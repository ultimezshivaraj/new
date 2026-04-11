// src/app/api/admin/app-usage/route.ts
// Redis cache: admin:app-usage:{from}:{to} — 2 hour TTL
// Data stopped Jul 2024 — historical only, safe to cache longer
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import { redisGet, redisSet } from '@/lib/redis'

const T   = `${PROJECT}.${TEAM_DATASET}`
const TTL = 2 * 60 * 60  // 2 hours

function IVsec(col: string): string {
  return (
    `CAST(SPLIT(REPLACE(CAST(${col} AS STRING),'0-0 0 ',''),':')[OFFSET(0)] AS INT64)*3600` +
    ` + CAST(SPLIT(REPLACE(CAST(${col} AS STRING),'0-0 0 ',''),':')[OFFSET(1)] AS INT64)*60` +
    ` + CAST(SPLIT(REPLACE(CAST(${col} AS STRING),'0-0 0 ',''),':')[OFFSET(2)] AS INT64)`
  )
}

const PRODUCTIVE_APPS = [
  'excel.exe','word.exe','winword.exe','powerpnt.exe','outlook.exe',
  'code.exe','chrome.exe','msedge.exe','firefox.exe',
  'notepad.exe','notepad++.exe','pycharm64.exe','idea64.exe','phpstorm64.exe',
  'slack.exe','teams.exe','zoom.exe','figma.exe','photoshop.exe',
  'illustrator.exe','filezilla.exe','putty.exe','winscp.exe',
  'git.exe','cmd.exe','powershell.exe','wt.exe',
].join("','")

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')
  const fromExpr = from ? `'${from}'` : `DATE('2023-12-01')`
  const toExpr   = to   ? `'${to}'`   : `DATE('2024-07-05')`
  const cacheKey = `admin:app-usage:${from || 'full'}:${to || 'full'}`

  // ── Cache check ──
  const cached = await redisGet<unknown>(cacheKey)
  if (cached) {
    return NextResponse.json({ success: true, ...(cached as object), cached: true })
  }

  try {
    const [topApps, perEmployee, summary] = await Promise.all([
      bqQuery<Record<string, string>>(`
        SELECT
          app_n_web_name,
          CAST(SUM(${IVsec('used_time')}) AS STRING)       AS total_secs,
          CAST(COUNT(*) AS STRING)                           AS usage_count,
          CAST(COUNT(DISTINCT employee_row_id) AS STRING)   AS employee_count,
          CASE
            WHEN LOWER(app_n_web_name) IN ('${PRODUCTIVE_APPS}') THEN 'Productive'
            WHEN LOWER(app_n_web_name) LIKE '%.exe'              THEN 'App'
            ELSE 'Other'
          END AS category
        FROM \`${T}.newultimez_team_tbl_employees_used_apps_n_web\`
        WHERE date BETWEEN ${fromExpr} AND ${toExpr}
          AND app_n_web_name IS NOT NULL AND app_n_web_name != ''
        GROUP BY app_n_web_name
        ORDER BY SUM(${IVsec('used_time')}) DESC
        LIMIT 50
      `),
      bqQuery<Record<string, string>>(`
        SELECT
          e.full_name,
          COALESCE(e.position, '')                          AS position,
          CAST(a.employee_row_id AS STRING)                 AS employee_id,
          a.top_app,
          CAST(a.total_secs AS STRING)                      AS total_secs,
          CAST(a.app_count AS STRING)                       AS app_count
        FROM (
          SELECT
            employee_row_id,
            ARRAY_AGG(app_n_web_name ORDER BY SUM(${IVsec('used_time')}) DESC LIMIT 1)[OFFSET(0)] AS top_app,
            SUM(${IVsec('used_time')}) AS total_secs,
            COUNT(DISTINCT app_n_web_name)                  AS app_count
          FROM \`${T}.newultimez_team_tbl_employees_used_apps_n_web\`
          WHERE date BETWEEN ${fromExpr} AND ${toExpr}
          GROUP BY employee_row_id
        ) a
        JOIN \`${T}.newultimez_team_tbl_employees\` e ON e.id = a.employee_row_id
        ORDER BY a.total_secs DESC LIMIT 50
      `),
      bqQuery<Record<string, string>>(`
        SELECT
          CAST(COUNT(*) AS STRING)                          AS total_records,
          CAST(COUNT(DISTINCT employee_row_id) AS STRING)   AS total_employees,
          CAST(COUNT(DISTINCT app_n_web_name) AS STRING)    AS unique_apps,
          CAST(SUM(${IVsec('used_time')}) AS STRING)        AS total_secs,
          CAST(MIN(date) AS STRING)                         AS data_from,
          CAST(MAX(date) AS STRING)                         AS data_to
        FROM \`${T}.newultimez_team_tbl_employees_used_apps_n_web\`
        WHERE date BETWEEN ${fromExpr} AND ${toExpr}
      `),
    ])

    const payload = { topApps, perEmployee, summary: summary[0] ?? {} }
    await redisSet(cacheKey, payload, TTL)
    return NextResponse.json({ success: true, ...payload, cached: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[app-usage]', msg)
    return NextResponse.json({ error: 'Failed to fetch app usage', detail: msg }, { status: 500 })
  }
}
