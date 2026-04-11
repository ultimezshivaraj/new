// src/app/api/admin/back-office/payroll/route.ts
// Redis cache: admin:backoffice:payroll:v1 — 15 min TTL
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import { redisGet, redisSet } from '@/lib/redis'

const T   = `${PROJECT}.${TEAM_DATASET}`
const KEY = 'admin:backoffice:payroll:v1'
const TTL = 15 * 60

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cached = await redisGet<unknown>(KEY)
  if (cached) return NextResponse.json({ success: true, ...(cached as object), cached: true })

  try {
    const [records, summary, bankAccounts, bankLogs] = await Promise.all([

      // ── Payroll Records ──────────────────────────────────────
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(p.id AS STRING)                                      AS id,
          CAST(p.employee_row_id AS STRING)                        AS employee_row_id,
          COALESCE(emp.full_name, '')                              AS employee_name,
          COALESCE(emp.position, '')                               AS position,
          COALESCE(p.account_holder_name, '')                      AS account_holder_name,
          COALESCE(p.account_number, '')                           AS account_number,
          COALESCE(p.ifsc_code, '')                                AS ifsc_code,
          COALESCE(p.bank_name, '')                                AS bank_name,
          COALESCE(p.branch_name, '')                              AS branch_name,
          CAST(COALESCE(p.salary, 0) AS STRING)                   AS salary,
          CAST(COALESCE(p.allowances, 0) AS STRING)               AS allowances,
          CAST(COALESCE(p.deductions, 0) AS STRING)               AS deductions,
          CAST(COALESCE(p.ot_payment, 0) AS STRING)               AS ot_payment,
          CAST(COALESCE(p.per_day_salary, 0) AS STRING)           AS per_day_salary,
          CAST(COALESCE(p.deducted_days, 0) AS STRING)            AS deducted_days,
          CAST(COALESCE(p.net_salary_paid, 0) AS STRING)          AS net_salary_paid,
          CAST(COALESCE(p.payment_status, 0) AS STRING)           AS payment_status,
          CAST(COALESCE(p.ticket_status, 0) AS STRING)            AS ticket_status,
          CAST(p.date_n_time AS STRING)                            AS date_n_time,
          COALESCE(CAST(p.payment_date_n_time AS STRING), '')      AS payment_date_n_time
        FROM \`${T}.newultimez_team_tbl_employees_bank_details_paid\` p
        LEFT JOIN \`${T}.newultimez_team_tbl_employees\` emp ON emp.id = p.employee_row_id
        ORDER BY p.date_n_time DESC
        LIMIT 500
      `),

      // ── Summary stats ────────────────────────────────────────
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(COUNT(*) AS STRING)                                          AS total_records,
          CAST(COUNT(DISTINCT employee_row_id) AS STRING)                  AS total_employees,
          CAST(ROUND(SUM(COALESCE(salary, 0)), 2) AS STRING)              AS total_salary,
          CAST(ROUND(SUM(COALESCE(allowances, 0)), 2) AS STRING)          AS total_allowances,
          CAST(ROUND(SUM(COALESCE(deductions, 0)), 2) AS STRING)          AS total_deductions,
          CAST(ROUND(SUM(COALESCE(ot_payment, 0)), 2) AS STRING)          AS total_ot_payment,
          CAST(ROUND(SUM(COALESCE(net_salary_paid, 0)), 2) AS STRING)     AS total_net_paid,
          CAST(COUNTIF(COALESCE(payment_status, 0) = 0) AS STRING)        AS pending_count,
          CAST(COUNTIF(COALESCE(payment_status, 0) = 1) AS STRING)        AS paid_count
        FROM \`${T}.newultimez_team_tbl_employees_bank_details_paid\`
      `),

      // ── Bank Accounts ────────────────────────────────────────
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(b.id AS STRING)                          AS id,
          CAST(b.employee_row_id AS STRING)            AS employee_row_id,
          COALESCE(emp.full_name, '')                  AS employee_name,
          COALESCE(emp.position, '')                   AS position,
          COALESCE(b.account_holder_name, '')          AS account_holder_name,
          COALESCE(b.account_number, '')               AS account_number,
          COALESCE(b.ifsc_code, '')                    AS ifsc_code,
          COALESCE(b.bank_name, '')                    AS bank_name,
          COALESCE(b.branch_name, '')                  AS branch_name,
          CAST(b.date_n_time AS STRING)                AS date_n_time
        FROM \`${T}.newultimez_team_tbl_employees_bank_details\` b
        LEFT JOIN \`${T}.newultimez_team_tbl_employees\` emp ON emp.id = b.employee_row_id
        ORDER BY emp.full_name ASC
      `),

      // ── Bank Change Logs ─────────────────────────────────────
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(l.id AS STRING)                              AS id,
          CAST(l.employee_row_id AS STRING)                AS employee_row_id,
          COALESCE(emp.full_name, '')                      AS employee_name,
          COALESCE(emp.position, '')                       AS position,
          COALESCE(l.account_holder_name, '')              AS account_holder_name,
          COALESCE(l.account_number, '')                   AS account_number,
          COALESCE(l.ifsc_code, '')                        AS ifsc_code,
          COALESCE(l.bank_name, '')                        AS bank_name,
          COALESCE(l.branch_name, '')                      AS branch_name,
          CAST(COALESCE(l.approval_status, 0) AS STRING)  AS approval_status,
          COALESCE(l.reason_for_reject, '')               AS reason_for_reject,
          CAST(l.date_n_time AS STRING)                    AS date_n_time
        FROM \`${T}.newultimez_team_tbl_employees_bank_details_logs\` l
        LEFT JOIN \`${T}.newultimez_team_tbl_employees\` emp ON emp.id = l.employee_row_id
        ORDER BY l.date_n_time DESC
      `),
    ])

    const payload = { records, summary: summary[0] ?? {}, bankAccounts, bankLogs }
    await redisSet(KEY, payload, TTL)
    return NextResponse.json({ success: true, ...payload, cached: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[back-office/payroll]', msg)
    return NextResponse.json({ error: 'Failed to fetch payroll data', detail: msg }, { status: 500 })
  }
}
