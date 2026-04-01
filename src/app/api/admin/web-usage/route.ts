// src/app/api/admin/web-usage/route.ts
// Redis cache: admin:web-usage:{from}:{to} — 1 hour TTL
// Data is live (Jan 2024 → today) — 1hr is a good balance
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import { redisGet, redisSet } from '@/lib/redis'

const T   = `${PROJECT}.${TEAM_DATASET}`
const TTL = 60 * 60  // 1 hour

function IVsec(col: string): string {
  return (
    `CAST(SPLIT(REPLACE(CAST(${col} AS STRING),'0-0 0 ',''),':')[OFFSET(0)] AS INT64)*3600` +
    ` + CAST(SPLIT(REPLACE(CAST(${col} AS STRING),'0-0 0 ',''),':')[OFFSET(1)] AS INT64)*60` +
    ` + CAST(SPLIT(REPLACE(CAST(${col} AS STRING),'0-0 0 ',''),':')[OFFSET(2)] AS INT64)`
  )
}

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')
  const fromExpr = from ? `'${from}'` : `DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 7 DAY)`
  const toExpr   = to   ? `'${to}'`   : `CURRENT_DATE('Asia/Kolkata')`
  const cacheKey = `admin:web-usage:${from || '7d'}:${to || 'today'}`

  // ── Cache check ──
  const cached = await redisGet<unknown>(cacheKey)
  if (cached) {
    return NextResponse.json({ success: true, ...(cached as object), cached: true })
  }

  const WEB_FILTER = `
    AND tab_url IS NOT NULL
    AND tab_url NOT LIKE 'chrome-extension://%'
    AND tab_url NOT LIKE 'about:%'
    AND tab_url NOT LIKE 'chrome://%'
    AND tab_url != ''
  `

  try {
    const [topDomains, topPages, perEmployee, summary] = await Promise.all([
      bqQuery<Record<string, string>>(`
        SELECT
          domain,
          CAST(SUM(active_secs) AS STRING)                  AS total_secs,
          CAST(COUNT(*) AS STRING)                           AS visit_count,
          CAST(COUNT(DISTINCT employee_row_id) AS STRING)   AS employee_count
        FROM (
          SELECT
            employee_row_id,
            ${IVsec('active_time')}                         AS active_secs,
            COALESCE(REGEXP_EXTRACT(tab_url, r'https?://([^/?#]+)'), tab_url) AS domain
          FROM \`${T}.newultimez_team_tbl_employees_used_webs\`
          WHERE DATE(date_n_time) BETWEEN ${fromExpr} AND ${toExpr}
          ${WEB_FILTER}
        )
        WHERE domain IS NOT NULL AND domain != ''
        GROUP BY domain
        ORDER BY SUM(active_secs) DESC
        LIMIT 50
      `),
      bqQuery<Record<string, string>>(`
        SELECT
          COALESCE(tab_title, tab_url)                      AS page_title,
          tab_url,
          COALESCE(REGEXP_EXTRACT(tab_url, r'https?://([^/?#]+)'), '') AS domain,
          CAST(SUM(${IVsec('active_time')}) AS STRING)      AS total_secs,
          CAST(COUNT(*) AS STRING)                           AS visit_count,
          CAST(COUNT(DISTINCT employee_row_id) AS STRING)   AS employee_count
        FROM \`${T}.newultimez_team_tbl_employees_used_webs\`
        WHERE DATE(date_n_time) BETWEEN ${fromExpr} AND ${toExpr}
        ${WEB_FILTER}
        GROUP BY tab_title, tab_url
        ORDER BY SUM(${IVsec('active_time')}) DESC
        LIMIT 50
      `),
      bqQuery<Record<string, string>>(`
        SELECT
          e.full_name,
          COALESCE(e.position, '')                          AS position,
          CAST(w.employee_row_id AS STRING)                 AS employee_id,
          w.top_domain,
          CAST(w.total_secs AS STRING)                      AS total_secs,
          CAST(w.page_count AS STRING)                      AS page_count
        FROM (
          SELECT
            employee_row_id,
            ARRAY_AGG(domain ORDER BY domain_secs DESC LIMIT 1)[OFFSET(0)] AS top_domain,
            SUM(domain_secs)  AS total_secs,
            COUNT(*)          AS page_count
          FROM (
            SELECT
              employee_row_id,
              COALESCE(REGEXP_EXTRACT(tab_url, r'https?://([^/?#]+)'), tab_url) AS domain,
              SUM(${IVsec('active_time')}) AS domain_secs
            FROM \`${T}.newultimez_team_tbl_employees_used_webs\`
            WHERE DATE(date_n_time) BETWEEN ${fromExpr} AND ${toExpr}
              AND tab_url NOT LIKE 'chrome-extension://%'
              AND tab_url NOT LIKE 'about:%'
              AND tab_url != ''
            GROUP BY employee_row_id, domain
          )
          GROUP BY employee_row_id
        ) w
        JOIN \`${T}.newultimez_team_tbl_employees\` e ON e.id = w.employee_row_id
        ORDER BY w.total_secs DESC LIMIT 50
      `),
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(COUNT(*) AS STRING)                          AS total_records,
          CAST(COUNT(DISTINCT employee_row_id) AS STRING)   AS total_employees,
          CAST(SUM(${IVsec('active_time')}) AS STRING)      AS total_secs,
          CAST(MIN(DATE(date_n_time)) AS STRING)            AS data_from,
          CAST(MAX(DATE(date_n_time)) AS STRING)            AS data_to
        FROM \`${T}.newultimez_team_tbl_employees_used_webs\`
        WHERE DATE(date_n_time) BETWEEN ${fromExpr} AND ${toExpr}
          AND tab_url NOT LIKE 'chrome-extension://%'
          AND tab_url NOT LIKE 'about:%'
          AND tab_url != ''
      `),
    ])

    const payload = { topDomains, topPages, perEmployee, summary: summary[0] ?? {} }
    await redisSet(cacheKey, payload, TTL)
    return NextResponse.json({ success: true, ...payload, cached: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[web-usage]', msg)
    return NextResponse.json({ error: 'Failed to fetch web usage', detail: msg }, { status: 500 })
  }
}
