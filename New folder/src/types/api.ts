// ─────────────────────────────────────────────
// REPORT — matches _dashboard_reports BQ table
// ─────────────────────────────────────────────
export interface Report {
  id: string
  name: string
  description?: string
  sql_query: string
  category?: string
  created_by?: string
  created_at?: string | { value: string }
  sort_order?: number
}

// ─────────────────────────────────────────────
// SAVE / CREATE REPORT — POST /api/reports body
// ─────────────────────────────────────────────
export interface SaveReportBody {
  id?: string           // omit = create, provide = update (MERGE)
  name: string
  description?: string
  sql_query: string
  category?: string
  sort_order?: number
}

// ─────────────────────────────────────────────
// RUN REPORT — POST /api/run-report body + response
// ─────────────────────────────────────────────
export interface RunReportBody {
  reportId: string
  limit?: number
  fresh?: boolean       // bypass Redis cache
}

export interface RunReportResult {
  success: boolean
  reportName?: string
  columns: string[]
  rows: Record<string, string | number | boolean | null>[]
  rowCount: number
  duration: string
  cached: boolean
  cacheAge?: string
  error?: string
}

// ─────────────────────────────────────────────
// GENERIC API RESPONSE WRAPPER
// ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ReportsListResponse {
  success: boolean
  reports: Report[]
  error?: string
}
