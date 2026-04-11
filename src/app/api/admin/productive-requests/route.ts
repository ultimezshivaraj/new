// src/app/api/admin/productive-requests/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { getBigQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'

const DS = TEAM_DATASET

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const p      = req.nextUrl.searchParams
  const status = p.get('status') || 'pending'
  const page   = Math.max(1, parseInt(p.get('page') || '1'))
  const limit  = 50
  const offset = (page - 1) * limit

  const bq = getBigQuery()

  try {
    let q = `
      SELECT request_id, agent_id, agent_name, department_name, domain_or_app, is_app,
             reason, status, admin_note,
             CAST(requested_at AS STRING) AS requested_at,
             CAST(reviewed_at  AS STRING) AS reviewed_at,
             reviewed_by
      FROM \`${PROJECT}.${DS}.qd_tool_requests\`
    `
    const params: any = { limit, offset }
    if (status !== 'all') { q += ' WHERE status = @status'; params.status = status }
    q += ' ORDER BY requested_at DESC LIMIT @limit OFFSET @offset'

    const [requests] = await bq.query({ query: q, params, location: 'us-central1' })

    const [counts] = await bq.query({
      query: `SELECT status, COUNT(*) AS cnt FROM \`${PROJECT}.${DS}.qd_tool_requests\` GROUP BY status`,
      location: 'us-central1',
    })
    const statusCounts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 }
    for (const row of counts as any[]) statusCounts[row.status] = Number(row.cnt)

    return NextResponse.json({ requests, statusCounts, page, limit })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[admin/productive-requests GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
