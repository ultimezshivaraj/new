// src/app/api/admin/web-app-usage/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { getBigQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'

const DS = TEAM_DATASET
const EMP = `\`${PROJECT}.${DS}.newultimez_team_tbl_employees\``

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const p        = req.nextUrl.searchParams
  const from     = p.get('from')     || new Date().toISOString().split('T')[0]
  const to       = p.get('to')       || from
  const agentId  = p.get('agent_id')
  const deptId   = p.get('dept_id')
  const category = p.get('category')
  const type     = p.get('type')     || 'both'
  const page     = Math.max(1, parseInt(p.get('page') || '1'))
  const limit    = 50
  const offset   = (page - 1) * limit
  const bq       = getBigQuery()

  try {
    const [webs, apps] = await Promise.all([
      type !== 'app' ? fetchWebs(bq, from, to, agentId, deptId, category, limit, offset) : Promise.resolve([]),
      type !== 'web' ? fetchApps(bq, from, to, agentId, deptId, limit, offset)           : Promise.resolve([]),
    ])
    const all = [...webs, ...apps]
    const summary = {
      productive_secs:   all.filter((r: any) => r.category === 'Productive').reduce((s, r: any)   => s + Number(r.active_secs), 0),
      unproductive_secs: all.filter((r: any) => r.category === 'Unproductive').reduce((s, r: any) => s + Number(r.active_secs), 0),
      unclassified_secs: all.filter((r: any) => r.category === 'Unclassified').reduce((s, r: any) => s + Number(r.active_secs), 0),
      unique_employees:  [...new Set(all.map((r: any) => r.agent_id))].length,
    }
    return NextResponse.json({ webs, apps, summary, page, limit })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[admin/web-app-usage]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST — filter options: pull employees who have agent_id set
export async function POST(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bq = getBigQuery()
  try {
    const [empRows, deptRows] = await Promise.all([
      bq.query({
        query: `
          SELECT DISTINCT
            CAST(e.agent_id AS INT64) AS agent_id,
            e.full_name               AS agent_name
          FROM ${EMP} e
          WHERE e.agent_id IS NOT NULL
            AND e.login_status = 1
          ORDER BY e.full_name
          LIMIT 200
        `,
        location: 'us-central1',
      }),
      bq.query({
        query: `
          SELECT DISTINCT department_id, department_name
          FROM \`${PROJECT}.${DS}.qd_used_webs\`
          WHERE department_id IS NOT NULL
          ORDER BY department_name
        `,
        location: 'us-central1',
      }),
    ])
    return NextResponse.json({ employees: empRows[0], departments: deptRows[0] })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

// Web usage — JOIN employees table on agent_id
async function fetchWebs(bq: any, from: string, to: string, agentId: string | null, deptId: string | null, category: string | null, limit: number, offset: number) {
  let q = `
    SELECT
      w.agent_id,
      COALESCE(e.full_name, w.agent_name)  AS agent_name,
      w.department_name,
      CAST(w.activity_date AS STRING)       AS activity_date,
      w.domain                              AS item,
      'web'                                 AS type,
      w.active_secs,
      w.category
    FROM \`${PROJECT}.${DS}.qd_used_webs\` w
    LEFT JOIN ${EMP} e
      ON CAST(e.agent_id AS INT64) = w.agent_id
    WHERE w.activity_date BETWEEN @from AND @to
  `
  const params: any = { from, to, limit, offset }
  if (agentId)  { q += ' AND w.agent_id = @agentId';     params.agentId  = parseInt(agentId) }
  if (deptId)   { q += ' AND w.department_id = @deptId'; params.deptId   = parseInt(deptId) }
  if (category) { q += ' AND w.category = @category';    params.category = category }
  q += ' ORDER BY w.activity_date DESC, w.active_secs DESC LIMIT @limit OFFSET @offset'
  const [rows] = await bq.query({ query: q, params, location: 'us-central1' })
  return rows
}

// App usage — JOIN employees table on agent_id
async function fetchApps(bq: any, from: string, to: string, agentId: string | null, deptId: string | null, limit: number, offset: number) {
  let q = `
    SELECT
      a.agent_id,
      COALESCE(e.full_name, a.agent_name)  AS agent_name,
      a.department_name,
      CAST(a.activity_date AS STRING)       AS activity_date,
      a.app_name                            AS item,
      'app'                                 AS type,
      a.active_secs,
      a.category
    FROM \`${PROJECT}.${DS}.qd_used_apps\` a
    LEFT JOIN ${EMP} e
      ON CAST(e.agent_id AS INT64) = a.agent_id
    WHERE a.activity_date BETWEEN @from AND @to
  `
  const params: any = { from, to, limit, offset }
  if (agentId) { q += ' AND a.agent_id = @agentId';     params.agentId = parseInt(agentId) }
  if (deptId)  { q += ' AND a.department_id = @deptId'; params.deptId  = parseInt(deptId) }
  q += ' ORDER BY a.activity_date DESC, a.active_secs DESC LIMIT @limit OFFSET @offset'
  const [rows] = await bq.query({ query: q, params, location: 'us-central1' })
  return rows
}
