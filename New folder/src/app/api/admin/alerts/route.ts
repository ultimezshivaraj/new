// src/app/api/admin/alerts/route.ts
// Redis cache: admin:alerts:v1 — 30 min TTL
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import { redisGet, redisSet } from '@/lib/redis'

const T   = `${PROJECT}.${TEAM_DATASET}`
const KEY = 'admin:alerts:v1'
const TTL = 30 * 60  // 30 minutes

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Cache check ──
  const cached = await redisGet<unknown[]>(KEY)
  if (cached) {
    return NextResponse.json({ success: true, alerts: cached, cached: true })
  }

  try {
    const alerts = await bqQuery<Record<string, string>>(`
      SELECT
        e.full_name,
        COALESCE(e.position, '')             AS position,
        CAST(a.employee_row_id AS STRING)    AS employee_id,
        CAST(a.alert_count AS STRING)        AS alert_count,
        CAST(a.date AS STRING)               AS date,
        COALESCE(det.rule_names,  CAST(a.alert_type AS STRING)) AS rule_names,
        COALESCE(det.rule_groups, '')                            AS rule_groups
      FROM \`${T}.newultimez_team_tbl_employees_work_reports_alerts\` a
      JOIN \`${T}.newultimez_team_tbl_employees\` e
        ON e.id = a.employee_row_id
      LEFT JOIN (
        SELECT
          agent_id,
          DATE(alert_date_n_time)                                              AS alert_date,
          STRING_AGG(DISTINCT rule_name       ORDER BY rule_name  LIMIT 5)    AS rule_names,
          STRING_AGG(DISTINCT rule_group_name ORDER BY rule_group_name LIMIT 3) AS rule_groups
        FROM \`${T}.newultimez_team_tbl_employees_work_reports_alerts_details\`
        WHERE DATE(alert_date_n_time) >= DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 30 DAY)
        GROUP BY agent_id, DATE(alert_date_n_time)
      ) det
        ON det.agent_id   = a.agent_id
        AND det.alert_date = a.date
      WHERE a.date >= DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 30 DAY)
      ORDER BY a.date DESC, a.alert_count DESC
      LIMIT 200
    `)
    await redisSet(KEY, alerts, TTL)
    return NextResponse.json({ success: true, alerts, cached: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[alerts]', msg)
    return NextResponse.json({ error: 'Failed to fetch alerts', detail: msg }, { status: 500 })
  }
}
