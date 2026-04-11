// src/app/api/reports/route.ts
// Full TypeScript port of /api/reports.js
// Handles: GET (list), POST (create/update via MERGE), DELETE (soft delete)

import { NextRequest, NextResponse } from 'next/server'
import { getBigQuery, ensureReportsTable, REPORTS_TABLE } from '@/lib/bigquery'
import { isAdmin, isEmployee } from '@/lib/auth'
import type { SaveReportBody } from '@/types/api'

// ─────────────────────────────────────────────
// BLOCKED SQL KEYWORDS (from original api/reports.js)
// ─────────────────────────────────────────────
const BLOCKED_KEYWORDS = ['DROP ', 'DELETE ', 'TRUNCATE ', 'ALTER ', 'GRANT ']

// ─────────────────────────────────────────────
// GET /api/reports — list all active reports
// Accessible by admins and employees
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isEmployee(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const bq = getBigQuery()
    await ensureReportsTable(bq)

    const [rows] = await bq.query({
      query: `
        SELECT id, name, description, category, sql_query, created_by, created_at, sort_order
        FROM \`${REPORTS_TABLE}\`
        WHERE is_active = TRUE
        ORDER BY sort_order ASC, created_at DESC
      `,
      location: 'US',
    })

    return NextResponse.json({ success: true, reports: rows })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────
// POST /api/reports — create or update (MERGE)
// Admin only
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  let body: SaveReportBody
  try {
    body = await req.json() as SaveReportBody
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { id, name, description, sql_query, category, sort_order } = body

  if (!name || !sql_query) {
    return NextResponse.json(
      { success: false, error: 'Name and sql_query are required' },
      { status: 400 }
    )
  }

  // SQL safety check — block destructive statements
  const upper = sql_query.toUpperCase()
  for (const kw of BLOCKED_KEYWORDS) {
    if (upper.includes(kw)) {
      return NextResponse.json(
        { success: false, error: `Blocked: ${kw.trim()} not allowed in queries` },
        { status: 403 }
      )
    }
  }

  const reportId = id ?? `report_${Date.now()}`

  try {
    const bq = getBigQuery()
    await ensureReportsTable(bq)

    // MERGE = insert-or-update — exact match of original JS
    await bq.query({
      query: `
        MERGE \`${REPORTS_TABLE}\` AS target
        USING (SELECT @id AS id) AS source ON target.id = source.id
        WHEN MATCHED THEN UPDATE SET
          name        = @name,
          description = @description,
          sql_query   = @sql_query,
          category    = @category,
          sort_order  = @sort_order,
          updated_at  = CURRENT_TIMESTAMP()
        WHEN NOT MATCHED THEN INSERT (id, name, description, sql_query, category, sort_order)
          VALUES (@id, @name, @description, @sql_query, @category, @sort_order)
      `,
      params: {
        id:          reportId,
        name,
        description: description ?? '',
        sql_query,
        category:    category ?? 'General',
        sort_order:  sort_order ?? 0,
      },
      location: 'US',
    })

    return NextResponse.json({ success: true, id: reportId, message: 'Report saved' })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────
// DELETE /api/reports — soft delete (is_active = FALSE)
// Admin only
// ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  let body: { id: string }
  try {
    body = await req.json() as { id: string }
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ success: false, error: 'Report ID required' }, { status: 400 })
  }

  try {
    const bq = getBigQuery()

    await bq.query({
      query: `UPDATE \`${REPORTS_TABLE}\` SET is_active = FALSE WHERE id = @id`,
      params: { id: body.id },
      location: 'US',
    })

    return NextResponse.json({ success: true, message: 'Report deleted' })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────
// OPTIONS — CORS preflight
// ─────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
