// src/app/api/admin/companies/review/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest }        from '@/lib/adminAuth'
import { bqQuery, PROJECT, DS_APP }  from '@/lib/bigquery'

const STAGING_TABLE = `${PROJECT}.${DS_APP}.Companies_Analyst_AGENT`

export async function POST(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const t0 = Date.now()

  try {
    const body         = await req.json()
    const action       = body.action       as string
    const id           = body.id           as string | undefined
    const ids          = body.ids          as string[] | undefined
    const company_id   = body.company_id   as string | undefined
    const section      = body.section      as string | undefined
    const reviewed_by  = (body.reviewed_by as string) || 'Admin'
    const final_value  = body.final_value  as string | undefined
    const review_notes = body.review_notes as string | undefined

    if (!action)
      return NextResponse.json({
        error: 'action is required',
        valid: ['approve', 'reject', 'edit', 'bulk_approve', 'bulk_reject', 'reset'],
      }, { status: 400 })

    let rows_updated = 0

    if (action === 'approve') {
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      rows_updated = await updateRows([id], 'approved', reviewed_by, null, null)

    } else if (action === 'reject') {
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      rows_updated = await updateRows([id], 'rejected', reviewed_by, review_notes ?? null, null)

    } else if (action === 'edit') {
      if (!id)          return NextResponse.json({ error: 'id required' }, { status: 400 })
      if (!final_value) return NextResponse.json({ error: 'final_value required' }, { status: 400 })
      rows_updated = await updateRows([id], 'edited', reviewed_by, review_notes ?? null, final_value)

    } else if (action === 'bulk_approve') {
      if (company_id)   rows_updated = await updateByCompany(company_id, section ?? null, 'approved', reviewed_by, null, null)
      else if (ids?.length) rows_updated = await updateRows(ids, 'approved', reviewed_by, null, null)
      else return NextResponse.json({ error: 'ids or company_id required' }, { status: 400 })

    } else if (action === 'bulk_reject') {
      if (company_id)   rows_updated = await updateByCompany(company_id, section ?? null, 'rejected', reviewed_by, review_notes ?? null, null)
      else if (ids?.length) rows_updated = await updateRows(ids, 'rejected', reviewed_by, review_notes ?? null, null)
      else return NextResponse.json({ error: 'ids or company_id required' }, { status: 400 })

    } else if (action === 'reset') {
      const resetIds = id ? [id] : ids
      if (!resetIds?.length) return NextResponse.json({ error: 'id or ids required' }, { status: 400 })
      rows_updated = await updateRows(resetIds, 'pending', null, null, null)

    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    return NextResponse.json({
      success:      true,
      action,
      rows_updated,
      reviewed_by,
      duration:     `${((Date.now() - t0) / 1000).toFixed(2)}s`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(v: unknown): string {
  if (v == null) return 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

async function updateRows(
  ids:          string[],
  status:       string,
  reviewed_by:  string | null,
  review_notes: string | null,
  final_value:  string | null,
): Promise<number> {
  if (!ids.length) return 0

  const idList = ids.map(i => `'${String(i).replace(/'/g, "''")}'`).join(', ')
  const rvAt   = status === 'pending' ? 'NULL' : 'CURRENT_TIMESTAMP()'

  // bqQuery handles DML — no bqInsert needed
  await bqQuery(`
    UPDATE \`${STAGING_TABLE}\`
    SET status       = ${esc(status)},
        reviewed_by  = ${esc(reviewed_by)},
        reviewed_at  = ${rvAt},
        review_notes = ${esc(review_notes)},
        final_value  = ${esc(final_value)}
    WHERE id IN (${idList})
      AND status != 'merged'
  `)

  return ids.length
}

async function updateByCompany(
  company_id:   string,
  section:      string | null,
  status:       string,
  reviewed_by:  string,
  review_notes: string | null,
  final_value:  string | null,
): Promise<number> {
  const secClause = section ? `AND section = ${esc(section)}` : ''

  await bqQuery(`
    UPDATE \`${STAGING_TABLE}\`
    SET status       = ${esc(status)},
        reviewed_by  = ${esc(reviewed_by)},
        reviewed_at  = CURRENT_TIMESTAMP(),
        review_notes = ${esc(review_notes)},
        final_value  = ${esc(final_value)}
    WHERE company_id = ${esc(company_id)}
      ${secClause}
      AND status NOT IN ('merged', ${esc(status)})
  `)

  // BigQuery DML doesn't return affected row count directly via this wrapper
  return 0
}