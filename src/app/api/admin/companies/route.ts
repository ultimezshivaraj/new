// src/app/api/admin/companies/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, DS_APP } from '@/lib/bigquery'

const LOCATION = 'us-central1'
const TBL_COMPANIES = `${PROJECT}.${DS_APP}.main_db_cln_company_lists`
const TBL_STAGING = `${PROJECT}.${DS_APP}.Companies_Analyst_AGENT`

export async function GET(req: NextRequest) {
    if (!await verifyAdminRequest(req))
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '50'))
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const sort = searchParams.get('sort') || 'priority'
    const offset = (page - 1) * limit

    const t0 = Date.now()

    try {
        const searchFilter = search
            ? `AND LOWER(JSON_VALUE(data,'$.company_name')) LIKE '%${search.replace(/'/g, "''")}%'`
            : ''

        let sortClause = 'ORDER BY enrichment_priority DESC'
        if (sort === 'score') sortClause = 'ORDER BY profile_score DESC'
        if (sort === 'views') sortClause = 'ORDER BY view_count DESC'
        if (sort === 'name') sortClause = 'ORDER BY company_name ASC'

        const mainQuery = `
      SELECT
        JSON_VALUE(data,'$._id')               AS company_id,
        JSON_VALUE(data,'$.company_name')       AS company_name,
        JSON_VALUE(data,'$.company_id')        AS company_url,
        JSON_VALUE(data,'$.website_link')       AS website,
        JSON_VALUE(data,'$.company_logo')      AS profile_image,
        JSON_VALUE(data,'$.primary_category')   AS category,
        JSON_VALUE(data,'$.company_location')   AS location,
        CAST(JSON_VALUE(data,'$.profile_score') AS INT64) AS profile_score,
        CAST(JSON_VALUE(data,'$.view_counts')   AS INT64) AS view_count,

        CASE WHEN JSON_VALUE(data,'$.company_description') IS NULL
          OR LENGTH(JSON_VALUE(data,'$.company_description')) < 20 THEN 1 ELSE 0 END AS missing_description,
        CASE WHEN JSON_VALUE(data,'$.describe_in_one_line') IS NULL THEN 1 ELSE 0 END AS missing_tagline,
        CASE WHEN JSON_VALUE(data,'$.launch_date')          IS NULL THEN 1 ELSE 0 END AS missing_launch_date,
        CASE WHEN JSON_VALUE(data,'$.company_location')     IS NULL THEN 1 ELSE 0 END AS missing_location,
        CASE WHEN JSON_VALUE(data,'$.company_size')         IS NULL THEN 1 ELSE 0 END AS missing_company_size,
        CASE WHEN JSON_VALUE(data,'$.email')                IS NULL THEN 1 ELSE 0 END AS missing_email,
        CASE WHEN JSON_VALUE(data,'$.valuation')            IS NULL THEN 1 ELSE 0 END AS missing_valuation,

        (
          CAST(JSON_VALUE(data,'$.view_counts') AS INT64) * 2
          + (100 - CAST(JSON_VALUE(data,'$.profile_score') AS INT64)) * 3
          + CASE WHEN JSON_VALUE(data,'$.company_description') IS NULL THEN 50 ELSE 0 END
          + CASE WHEN JSON_VALUE(data,'$.launch_date')          IS NULL THEN 20 ELSE 0 END
          + CASE WHEN JSON_VALUE(data,'$.valuation')            IS NULL THEN 20 ELSE 0 END
          + CASE WHEN JSON_VALUE(data,'$.email')                IS NULL THEN 10 ELSE 0 END
        ) AS enrichment_priority

      FROM \`${TBL_COMPANIES}\`
      WHERE JSON_VALUE(data,'$.active_status') = '1'
        AND JSON_VALUE(data,'$.company_name') IS NOT NULL
        ${searchFilter}
      ${sortClause}
      LIMIT ${limit} OFFSET ${offset}
    `

        const countQuery = `
      SELECT COUNT(*) AS total
      FROM \`${TBL_COMPANIES}\`
      WHERE JSON_VALUE(data,'$.active_status') = '1'
        AND JSON_VALUE(data,'$.company_name') IS NOT NULL
        ${searchFilter}
    `

        const enrichQuery = `
      SELECT
        company_id,
        MAX(CAST(created_at AS STRING))   AS last_run_at,
        COUNTIF(status = 'pending')       AS pending_count,
        COUNTIF(status = 'approved')      AS approved_count,
        COUNTIF(status = 'merged')        AS merged_count,
        COUNT(*) AS total_staged
      FROM \`${TBL_STAGING}\`
      GROUP BY company_id
    `

        const [companies, countRows, enrichRows] = await Promise.all([
            bqQuery<Record<string, string>>(mainQuery),
            bqQuery<Record<string, string>>(countQuery),
            bqQuery<Record<string, string>>(enrichQuery),
        ])

        const total = Number(countRows[0]?.total) || 0
        const enrichMap: Record<string, Record<string, string>> = {}
        enrichRows.forEach(r => { enrichMap[r.company_id] = r })

        const rows = companies.map(c => {
            const enrich = enrichMap[c.company_id] || {}
            const missing: string[] = []
            if (Number(c.missing_description)) missing.push('description')
            if (Number(c.missing_tagline)) missing.push('tagline')
            if (Number(c.missing_launch_date)) missing.push('launch_date')
            if (Number(c.missing_location)) missing.push('location')
            if (Number(c.missing_company_size)) missing.push('company_size')
            if (Number(c.missing_email)) missing.push('email')
            if (Number(c.missing_valuation)) missing.push('valuation')

            let enrichStatus = 'not_run'
            if (Number(enrich.merged_count) > 0) enrichStatus = 'merged'
            else if (Number(enrich.approved_count) > 0) enrichStatus = 'approved'
            else if (Number(enrich.pending_count) > 0) enrichStatus = 'pending'
            else if (Number(enrich.total_staged) > 0) enrichStatus = 'staged'

            return {
                company_id: c.company_id,
                company_name: c.company_name,
                company_url: c.company_url || null,
                website: c.website || null,
                profile_image: c.profile_image ? `https://image.coinpedia.org/app_uploads/profile/${c.profile_image}` : null,
                category: c.category || null,
                location: c.location || null,
                profile_score: Number(c.profile_score) || 0,
                view_count: Number(c.view_count) || 0,
                missing_fields: missing,
                missing_count: missing.length,
                enrichment_priority: Number(c.enrichment_priority) || 0,
                enrichment_status: enrichStatus,
                last_run_at: enrich.last_run_at || null,
                pending_count: Number(enrich.pending_count) || 0,
                approved_count: Number(enrich.approved_count) || 0,
                merged_count: Number(enrich.merged_count) || 0,
                live_url: `https://coinpedia.org/company/${c.company_url || ''}/`,
            }
        })

        return NextResponse.json({
            success: true,
            page, limit, total,
            pages: Math.ceil(total / limit),
            search: search || null,
            sort,
            companies: rows,
            duration: `${((Date.now() - t0) / 1000).toFixed(2)}s`,
        })
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[Companies] Error:', msg)
        return NextResponse.json({ success: false, error: msg }, { status: 500 })
    }
}
