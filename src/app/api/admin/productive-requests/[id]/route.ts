// src/app/api/admin/productive-requests/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { getSession } from '@/lib/session'
import { getBigQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'

const DS = TEAM_DATASET

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, admin_note } = await req.json()
  if (!['approve', 'reject'].includes(action))
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })

  const { id: requestId } = await params
  const bq                = getBigQuery()
  const session           = await getSession('admin')
  const reviewedBy        = session?.name || 'Admin'

  try {
    // Get the request
    const [rows] = await bq.query({
      query: `SELECT * FROM \`${PROJECT}.${DS}.qd_tool_requests\` WHERE request_id = @requestId LIMIT 1`,
      params: { requestId }, location: 'us-central1',
    })
    if (!rows.length) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const request   = rows[0] as any
    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // Update status
    await bq.query({
      query: `UPDATE \`${PROJECT}.${DS}.qd_tool_requests\` SET status = @status, admin_note = @adminNote, reviewed_at = CURRENT_TIMESTAMP(), reviewed_by = @reviewedBy WHERE request_id = @requestId`,
      params: { status: newStatus, adminNote: admin_note || '', reviewedBy, requestId },
      location: 'us-central1',
    })

    // If approved → insert into qd_site_classifications
    if (action === 'approve') {
      const [existing] = await bq.query({
        query: `SELECT domain FROM \`${PROJECT}.${DS}.qd_site_classifications\` WHERE domain = @domain AND department_id IS NULL LIMIT 1`,
        params: { domain: request.domain_or_app }, location: 'us-central1',
      })
      if (!existing.length) {
        await bq.query({
          query: `INSERT INTO \`${PROJECT}.${DS}.qd_site_classifications\` (domain, category, department_id, added_by, added_at, note) VALUES (@domain, 'Productive', NULL, @addedBy, CURRENT_TIMESTAMP(), @note)`,
          params: { domain: request.domain_or_app, addedBy: reviewedBy, note: `Approved: ${request.reason}` },
          location: 'us-central1',
        })
      }
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[admin/productive-requests PUT]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
