// src/app/api/admin/work-today/route.ts
// Redis cache: admin:work-today:{from}:{to} — 15 min TTL
// Short TTL because productivity data updates throughout the day
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import { redisGet, redisSet } from '@/lib/redis'

const T = `${PROJECT}.${TEAM_DATASET}`
const TTL = 15 * 60  // 15 minutes

function IV(col: string): string {
  return (
    `CAST(SPLIT(REPLACE(CAST(${col} AS STRING),'0-0 0 ',''),':')[OFFSET(0)] AS INT64)*60` +
    ` + CAST(SPLIT(REPLACE(CAST(${col} AS STRING),'0-0 0 ',''),':')[OFFSET(1)] AS INT64)`
  )
}

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')
  const fromExpr = from ? `'${from}'` : `CURRENT_DATE('Asia/Kolkata')`
  const toExpr   = to   ? `'${to}'`   : `CURRENT_DATE('Asia/Kolkata')`
  const cacheKey = `admin:work-today:${from || 'today'}:${to || 'today'}`

  // ── Cache check ──
  const cached = await redisGet<unknown[]>(cacheKey)
  if (cached) {
    return NextResponse.json({ success: true, reports: cached, total: cached.length, cached: true })
  }

  const sql = `
    SELECT
      CAST(e.id AS STRING)                                      AS employee_id,
      e.full_name,
      COALESCE(e.position, '')                                  AS position,
      COALESCE(e.location, '')                                  AS location,
      CAST(wr.date AS STRING)                                   AS date,
      CAST(${IV('wr.login_time')} AS STRING)                    AS login_mins,
      CASE WHEN wr.logout_time IS NOT NULL
        THEN CAST(${IV('wr.logout_time')} AS STRING)
        ELSE NULL END                                           AS logout_mins,
      CAST(${IV('wr.active_hours')} AS STRING)                  AS active_mins,
      CAST(${IV('wr.total_worked_hours')} AS STRING)            AS worked_mins,
      CAST(${IV('wr.over_time')} AS STRING)                     AS overtime_mins,
      CAST(${IV('wr.idle_hours')} AS STRING)                    AS idle_mins,
      CAST(${IV('wr.productive_hours')} AS STRING)              AS prod_mins,
      CAST(${IV('wr.unproductive_hours')} AS STRING)            AS unprod_mins,
      CAST(ROUND(wr.productivity_percentage, 2) AS STRING)      AS productivity_pct,
      CAST(wr.report_type AS STRING)                            AS report_type,
      COALESCE(CAST(ac.alert_count AS STRING), '0')             AS alert_count
    FROM \`${T}.newultimez_team_tbl_employees_work_reports\` wr
    JOIN \`${T}.newultimez_team_tbl_employees\` e
      ON e.id = wr.employee_row_id
    LEFT JOIN (
      SELECT employee_row_id, COUNT(*) AS alert_count
      FROM \`${T}.newultimez_team_tbl_employees_work_reports_alerts\`
      WHERE date BETWEEN ${fromExpr} AND ${toExpr}
      GROUP BY employee_row_id
    ) ac ON ac.employee_row_id = wr.employee_row_id
    WHERE wr.date BETWEEN ${fromExpr} AND ${toExpr}
    ORDER BY wr.productivity_percentage DESC
  `

  try {
    const rows = await bqQuery<Record<string, string>>(sql)
    await redisSet(cacheKey, rows, TTL)
    return NextResponse.json({ success: true, reports: rows, total: rows.length, cached: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[work-today]', msg)
    return NextResponse.json({ error: 'Failed to fetch work reports', detail: msg }, { status: 500 })
  }
}
