// src/app/api/admin/back-office/leave/route.ts
// Redis cache: admin:backoffice:leave:v1 — 10 min TTL
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import { redisGet, redisSet } from '@/lib/redis'

const T   = `${PROJECT}.${TEAM_DATASET}`
const KEY = 'admin:backoffice:leave:v1'
const TTL = 10 * 60

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cached = await redisGet<unknown>(KEY)
  if (cached) return NextResponse.json({ success: true, ...(cached as object), cached: true })

  try {
    const [leaves, leaveTypes, summary] = await Promise.all([
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(l.id AS STRING)                                       AS id,
          CAST(l.employee_row_id AS STRING)                         AS employee_row_id,
          COALESCE(emp.full_name, '')                               AS employee_name,
          COALESCE(emp.position, '')                                AS position,
          COALESCE(emp.profile_image, '')                           AS profile_image,
          COALESCE(l.leave_type, '')                                AS leave_type,
          COALESCE(l.day_type, '')                                  AS day_type,
          CAST(COALESCE(l.leave_type_row_id, 0) AS STRING)         AS leave_type_row_id,
          COALESCE(lt.type, '')                                     AS leave_type_name,
          COALESCE(CAST(l.from_date AS STRING), '')                 AS from_date,
          COALESCE(CAST(l.to_date AS STRING), '')                   AS to_date,
          COALESCE(CAST(l.first_half_date AS STRING), '')           AS first_half_date,
          COALESCE(CAST(l.second_half_date AS STRING), '')          AS second_half_date,
          CAST(COALESCE(l.applied_leaves, 0) AS STRING)            AS applied_leaves,
          CAST(COALESCE(l.extra_leaves, 0) AS STRING)              AS extra_leaves,
          CAST(COALESCE(l.team_lead_approval_status, 0) AS STRING) AS team_lead_approval_status,
          COALESCE(tl.full_name, '')                                AS team_lead_name,
          COALESCE(l.leader_comments, '')                           AS leader_comments,
          CAST(COALESCE(l.approval_status, 0) AS STRING)           AS approval_status,
          COALESCE(hr.full_name, '')                                AS hr_name,
          COALESCE(l.hr_comments, '')                               AS hr_comments,
          COALESCE(l.other_leave_type, '')                          AS other_leave_type,
          CAST(COALESCE(l.wfh_leave_type, 0) AS STRING)            AS wfh_leave_type,
          CAST(l.date_n_time AS STRING)                             AS date_n_time,
          COALESCE(CAST(l.compensation_date AS STRING), '')         AS compensation_date,
          COALESCE(CAST(l.compensation_to AS STRING), '')           AS compensation_to
        FROM \`${T}.newultimez_team_tbl_leaves\` l
        LEFT JOIN \`${T}.newultimez_team_tbl_employees\` emp  ON emp.id = l.employee_row_id
        LEFT JOIN \`${T}.newultimez_team_tbl_leave_types\` lt ON lt.id  = l.leave_type_row_id
        LEFT JOIN \`${T}.newultimez_team_tbl_employees\` tl   ON tl.id  = l.lead_employee_row_id
        LEFT JOIN \`${T}.newultimez_team_tbl_employees\` hr   ON hr.id  = l.hr_employee_row_id
        ORDER BY l.date_n_time DESC
        LIMIT 500
      `),
      bqQuery<Record<string, string>>(`
        SELECT CAST(id AS STRING) AS id, COALESCE(type, '') AS type
        FROM \`${T}.newultimez_team_tbl_leave_types\`
        ORDER BY id ASC
      `),
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(COUNT(*) AS STRING)                                                                    AS total_requests,
          CAST(ROUND(SUM(COALESCE(applied_leaves, 0)), 1) AS STRING)                                AS total_days,
          CAST(COUNT(DISTINCT COALESCE(leave_type,'')) AS STRING)                                   AS apply_type_count,
          CAST(COUNT(DISTINCT COALESCE(CAST(leave_type_row_id AS STRING),'')) AS STRING)            AS request_type_count,
          CAST(ROUND(SUM(COALESCE(extra_leaves, 0)), 1) AS STRING)                                  AS total_lop_days,
          CAST(COUNTIF(COALESCE(approval_status, 0) = 0) AS STRING)                                AS pending_hr,
          CAST(COUNTIF(COALESCE(team_lead_approval_status, 0) = 0) AS STRING)                      AS pending_tl,
          CAST(COUNTIF(COALESCE(approval_status,0)=0 AND COALESCE(team_lead_approval_status,0)=1) AS STRING) AS awaiting_hr_only
        FROM \`${T}.newultimez_team_tbl_leaves\`
      `),
    ])
    const payload = { leaves, leaveTypes, summary: summary[0] ?? {} }
    await redisSet(KEY, payload, TTL)
    return NextResponse.json({ success: true, ...payload, cached: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[back-office/leave]', msg)
    return NextResponse.json({ error: 'Failed to fetch leave data', detail: msg }, { status: 500 })
  }
}
