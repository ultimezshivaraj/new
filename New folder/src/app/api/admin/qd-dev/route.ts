// src/app/api/admin/qd-dev/route.ts
// GET /api/admin/qd-dev                           → list all projects
// GET /api/admin/qd-dev?id=UUID                   → single project with report_html
// GET /api/admin/qd-dev?tab=TABNAME&id=UUID       → tab-specific data
// tab values: schema | tasks | controllers | flows | devops | agents
// GET /api/admin/qd-dev?issues=1&id=UUID          → legacy compat (reads tasks table)

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest }        from '@/lib/adminAuth'
import { getBigQuery }               from '@/lib/bigquery'

const BQ_PROJECT = 'for-ga4-bitquery-new'
const BQ_DATASET = 'QDDev_Project'
const T = (table: string) => `\`${BQ_PROJECT}.${BQ_DATASET}.${table}\``

async function getProjectName(id: string): Promise<string | null> {
  const bq = getBigQuery()
  const [rows] = await bq.query({
    query: `SELECT project_name FROM ${T('projects')} WHERE project_id=@id LIMIT 1`,
    params: { id },
  })
  return (rows as { project_name: string }[]).length ? rows[0].project_name : null
}

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const id     = searchParams.get('id')     ?? ''
  const tab    = searchParams.get('tab')    ?? ''
  const issues = searchParams.get('issues') ?? ''

  const bq = getBigQuery()

  try {

    // ── Legacy compat: ?issues=1&id= → reads new tasks table ──
    if (issues === '1' && id) {
      const [rows] = await bq.query({
        query: `SELECT task_id AS issue_id, title, severity, category AS issue_type,
                       file_path, NULL AS column_name, description AS fix_description,
                       fix_code, effort_minutes, status, NULL AS fixed_at,
                       NULL AS fixed_by, created_at
                FROM ${T('tasks')}
                WHERE project_id=@id AND category='security'
                ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                  WHEN 'medium' THEN 3 ELSE 4 END, created_at DESC LIMIT 50`,
        params: { id },
      })
      return NextResponse.json({ issues: rows })
    }

    // ── Tab-specific data ──────────────────────────────────────
    if (tab && id) {
      const pn = await getProjectName(id)
      if (!pn) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

      // ── Schema columns (SQL + MongoDB) ───────────────────────
      if (tab === 'schema') {
        const [rows] = await bq.query({
          query: `SELECT table_name, column_name, data_type, is_nullable,
                         is_pk, is_fk, fk_references, is_security_risk,
                         risk_reason, table_type, ordinal_position,
                         COALESCE(doc_count, 0) AS doc_count
                  FROM ${T('schema_columns')}
                  WHERE project_name=@pn
                  ORDER BY table_type, table_name, ordinal_position LIMIT 2000`,
          params: { pn },
        })
        return NextResponse.json({ columns: rows, project_name: pn })
      }

      // ── Tasks — all 4 categories ─────────────────────────────
      if (tab === 'tasks') {
        const [rows] = await bq.query({
          query: `SELECT task_id, category, title, description, business_impact,
                         file_path, fix_steps, fix_code, effort_minutes,
                         severity, owasp_category, assigned_to,
                         status, generated_by, generated_by_name, chat_context, created_at
                  FROM ${T('tasks')}
                  WHERE project_id=@id AND status != 'done'
                  ORDER BY
                    CASE category WHEN 'security' THEN 1 WHEN 'bug' THEN 2
                      WHEN 'scalable' THEN 3 ELSE 4 END,
                    CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                      WHEN 'medium' THEN 3 ELSE 4 END,
                    created_at DESC
                  LIMIT 200`,
          params: { id },
        })
        return NextResponse.json({ tasks: rows, project_name: pn })
      }

      // ── Controllers ──────────────────────────────────────────
      if (tab === 'controllers') {
        const [rows] = await bq.query({
          query: `SELECT file_path, class_name, method_name, http_method,
                         auth_level, auth_condition, purpose,
                         db_tables_read, db_tables_write,
                         calls_notification, uses_redis, redis_keys, is_ajax, role
                  FROM ${T('controller_methods')}
                  WHERE project_name=@pn
                  ORDER BY file_path, method_name LIMIT 200`,
          params: { pn },
        })
        return NextResponse.json({ controllers: rows, project_name: pn })
      }

      // ── Data flows ───────────────────────────────────────────
      if (tab === 'flows') {
        const [rows] = await bq.query({
          query: `SELECT flow_id, flow_name, step_number, step_actor,
                         step_action, step_function, step_db_table,
                         step_db_operation, step_triggers_notification,
                         step_triggers_cache_bust
                  FROM ${T('data_flows')}
                  WHERE project_name=@pn
                  ORDER BY flow_name, step_number LIMIT 500`,
          params: { pn },
        })
        return NextResponse.json({ flows: rows, project_name: pn })
      }

      // ── DevOps config ────────────────────────────────────────
      if (tab === 'devops') {
        const [rows] = await bq.query({
          query: `SELECT component, failure_impact, risk_level, mitigation,
                         cache_key_pattern, env_var_name,
                         env_var_required_by, env_var_sensitive
                  FROM ${T('devops_config')}
                  WHERE project_name=@pn
                  ORDER BY CASE risk_level WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3 ELSE 4 END LIMIT 100`,
          params: { pn },
        })
        return NextResponse.json({ devops: rows, project_name: pn })
      }

      // ── AI Agents & Cron Jobs ────────────────────────────────
      if (tab === 'agents') {
        const [agentRows] = await bq.query({
          query: `SELECT agent_id, file_path, agent_type, provider, model,
                         purpose, call_pattern, max_tokens,
                         has_system_prompt, has_tools, created_at
                  FROM ${T('ai_agents')}
                  WHERE project_id=@id
                  ORDER BY provider, file_path LIMIT 50`,
          params: { id },
        })
        const [cronRows] = await bq.query({
          query: `SELECT cron_id, source, schedule, schedule_human,
                         path, description, max_duration, created_at
                  FROM ${T('cron_jobs')}
                  WHERE project_id=@id
                  ORDER BY source, schedule LIMIT 50`,
          params: { id },
        })
        return NextResponse.json({
          agents: agentRows,
          crons:  cronRows,
          project_name: pn,
        })
      }

      return NextResponse.json({ error: 'Unknown tab: ' + tab }, { status: 400 })
    }

    // ── Single project ─────────────────────────────────────────
    if (id) {
      const [rows] = await bq.query({
        query: `SELECT project_id, project_name, project_type, environment,
                       repo_url, live_url, description,
                       tech_stack, team_members, analysis_focus,
                       priority, depth,
                       total_files, total_tables, total_columns,
                       COALESCE(total_loc, 0)    AS total_loc,
                       COALESCE(health_score, 0) AS health_score,
                       folder_structure,
                       report_html, created_at, created_by, last_analysed
                FROM ${T('projects')}
                WHERE project_id=@id LIMIT 1`,
        params: { id },
      })
      if (!(rows as unknown[]).length)
        return NextResponse.json({ error: 'Project not found', id }, { status: 404 })
      return NextResponse.json(rows[0])
    }

    // ── All projects list ──────────────────────────────────────
    const [rows] = await bq.query(`
      SELECT project_id, project_name, project_type, environment,
             repo_url, live_url, description, tech_stack, team_members,
             total_files, total_tables, total_columns,
             COALESCE(total_loc, 0)    AS total_loc,
             COALESCE(health_score, 0) AS health_score,
             created_at, created_by, last_analysed
      FROM ${T('projects')}
      ORDER BY last_analysed DESC LIMIT 100
    `)
    return NextResponse.json(rows)

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[qd-dev] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
