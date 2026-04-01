// src/app/api/admin/departments/route.ts
// Redis cache: admin:departments:v1 — 4 hour TTL
// Long TTL: dept/role assignments rarely change day-to-day
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import { redisGet, redisSet } from '@/lib/redis'

const T   = `${PROJECT}.${TEAM_DATASET}`
const KEY = 'admin:departments:v2'
const TTL = 4 * 60 * 60  // 4 hours

function deptCase(alias = 'e'): string {
  const f = `COALESCE(CAST(${alias}.create_type_row_id AS STRING),'')`
  return `CASE
    WHEN REGEXP_CONTAINS(${f}, r'(?:^|,)(1|2|3|10|12|20)(?:,|$)')  THEN 'Content & Editorial'
    WHEN REGEXP_CONTAINS(${f}, r'(?:^|,)(9|27|28)(?:,|$)')          THEN 'Development'
    WHEN REGEXP_CONTAINS(${f}, r'(?:^|,)(8|15|19)(?:,|$)')          THEN 'SEO & Backlinks'
    WHEN REGEXP_CONTAINS(${f}, r'(?:^|,)(5|17|21)(?:,|$)')          THEN 'Marketing & Growth'
    WHEN REGEXP_CONTAINS(${f}, r'(?:^|,)(22|25)(?:,|$)')            THEN 'Data & Analytics'
    WHEN REGEXP_CONTAINS(${f}, r'(?:^|,)(14|16|23|24|29)(?:,|$)')   THEN 'HR'
    WHEN REGEXP_CONTAINS(${f}, r'(?:^|,)(4|6|7|18)(?:,|$)')         THEN 'Sales & BD'
    WHEN REGEXP_CONTAINS(${f}, r'(?:^|,)13(?:,|$)')                 THEN 'Design'
    WHEN REGEXP_CONTAINS(${f}, r'(?:^|,)26(?:,|$)')                 THEN 'Academy'
    WHEN REGEXP_CONTAINS(${f}, r'(?:^|,)11(?:,|$)')                 THEN 'Management'
    ELSE 'Other'
  END`
}

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Cache check ──
  const cached = await redisGet<{ depts: unknown[]; employees: unknown[]; roleStats: unknown[] }>(KEY)
  if (cached) {
    return NextResponse.json({ success: true, ...cached, cached: true })
  }

  const roleNamesCTE = `
    WITH emp_role_names AS (
      SELECT
        e.id AS emp_id,
        STRING_AGG(ct.create_type_name ORDER BY ct.id) AS role_names
      FROM \`${T}.newultimez_team_tbl_employees\` e
      JOIN \`${T}.newultimez_team_tbl_employees_create_types\` ct
        ON REGEXP_CONTAINS(
             COALESCE(CAST(e.create_type_row_id AS STRING), ''),
             CONCAT(r'(?:^|,)', CAST(ct.id AS STRING), r'(?:,|$)')
           )
      GROUP BY e.id
    )
  `

  try {
    const [depts, directory, roleStats] = await Promise.all([
      bqQuery<Record<string, string>>(`
        SELECT
          dept_name                                                             AS department_name,
          CAST(COUNTIF(login_status = 1) AS STRING)                            AS active_employees,
          CAST(ROUND(SAFE_DIVIDE(COUNTIF(login_status = 1), COUNT(DISTINCT id)) * 100, 1) AS STRING) AS retention_pct,
          CAST(ROUND(AVG(CASE WHEN login_status = 1 AND ultimez_join_date IS NOT NULL
            THEN DATE_DIFF(CURRENT_DATE('Asia/Kolkata'), ultimez_join_date, MONTH)
            ELSE NULL END), 1) AS STRING)                                       AS avg_tenure_months,
          CAST(COUNTIF(ultimez_join_date >= DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 90 DAY)) AS STRING) AS new_hires_90d,
          CAST(COUNT(DISTINCT id) AS STRING)                                    AS total_ever
        FROM (
          SELECT e.id, e.login_status, e.ultimez_join_date, ${deptCase()} AS dept_name
          FROM \`${T}.newultimez_team_tbl_employees\` e
        )
        WHERE dept_name != 'Other'
        GROUP BY dept_name
        ORDER BY COUNTIF(login_status = 1) DESC
      `),
      bqQuery<Record<string, string>>(`
        ${roleNamesCTE}
        SELECT
          CAST(e.id AS STRING)                               AS employee_id,
          e.full_name,
          COALESCE(e.email_id, '')                           AS email_id,
          CAST(e.login_status AS STRING)                     AS login_status,
          COALESCE(e.position, '')                           AS position,
          COALESCE(e.location, '')                           AS location,
          COALESCE(CAST(e.ultimez_join_date AS STRING), '')  AS ultimez_join_date,
          COALESCE(CAST(e.create_type_row_id AS STRING), '') AS create_type_row_id,
          ${deptCase()}                                      AS department_name,
          COALESCE(ern.role_names, '')                       AS role_names,
          CAST(CASE WHEN e.ultimez_join_date IS NOT NULL
            THEN DATE_DIFF(CURRENT_DATE('Asia/Kolkata'), e.ultimez_join_date, MONTH)
            ELSE NULL END AS STRING)                         AS tenure_months
        FROM \`${T}.newultimez_team_tbl_employees\` e
        LEFT JOIN emp_role_names ern ON ern.emp_id = e.id
        WHERE e.login_status = 1
        ORDER BY department_name, e.full_name ASC
      `),
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(ct.id AS STRING)                              AS role_id,
          ct.create_type_name                               AS role_name,
          CAST(COUNTIF(e.login_status = 1) AS STRING)       AS active_employees,
          CAST(COUNT(DISTINCT e.id) AS STRING)              AS total_employees
        FROM \`${T}.newultimez_team_tbl_employees_create_types\` ct
        LEFT JOIN \`${T}.newultimez_team_tbl_employees\` e
          ON REGEXP_CONTAINS(
               COALESCE(CAST(e.create_type_row_id AS STRING), ''),
               CONCAT(r'(?:^|,)', CAST(ct.id AS STRING), r'(?:,|$)')
             )
        GROUP BY ct.id, ct.create_type_name
        ORDER BY COUNTIF(e.login_status = 1) DESC
      `),
    ])

    const payload = { depts, employees: directory, roleStats }
    await redisSet(KEY, payload, TTL)
    return NextResponse.json({ success: true, ...payload, cached: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[departments]', msg)
    return NextResponse.json({ error: 'Failed to fetch departments', detail: msg }, { status: 500 })
  }
}
