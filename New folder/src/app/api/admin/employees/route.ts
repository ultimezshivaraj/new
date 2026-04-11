// src/app/api/admin/employees/route.ts
// Redis cache: admin:employees:v1 — 30 min TTL
// Short TTL because today's work_report changes through the day
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import { redisGet, redisSet } from '@/lib/redis'

const T    = `${PROJECT}.${TEAM_DATASET}`
const KEY  = 'admin:employees:v2'
const TTL  = 30 * 60  // 30 minutes

function IV(col: string): string {
  return (
    `CAST(SPLIT(REPLACE(CAST(${col} AS STRING),'0-0 0 ',''),':')[OFFSET(0)] AS INT64)*60` +
    ` + CAST(SPLIT(REPLACE(CAST(${col} AS STRING),'0-0 0 ',''),':')[OFFSET(1)] AS INT64)`
  )
}

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Cache check ──
  const cached = await redisGet<unknown[]>(KEY)
  if (cached) {
    return NextResponse.json({ success: true, employees: cached, cached: true })
  }

  const sql = `
    SELECT
      CAST(e.id AS STRING)                                  AS employee_id,
      e.full_name,
      COALESCE(e.username, '')                              AS username,
      COALESCE(e.email_id, '')                              AS email_id,
      COALESCE(e.position, '')                              AS position,
      COALESCE(e.location, '')                              AS location,
      COALESCE(e.mobile_number, '')                         AS mobile_number,
      COALESCE(CAST(e.ultimez_join_date AS STRING), '')     AS ultimez_join_date,
      CAST(e.login_status AS STRING)                        AS login_status,
      CAST(e.employee_type AS STRING)                       AS employee_type,
      CAST(e.employee_category_type AS STRING)              AS employee_category_type,
      COALESCE(CAST(e.salary AS STRING), '0')               AS salary,
      COALESCE(CAST(e.allowances AS STRING), '0')           AS allowances,
      COALESCE(e.profile_image, '')                         AS profile_image,
      COALESCE(CAST(e.create_type_row_id AS STRING), '')    AS create_type_row_id,
      COALESCE(CAST(e.date_n_time AS STRING), '')           AS created_at,
      COALESCE(
        STRING_AGG(DISTINCT tl_emp.full_name ORDER BY tl_emp.full_name LIMIT 1),
        ''
      )                                                     AS team_leader,
      COALESCE(CAST(MAX(ac.alert_count) AS STRING), '0')   AS alert_count,
      COALESCE(CAST(MAX(wr.login_mins)   AS STRING), '')   AS wr_login_mins,
      COALESCE(CAST(MAX(wr.logout_mins)  AS STRING), '')   AS wr_logout_mins,
      COALESCE(CAST(MAX(wr.active_mins)  AS STRING), '')   AS wr_active_mins,
      COALESCE(CAST(MAX(wr.worked_mins)  AS STRING), '')   AS wr_worked_mins,
      COALESCE(CAST(MAX(wr.ot_mins)      AS STRING), '')   AS wr_ot_mins,
      COALESCE(CAST(MAX(wr.idle_mins)    AS STRING), '')   AS wr_idle_mins,
      COALESCE(CAST(MAX(wr.prod_mins)    AS STRING), '')   AS wr_prod_mins,
      COALESCE(CAST(MAX(wr.unprod_mins)  AS STRING), '')   AS wr_unprod_mins,
      COALESCE(CAST(MAX(wr.prod_pct)     AS STRING), '')   AS wr_prod,
      COALESCE(CAST(MAX(wr.rtype)        AS STRING), '')   AS wr_report_type
    FROM \`${T}.newultimez_team_tbl_employees\` e
    LEFT JOIN \`${T}.newultimez_team_tbl_employees_team_leaders\` tl
      ON REGEXP_CONTAINS(
           CAST(tl.juniors_row_ids AS STRING),
           CONCAT(r'(?:^|,)', CAST(e.id AS STRING), r'(?:,|$)')
         )
    LEFT JOIN \`${T}.newultimez_team_tbl_employees\` tl_emp
      ON tl_emp.id = tl.employee_row_id
    LEFT JOIN (
      SELECT employee_row_id, COUNT(*) AS alert_count
      FROM \`${T}.newultimez_team_tbl_employees_work_reports_alerts\`
      WHERE date = CURRENT_DATE('Asia/Kolkata')
      GROUP BY employee_row_id
    ) ac ON ac.employee_row_id = e.id
    LEFT JOIN (
      SELECT
        employee_row_id,
        ${IV('login_time')}           AS login_mins,
        CASE WHEN logout_time IS NOT NULL THEN ${IV('logout_time')} ELSE NULL END AS logout_mins,
        ${IV('active_hours')}         AS active_mins,
        ${IV('total_worked_hours')}   AS worked_mins,
        ${IV('over_time')}            AS ot_mins,
        ${IV('idle_hours')}           AS idle_mins,
        ${IV('productive_hours')}     AS prod_mins,
        ${IV('unproductive_hours')}   AS unprod_mins,
        ROUND(productivity_percentage, 2) AS prod_pct,
        report_type AS rtype
      FROM \`${T}.newultimez_team_tbl_employees_work_reports\`
      WHERE date = CURRENT_DATE('Asia/Kolkata')
    ) wr ON wr.employee_row_id = e.id
    GROUP BY
      e.id, e.full_name, e.username, e.email_id, e.position, e.location,
      e.mobile_number, e.ultimez_join_date, e.login_status, e.employee_type,
      e.employee_category_type, e.salary, e.allowances, e.profile_image,
      e.create_type_row_id, e.date_n_time
    ORDER BY e.full_name ASC
  `

  try {
    const rows = await bqQuery<Record<string, string>>(sql)
    await redisSet(KEY, rows, TTL)
    return NextResponse.json({ success: true, employees: rows, cached: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[employees]', msg)
    return NextResponse.json({ error: 'Failed to fetch employees', detail: msg }, { status: 500 })
  }
}
