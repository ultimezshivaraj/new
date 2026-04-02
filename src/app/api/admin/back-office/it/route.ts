// src/app/api/admin/back-office/it/route.ts
// Redis cache: admin:backoffice:it:v1 — 10 min TTL
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import { redisGet, redisSet } from '@/lib/redis'

const T   = `${PROJECT}.${TEAM_DATASET}`
const KEY = 'admin:backoffice:it:v1'
const TTL = 10 * 60

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cached = await redisGet<unknown>(KEY)
  if (cached) return NextResponse.json({ success: true, ...(cached as object), cached: true })

  try {
    const [queries, querySummary, queryLogs, devices, deviceLogs] = await Promise.all([

      // ── System Queries ───────────────────────────────────────
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(q.id AS STRING)                                          AS id,
          CAST(q.employee_row_id AS STRING)                            AS employee_row_id,
          COALESCE(emp.full_name, '')                                   AS employee_name,
          COALESCE(emp.position, '')                                    AS position,
          CAST(COALESCE(q.device_row_id, 0) AS STRING)                AS device_row_id,
          COALESCE(dev.device_name, '')                                 AS device_name,
          COALESCE(dev.computer_name, '')                               AS computer_name,
          CAST(COALESCE(q.request_type, 0) AS STRING)                 AS request_type,
          COALESCE(q.problem_id, '')                                    AS problem_id,
          COALESCE(q.accessory_id, '')                                  AS accessory_id,
          COALESCE(q.contact, '')                                       AS contact,
          COALESCE(q.note, '')                                          AS note,
          CAST(COALESCE(q.quantity_required, 0) AS STRING)            AS quantity_required,
          COALESCE(CAST(q.expected_date AS STRING), '')                AS expected_date,
          COALESCE(q.upload_video, '')                                  AS upload_video,
          COALESCE(q.uploaded_resolved_video, '')                       AS uploaded_resolved_video,
          CAST(COALESCE(q.status, 0) AS STRING)                       AS status,
          COALESCE(q.status_comment, '')                                AS status_comment,
          COALESCE(q.other_problem, '')                                 AS other_problem,
          COALESCE(q.other_accessory, '')                               AS other_accessory,
          CAST(COALESCE(q.status_updated_employee_row_id, 0) AS STRING) AS status_updated_employee_row_id,
          COALESCE(resolver.full_name, '')                              AS resolved_by_name,
          CAST(q.created_date_n_time AS STRING)                        AS created_date_n_time,
          COALESCE(CAST(q.updated_date_n_time AS STRING), '')          AS updated_date_n_time
        FROM \`${T}.newultimez_team_tbl_system_admin_query_details\` q
        LEFT JOIN \`${T}.newultimez_team_tbl_employees\` emp
          ON emp.id = q.employee_row_id
        LEFT JOIN \`${T}.newultimez_team_tbl_system_admin_device_details\` dev
          ON dev.id = q.device_row_id
        LEFT JOIN \`${T}.newultimez_team_tbl_employees\` resolver
          ON resolver.id = q.status_updated_employee_row_id
        ORDER BY q.created_date_n_time DESC
      `),

      // ── Query Summary ────────────────────────────────────────
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(COUNT(*) AS STRING)                              AS total,
          CAST(COUNTIF(COALESCE(status,0) = 0) AS STRING)     AS pending,
          CAST(COUNTIF(COALESCE(status,0) = 1) AS STRING)     AS solved,
          CAST(COUNTIF(COALESCE(status,0) = 2) AS STRING)     AS rejected,
          CAST(COUNTIF(COALESCE(request_type,0) = 1) AS STRING) AS system_issues,
          CAST(COUNTIF(COALESCE(request_type,0) = 2) AS STRING) AS accessory_requests
        FROM \`${T}.newultimez_team_tbl_system_admin_query_details\`
      `),

      // ── Query Status Logs ────────────────────────────────────
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(l.id AS STRING)                              AS id,
          CAST(l.query_id AS STRING)                       AS query_id,
          CAST(l.employee_row_id AS STRING)                AS employee_row_id,
          COALESCE(emp.full_name, '')                      AS employee_name,
          CAST(COALESCE(l.query_status, 0) AS STRING)     AS query_status,
          COALESCE(l.upload_video, '')                     AS upload_video,
          COALESCE(l.comments, '')                         AS comments,
          CAST(l.date_n_time AS STRING)                    AS date_n_time
        FROM \`${T}.newultimez_team_tbl_system_admin_query_details_logs\` l
        LEFT JOIN \`${T}.newultimez_team_tbl_employees\` emp ON emp.id = l.employee_row_id
        ORDER BY l.date_n_time DESC
      `),

      // ── Device Inventory ─────────────────────────────────────
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(d.id AS STRING)                                          AS id,
          CAST(d.employee_row_id AS STRING)                            AS employee_row_id,
          COALESCE(emp.full_name, '')                                   AS employee_name,
          COALESCE(emp.position, '')                                    AS position,
          CAST(COALESCE(d.device_type, 0) AS STRING)                  AS device_type,
          COALESCE(d.device_name, '')                                   AS device_name,
          COALESCE(d.computer_name, '')                                 AS computer_name,
          CAST(COALESCE(d.ram, 0) AS STRING)                          AS ram,
          COALESCE(d.hard_disk, '')                                     AS hard_disk,
          COALESCE(d.processor_details, '')                             AS processor_details,
          COALESCE(d.graphic_card, '')                                  AS graphic_card,
          COALESCE(d.monitor, '')                                       AS monitor,
          COALESCE(d.monitor_size, '')                                  AS monitor_size,
          COALESCE(d.os_version, '')                                    AS os_version,
          COALESCE(CAST(d.os_last_updated_date AS STRING), '')         AS os_last_updated_date,
          CAST(COALESCE(d.monitoring, 0) AS STRING)                   AS monitoring,
          CAST(COALESCE(d.antivirus, 0) AS STRING)                    AS antivirus,
          COALESCE(d.antivirus_name, '')                               AS antivirus_name,
          COALESCE(CAST(d.antivirus_expiry_date AS STRING), '')        AS antivirus_expiry_date,
          CAST(COALESCE(d.device_status, 0) AS STRING)                AS device_status,
          COALESCE(CAST(d.device_provided_date AS STRING), '')         AS device_provided_date,
          COALESCE(CAST(d.return_date AS STRING), '')                  AS return_date,
          CAST(COALESCE(d.work_type, 0) AS STRING)                    AS work_type
        FROM \`${T}.newultimez_team_tbl_system_admin_device_details\` d
        LEFT JOIN \`${T}.newultimez_team_tbl_employees\` emp ON emp.id = d.employee_row_id
        ORDER BY emp.full_name ASC
      `),

      // ── Device Assignment Logs ───────────────────────────────
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(l.id AS STRING)                                    AS id,
          CAST(l.device_row_id AS STRING)                        AS device_row_id,
          COALESCE(dev.device_name, '')                           AS device_name,
          COALESCE(dev.computer_name, '')                         AS computer_name,
          CAST(l.employee_row_id AS STRING)                      AS employee_row_id,
          COALESCE(emp.full_name, '')                             AS employee_name,
          COALESCE(CAST(l.device_provided_date AS STRING), '')   AS device_provided_date,
          COALESCE(CAST(l.return_date AS STRING), '')             AS return_date,
          CAST(l.date_n_time AS STRING)                           AS date_n_time
        FROM \`${T}.newultimez_team_tbl_system_admin_device_details_logs\` l
        LEFT JOIN \`${T}.newultimez_team_tbl_system_admin_device_details\` dev ON dev.id = l.device_row_id
        LEFT JOIN \`${T}.newultimez_team_tbl_employees\` emp ON emp.id = l.employee_row_id
        ORDER BY l.date_n_time DESC
      `),
    ])

    const payload = { queries, querySummary: querySummary[0] ?? {}, queryLogs, devices, deviceLogs }
    await redisSet(KEY, payload, TTL)
    return NextResponse.json({ success: true, ...payload, cached: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[back-office/it]', msg)
    return NextResponse.json({ error: 'Failed to fetch IT data', detail: msg }, { status: 500 })
  }
}
