// src/app/api/employee/web-app-usage/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getBigQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'

const DS  = TEAM_DATASET
const EMP = `\`${PROJECT}.${DS}.newultimez_team_tbl_employees\``

export async function GET(req: NextRequest) {
  const session = await getSession('employee')
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // session.id = BQ employee id
  // Look up agent_id from employees table using that id
  const bqEmployeeId = parseInt(session.id)
  const bq           = getBigQuery()

  const p      = req.nextUrl.searchParams
  const from   = p.get('from')  || new Date().toISOString().split('T')[0]
  const to     = p.get('to')    || from
  const type   = p.get('type')  || 'both'
  const page   = Math.max(1, parseInt(p.get('page') || '1'))
  const limit  = 50
  const offset = (page - 1) * limit

  try {
    // Step 1: Get agent_id from employee table using session id
    const [empRows] = await bq.query({
      query: `
        SELECT CAST(agent_id AS INT64) AS agent_id, full_name
        FROM ${EMP}
        WHERE id = @empId
          AND agent_id IS NOT NULL
        LIMIT 1
      `,
      params: { empId: bqEmployeeId },
      location: 'us-central1',
    })

    // Employee has no Teramind agent assigned
    if (!empRows.length || !(empRows[0] as any).agent_id) {
      return NextResponse.json({
        webs: [], apps: [],
        summary: { total_secs: 0, productive_secs: 0, unproductive_secs: 0, unclassified_secs: 0, productivity_pct: 0 },
        pagination: { page, limit },
        note: 'No Teramind agent_id assigned to this employee',
      })
    }

    const agentId    = Number((empRows[0] as any).agent_id)
    const fullName   = (empRows[0] as any).full_name as string

    // Step 2: Fetch usage data using agent_id
    const [webs, apps] = await Promise.all([
      type !== 'app' ? fetchMyWebs(bq, agentId, from, to, limit, offset) : Promise.resolve([]),
      type !== 'web' ? fetchMyApps(bq, agentId, from, to, limit, offset) : Promise.resolve([]),
    ])

    const all              = [...webs, ...apps]
    const totalSecs        = all.reduce((s, r: any) => s + Number(r.active_secs), 0)
    const productiveSecs   = all.filter((r: any) => r.category === 'Productive').reduce((s, r: any)   => s + Number(r.active_secs), 0)
    const unproductiveSecs = all.filter((r: any) => r.category === 'Unproductive').reduce((s, r: any) => s + Number(r.active_secs), 0)
    const unclassifiedSecs = all.filter((r: any) => r.category === 'Unclassified').reduce((s, r: any) => s + Number(r.active_secs), 0)

    return NextResponse.json({
      webs, apps,
      employee_name: fullName,
      summary: {
        total_secs:        totalSecs,
        productive_secs:   productiveSecs,
        unproductive_secs: unproductiveSecs,
        unclassified_secs: unclassifiedSecs,
        productivity_pct:  totalSecs ? Math.round((productiveSecs / totalSecs) * 100) : 0,
      },
      pagination: { page, limit },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[employee/web-app-usage]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function fetchMyWebs(bq: any, agentId: number, from: string, to: string, limit: number, offset: number) {
  const [rows] = await bq.query({
    query: `
      SELECT
        w.domain                             AS item,
        'web'                                AS type,
        CAST(w.activity_date AS STRING)      AS activity_date,
        w.active_secs,
        w.category
      FROM \`${PROJECT}.${DS}.qd_used_webs\` w
      WHERE w.agent_id = @agentId
        AND w.activity_date BETWEEN @from AND @to
      ORDER BY w.active_secs DESC
      LIMIT @limit OFFSET @offset
    `,
    params: { agentId, from, to, limit, offset },
    location: 'us-central1',
  })
  return rows
}

async function fetchMyApps(bq: any, agentId: number, from: string, to: string, limit: number, offset: number) {
  const [rows] = await bq.query({
    query: `
      SELECT
        a.app_name                           AS item,
        'app'                                AS type,
        CAST(a.activity_date AS STRING)      AS activity_date,
        a.active_secs,
        a.category
      FROM \`${PROJECT}.${DS}.qd_used_apps\` a
      WHERE a.agent_id = @agentId
        AND a.activity_date BETWEEN @from AND @to
      ORDER BY a.active_secs DESC
      LIMIT @limit OFFSET @offset
    `,
    params: { agentId, from, to, limit, offset },
    location: 'us-central1',
  })
  return rows
}
