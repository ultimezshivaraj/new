// src/app/api/employee/tool-request/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getBigQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import { randomUUID } from 'crypto'

const DS = TEAM_DATASET

export async function POST(req: NextRequest) {
  const session = await getSession('employee')
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { domain_or_app, is_app, reason } = await req.json()
  if (!domain_or_app?.trim()) return NextResponse.json({ error: 'domain_or_app required' }, { status: 400 })
  if (!reason?.trim())        return NextResponse.json({ error: 'reason required' }, { status: 400 })

  const empId = parseInt(session.id)
  const bq    = getBigQuery()

  try {
    // Check existing pending
    const [existing] = await bq.query({
      query: `SELECT request_id FROM \`${PROJECT}.${DS}.qd_tool_requests\` WHERE agent_id = @empId AND domain_or_app = @domain AND status = 'pending' LIMIT 1`,
      params: { empId, domain: domain_or_app.trim() }, location: 'us-central1',
    })
    if (existing.length) return NextResponse.json({ error: 'You already have a pending request for this' }, { status: 409 })

    const requestId = randomUUID()
    await bq.query({
      query: `INSERT INTO \`${PROJECT}.${DS}.qd_tool_requests\` (request_id, agent_id, agent_name, department_id, department_name, domain_or_app, is_app, reason, status, admin_note, requested_at, reviewed_at, reviewed_by) VALUES (@requestId, @empId, @agentName, NULL, '', @domain, @isApp, @reason, 'pending', '', CURRENT_TIMESTAMP(), NULL, NULL)`,
      params: { requestId, empId, agentName: session.name || '', domain: domain_or_app.trim(), isApp: Boolean(is_app), reason: reason.trim() },
      location: 'us-central1',
    })

    return NextResponse.json({ success: true, request_id: requestId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[employee/tool-request POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession('employee')
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const empId = parseInt(session.id)
  const bq    = getBigQuery()

  try {
    const [rows] = await bq.query({
      query: `SELECT request_id, domain_or_app, is_app, reason, status, admin_note, CAST(requested_at AS STRING) AS requested_at, CAST(reviewed_at AS STRING) AS reviewed_at FROM \`${PROJECT}.${DS}.qd_tool_requests\` WHERE agent_id = @empId ORDER BY requested_at DESC LIMIT 50`,
      params: { empId }, location: 'us-central1',
    })
    return NextResponse.json({ requests: rows })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
