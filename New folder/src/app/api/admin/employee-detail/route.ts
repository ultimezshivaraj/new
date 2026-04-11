// src/app/api/admin/employee-detail/route.ts
// Returns per-employee: last 7 days work rows, 30-day stats, recent alerts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'

const T = `${PROJECT}.${TEAM_DATASET}`

const IV = (col: string) =>
  `CAST(SPLIT(REPLACE(CAST(${col} AS STRING),'0-0 0 ',''),':')[OFFSET(0)] AS INT64)*60` +
  ` + CAST(SPLIT(REPLACE(CAST(${col} AS STRING),'0-0 0 ',''),':')[OFFSET(1)] AS INT64)`

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const empId = searchParams.get('id')

  if (!empId || isNaN(parseInt(empId)))
    return NextResponse.json({ error: 'Missing or invalid employee id' }, { status: 400 })

  try {
    const [reports7d, stats30d, alerts] = await Promise.all([

      // ── Last 7 days: individual rows ─────────────────────────────
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(date AS STRING)                            AS date,
          CAST(${IV('login_time')} AS STRING)             AS login_mins,
          CASE WHEN logout_time IS NOT NULL
            THEN CAST(${IV('logout_time')} AS STRING)
            ELSE NULL END                                 AS logout_mins,
          CAST(${IV('active_hours')} AS STRING)           AS active_mins,
          CAST(${IV('total_worked_hours')} AS STRING)     AS worked_mins,
          CAST(${IV('over_time')} AS STRING)              AS ot_mins,
          CAST(${IV('idle_hours')} AS STRING)             AS idle_mins,
          CAST(${IV('productive_hours')} AS STRING)       AS prod_mins,
          CAST(${IV('unproductive_hours')} AS STRING)     AS unprod_mins,
          CAST(ROUND(productivity_percentage, 2) AS STRING) AS prod_pct,
          CAST(report_type AS STRING)                     AS report_type
        FROM \`${T}.newultimez_team_tbl_employees_work_reports\`
        WHERE employee_row_id = ${empId}
          AND date >= DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 7 DAY)
        ORDER BY date DESC
      `),

      // ── Last 30 days: aggregate stats ─────────────────────────────
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(COUNT(*) AS STRING)                                          AS total_days,
          CAST(ROUND(AVG(productivity_percentage), 1) AS STRING)            AS avg_prod,
          CAST(ROUND(MAX(productivity_percentage), 1) AS STRING)            AS best_day,
          CAST(ROUND(MIN(productivity_percentage), 1) AS STRING)            AS worst_day,
          CAST(COUNTIF(productivity_percentage >= 70) AS STRING)            AS high_days,
          CAST(COUNTIF(productivity_percentage >= 40
            AND productivity_percentage < 70) AS STRING)                    AS mid_days,
          CAST(COUNTIF(productivity_percentage < 40) AS STRING)             AS low_days,
          CAST(SUM(${IV('total_worked_hours')}) AS STRING)                  AS total_worked_mins,
          CAST(SUM(${IV('over_time')}) AS STRING)                           AS total_ot_mins,
          CAST(SUM(${IV('idle_hours')}) AS STRING)                          AS total_idle_mins,
          CAST(SUM(${IV('productive_hours')}) AS STRING)                    AS total_prod_mins
        FROM \`${T}.newultimez_team_tbl_employees_work_reports\`
        WHERE employee_row_id = ${empId}
          AND date >= DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 30 DAY)
      `),

      // ── Alerts: last 30 days with rule names ──────────────────────
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(a.date AS STRING)               AS date,
          CAST(a.alert_count AS STRING)        AS alert_count,
          COALESCE(det.rule_names,  CAST(a.alert_type AS STRING)) AS rule_names,
          COALESCE(det.rule_groups, '')                            AS rule_groups
        FROM \`${T}.newultimez_team_tbl_employees_work_reports_alerts\` a
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
        WHERE a.employee_row_id = ${empId}
          AND a.date >= DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 30 DAY)
        ORDER BY a.date DESC
        LIMIT 30
      `),
    ])

    return NextResponse.json({
      success: true,
      reports7d,
      stats30d: stats30d[0] ?? {},
      alerts,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[employee-detail]', msg)
    return NextResponse.json({ error: 'Failed to fetch employee detail', detail: msg }, { status: 500 })
  }
}
