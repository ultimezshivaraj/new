// src/app/api/admin/qd-dev/projects/route.ts
// Port of development/api/projects.js → Next.js App Router route handler
// GET /api/admin/qd-dev/projects            → list all projects
// GET /api/admin/qd-dev/projects?id=UUID    → single project
// GET /api/admin/qd-dev/projects?tab=X&id=Y → tab-specific data

import { NextRequest, NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'

const BQ_PROJECT = 'for-ga4-bitquery-new'
const BQ_DATASET = 'QDDev_Project'

let _bq: BigQuery | null = null
function getBQ(): BigQuery {
  if (_bq) return _bq
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!json) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')
  _bq = new BigQuery({ projectId: BQ_PROJECT, credentials: JSON.parse(json) })
  return _bq
}

async function getProjectName(bq: BigQuery, id: string): Promise<string | null> {
  const [rows] = await bq.query({
    query: `SELECT project_name FROM \`${BQ_PROJECT}.${BQ_DATASET}.projects\` WHERE project_id=@id LIMIT 1`,
    params: { id },
  })
  return (rows as { project_name: string }[]).length ? (rows as { project_name: string }[])[0].project_name : null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id  = searchParams.get('id')  ?? undefined
  const tab = searchParams.get('tab') ?? undefined

  try {
    const bq = getBQ()

    // Tab-specific data
    if (tab && id) {
      const pn = await getProjectName(bq, id)
      if (!pn) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

      if (tab === 'schema') {
        const [rows] = await bq.query({
          query: `SELECT table_name, column_name, data_type, is_nullable,
                         is_pk, is_fk, fk_references, is_security_risk,
                         risk_reason, table_type, ordinal_position
                  FROM \`${BQ_PROJECT}.${BQ_DATASET}.schema_columns\`
                  WHERE project_name=@pn
                  ORDER BY table_name, ordinal_position LIMIT 1000`,
          params: { pn },
        })
        return NextResponse.json({ columns: rows, project_name: pn })
      }

      if (tab === 'security') {
        const [rows] = await bq.query({
          query: `SELECT issue_id, title, severity, issue_type, file_path,
                         column_name, fix_description, fix_code, effort_minutes, status
                  FROM \`${BQ_PROJECT}.${BQ_DATASET}.security_issues\`
                  WHERE project_id=@id AND status != 'fixed'
                  ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3 ELSE 4 END LIMIT 50`,
          params: { id },
        })
        return NextResponse.json({ issues: rows, project_name: pn })
      }

      if (tab === 'controllers') {
        const [rows] = await bq.query({
          query: `SELECT file_path, class_name, method_name, http_method,
                         auth_level, auth_condition, purpose,
                         db_tables_read, db_tables_write,
                         calls_notification, notification_ids,
                         uses_redis, redis_keys, has_file_upload, is_ajax, role
                  FROM \`${BQ_PROJECT}.${BQ_DATASET}.controller_methods\`
                  WHERE project_name=@pn
                  ORDER BY file_path, method_name LIMIT 200`,
          params: { pn },
        })
        return NextResponse.json({ controllers: rows, project_name: pn })
      }

      if (tab === 'flows') {
        const [rows] = await bq.query({
          query: `SELECT flow_id, flow_name, step_number, step_actor,
                         step_action, step_function, step_db_table,
                         step_db_operation, step_triggers_notification,
                         step_triggers_cache_bust
                  FROM \`${BQ_PROJECT}.${BQ_DATASET}.data_flows\`
                  WHERE project_name=@pn
                  ORDER BY flow_name, step_number LIMIT 500`,
          params: { pn },
        })
        return NextResponse.json({ flows: rows, project_name: pn })
      }

      if (tab === 'devops') {
        const [rows] = await bq.query({
          query: `SELECT component, failure_impact, risk_level, mitigation,
                         cache_key_pattern, env_var_name,
                         env_var_required_by, env_var_sensitive
                  FROM \`${BQ_PROJECT}.${BQ_DATASET}.devops_config\`
                  WHERE project_name=@pn
                  ORDER BY CASE risk_level WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3 ELSE 4 END LIMIT 100`,
          params: { pn },
        })
        return NextResponse.json({ devops: rows, project_name: pn })
      }

      return NextResponse.json({ error: 'Unknown tab: ' + tab }, { status: 400 })
    }

    // Single project
    if (id) {
      const [rows] = await bq.query({
        query: `SELECT project_id, project_name, project_type, environment,
                       repo_url, live_url, description,
                       tech_stack, team_members, analysis_focus,
                       priority, depth,
                       total_files, total_tables, total_columns,
                       report_html, created_at, created_by, last_analysed
                FROM \`${BQ_PROJECT}.${BQ_DATASET}.projects\`
                WHERE project_id=@id LIMIT 1`,
        params: { id },
      })
      if (!(rows as unknown[]).length) return NextResponse.json({ error: 'Project not found', id }, { status: 404 })
      return NextResponse.json((rows as unknown[])[0])
    }

    // All projects list
    const [rows] = await bq.query(`
      SELECT project_id, project_name, project_type, environment,
             repo_url, live_url, description, tech_stack, team_members,
             total_files, total_tables, total_columns,
             created_at, created_by, last_analysed
      FROM \`${BQ_PROJECT}.${BQ_DATASET}.projects\`
      ORDER BY last_analysed DESC LIMIT 100
    `)
    return NextResponse.json(rows)

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
