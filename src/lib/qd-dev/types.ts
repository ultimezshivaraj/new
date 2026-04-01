// ─── Project ────────────────────────────────────────────────────────────────

export type ProjectStatus = 'pending' | 'analysing' | 'complete' | 'error'

export interface SecurityIssue {
  id:          string
  severity:    'critical' | 'high' | 'medium' | 'low' | 'info'
  title:       string
  description: string
  file?:       string
  line?:       number
  fix:         string
}

export interface Project {
  project_id:      string
  project_name:    string
  description:     string
  created_by:      string
  created_at:      string   // ISO
  updated_at:      string
  status:          ProjectStatus
  health_score:    number   // 0-100
  file_count:      number
  tech_stack:      string[]
  security_issues: SecurityIssue[]
  report_html:     string   // full AI-generated HTML (stored in BQ)
  error_message?:  string
}

export interface ProjectRow {
  project_id:      string
  project_name:    string
  description:     string
  created_by:      string
  created_at:      { value: string }
  updated_at:      { value: string }
  status:          string
  health_score:    number | null
  file_count:      number | null
  tech_stack:      string | null   // JSON array string
  security_issues: string | null   // JSON array string
  report_html:     string | null
  error_message:   string | null
}

// ─── Work Log ───────────────────────────────────────────────────────────────

export type TaskStatus = 'running' | 'complete'

export interface WorkLog {
  log_id:           string
  project_id:       string
  task_title:       string
  started_at:       string
  stopped_at?:      string
  duration_seconds: number
  status:           TaskStatus
  notes:            string
  created_by:       string
}

export interface WorkLogRow {
  log_id:           string
  project_id:       string
  task_title:       string
  started_at:       { value: string }
  stopped_at:       { value: string } | null
  duration_seconds: number | null
  status:           string
  notes:            string | null
  created_by:       string
}

// ─── Analysis SSE ────────────────────────────────────────────────────────────

export interface AnalysisEvent {
  type:     'progress' | 'complete' | 'error'
  step?:    number      // 1-5
  label?:   string
  data?:    Partial<Project>
  message?: string
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

// ─── API helpers ─────────────────────────────────────────────────────────────

export function adminHeaders(): Record<string, string> {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY ?? 'coinpedia-admin-2026'}`,
  }
}
