// src/app/api/admin/low-performers/route.ts
// Returns all employees whose 30-day avg productivity < 40%
// with full monthly stats needed for the message generator
// Redis cache: admin:low-performers:v1 — 30 min TTL

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import { redisGet, redisSet } from '@/lib/redis'

const T   = `${PROJECT}.${TEAM_DATASET}`
const KEY = 'admin:low-performers:v1'
const TTL = 30 * 60

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cached = await redisGet<unknown>(KEY)
  if (cached) return NextResponse.json({ success: true, ...(cached as object), cached: true })

  try {
    const [performers, meta] = await Promise.all([

      // ── Monthly stats per employee (last 30 days) ────────────
      bqQuery<Record<string, string>>(`
        WITH monthly AS (
          SELECT
            wr.employee_row_id,
            COUNT(*)                                                   AS days_worked,
            ROUND(AVG(wr.productivity_percentage), 1)                 AS avg_prod,
            ROUND(SUM(CAST(SPLIT(REPLACE(CAST(wr.active_hours AS STRING),'0-0 0 ',''),':')[OFFSET(0)] AS INT64)*60 +
                      CAST(SPLIT(REPLACE(CAST(wr.active_hours AS STRING),'0-0 0 ',''),':')[OFFSET(1)] AS INT64)) / 60.0, 2) AS active_hrs,
            ROUND(SUM(CAST(SPLIT(REPLACE(CAST(wr.total_worked_hours AS STRING),'0-0 0 ',''),':')[OFFSET(0)] AS INT64)*60 +
                      CAST(SPLIT(REPLACE(CAST(wr.total_worked_hours AS STRING),'0-0 0 ',''),':')[OFFSET(1)] AS INT64)) / 60.0, 2) AS worked_hrs,
            ROUND(SUM(CAST(SPLIT(REPLACE(CAST(wr.idle_hours AS STRING),'0-0 0 ',''),':')[OFFSET(0)] AS INT64)*60 +
                      CAST(SPLIT(REPLACE(CAST(wr.idle_hours AS STRING),'0-0 0 ',''),':')[OFFSET(1)] AS INT64)) / 60.0, 2) AS idle_hrs,
            ROUND(SUM(CAST(SPLIT(REPLACE(CAST(wr.productive_hours AS STRING),'0-0 0 ',''),':')[OFFSET(0)] AS INT64)*60 +
                      CAST(SPLIT(REPLACE(CAST(wr.productive_hours AS STRING),'0-0 0 ',''),':')[OFFSET(1)] AS INT64)) / 60.0, 2) AS prod_hrs,
            COUNTIF(wr.productivity_percentage < 40)                  AS low_days,
            COUNTIF(wr.productivity_percentage >= 70)                 AS high_days,
            MIN(CAST(wr.date AS STRING))                              AS period_start,
            MAX(CAST(wr.date AS STRING))                              AS period_end
          FROM \`${T}.newultimez_team_tbl_employees_work_reports\` wr
          WHERE wr.date >= DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 30 DAY)
            AND wr.productivity_percentage > 0
          GROUP BY wr.employee_row_id
          HAVING AVG(wr.productivity_percentage) < 40
        )
        SELECT
          CAST(m.employee_row_id AS STRING)          AS employee_row_id,
          COALESCE(e.full_name, '')                  AS full_name,
          COALESCE(e.position, '')                   AS position,
          COALESCE(e.email_id, '')                   AS email_id,
          COALESCE(e.mobile_number, '')              AS mobile_number,
          COALESCE(e.profile_image, '')              AS profile_image,
          CAST(m.days_worked AS STRING)              AS days_worked,
          CAST(m.avg_prod AS STRING)                 AS avg_prod,
          CAST(m.active_hrs AS STRING)               AS active_hrs,
          CAST(m.worked_hrs AS STRING)               AS worked_hrs,
          CAST(m.idle_hrs AS STRING)                 AS idle_hrs,
          CAST(m.prod_hrs AS STRING)                 AS prod_hrs,
          CAST(m.low_days AS STRING)                 AS low_days,
          CAST(m.high_days AS STRING)                AS high_days,
          COALESCE(m.period_start, '')               AS period_start,
          COALESCE(m.period_end, '')                 AS period_end
        FROM monthly m
        LEFT JOIN \`${T}.newultimez_team_tbl_employees\` e ON e.id = m.employee_row_id
        WHERE e.login_status = 1
        ORDER BY m.avg_prod ASC
      `),

      // ── Summary counts ────────────────────────────────────────
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(COUNT(DISTINCT CASE WHEN avg_prod < 40 THEN employee_row_id END) AS STRING) AS low_count,
          CAST(COUNT(DISTINCT CASE WHEN avg_prod < 20 THEN employee_row_id END) AS STRING) AS critical_count,
          CAST(COUNT(DISTINCT employee_row_id) AS STRING)                                   AS total_with_reports
        FROM (
          SELECT employee_row_id, AVG(productivity_percentage) AS avg_prod
          FROM \`${T}.newultimez_team_tbl_employees_work_reports\`
          WHERE date >= DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 30 DAY)
            AND productivity_percentage > 0
          GROUP BY employee_row_id
        )
      `),
    ])

    const payload = { performers, meta: meta[0] ?? {} }
    await redisSet(KEY, payload, TTL)
    return NextResponse.json({ success: true, ...payload, cached: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[low-performers]', msg)
    return NextResponse.json({ error: 'Failed to fetch data', detail: msg }, { status: 500 })
  }
}
