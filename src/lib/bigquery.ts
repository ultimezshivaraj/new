import { BigQuery } from '@google-cloud/bigquery'
import { createHash } from 'crypto'

export const PROJECT        = 'for-ga4-bitquery-new'
export const DATASET        = 'app_events_mongodb'
export const TEAM_DATASET   = 'qd_ul_ultimez_team'
export const REPORTS_TABLE  = `${PROJECT}.${DATASET}._dashboard_reports`

export function getBigQuery(): BigQuery {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')
  const credentials = JSON.parse(raw) as { project_id: string }
  return new BigQuery({ projectId: credentials.project_id, credentials })
}

export function md5(str: string): string {
  return createHash('md5').update(str).digest('hex')
}

export async function ensureReportsTable(bq: BigQuery): Promise<void> {
  const query = `CREATE TABLE IF NOT EXISTS \`${REPORTS_TABLE}\` (id STRING NOT NULL, name STRING NOT NULL, description STRING, sql_query STRING NOT NULL, category STRING DEFAULT 'General', created_by STRING DEFAULT 'admin', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(), updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(), is_active BOOL DEFAULT TRUE, sort_order INT64 DEFAULT 0)`
  try { await bq.query({ query, location: 'US' }) } catch { /* exists */ }
}

export function detectLocation(sql: string): string {
  if (sql.includes('cp_wp_bigquery'))     return 'us-central1'
  if (sql.includes('qd_cp_app_events'))   return 'us-central1'
  if (sql.includes('qd_ul_ultimez_team')) return 'us-central1'
  if (sql.includes('matomo_export'))      return 'europe-west3'
  return 'US'
}

export async function bqQuery<T = Record<string,unknown>>(sql: string): Promise<T[]> {
  const bq = getBigQuery()
  const [rows] = await bq.query({ query: sql, location: 'us-central1' })
  return rows as T[]
}

// ── EMPLOYEE AUTH (MD5 passwords, email_id / username columns) ──
export interface EmployeeRow {
  id: string; full_name: string; username: string; email_id: string
  login_status: string; create_type_row_id: string; position: string
  location: string; profile_image: string; ultimez_join_date: string
  employee_type: string; employee_category_type: string
  salary: string; allowances: string; mobile_number: string
}

export async function authenticateEmployee(loginId: string, password: string): Promise<EmployeeRow|null> {
  const h = md5(password)
  const q = loginId.replace(/'/g,"''")
  const sql = `
    SELECT CAST(id AS STRING) AS id, full_name, username, email_id,
      CAST(login_status AS STRING) AS login_status,
      CAST(create_type_row_id AS STRING) AS create_type_row_id,
      COALESCE(position,'') AS position,
      COALESCE(location,'') AS location,
      COALESCE(profile_image,'') AS profile_image,
      COALESCE(CAST(ultimez_join_date AS STRING),'') AS ultimez_join_date,
      CAST(employee_type AS STRING) AS employee_type,
      CAST(employee_category_type AS STRING) AS employee_category_type,
      COALESCE(CAST(salary AS STRING),'0') AS salary,
      COALESCE(CAST(allowances AS STRING),'0') AS allowances,
      COALESCE(mobile_number,'') AS mobile_number
    FROM \`${PROJECT}.${TEAM_DATASET}.newultimez_team_tbl_employees\`
    WHERE (LOWER(email_id)=LOWER('${q}') OR LOWER(username)=LOWER('${q}'))
      AND password='${h}' AND login_status=1
    LIMIT 1`
  try { const r = await bqQuery<EmployeeRow>(sql); return r[0]??null } catch { return null }
}

// ── CLIENT AUTH (MD5 passwords, email_id column) ──
export interface ClientRow {
  id: string; full_name: string; email_id: string
  username: string; mobile_number: string; login_status: string
}

export async function authenticateClient(emailId: string, password: string): Promise<ClientRow|null> {
  const h = md5(password)
  const q = emailId.replace(/'/g,"''")
  const sql = `
    SELECT CAST(id AS STRING) AS id, COALESCE(full_name,'') AS full_name,
      email_id, COALESCE(username,'') AS username,
      COALESCE(mobile_number,'') AS mobile_number,
      CAST(login_status AS STRING) AS login_status
    FROM \`${PROJECT}.${TEAM_DATASET}.newultimez_team_tbl_clients\`
    WHERE LOWER(email_id)=LOWER('${q}') AND password='${h}' AND login_status=1
    LIMIT 1`
  try { const r = await bqQuery<ClientRow>(sql); return r[0]??null } catch { return null }
}

// ── ADMIN AUTH ──
// PHP uses: ad_email_id, ad_password (bcrypt via password_verify), ad_name
// bcrypt cannot be verified in BigQuery directly — we fetch the hash and verify in Node
export interface AdminRow { id: string; name: string; email_id: string }

export async function authenticateAdmin(emailId: string, password: string): Promise<AdminRow|null> {
  const q = emailId.replace(/'/g,"''")
  // Fetch the stored bcrypt hash + admin info
  const sql = `
    SELECT
      CAST(id AS STRING) AS id,
      COALESCE(ad_name, ad_email_id) AS name,
      ad_email_id AS email_id,
      ad_password AS password_hash
    FROM \`${PROJECT}.${TEAM_DATASET}.newultimez_team_tbl_admin\`
    WHERE LOWER(ad_email_id) = LOWER('${q}')
    LIMIT 1`
  try {
    const rows = await bqQuery<{ id: string; name: string; email_id: string; password_hash: string }>(sql)
    if (!rows[0]) return null

    const { id, name, email_id, password_hash } = rows[0]

    // Verify bcrypt in Node.js
    const bcrypt = await import('bcryptjs')
    const valid = await bcrypt.compare(password, password_hash)
    if (!valid) return null

    return { id, name, email_id }
  } catch {
    return null
  }
}
