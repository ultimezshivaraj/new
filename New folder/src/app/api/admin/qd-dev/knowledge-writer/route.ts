// src/app/api/admin/qd-dev/knowledge-writer/route.ts
// POST /api/admin/qd-dev/knowledge-writer

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { getBigQuery } from '@/lib/bigquery'
import { randomUUID } from 'crypto'

const BQ_PROJECT = 'for-ga4-bitquery-new'
const BQ_DATASET = 'QDDev_Project'
const T = (t: string) => `\`${BQ_PROJECT}.${BQ_DATASET}.${t}\``

const SENSITIVE = [
  'password','passwd','pwd','secret','token','api_key','apikey',
  'private_key','access_token','refresh_token','auth_key',
  'recovery_email','credit_card','card_number','cvv',
]

function isSensitiveCol(name: string): boolean {
  return SENSITIVE.some(s => name.toLowerCase().includes(s))
}

function detectTableType(name: string, isMongo = false): string {
  if (isMongo) return 'mongodb'
  const n = name.toLowerCase()
  if (n.startsWith('cm_'))         return 'bq_native'
  if (n.startsWith('tbl_'))        return 'datastream_synced'
  if (n.startsWith('newultimez_')) return 'datastream_synced'
  if (n.includes('_view'))         return 'view'
  return 'mysql'
}

// ── Structured data keys ──────────────────────────────────────
const STRUCTURED_KEYS = [
  'tasks','controller_methods','data_flows','devops_config','ai_agents','cron_jobs',
] as const
type StructuredKey = typeof STRUCTURED_KEYS[number]
type StructuredData = Record<StructuredKey, unknown[]> & { _parsed: boolean }

function emptyStructured(): StructuredData {
  return { tasks:[], controller_methods:[], data_flows:[], devops_config:[], ai_agents:[], cron_jobs:[], _parsed: false }
}

function buildFromParsed(p: Record<string, unknown>): StructuredData {
  return {
    ...Object.fromEntries(STRUCTURED_KEYS.map(k => [k, Array.isArray(p[k]) ? p[k] : []])),
    _parsed: true,
  } as StructuredData
}

