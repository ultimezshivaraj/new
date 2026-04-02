// src/app/employee/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import EmployeeDashboardClient from '@/components/employee/EmployeeDashboardClient'

export const metadata = { title: 'My Dashboard — Ultimez Team' }

const T = `${PROJECT}.${TEAM_DATASET}`

// INTERVAL → "HH:MM" display string (kept as raw string for client)
export default async function EmployeeDashboardPage() {
  const session = await getSession('employee')
  if (!session) redirect('/employee/login')

  const empId = session.id

  const [
    workReports,
    recentReports,
    statsResult,
    profileResult,
    alertsResult,
    loginHistory,
  ] = await Promise.allSettled([

    // ── Today's work report (all 9 time fields) ──────────────────
    bqQuery<Record<string, unknown>>(`
      SELECT
        CAST(id AS STRING)                         AS id,
        CAST(date AS STRING)                       AS date,
        CAST(login_time AS STRING)                 AS login_time,
        CAST(logout_time AS STRING)                AS logout_time,
        CAST(total_worked_hours AS STRING)         AS total_worked_hours,
        CAST(active_hours AS STRING)               AS active_hours,
        CAST(idle_hours AS STRING)                 AS idle_hours,
        CAST(productive_hours AS STRING)           AS productive_hours,
        CAST(unproductive_hours AS STRING)         AS unproductive_hours,
        CAST(over_time AS STRING)                  AS over_time,
        CAST(ROUND(productivity_percentage, 1) AS STRING) AS productivity_percentage,
        CAST(report_type AS STRING)                AS report_type
      FROM \`${T}.newultimez_team_tbl_employees_work_reports\`
      WHERE employee_row_id = ${empId}
        AND date = CURRENT_DATE('Asia/Kolkata')
      LIMIT 3
    `),

    // ── Last 180 days reports ──────────────────────────────────────
    bqQuery<Record<string, unknown>>(`
      SELECT
        CAST(date AS STRING)                       AS date,
        CAST(login_time AS STRING)                 AS login_time,
        CAST(logout_time AS STRING)                AS logout_time,
        CAST(total_worked_hours AS STRING)         AS total_worked_hours,
        CAST(active_hours AS STRING)               AS active_hours,
        CAST(idle_hours AS STRING)                 AS idle_hours,
        CAST(productive_hours AS STRING)           AS productive_hours,
        CAST(unproductive_hours AS STRING)         AS unproductive_hours,
        CAST(over_time AS STRING)                  AS over_time,
        CAST(ROUND(productivity_percentage, 1) AS STRING) AS productivity_percentage,
        CAST(report_type AS STRING)                AS report_type
      FROM \`${T}.newultimez_team_tbl_employees_work_reports\`
      WHERE employee_row_id = ${empId}
      ORDER BY date DESC
      LIMIT 180
    `),

    // ── 30-day aggregate stats ────────────────────────────────────
    bqQuery<Record<string, unknown>>(`
      SELECT
        CAST(COUNT(*) AS STRING)                                              AS total_days,
        CAST(ROUND(AVG(productivity_percentage), 1) AS STRING)               AS avg_productivity,
        CAST(ROUND(MAX(productivity_percentage), 1) AS STRING)               AS best_productivity,
        CAST(COUNTIF(productivity_percentage >= 70) AS STRING)               AS high_perf_days,
        CAST(COUNTIF(productivity_percentage < 40) AS STRING)                AS low_perf_days
      FROM \`${T}.newultimez_team_tbl_employees_work_reports\`
      WHERE employee_row_id = ${empId}
        AND date >= DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 30 DAY)
    `),

    // ── Full profile + team leader ────────────────────────────────
    bqQuery<Record<string, unknown>>(`
      SELECT
        COALESCE(e.position, '')                               AS position,
        COALESCE(e.location, '')                               AS location,
        COALESCE(e.mobile_number, '')                         AS mobile_number,
        COALESCE(CAST(e.ultimez_join_date AS STRING), '')     AS ultimez_join_date,
        COALESCE(e.profile_image, '')                         AS profile_image,
        CAST(e.employee_type AS STRING)                       AS employee_type,
        CAST(e.employee_category_type AS STRING)              AS employee_category_type,
        CAST(e.agent_id AS STRING)                            AS agent_id,
        -- Team leader via tbl_employees_team_leaders
        COALESCE(
          STRING_AGG(DISTINCT tl_emp.full_name ORDER BY tl_emp.full_name),
          ''
        )                                                     AS team_leader
      FROM \`${T}.newultimez_team_tbl_employees\` e
      LEFT JOIN \`${T}.newultimez_team_tbl_employees_team_leaders\` tl
        ON REGEXP_CONTAINS(
             CAST(tl.juniors_row_ids AS STRING),
             CONCAT(r'(?:^|,)', CAST(e.id AS STRING), r'(?:,|$)')
           )
      LEFT JOIN \`${T}.newultimez_team_tbl_employees\` tl_emp
        ON tl_emp.id = tl.employee_row_id
      WHERE e.id = ${empId}
      GROUP BY
        e.position, e.location, e.mobile_number, e.ultimez_join_date,
        e.profile_image, e.employee_type, e.employee_category_type, e.agent_id
      LIMIT 1
    `),

    // ── Alerts with rule names (last 30 days) ─────────────────────
    // Joins via agent_id (Teramind ID) to get human-readable rule names
    bqQuery<Record<string, unknown>>(`
      SELECT
        CAST(a.date AS STRING)                                              AS date,
        CAST(a.alert_count AS STRING)                                      AS alert_count,
        COALESCE(det.rule_names, CAST(a.alert_type AS STRING))             AS rule_names,
        COALESCE(det.rule_groups, '')                                      AS rule_groups
      FROM \`${T}.newultimez_team_tbl_employees_work_reports_alerts\` a
      LEFT JOIN (
        SELECT
          agent_id,
          DATE(alert_date_n_time)                                          AS alert_date,
          STRING_AGG(DISTINCT rule_name ORDER BY rule_name LIMIT 5)       AS rule_names,
          STRING_AGG(DISTINCT rule_group_name ORDER BY rule_group_name LIMIT 3) AS rule_groups
        FROM \`${T}.newultimez_team_tbl_employees_work_reports_alerts_details\`
        WHERE DATE(alert_date_n_time) >= DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 30 DAY)
        GROUP BY agent_id, DATE(alert_date_n_time)
      ) det ON det.agent_id = a.agent_id AND det.alert_date = a.date
      WHERE a.employee_row_id = ${empId}
        AND a.date >= DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 30 DAY)
      ORDER BY a.date DESC
      LIMIT 30
    `),

    // ── Login history (last 30 events) ───────────────────────────
    bqQuery<Record<string, unknown>>(`
      SELECT
        ip.ip_address,
        COALESCE(ip.browser_details, '')   AS browser_details,
        CASE ip.browser_type
          WHEN 0 THEN 'Teramind'
          WHEN 1 THEN 'Mobile'
          WHEN 2 THEN 'Desktop'
          ELSE 'Unknown'
        END                                AS device_type,
        CAST(ip.date_n_time AS STRING)     AS auth_date
      FROM \`${T}.newultimez_team_tbl_employees_auth_ip_addresses\` ip
      WHERE ip.employee_row_id = ${empId}
      ORDER BY ip.date_n_time DESC
      LIMIT 30
    `),
  ])

  return (
    <EmployeeDashboardClient
      session={session}
      todayReports={workReports.status === 'fulfilled'   ? workReports.value   : []}
      recentReports={recentReports.status === 'fulfilled' ? recentReports.value : []}
      stats={statsResult.status === 'fulfilled'          ? (statsResult.value[0] ?? {}) : {}}
      profile={profileResult.status === 'fulfilled'      ? (profileResult.value[0] ?? {}) : {}}
      alerts={alertsResult.status === 'fulfilled'        ? alertsResult.value  : []}
      loginHistory={loginHistory.status === 'fulfilled'  ? loginHistory.value  : []}
    />
  )
}
