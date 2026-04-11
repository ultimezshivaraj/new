// src/app/api/admin/ip-monitor/route.ts
// Redis cache: admin:ip-monitor:v1 — 15 min TTL
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import { redisGet, redisSet } from '@/lib/redis'

const T      = `${PROJECT}.${TEAM_DATASET}`
const OFFICE = '61.3.18.4'
const KEY    = 'admin:ip-monitor:v1'
const TTL    = 15 * 60  // 15 minutes

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Cache check ──
  const cached = await redisGet<{ events: unknown[]; stats: unknown }>(KEY)
  if (cached) {
    return NextResponse.json({ success: true, ...cached, officeIp: OFFICE, cached: true })
  }

  try {
    const [events, stats] = await Promise.all([
      bqQuery<Record<string, string>>(`
        SELECT
          COALESCE(e.full_name, '')          AS full_name,
          COALESCE(e.email_id, '')           AS email_id,
          COALESCE(e.position, '')           AS position,
          CAST(ip.employee_row_id AS STRING) AS employee_id,
          ip.ip_address,
          CAST(ip.date_n_time AS STRING)     AS auth_date,
          COALESCE(ip.browser_details, '')   AS browser_details,
          CASE ip.browser_type
            WHEN 0 THEN 'Teramind'
            WHEN 1 THEN 'Mobile'
            WHEN 2 THEN 'Desktop'
            ELSE 'Unknown'
          END                                AS browser_type_label,
          CAST(ip.browser_type AS STRING)    AS browser_type
        FROM \`${T}.newultimez_team_tbl_employees_auth_ip_addresses\` ip
        LEFT JOIN \`${T}.newultimez_team_tbl_employees\` e
          ON e.id = ip.employee_row_id
        ORDER BY ip.date_n_time DESC
        LIMIT 200
      `),
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(COUNT(*) AS STRING)                                           AS total_events,
          CAST(COUNT(DISTINCT employee_row_id) AS STRING)                    AS unique_employees,
          CAST(COUNTIF(ip_address = '${OFFICE}') AS STRING)                 AS office_logins,
          CAST(COUNTIF(ip_address != '${OFFICE}') AS STRING)                AS remote_logins,
          CAST(COUNT(DISTINCT ip_address) AS STRING)                         AS unique_ips,
          CAST(COUNTIF(DATE(date_n_time) = CURRENT_DATE('Asia/Kolkata')) AS STRING) AS today_events,
          CAST(COUNTIF(browser_type = 0) AS STRING)                          AS teramind_logins,
          CAST(COUNTIF(browser_type = 1) AS STRING)                          AS mobile_logins,
          CAST(COUNTIF(browser_type = 2) AS STRING)                          AS desktop_logins
        FROM \`${T}.newultimez_team_tbl_employees_auth_ip_addresses\`
      `),
    ])

    const payload = { events, stats: stats[0] ?? {} }
    await redisSet(KEY, payload, TTL)
    return NextResponse.json({ success: true, ...payload, officeIp: OFFICE, cached: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ip-monitor]', msg)
    return NextResponse.json({ error: 'Failed to fetch IP data', detail: msg }, { status: 500 })
  }
}
