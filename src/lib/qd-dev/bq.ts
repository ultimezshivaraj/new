import { BigQuery } from '@google-cloud/bigquery'
import type { Project, ProjectRow, WorkLog, WorkLogRow, ProjectStatus, SecurityIssue } from './types'

// ─── Singleton ───────────────────────────────────────────────────────────────

let _bq: BigQuery | null = null

export function getBQ(): BigQuery {
  if (_bq) return _bq
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')
  const creds = JSON.parse(raw)
  _bq = new BigQuery({ projectId: 'for-ga4-bitquery-new', credentials: creds })
  return _bq
}

// ─── DDL (run once) ───────────────────────────────────────────────────────────

export const DDL = `
CREATE TABLE IF NOT EXISTS \`for-ga4-bitquery-new.QDDev_Project.projects\` (
  project_id      STRING    NOT NULL,
  project_name    STRING    NOT NULL,
  description     STRING,
  created_by      STRING,
  created_at      TIMESTAMP NOT NULL,
  updated_at      TIMESTAMP NOT NULL,
  status          STRING    NOT NULL,
  health_score    INT64,
  file_count      INT64,
  tech_stack      STRING,
  security_issues STRING,
  report_html     STRING,
  error_message   STRING
);

CREATE TABLE IF NOT EXISTS \`for-ga4-bitquery-new.QDDev_Project.work_log\` (
  log_id           STRING    NOT NULL,
  project_id       STRING    NOT NULL,
  task_title       STRING    NOT NULL,
  started_at       TIMESTAMP NOT NULL,
  stopped_at       TIMESTAMP,
  duration_seconds INT64,
  status           STRING    NOT NULL,
  notes            STRING,
  created_by       STRING
);
`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseProject(r: ProjectRow): Project {
  return {
    project_id:      r.project_id,
    project_name:    r.project_name,
    description:     r.description ?? '',
    created_by:      r.created_by ?? '',
    created_at:      r.created_at?.value ?? '',
    updated_at:      r.updated_at?.value ?? '',
    status:          (r.status as ProjectStatus) ?? 'pending',
    health_score:    r.health_score ?? 0,
    file_count:      r.file_count ?? 0,
    tech_stack:      r.tech_stack ? JSON.parse(r.tech_stack) : [],
    security_issues: r.security_issues ? JSON.parse(r.security_issues) : [],
    report_html:     r.report_html ?? '',
    error_message:   r.error_message ?? undefined,
  }
}

function parseWorkLog(r: WorkLogRow): WorkLog {
  return {
    log_id:           r.log_id,
    project_id:       r.project_id,
    task_title:       r.task_title,
    started_at:       r.started_at?.value ?? '',
    stopped_at:       r.stopped_at?.value ?? undefined,
    duration_seconds: r.duration_seconds ?? 0,
    status:           (r.status as 'running' | 'complete') ?? 'complete',
    notes:            r.notes ?? '',
    created_by:       r.created_by ?? '',
  }
}

// ─── Projects CRUD ───────────────────────────────────────────────────────────

export async function listProjects(): Promise<Project[]> {
  const [rows] = await getBQ().query({
    query: `
      SELECT * FROM \`for-ga4-bitquery-new.QDDev_Project.projects\`
      ORDER BY created_at DESC
      LIMIT 100
    `,
  })
  return (rows as ProjectRow[]).map(parseProject)
}

export async function getProject(id: string): Promise<Project | null> {
  const [rows] = await getBQ().query({
    query: `
      SELECT * FROM \`for-ga4-bitquery-new.QDDev_Project.projects\`
      WHERE project_id = @id
      LIMIT 1
    `,
    params: { id },
  })
  if (!rows.length) return null
  return parseProject(rows[0] as ProjectRow)
}

export async function insertProject(p: {
  project_id:   string
  project_name: string
  description:  string
  created_by:   string
}): Promise<void> {
  await getBQ().query({
    query: `
      INSERT INTO \`for-ga4-bitquery-new.QDDev_Project.projects\`
        (project_id, project_name, description, created_by, created_at, updated_at, status,
         health_score, file_count, tech_stack, security_issues, report_html, error_message)
      VALUES
        (@project_id, @project_name, @description, @created_by,
         CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), 'pending',
         NULL, NULL, NULL, NULL, NULL, NULL)
    `,
    params: p,
  })
}

export async function updateProjectStatus(
  id:     string,
  status: ProjectStatus,
  extra:  Partial<{
    health_score:    number
    file_count:      number
    tech_stack:      string[]
    security_issues: SecurityIssue[]
    report_html:     string
    error_message:   string
  }> = {}
): Promise<void> {
  const sets: string[] = ['updated_at = CURRENT_TIMESTAMP()', 'status = @status']
  const params: Record<string, unknown> = { id, status }

  if (extra.health_score    != null) { sets.push('health_score = @health_score');       params.health_score    = extra.health_score }
  if (extra.file_count      != null) { sets.push('file_count = @file_count');           params.file_count      = extra.file_count }
  if (extra.tech_stack      != null) { sets.push('tech_stack = @tech_stack');           params.tech_stack      = JSON.stringify(extra.tech_stack) }
  if (extra.security_issues != null) { sets.push('security_issues = @security_issues'); params.security_issues = JSON.stringify(extra.security_issues) }
  if (extra.report_html     != null) { sets.push('report_html = @report_html');         params.report_html     = extra.report_html }
  if (extra.error_message   != null) { sets.push('error_message = @error_message');     params.error_message   = extra.error_message }

  await getBQ().query({
    query: `UPDATE \`for-ga4-bitquery-new.QDDev_Project.projects\` SET ${sets.join(', ')} WHERE project_id = @id`,
    params,
  })
}

// ─── Work Log CRUD ───────────────────────────────────────────────────────────

export async function listWorkLogs(projectId: string): Promise<WorkLog[]> {
  const [rows] = await getBQ().query({
    query: `
      SELECT * FROM \`for-ga4-bitquery-new.QDDev_Project.work_log\`
      WHERE project_id = @projectId
      ORDER BY started_at DESC
      LIMIT 200
    `,
    params: { projectId },
  })
  return (rows as WorkLogRow[]).map(parseWorkLog)
}

export async function insertWorkLog(w: {
  log_id:     string
  project_id: string
  task_title: string
  created_by: string
}): Promise<void> {
  await getBQ().query({
    query: `
      INSERT INTO \`for-ga4-bitquery-new.QDDev_Project.work_log\`
        (log_id, project_id, task_title, started_at, stopped_at, duration_seconds, status, notes, created_by)
      VALUES
        (@log_id, @project_id, @task_title, CURRENT_TIMESTAMP(), NULL, NULL, 'running', NULL, @created_by)
    `,
    params: w,
  })
}

export async function stopWorkLog(logId: string, notes: string): Promise<void> {
  await getBQ().query({
    query: `
      UPDATE \`for-ga4-bitquery-new.QDDev_Project.work_log\`
      SET stopped_at = CURRENT_TIMESTAMP(),
          duration_seconds = TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), started_at, SECOND),
          status = 'complete',
          notes = @notes
      WHERE log_id = @logId
    `,
    params: { logId, notes },
  })
}
