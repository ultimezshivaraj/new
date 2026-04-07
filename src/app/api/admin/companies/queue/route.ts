// src/app/api/admin/companies/queue/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest }        from '@/lib/adminAuth'
import { bqQuery, PROJECT, DS_APP }  from '@/lib/bigquery'
 
const STAGING_TABLE = `${PROJECT}.${DS_APP}.Companies_Analyst_AGENT`
 
export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')     || 'pending'
  const section    = searchParams.get('section')    || null
  const company_id = searchParams.get('company_id') || null
  const run_id     = searchParams.get('run_id')     || null
  const limit      = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
 
  const t0 = Date.now()
 
  try {
    const conditions: string[] = []
    if (status && status !== 'all') conditions.push(`status = '${status.replace(/'/g, "''")}'`)
    if (section)    conditions.push(`section    = '${section.replace(/'/g, "''")}'`)
    if (company_id) conditions.push(`company_id = '${company_id.replace(/'/g, "''")}'`)
    if (run_id)     conditions.push(`run_id     = '${run_id.replace(/'/g, "''")}'`)
    const WHERE = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
 
    const [summaryRows, rows, companySummaryRows] = await Promise.all([
 
      // 1. Overall summary stats
      bqQuery<Record<string, string>>(`
        SELECT
          COUNT(*)                        AS total_rows,
          COUNTIF(status = 'pending')     AS pending,
          COUNTIF(status = 'approved')    AS approved,
          COUNTIF(status = 'rejected')    AS rejected,
          COUNTIF(status = 'edited')      AS edited,
          COUNTIF(status = 'merged')      AS merged,
          COUNTIF(section = 'about')      AS section_about,
          COUNTIF(section = 'details')    AS section_details,
          COUNTIF(section = 'funding')    AS section_funding,
          COUNTIF(section = 'team')       AS section_team,
          COUNTIF(section = 'products')   AS section_products,
          ROUND(AVG(confidence), 3)       AS avg_confidence,
          COUNT(DISTINCT company_id)      AS companies_count,
          COUNT(DISTINCT run_id)          AS total_runs,
          MAX(created_at)                 AS last_run_at
        FROM \`${STAGING_TABLE}\`
        ${WHERE}
      `),
 
      // 2. Individual rows
      bqQuery<Record<string, string>>(`
        SELECT
          id, company_id, company_name, company_url, section, field_name,
          current_value, agent_value,
          TO_JSON_STRING(agent_data) AS agent_data,
          source_url, source_name, confidence, status,
          reviewed_by, final_value, review_notes,
          CASE WHEN reviewed_at IS NULL THEN NULL
            ELSE FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', reviewed_at) END AS reviewed_at,
          FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', created_at) AS created_at,
          agent_version, run_id
        FROM \`${STAGING_TABLE}\`
        ${WHERE}
        ORDER BY company_name ASC, section ASC, created_at DESC
        LIMIT ${limit}
      `),
 
      // 3. Per-company summary
      bqQuery<Record<string, string>>(`
        SELECT
          company_id, company_name, company_url,
          COUNT(*)                     AS total_rows,
          COUNTIF(status = 'pending')  AS pending,
          COUNTIF(status = 'approved') AS approved,
          COUNTIF(status = 'rejected') AS rejected,
          COUNTIF(status = 'edited')   AS edited,
          COUNTIF(status = 'merged')   AS merged,
          COUNT(DISTINCT section)      AS sections_enriched,
          ROUND(AVG(confidence), 3)    AS avg_confidence,
          FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', MAX(created_at)) AS last_enriched_at
        FROM \`${STAGING_TABLE}\`
        ${WHERE}
        GROUP BY company_id, company_name, company_url
        ORDER BY pending DESC, company_name ASC
      `),
    ])
 
    const summary = summaryRows[0] || {}
 
    // Parse agent_data JSON string → object
    const parsedRows = rows.map(r => ({
      ...r,
      agent_data: (() => {
        if (!r.agent_data) return null
        try { return JSON.parse(r.agent_data) } catch { return null }
      })(),
    }))
 
    return NextResponse.json({
      success:  true,
      duration: `${((Date.now() - t0) / 1000).toFixed(2)}s`,
      filters:  { section, status, company_id, run_id, limit },
      summary: {
        total_rows:      Number(summary.total_rows)      || 0,
        pending:         Number(summary.pending)         || 0,
        approved:        Number(summary.approved)        || 0,
        rejected:        Number(summary.rejected)        || 0,
        edited:          Number(summary.edited)          || 0,
        merged:          Number(summary.merged)          || 0,
        companies_count: Number(summary.companies_count) || 0,
        total_runs:      Number(summary.total_runs)      || 0,
        avg_confidence:  Number(summary.avg_confidence)  || 0,
        last_run_at:     summary.last_run_at             || null,
        sections: {
          about:    Number(summary.section_about)    || 0,
          details:  Number(summary.section_details)  || 0,
          funding:  Number(summary.section_funding)  || 0,
          team:     Number(summary.section_team)     || 0,
          products: Number(summary.section_products) || 0,
        },
      },
      companies: companySummaryRows.map(c => ({
        company_id:        c.company_id,
        company_name:      c.company_name,
        company_url:       c.company_url || null,
        profile_url:       `https://coinpedia.org/company/${c.company_url || ''}/`,
        total_rows:        Number(c.total_rows)        || 0,
        pending:           Number(c.pending)           || 0,
        approved:          Number(c.approved)          || 0,
        rejected:          Number(c.rejected)          || 0,
        edited:            Number(c.edited)            || 0,
        merged:            Number(c.merged)            || 0,
        sections_enriched: Number(c.sections_enriched) || 0,
        avg_confidence:    Number(c.avg_confidence)    || 0,
        last_enriched_at:  c.last_enriched_at          || null,
      })),
      rows: parsedRows,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}