// src/app/api/run-report/route.ts
// Full TypeScript port of /api/run-report.js
// Executes a saved report by ID with Upstash Redis caching

import { NextRequest, NextResponse } from 'next/server'
import { getBigQuery, detectLocation, PROJECT, DATASET } from '@/lib/bigquery'
import { isEmployee } from '@/lib/auth'
import { redisGet, redisSet, CACHE_TTL, DEFAULT_TTL } from '@/lib/redis'
import type { RunReportBody, RunReportResult } from '@/types/api'

// ─────────────────────────────────────────────
// POST /api/run-report
// Body: { reportId, limit?, fresh? }
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isEmployee(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: RunReportBody
  try {
    body = await req.json() as RunReportBody
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { reportId, limit, fresh } = body

  if (!reportId) {
    return NextResponse.json({ success: false, error: 'reportId is required' }, { status: 400 })
  }

  const effectiveLimit = parseInt(String(limit ?? 500)) || 500
  const cacheKey       = `report:${reportId}:${effectiveLimit}`
  const startTime      = Date.now()

  // ─────────────────────────────────────────
  // 1. CHECK CACHE (unless fresh=true)
  // ─────────────────────────────────────────
  if (!fresh) {
    const cached = await redisGet<RunReportResult & { cachedAt?: number }>(cacheKey)
    if (cached) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      return NextResponse.json({
        ...cached,
        duration:  `${duration}s`,
        cached:    true,
        cacheAge:  cached.cachedAt
          ? `${Math.round((Date.now() - cached.cachedAt) / 60000)}m ago`
          : 'unknown',
      })
    }
  }

  try {
    const bq = getBigQuery()

    // ─────────────────────────────────────────
    // 2. FETCH REPORT SQL FROM BIGQUERY
    // ─────────────────────────────────────────
    const [reports] = await bq.query({
      query: `
        SELECT sql_query, name, category
        FROM \`${PROJECT}.${DATASET}._dashboard_reports\`
        WHERE id = @id AND is_active = TRUE
      `,
      params: { id: reportId },
      location: 'US',
    })

    if (!reports.length) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
    }

    let sqlQuery          = (reports[0].sql_query as string).trim()
    const reportName     = reports[0].name     as string
    const reportCategory = (reports[0].category as string) || 'General'

    // Strip trailing semicolon
    if (sqlQuery.endsWith(';')) sqlQuery = sqlQuery.slice(0, -1).trim()

    // Append LIMIT if not already present and no UNION
    const upper = sqlQuery.toUpperCase()
    if (effectiveLimit && !upper.includes('UNION') && !upper.includes('LIMIT')) {
      sqlQuery += `\nLIMIT ${effectiveLimit}`
    }

    const location = detectLocation(sqlQuery)

    // ─────────────────────────────────────────
    // 3. EXECUTE QUERY
    // ─────────────────────────────────────────
    const [rows] = await bq.query({
      query:               sqlQuery,
      location,
      maximumBytesBilled:  '1000000000',
    })

    const columns  = rows.length > 0 ? Object.keys(rows[0]) : []
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    const result: RunReportResult = {
      success:    true,
      reportName,
      columns,
      rows:       rows.slice(0, effectiveLimit) as RunReportResult['rows'],
      rowCount:   rows.length,
      duration:   `${duration}s`,
      cached:     false,
    }

    // ─────────────────────────────────────────
    // 4. WRITE TO CACHE (fire-and-forget)
    // ─────────────────────────────────────────
    const ttl          = CACHE_TTL[reportCategory] ?? DEFAULT_TTL
    const cachePayload = { ...result, cachedAt: Date.now() }
    redisSet(cacheKey, cachePayload, ttl).catch(() => {})

    return NextResponse.json(result)

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    return NextResponse.json(
      { success: false, error: (error as Error).message, duration: `${duration}s` },
      { status: 400 }
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