// ── Robust STRUCTURED_DATA parser ────────────────────────────
// Attempts (in order):
//   1. Primary markers <!-- STRUCTURED_DATA ... STRUCTURED_DATA -->
//   2. Fallback: JSON block ending at last } in document
//   3. Fallback: JSON block containing "tasks": anywhere
//   4. Direct JSON.parse on found raw string
//   5. JSON repair: trailing commas, unquoted keys, truncation/unclosed brackets
function parseStructuredData(html: string | null): StructuredData {
  if (!html) return emptyStructured()

  // ── Attempt 1: primary markers ────────────────────────────
  let raw: string | null = null
  const start = html.indexOf('<!-- STRUCTURED_DATA')
  const end   = html.indexOf('STRUCTURED_DATA -->')
  if (start !== -1 && end !== -1) {
    raw = html.substring(start + 20, end).trim()
  }

  // ── Attempt 2: bare JSON block ending at last } ───────────
  if (!raw) {
    const m = html.match(/\{[\s\S]*?"tasks"\s*:\s*\[[\s\S]*?\}\s*$/)
    if (m) raw = m[0]
  }

  // ── Attempt 3: JSON block with "tasks" key anywhere ───────
  if (!raw) {
    const m = html.match(/\{[^{}]*"tasks"\s*:\s*\[[\s\S]{0,50000}/)
    if (m) raw = m[0]
  }

  if (!raw) return emptyStructured()

  // ── Attempt 4: direct JSON.parse ─────────────────────────
  const tryParse = (s: string): StructuredData | null => {
    try {
      const p = JSON.parse(s)
      if (typeof p !== 'object' || p === null || Array.isArray(p)) return null
      return buildFromParsed(p as Record<string, unknown>)
    } catch { return null }
  }

  const direct = tryParse(raw)
  if (direct) return direct

  // ── Attempt 5: JSON repair ────────────────────────────────
  let repaired = raw
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/,?\s*$/, '')

  // Count unclosed brackets and close them (handles token-limit truncation)
  let depth = 0; let inStr = false; let escaped = false
  for (const ch of repaired) {
    if (escaped)              { escaped = false; continue }
    if (ch === '\\' && inStr) { escaped = true;  continue }
    if (ch === '"')           { inStr = !inStr;   continue }
    if (inStr)                continue
    if (ch === '{' || ch === '[') depth++
    if (ch === '}' || ch === ']') depth--
  }
  if (depth > 0) repaired += ']}'.repeat(Math.min(depth, 6))

  return tryParse(repaired) ?? emptyStructured()
}

function calcHealthScore(tasks: Record<string,unknown>[]): number {
  const costs: Record<string,number> = { critical:15, high:8, medium:3, low:1 }
  const deduction = tasks
    .filter(t => t.category === 'security')
    .reduce((s, t) => s + (costs[String(t.severity||'medium')]||3), 0)
  return Math.max(0, Math.min(100, 100 - deduction))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertProject(bq: any, body: Record<string,unknown>, html: string|null, healthScore: number, now: Date): Promise<string> {
  const projectName = body.project_name as string
  const [existing] = await bq.query({ query: `SELECT project_id FROM ${T('projects')} WHERE project_name=@pn LIMIT 1`, params: { pn: projectName } })
  const projectId: string = (existing as {project_id:string}[]).length ? existing[0].project_id : randomUUID()
  let stack = body.tech_stack; if (Array.isArray(stack)) stack = JSON.stringify(stack)
  let team  = body.team;       if (Array.isArray(team))  team  = JSON.stringify(team)
  const row = {
    project_id:       projectId,
    project_name:     projectName.substring(0,200),
    project_type:     ((body.project_type as string)||'web_app').substring(0,50),
    environment:      ((body.environment  as string)||'production').substring(0,50),
    repo_url:         (body.repo_url as string)||null,
    live_url:         (body.live_url as string)||null,
    description:      ((body.description as string)||null)?.substring(0,2000),
    tech_stack:       typeof stack==='string' ? stack : '[]',
    team_members:     typeof team ==='string' ? team  : '[]',
    analysis_focus:   ((body.analysis_focus as string)||null)?.substring(0,1000),
    priority:         (body.priority as string)||null,
    depth:            (body.depth    as string)||null,
    report_html:      html ? html.substring(0,900000) : null,
    total_files:      Number(body.total_files)||0,
    total_tables:     Number(body.total_tables)||0,
    total_columns:    Number(body.total_columns)||0,
    total_loc:        Number(body.total_loc)||0,
    health_score:     healthScore,
    folder_structure: (body.folder_structure as string)||null,
    created_by:       ((body.analysed_by as string)||'admin').substring(0,100),
    last_analysed:    now,
    created_at:       now,
  }
  if ((existing as unknown[]).length) {
    await bq.query({ query: `UPDATE ${T('projects')} SET project_type=@project_type,environment=@environment,repo_url=@repo_url,live_url=@live_url,description=@description,tech_stack=@tech_stack,team_members=@team_members,analysis_focus=@analysis_focus,priority=@priority,depth=@depth,report_html=@report_html,total_files=@total_files,total_tables=@total_tables,total_columns=@total_columns,total_loc=@total_loc,health_score=@health_score,folder_structure=@folder_structure,created_by=@created_by,last_analysed=@last_analysed,created_at=@created_at WHERE project_id=@project_id`, params: row })
  } else {
    await bq.dataset(BQ_DATASET).table('projects').insert([row])
  }
  return projectId
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function replaceSchemaColumns(bq: any, projectId: string, projectName: string, sqlTables: Record<string,unknown>[], mongoCollections: Record<string,unknown>[], now: Date) {
  await bq.query({ query: `DELETE FROM ${T('schema_columns')} WHERE project_id=@pid`, params: { pid: projectId } })
  const rows: Record<string,unknown>[] = []
  for (const t of sqlTables) {
    const tn = String(t.name||t.table||''); const fields = Array.isArray(t.fields) ? t.fields as Record<string,unknown>[] : []; let ord = 1
    for (const f of fields) { const cn = String(f.name||''); rows.push({ column_id:randomUUID(), project_id:projectId, project_name:projectName, table_name:tn, column_name:cn, data_type:String(f.type||f.data_type||'').substring(0,100), is_nullable:f.nullable!==false, is_pk:f.key==='PRI'||f.is_pk===true, is_fk:f.key==='MUL'||f.is_fk===true, fk_references:(f.fk_references as string)||null, is_security_risk:isSensitiveCol(cn), risk_reason:isSensitiveCol(cn)?'Sensitive column name':null, table_type:detectTableType(tn,false), ordinal_position:ord++, dataset_name:null, doc_count:null, created_at:now }) }
  }
  for (const col of mongoCollections) {
    const cn_col = String(col.collection||col.name||''); const fields = Array.isArray(col.fields) ? col.fields as Record<string,unknown>[] : []; let ord = 1
    for (const f of fields) { const fn = String(f.name||''); rows.push({ column_id:randomUUID(), project_id:projectId, project_name:projectName, table_name:cn_col, column_name:fn, data_type:String(f.type||'').substring(0,100), is_nullable:true, is_pk:fn==='_id', is_fk:f.type==='ObjectId'&&fn!=='_id', fk_references:null, is_security_risk:isSensitiveCol(fn), risk_reason:isSensitiveCol(fn)?'Sensitive field name':null, table_type:'mongodb', ordinal_position:ord++, dataset_name:null, doc_count:Number(col.doc_count)||null, created_at:now }) }
  }
  if (rows.length) { const CHUNK=200; for (let i=0;i<rows.length;i+=CHUNK) await bq.dataset(BQ_DATASET).table('schema_columns').insert(rows.slice(i,i+CHUNK)) }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function replaceTasks(bq: any, projectId: string, projectName: string, tasks: Record<string,unknown>[], now: Date) {
  await bq.query({ query: `DELETE FROM ${T('tasks')} WHERE project_id=@pid AND generated_by='claude'`, params: { pid: projectId } })
  const rows = tasks.slice(0,200).map(t => {
    const cat = String(t.category||'bug')
    return { task_id:randomUUID(), project_id:projectId, project_name:projectName, category:['security','bug','scalable','research'].includes(cat)?cat:'bug', title:String(t.title||'').substring(0,500), description:(String(t.description||'')||null)?.substring(0,2000), business_impact:(String(t.business_impact||'')||null)?.substring(0,1000), file_path:(String(t.file_path||'')||null)?.substring(0,500), fix_steps:Array.isArray(t.fix_steps)?JSON.stringify(t.fix_steps):null, fix_code:(String(t.fix_code||'')||null)?.substring(0,5000), effort_minutes:Number(t.effort_minutes)||null, severity:['critical','high','medium','low'].includes(String(t.severity||''))?String(t.severity):null, owasp_category:(String(t.owasp_category||'')||null)?.substring(0,100), assigned_to:String(t.assigned_to||'Developer').substring(0,100), status:'open', generated_by:'claude', generated_by_name:null, chat_context:null, created_at:now, updated_at:now }
  })
  if (rows.length) { const CHUNK=100; for (let i=0;i<rows.length;i+=CHUNK) await bq.dataset(BQ_DATASET).table('tasks').insert(rows.slice(i,i+CHUNK)) }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function replaceControllerMethods(bq: any, projectName: string, methods: Record<string,unknown>[], now: Date) {
  await bq.query({ query: `DELETE FROM ${T('controller_methods')} WHERE project_name=@pn`, params: { pn: projectName } })
  const rows = methods.slice(0,200).map(m => ({ method_id:randomUUID(), project_name:projectName, file_path:String(m.file_path||'').substring(0,500), class_name:(String(m.class_name||'')||null)?.substring(0,200), method_name:String(m.method_name||'').substring(0,200), http_method:String(m.http_method||'GET').substring(0,10), auth_level:String(m.auth_level||'public').substring(0,50), auth_condition:(String(m.auth_condition||'')||null)?.substring(0,500), purpose:(String(m.purpose||'')||null)?.substring(0,1000), db_tables_read:(String(m.db_tables_read||'')||null)?.substring(0,500), db_tables_write:(String(m.db_tables_write||'')||null)?.substring(0,500), calls_notification:Boolean(m.calls_notification), notification_ids:null, uses_redis:Boolean(m.uses_redis), redis_keys:null, has_file_upload:Boolean(m.has_file_upload), is_ajax:Boolean(m.is_ajax), role:null, created_at:now }))
  if (rows.length) await bq.dataset(BQ_DATASET).table('controller_methods').insert(rows)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function replaceDataFlows(bq: any, projectName: string, flows: Record<string,unknown>[], now: Date) {
  await bq.query({ query: `DELETE FROM ${T('data_flows')} WHERE project_name=@pn`, params: { pn: projectName } })
  const rows = flows.slice(0,500).map(s => ({ step_id:randomUUID(), project_name:projectName, flow_id:String(s.flow_id||'').substring(0,100), flow_name:String(s.flow_name||'').substring(0,200), step_number:Number(s.step_number)||1, step_actor:String(s.step_actor||'').substring(0,100), step_action:String(s.step_action||'').substring(0,500), step_function:(String(s.step_function||'')||null)?.substring(0,200), step_db_table:(String(s.step_db_table||'')||null)?.substring(0,200), step_db_operation:(String(s.step_db_operation||'')||null)?.substring(0,20), step_triggers_notification:Boolean(s.step_triggers_notification), step_triggers_cache_bust:Boolean(s.step_triggers_cache_bust), created_at:now }))
  if (rows.length) await bq.dataset(BQ_DATASET).table('data_flows').insert(rows)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function replaceDevopsConfig(bq: any, projectName: string, devops: Record<string,unknown>[], now: Date) {
  await bq.query({ query: `DELETE FROM ${T('devops_config')} WHERE project_name=@pn`, params: { pn: projectName } })
  const rows = devops.slice(0,100).map(d => ({ config_id:randomUUID(), project_name:projectName, component:String(d.component||'').substring(0,200), failure_impact:(String(d.failure_impact||'')||null)?.substring(0,500), risk_level:['critical','high','medium','low'].includes(String(d.risk_level||''))?String(d.risk_level):'medium', mitigation:(String(d.mitigation||'')||null)?.substring(0,500), cache_key_pattern:(String(d.cache_key_pattern||'')||null)?.substring(0,200), env_var_name:(String(d.env_var_name||'')||null)?.substring(0,200), env_var_required_by:(String(d.env_var_required_by||'')||null)?.substring(0,200), env_var_sensitive:Boolean(d.env_var_sensitive), created_at:now }))
  if (rows.length) await bq.dataset(BQ_DATASET).table('devops_config').insert(rows)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function replaceAiAgents(bq: any, projectId: string, projectName: string, agents: Record<string,unknown>[], now: Date) {
  await bq.query({ query: `DELETE FROM ${T('ai_agents')} WHERE project_id=@pid`, params: { pid: projectId } })
  const rows = agents.slice(0,50).map(a => ({ agent_id:randomUUID(), project_id:projectId, project_name:projectName, file_path:String(a.file_path||'').substring(0,500), agent_type:String(a.agent_type||'LLM Call').substring(0,100), provider:String(a.provider||'Unknown').substring(0,100), model:(String(a.model||'')||null)?.substring(0,200), purpose:(String(a.purpose||'')||null)?.substring(0,1000), call_pattern:String(a.call_pattern||'Single call').substring(0,100), max_tokens:Number(a.max_tokens)||null, has_system_prompt:Boolean(a.has_system_prompt), has_tools:Boolean(a.has_tools), created_at:now }))
  if (rows.length) await bq.dataset(BQ_DATASET).table('ai_agents').insert(rows)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function replaceCronJobs(bq: any, projectId: string, projectName: string, crons: Record<string,unknown>[], now: Date) {
  await bq.query({ query: `DELETE FROM ${T('cron_jobs')} WHERE project_id=@pid`, params: { pid: projectId } })
  const rows = crons.slice(0,50).map(c => ({ cron_id:randomUUID(), project_id:projectId, project_name:projectName, source:String(c.source||'unknown').substring(0,100), schedule:String(c.schedule||'').substring(0,100), schedule_human:String(c.schedule_human||'').substring(0,200), path:(String(c.path||'')||null)?.substring(0,500), description:(String(c.description||'')||null)?.substring(0,1000), max_duration:Number(c.max_duration)||null, created_at:now }))
  if (rows.length) await bq.dataset(BQ_DATASET).table('cron_jobs').insert(rows)
}

export async function POST(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as Record<string,unknown>
  const projectName = ((body.project_name as string)||'').trim()
  if (!projectName) return NextResponse.json({ error: 'project_name required' }, { status: 400 })

  const bq  = getBigQuery()
  const now = new Date()
  const html: string|null = typeof body.report_html==='string' ? (body.report_html as string).substring(0,900000) : null

  try {
    const structured = parseStructuredData(html)

    // Cast entire ternary expression — both structured.tasks (unknown[]) and
    // body.tasks (unknown[]) become Record<string,unknown>[] in one shot.
    const tasks = (
      (Array.isArray(body.tasks) && (body.tasks as unknown[]).length)
        ? body.tasks
        : structured.tasks
    ) as Record<string,unknown>[]

    const healthScore = calcHealthScore(tasks)
    const projectId   = await upsertProject(bq, body, html, healthScore, now)

    const sqlTables        = Array.isArray(body.tables)         ? body.tables         as Record<string,unknown>[] : []
    const mongoCollections = Array.isArray(body.mongodb_tables) ? body.mongodb_tables as Record<string,unknown>[] : []
    if (sqlTables.length || mongoCollections.length)
      await replaceSchemaColumns(bq, projectId, projectName, sqlTables, mongoCollections, now)

    if (tasks.length) await replaceTasks(bq, projectId, projectName, tasks, now)

    // Wrap entire ternary in () and cast once at the end.
    // This resolves the type regardless of which branch (structured.* or body.*) runs.
    const methods = (
      structured.controller_methods.length
        ? structured.controller_methods
        : (Array.isArray(body.controller_methods) ? body.controller_methods : [])
    ) as Record<string,unknown>[]
    if (methods.length) await replaceControllerMethods(bq, projectName, methods, now)

    const flows = (
      structured.data_flows.length
        ? structured.data_flows
        : (Array.isArray(body.data_flows) ? body.data_flows : [])
    ) as Record<string,unknown>[]
    if (flows.length) await replaceDataFlows(bq, projectName, flows, now)

    const devops = (
      structured.devops_config.length
        ? structured.devops_config
        : (Array.isArray(body.devops_config) ? body.devops_config : [])
    ) as Record<string,unknown>[]
    if (devops.length) await replaceDevopsConfig(bq, projectName, devops, now)

    const agents = (
      structured.ai_agents.length
        ? structured.ai_agents
        : (Array.isArray(body.ai_agents) ? body.ai_agents : [])
    ) as Record<string,unknown>[]
    if (agents.length) await replaceAiAgents(bq, projectId, projectName, agents, now)

    const crons = (
      structured.cron_jobs.length
        ? structured.cron_jobs
        : (Array.isArray(body.cron_jobs) ? body.cron_jobs : [])
    ) as Record<string,unknown>[]
    if (crons.length) await replaceCronJobs(bq, projectId, projectName, crons, now)

    // Warn if STRUCTURED_DATA could not be parsed — tabs will be empty
    const warnings: string[] = !structured._parsed && html
      ? ['STRUCTURED_DATA block could not be parsed — Tasks, Controllers, Flows, Agents and Crons tabs will be empty. Re-run the analysis.']
      : []

    return NextResponse.json({
      ok: true,
      project_id:   projectId,
      health_score: healthScore,
      warnings,
      saved: {
        schema_columns:      sqlTables.reduce((n,t)=>n+((t.fields as unknown[])?.length||0),0)+mongoCollections.reduce((n,c)=>n+((c.fields as unknown[])?.length||0),0),
        mongodb_collections: mongoCollections.length,
        tasks:               tasks.length,
        controller_methods:  methods.length,
        data_flow_steps:     flows.length,
        devops_config:       devops.length,
        ai_agents:           agents.length,
        cron_jobs:           crons.length,
      },
    })

  } catch (err: unknown) {
    console.error('[knowledge-writer] ERROR:', err)
    const e = err as Record<string,unknown>
    return NextResponse.json({ ok:false, error: String((e?.message as string)||((e?.errors as Array<{message:string}>)?.[0]?.message)||JSON.stringify(err)) })
  }
}
