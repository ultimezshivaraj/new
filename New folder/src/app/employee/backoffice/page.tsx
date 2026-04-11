// src/app/employee/backoffice/page.tsx
import { redirect }      from 'next/navigation'
import { getSession }    from '@/lib/session'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import EmployeeBackOfficePage from '@/components/employee/backoffice/EmployeeBackOfficePage'
import { type LeaveRow, type LeaveType } from '@/components/employee/backoffice/EmpLeaveRequestsTab'
import { type HolidayRow } from '@/components/employee/backoffice/EmpHolidayCalendarTab'
import { type PayslipRow, type BankAccountRow, type BankLogRow } from '@/components/employee/backoffice/EmpPayrollTab'
import { type ITQueryRow, type ITQueryLogRow, type DeviceRow } from '@/components/employee/backoffice/EmpITServicesTab'

export const metadata = { title: 'My Back Office — Ultimez Team' }
const T = `${PROJECT}.${TEAM_DATASET}`

interface PageProps { searchParams: Promise<{ tab?: string }> }

export default async function EmployeeBackOfficeServerPage({ searchParams }: PageProps) {
  const session = await getSession('employee')
  if (!session) redirect('/employee/login')
  const empId = session.id
  const { tab } = await searchParams

  const [
    leavesResult, leaveTypesResult, holidaysResult,
    payslipsResult, bankAccountResult, bankLogsResult,
    itQueriesResult, itQueryLogsResult, deviceResult,
  ] = await Promise.allSettled([

    // ── Leave ────────────────────────────────────────────────────
    bqQuery<Record<string,string>>(`
      SELECT
        CAST(l.id AS STRING)                                       AS id,
        COALESCE(l.leave_type,'')                                 AS leave_type,
        COALESCE(l.day_type,'')                                   AS day_type,
        CAST(COALESCE(l.leave_type_row_id,0) AS STRING)          AS leave_type_row_id,
        COALESCE(lt.type,'')                                      AS leave_type_name,
        COALESCE(CAST(l.from_date AS STRING),'')                  AS from_date,
        COALESCE(CAST(l.to_date AS STRING),'')                    AS to_date,
        COALESCE(CAST(l.first_half_date AS STRING),'')            AS first_half_date,
        COALESCE(CAST(l.second_half_date AS STRING),'')           AS second_half_date,
        CAST(COALESCE(l.applied_leaves,0) AS STRING)             AS applied_leaves,
        CAST(COALESCE(l.extra_leaves,0) AS STRING)               AS extra_leaves,
        CAST(COALESCE(l.team_lead_approval_status,0) AS STRING)  AS team_lead_approval_status,
        COALESCE(tl.full_name,'')                                 AS team_lead_name,
        COALESCE(l.leader_comments,'')                            AS leader_comments,
        CAST(COALESCE(l.approval_status,0) AS STRING)            AS approval_status,
        COALESCE(hr.full_name,'')                                 AS hr_name,
        COALESCE(l.hr_comments,'')                                AS hr_comments,
        COALESCE(l.other_leave_type,'')                           AS other_leave_type,
        CAST(COALESCE(l.wfh_leave_type,0) AS STRING)             AS wfh_leave_type,
        CAST(l.date_n_time AS STRING)                             AS date_n_time,
        COALESCE(CAST(l.compensation_date AS STRING),'')          AS compensation_date,
        COALESCE(CAST(l.compensation_to AS STRING),'')            AS compensation_to
      FROM \`${T}.newultimez_team_tbl_leaves\` l
      LEFT JOIN \`${T}.newultimez_team_tbl_leave_types\` lt ON lt.id = l.leave_type_row_id
      LEFT JOIN \`${T}.newultimez_team_tbl_employees\`   tl ON tl.id = l.lead_employee_row_id
      LEFT JOIN \`${T}.newultimez_team_tbl_employees\`   hr ON hr.id = l.hr_employee_row_id
      WHERE l.employee_row_id = ${empId}
      ORDER BY l.date_n_time DESC
    `),

    bqQuery<Record<string,string>>(`
      SELECT CAST(id AS STRING) AS id, COALESCE(type,'') AS type
      FROM \`${T}.newultimez_team_tbl_leave_types\` ORDER BY id ASC
    `),

    bqQuery<Record<string,string>>(`
      SELECT
        CAST(id AS STRING) AS id, CAST(holiday_date AS STRING) AS holiday_date,
        COALESCE(holiday_details,'') AS holiday_details,
        FORMAT_DATE('%A', holiday_date) AS day_name,
        CAST(EXTRACT(DAYOFWEEK FROM holiday_date) AS STRING) AS day_of_week,
        CASE
          WHEN holiday_date = CURRENT_DATE('Asia/Kolkata') THEN 'today'
          WHEN holiday_date > CURRENT_DATE('Asia/Kolkata') THEN 'upcoming'
          ELSE 'past'
        END AS status,
        CAST(DATE_DIFF(holiday_date, CURRENT_DATE('Asia/Kolkata'), DAY) AS STRING) AS days_away
      FROM \`${T}.newultimez_team_tbl_holiday_details\` ORDER BY holiday_date ASC
    `),

    // ── Payroll ──────────────────────────────────────────────────
    bqQuery<Record<string,string>>(`
      SELECT
        CAST(id AS STRING) AS id,
        COALESCE(account_holder_name,'') AS account_holder_name,
        COALESCE(account_number,'')      AS account_number,
        COALESCE(ifsc_code,'')           AS ifsc_code,
        COALESCE(bank_name,'')           AS bank_name,
        COALESCE(branch_name,'')         AS branch_name,
        CAST(COALESCE(salary,0) AS STRING)          AS salary,
        CAST(COALESCE(allowances,0) AS STRING)      AS allowances,
        CAST(COALESCE(deductions,0) AS STRING)      AS deductions,
        CAST(COALESCE(ot_payment,0) AS STRING)      AS ot_payment,
        CAST(COALESCE(per_day_salary,0) AS STRING)  AS per_day_salary,
        CAST(COALESCE(deducted_days,0) AS STRING)   AS deducted_days,
        CAST(COALESCE(net_salary_paid,0) AS STRING) AS net_salary_paid,
        CAST(COALESCE(payment_status,0) AS STRING)  AS payment_status,
        CAST(COALESCE(ticket_status,0) AS STRING)   AS ticket_status,
        CAST(date_n_time AS STRING)                  AS date_n_time,
        COALESCE(CAST(payment_date_n_time AS STRING),'') AS payment_date_n_time
      FROM \`${T}.newultimez_team_tbl_employees_bank_details_paid\`
      WHERE employee_row_id = ${empId}
      ORDER BY date_n_time DESC
    `),

    bqQuery<Record<string,string>>(`
      SELECT
        CAST(id AS STRING) AS id,
        COALESCE(account_holder_name,'') AS account_holder_name,
        COALESCE(account_number,'')      AS account_number,
        COALESCE(ifsc_code,'')           AS ifsc_code,
        COALESCE(bank_name,'')           AS bank_name,
        COALESCE(branch_name,'')         AS branch_name,
        CAST(date_n_time AS STRING)      AS date_n_time
      FROM \`${T}.newultimez_team_tbl_employees_bank_details\`
      WHERE employee_row_id = ${empId}
      LIMIT 1
    `),

    bqQuery<Record<string,string>>(`
      SELECT
        CAST(id AS STRING) AS id,
        COALESCE(account_holder_name,'') AS account_holder_name,
        COALESCE(account_number,'')      AS account_number,
        COALESCE(ifsc_code,'')           AS ifsc_code,
        COALESCE(bank_name,'')           AS bank_name,
        COALESCE(branch_name,'')         AS branch_name,
        CAST(COALESCE(approval_status,0) AS STRING) AS approval_status,
        COALESCE(reason_for_reject,'')   AS reason_for_reject,
        CAST(date_n_time AS STRING)      AS date_n_time
      FROM \`${T}.newultimez_team_tbl_employees_bank_details_logs\`
      WHERE employee_row_id = ${empId}
      ORDER BY date_n_time DESC
    `),

    // ── IT Services ──────────────────────────────────────────────
    bqQuery<Record<string,string>>(`
      SELECT
        CAST(q.id AS STRING) AS id,
        COALESCE(dev.device_name,'')    AS device_name,
        COALESCE(dev.computer_name,'')  AS computer_name,
        CAST(COALESCE(q.request_type,0) AS STRING)   AS request_type,
        COALESCE(q.problem_id,'')       AS problem_id,
        COALESCE(q.accessory_id,'')     AS accessory_id,
        COALESCE(q.contact,'')          AS contact,
        COALESCE(q.note,'')             AS note,
        CAST(COALESCE(q.quantity_required,0) AS STRING) AS quantity_required,
        COALESCE(CAST(q.expected_date AS STRING),'')    AS expected_date,
        COALESCE(q.upload_video,'')                      AS upload_video,
        COALESCE(q.uploaded_resolved_video,'')           AS uploaded_resolved_video,
        CAST(COALESCE(q.status,0) AS STRING)             AS status,
        COALESCE(q.status_comment,'')                    AS status_comment,
        COALESCE(q.other_problem,'')                     AS other_problem,
        COALESCE(q.other_accessory,'')                   AS other_accessory,
        COALESCE(resolver.full_name,'')                  AS resolved_by_name,
        CAST(q.created_date_n_time AS STRING)            AS created_date_n_time,
        COALESCE(CAST(q.updated_date_n_time AS STRING),'') AS updated_date_n_time
      FROM \`${T}.newultimez_team_tbl_system_admin_query_details\` q
      LEFT JOIN \`${T}.newultimez_team_tbl_system_admin_device_details\` dev ON dev.id = q.device_row_id
      LEFT JOIN \`${T}.newultimez_team_tbl_employees\` resolver ON resolver.id = q.status_updated_employee_row_id
      WHERE q.employee_row_id = ${empId}
      ORDER BY q.created_date_n_time DESC
    `),

    bqQuery<Record<string,string>>(`
      SELECT
        CAST(l.id AS STRING) AS id,
        CAST(l.query_id AS STRING) AS query_id,
        COALESCE(emp.full_name,'') AS employee_name,
        CAST(COALESCE(l.query_status,0) AS STRING) AS query_status,
        COALESCE(l.comments,'')   AS comments,
        COALESCE(l.upload_video,'') AS upload_video,
        CAST(l.date_n_time AS STRING) AS date_n_time
      FROM \`${T}.newultimez_team_tbl_system_admin_query_details_logs\` l
      JOIN \`${T}.newultimez_team_tbl_system_admin_query_details\` q ON q.id = l.query_id
      LEFT JOIN \`${T}.newultimez_team_tbl_employees\` emp ON emp.id = l.employee_row_id
      WHERE q.employee_row_id = ${empId}
      ORDER BY l.date_n_time DESC
    `),

    bqQuery<Record<string,string>>(`
      SELECT
        CAST(id AS STRING) AS id,
        CAST(COALESCE(device_type,0) AS STRING)  AS device_type,
        COALESCE(device_name,'')                  AS device_name,
        COALESCE(computer_name,'')                AS computer_name,
        CAST(COALESCE(ram,0) AS STRING)           AS ram,
        COALESCE(hard_disk,'')                    AS hard_disk,
        COALESCE(processor_details,'')            AS processor_details,
        COALESCE(graphic_card,'')                 AS graphic_card,
        COALESCE(monitor,'')                      AS monitor,
        COALESCE(monitor_size,'')                 AS monitor_size,
        COALESCE(os_version,'')                   AS os_version,
        COALESCE(CAST(os_last_updated_date AS STRING),'') AS os_last_updated_date,
        CAST(COALESCE(monitoring,0) AS STRING)    AS monitoring,
        CAST(COALESCE(antivirus,0) AS STRING)     AS antivirus,
        COALESCE(antivirus_name,'')               AS antivirus_name,
        COALESCE(CAST(antivirus_expiry_date AS STRING),'') AS antivirus_expiry_date,
        CAST(COALESCE(device_status,0) AS STRING) AS device_status,
        COALESCE(CAST(device_provided_date AS STRING),'') AS device_provided_date,
        COALESCE(CAST(return_date AS STRING),'')  AS return_date
      FROM \`${T}.newultimez_team_tbl_system_admin_device_details\`
      WHERE employee_row_id = ${empId}
      LIMIT 1
    `),
  ])

  const payslips    = payslipsResult.status     === 'fulfilled' ? payslipsResult.value     as unknown as PayslipRow[]    : []
  const bankArr     = bankAccountResult.status  === 'fulfilled' ? bankAccountResult.value  as unknown as BankAccountRow[] : []
  const itQueries   = itQueriesResult.status    === 'fulfilled' ? itQueriesResult.value    as unknown as ITQueryRow[]    : []
  const itLogs      = itQueryLogsResult.status  === 'fulfilled' ? itQueryLogsResult.value  as unknown as ITQueryLogRow[] : []
  const deviceArr   = deviceResult.status       === 'fulfilled' ? deviceResult.value       as unknown as DeviceRow[]     : []

  return (
    <EmployeeBackOfficePage
      session={session}
      initialTab={tab}
      leaves={leavesResult.status       === 'fulfilled' ? leavesResult.value       as unknown as LeaveRow[]       : []}
      leaveTypes={leaveTypesResult.status === 'fulfilled' ? leaveTypesResult.value  as unknown as LeaveType[]     : []}
      holidays={holidaysResult.status   === 'fulfilled' ? holidaysResult.value     as unknown as HolidayRow[]     : []}
      payslips={payslips}
      bankAccount={bankArr[0] ?? null}
      bankLogs={bankLogsResult.status   === 'fulfilled' ? bankLogsResult.value     as unknown as BankLogRow[]     : []}
      itQueries={itQueries}
      itQueryLogs={itLogs}
      device={deviceArr[0] ?? null}
    />
  )
}