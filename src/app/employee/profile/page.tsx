// src/app/employee/profile/page.tsx
import { redirect }   from 'next/navigation'
import { getSession } from '@/lib/session'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import EmployeeProfileClient from '@/components/employee/EmployeeProfileClient'

export const metadata = { title: 'My Profile — Ultimez Team' }

const T = `${PROJECT}.${TEAM_DATASET}`

export default async function EmployeeProfilePage() {
  const session = await getSession('employee')
  if (!session) redirect('/employee/login')

  const empId = session.id

  const [profileRows, tlRows, statsRows] = await Promise.allSettled([

    // Full employee profile
    bqQuery<Record<string, string>>(`
      SELECT
        CAST(e.id AS STRING)                                 AS employee_id,
        e.full_name,
        COALESCE(e.username, '')                             AS username,
        COALESCE(e.email_id, '')                             AS email_id,
        COALESCE(e.position, '')                             AS position,
        COALESCE(e.location, '')                             AS location,
        COALESCE(e.mobile_number, '')                        AS mobile_number,
        COALESCE(CAST(e.ultimez_join_date AS STRING), '')    AS ultimez_join_date,
        CAST(e.login_status AS STRING)                       AS login_status,
        CAST(e.employee_type AS STRING)                      AS employee_type,
        CAST(e.employee_category_type AS STRING)             AS employee_category_type,
        COALESCE(e.profile_image, '')                        AS profile_image,
        COALESCE(CAST(e.create_type_row_id AS STRING), '')   AS create_type_row_id,
        COALESCE(CAST(e.salary AS STRING), '0')              AS salary,
        COALESCE(CAST(e.allowances AS STRING), '0')          AS allowances
      FROM \`${T}.newultimez_team_tbl_employees\` e
      WHERE e.id = ${empId}
      LIMIT 1
    `),

    // Team leader name via join table
    bqQuery<Record<string, string>>(`
      SELECT tl.full_name AS team_leader_name
      FROM \`${T}.newultimez_team_tbl_employees_team_leaders\` tlr
      JOIN \`${T}.newultimez_team_tbl_employees\` tl
        ON tl.id = tlr.team_leader_employee_id
      WHERE tlr.junior_employee_id = ${empId}
      LIMIT 1
    `),

    // 30-day productivity summary
    bqQuery<Record<string, string>>(`
      SELECT
        CAST(COUNT(*) AS STRING)                                AS total_days,
        CAST(ROUND(AVG(productivity_percentage), 1) AS STRING)  AS avg_productivity,
        CAST(MAX(productivity_percentage) AS STRING)            AS best_day,
        CAST(COUNTIF(productivity_percentage >= 70) AS STRING)  AS high_days,
        CAST(COUNTIF(productivity_percentage < 40) AS STRING)   AS low_days
      FROM \`${T}.newultimez_team_tbl_employees_work_reports\`
      WHERE employee_row_id = ${empId}
        AND date >= DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 30 DAY)
    `),
  ])

  const profile    = profileRows.status === 'fulfilled' ? (profileRows.value[0] ?? {}) : {}
  const teamLeader = tlRows.status      === 'fulfilled' ? (tlRows.value[0]?.team_leader_name ?? '') : ''
  const stats      = statsRows.status   === 'fulfilled' ? (statsRows.value[0] ?? {}) : {}

  return (
    <EmployeeProfileClient
      session={session}
      profile={{ ...profile, team_leader: teamLeader } as Record<string, string>}
      stats={stats as Record<string, string>}
    />
  )
}
