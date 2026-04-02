// src/app/api/admin/back-office/holidays/route.ts
// Redis cache: admin:backoffice:holidays:v1 — 6 hour TTL (rarely changes)
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import { redisGet, redisSet } from '@/lib/redis'

const T   = `${PROJECT}.${TEAM_DATASET}`
const KEY = 'admin:backoffice:holidays:v1'
const TTL = 6 * 60 * 60

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cached = await redisGet<unknown>(KEY)
  if (cached) return NextResponse.json({ success: true, ...(cached as object), cached: true })

  try {
    const holidays = await bqQuery<Record<string, string>>(`
      SELECT
        CAST(id AS STRING)                                              AS id,
        CAST(holiday_date AS STRING)                                    AS holiday_date,
        COALESCE(holiday_details, '')                                   AS holiday_details,
        FORMAT_DATE('%A', holiday_date)                                 AS day_name,
        CAST(EXTRACT(DAYOFWEEK FROM holiday_date) AS STRING)           AS day_of_week,
        CASE
          WHEN holiday_date = CURRENT_DATE('Asia/Kolkata') THEN 'today'
          WHEN holiday_date > CURRENT_DATE('Asia/Kolkata') THEN 'upcoming'
          ELSE 'past'
        END                                                             AS status,
        CAST(DATE_DIFF(holiday_date, CURRENT_DATE('Asia/Kolkata'), DAY) AS STRING) AS days_away
      FROM \`${T}.newultimez_team_tbl_holiday_details\`
      ORDER BY holiday_date ASC
    `)

    const payload = { holidays }
    await redisSet(KEY, payload, TTL)
    return NextResponse.json({ success: true, ...payload, cached: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[back-office/holidays]', msg)
    return NextResponse.json({ error: 'Failed to fetch holidays', detail: msg }, { status: 500 })
  }
}
