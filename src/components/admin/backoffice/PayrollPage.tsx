'use client'
// src/components/admin/backoffice/PayrollPage.tsx

import { useState, useEffect, useMemo } from 'react'

// ── Shared helpers ─────────────────────────────────────────────
function adminHeaders(): HeadersInit {
  const key = typeof window !== 'undefined' ? (localStorage.getItem('adminKey') ?? '') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
}

const TH: React.CSSProperties = {
  padding: '9px 12px', fontSize: 10, fontFamily: 'var(--font-mono)',
  letterSpacing: 1, textTransform: 'uppercase' as const, color: 'var(--text2)',
  background: 'var(--bg3)', textAlign: 'left' as const,
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' as const,
}
const TD: React.CSSProperties = {
  padding: '9px 12px', fontSize: 12,
  borderBottom: '1px solid var(--border)', color: 'var(--text)',
  verticalAlign: 'top' as const,
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase' as const, color: 'var(--text3)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, fontFamily: 'var(--font-mono)', color }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: 56, color: 'var(--text3)', fontSize: 13 }}>
      <div style={{ fontSize: 24, marginBottom: 10, display: 'inline-block', animation: 'qd-spin 1s linear infinite' }}>⟳</div>
      <div>Loading from BigQuery…</div>
      <style>{`@keyframes qd-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Types ──────────────────────────────────────────────────────
interface PayrollRecord {
  id: string; employee_row_id: string; employee_name: string; position: string
  account_holder_name: string; account_number: string; ifsc_code: string
  bank_name: string; branch_name: string
  salary: string; allowances: string; deductions: string
  ot_payment: string; per_day_salary: string; deducted_days: string
  net_salary_paid: string; payment_status: string; ticket_status: string
  date_n_time: string; payment_date_n_time: string
}

interface BankAccount {
  id: string; employee_row_id: string; employee_name: string; position: string
  account_holder_name: string; account_number: string; ifsc_code: string
  bank_name: string; branch_name: string; date_n_time: string
}

interface BankLog {
  id: string; employee_row_id: string; employee_name: string; position: string
  account_holder_name: string; account_number: string; ifsc_code: string
  bank_name: string; branch_name: string
  approval_status: string; reason_for_reject: string; date_n_time: string
}

interface Summary {
  total_records: string; total_employees: string
  total_salary: string; total_allowances: string; total_deductions: string
  total_ot_payment: string; total_net_paid: string
  pending_count: string; paid_count: string
}

// ── Helpers ────────────────────────────────────────────────────
function fmtDate(d: string) {
  if (!d || d < '2010') return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}
function fmtDateTime(d: string) {
  if (!d || d < '2010') return '—'
  try { return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return d }
}
function fmtCurrency(v: string) {
  const n = parseFloat(v || '0')
  if (n === 0) return '₹0'
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function monthLabel(dateStr: string) {
  if (!dateStr || dateStr < '2010') return '—'
  try { return new Date(dateStr).toLocaleString('en-IN', { month: 'long', year: 'numeric' }) }
  catch { return dateStr.slice(0, 7) }
}

// ── TAB 1: Payroll Records ─────────────────────────────────────
function PayrollRecordsTab({ records, summary }: { records: PayrollRecord[]; summary: Summary }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [selected, setSelected] = useState<PayrollRecord | null>(null)

  const months = useMemo(() => {
    const ms = [...new Set(records.map(r => r.date_n_time.slice(0, 7)))].sort().reverse()
    return ms
  }, [records])

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (search) {
        const q = search.toLowerCase()
        if (!r.employee_name.toLowerCase().includes(q) &&
          !r.account_holder_name.toLowerCase().includes(q) &&
          !r.bank_name.toLowerCase().includes(q)) return false
      }
      if (filterStatus && r.payment_status !== filterStatus) return false
      if (filterMonth && !r.date_n_time.startsWith(filterMonth)) return false
      return true
    })
  }, [records, search, filterStatus, filterMonth])

  const clearFilters = () => { setSearch(''); setFilterStatus(''); setFilterMonth('') }
  const hasFilters = !!(search || filterStatus || filterMonth)

  const selStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11,
    padding: '6px 10px', cursor: 'pointer',
  }

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Records" value={summary.total_records} color="var(--accent-c)" sub={`${summary.total_employees} employees`} />
        <StatCard label="Total Salary" value={fmtCurrency(summary.total_salary)} color="#3b82f6" />
        <StatCard label="Total Deductions" value={fmtCurrency(summary.total_deductions)} color="#ef4444" />
        <StatCard label="Total Net Paid" value={fmtCurrency(summary.total_net_paid)} color="#22c55e" />
        <StatCard label="Pending Payment" value={summary.pending_count} color="#f59e0b" sub={`${summary.paid_count} paid`} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee or bank…"
          style={{ ...selStyle, flex: 1, minWidth: 180 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="">All Status</option>
          <option value="0">Pending</option>
          <option value="1">Paid</option>
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={selStyle}>
          <option value="">All Months</option>
          {months.map(m => <option key={m} value={m}>{monthLabel(m + '-01')}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
            ✕ Clear all
          </button>
        )}
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginLeft: 'auto' }}>
          {filtered.length} of {records.length} records
        </span>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr>
              {['#', 'Requested On', 'Employee', 'Account Details', 'Salary', 'Allowances', 'Deductions', 'OT', 'Net Paid', 'Deducted Days', 'Status', 'Action'].map(h => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={12} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                {hasFilters ? 'No records match your filters' : 'No payroll records found'}
              </td></tr>
            ) : filtered.map((r, i) => {
              const isPaid = r.payment_status === '1'
              return (
                <tr key={r.id}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <td style={{ ...TD, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' as const }}>
                    <div>{monthLabel(r.date_n_time)}</div>
                    <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 2 }}>Auto Generated</div>
                  </td>
                  <td style={TD}>
                    <div style={{ fontWeight: 600 }}>{r.employee_name || '—'}</div>
                    {r.position && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{r.position}</div>}
                  </td>
                  <td style={TD}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{r.account_holder_name}</div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginTop: 2 }}>{r.account_number}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{r.ifsc_code}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{r.bank_name}</div>
                  </td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' as const }}>{fmtCurrency(r.salary)}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' as const }}>{fmtCurrency(r.allowances)}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: '#ef4444', whiteSpace: 'nowrap' as const }}>{fmtCurrency(r.deductions)}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: '#f59e0b', whiteSpace: 'nowrap' as const }}>{fmtCurrency(r.ot_payment)}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: '#22c55e', fontWeight: 700, whiteSpace: 'nowrap' as const }}>{fmtCurrency(r.net_salary_paid)}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', textAlign: 'center' as const }}>
                    {parseFloat(r.deducted_days) > 0
                      ? <span style={{ color: '#f59e0b' }}>{r.deducted_days} days</span>
                      : <span style={{ color: 'var(--text4)' }}>0</span>}
                  </td>
                  <td style={TD}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: isPaid ? '#22c55e18' : '#f59e0b18', color: isPaid ? '#22c55e' : '#f59e0b' }}>
                      {isPaid ? 'Paid' : 'Pending'}
                    </span>
                    {r.payment_date_n_time && isPaid && (
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{fmtDate(r.payment_date_n_time)}</div>
                    )}
                  </td>
                  <td style={TD}>
                    <button onClick={() => setSelected(r)} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text)', whiteSpace: 'nowrap' as const }}>
                      View
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <div onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{selected.employee_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{monthLabel(selected.date_n_time)}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['Account Holder', selected.account_holder_name],
                  ['Account Number', selected.account_number],
                  ['IFSC Code', selected.ifsc_code],
                  ['Bank Name', selected.bank_name],
                  ['Branch', selected.branch_name],
                  ['Salary', fmtCurrency(selected.salary)],
                  ['Allowances', fmtCurrency(selected.allowances)],
                  ['Deductions', fmtCurrency(selected.deductions)],
                  ['OT Payment', fmtCurrency(selected.ot_payment)],
                  ['Per Day Salary', fmtCurrency(selected.per_day_salary)],
                  ['Deducted Days', `${selected.deducted_days} days`],
                  ['Net Salary Paid', fmtCurrency(selected.net_salary_paid)],
                  ['Payment Status', selected.payment_status === '1' ? 'Paid' : 'Pending'],
                  ['Payment Date', fmtDate(selected.payment_date_n_time)],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text4)', marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TAB 2: Bank Accounts ───────────────────────────────────────
function BankAccountsTab({ accounts }: { accounts: BankAccount[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() =>
    accounts.filter(a => {
      if (!search) return true
      const q = search.toLowerCase()
      return a.employee_name.toLowerCase().includes(q) ||
        a.bank_name.toLowerCase().includes(q) ||
        a.account_number.toLowerCase().includes(q) ||
        a.ifsc_code.toLowerCase().includes(q)
    })
    , [accounts, search])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee, bank, IFSC…"
          style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '6px 10px' }} />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>
          {filtered.length} of {accounts.length} accounts
        </span>
      </div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              {['#', 'Employee', 'Account Holder Name', 'Account Number', 'IFSC Code', 'Bank Name', 'Branch', 'Registered On'].map(h => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No accounts found</td></tr>
            ) : filtered.map((a, i) => (
              <tr key={a.id}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                <td style={{ ...TD, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                <td style={TD}>
                  <div style={{ fontWeight: 600 }}>{a.employee_name || '—'}</div>
                  {a.position && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{a.position}</div>}
                </td>
                <td style={{ ...TD, fontWeight: 500 }}>{a.account_holder_name || '—'}</td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{a.account_number || '—'}</td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{a.ifsc_code || '—'}</td>
                <td style={TD}>{a.bank_name || '—'}</td>
                <td style={{ ...TD, fontSize: 11, color: 'var(--text3)' }}>{a.branch_name || '—'}</td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fmtDate(a.date_n_time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── TAB 3: Bank Change History ─────────────────────────────────
function BankChangeHistoryTab({ logs }: { logs: BankLog[] }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const filtered = useMemo(() =>
    logs.filter(l => {
      if (search) {
        const q = search.toLowerCase()
        if (!l.employee_name.toLowerCase().includes(q) &&
          !l.bank_name.toLowerCase().includes(q) &&
          !l.account_number.toLowerCase().includes(q)) return false
      }
      if (filterStatus && l.approval_status !== filterStatus) return false
      return true
    })
    , [logs, search, filterStatus])

  const selStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '6px 10px', cursor: 'pointer',
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Changes" value={logs.length} color="var(--accent-c)" />
        <StatCard label="Approved Changes" value={logs.filter(l => l.approval_status === '1').length} color="#22c55e" />
        <StatCard label="Rejected Changes" value={logs.filter(l => l.approval_status === '2').length} color="#ef4444" />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee or bank…"
          style={{ ...selStyle, flex: 1, minWidth: 180 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="">All Status</option>
          <option value="0">Pending</option>
          <option value="1">Approved</option>
          <option value="2">Rejected</option>
        </select>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginLeft: 'auto' }}>
          {filtered.length} of {logs.length} records
        </span>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead>
            <tr>
              {['#', 'Changed On', 'Employee', 'Account Holder', 'Account Number', 'IFSC', 'Bank', 'Status', 'Reason'].map(h => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No records found</td></tr>
            ) : filtered.map((l, i) => {
              const s = parseInt(l.approval_status)
              const cfg = s === 1 ? { label: 'Approved', color: '#22c55e', bg: '#22c55e18' }
                : s === 2 ? { label: 'Rejected', color: '#ef4444', bg: '#ef444418' }
                  : { label: 'Pending', color: '#f59e0b', bg: '#f59e0b18' }
              return (
                <tr key={l.id}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <td style={{ ...TD, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' as const }}>{fmtDateTime(l.date_n_time)}</td>
                  <td style={TD}>
                    <div style={{ fontWeight: 600 }}>{l.employee_name || '—'}</div>
                    {l.position && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{l.position}</div>}
                  </td>
                  <td style={TD}>{l.account_holder_name || '—'}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{l.account_number || '—'}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{l.ifsc_code || '—'}</td>
                  <td style={TD}>{l.bank_name || '—'}</td>
                  <td style={TD}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </td>
                  <td style={{ ...TD, fontSize: 11, color: 'var(--text3)', maxWidth: 180 }}>
                    {l.reason_for_reject || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────
type PayrollSubTab = 'records' | 'accounts' | 'logs'

export default function PayrollPage({ initialTab }: { initialTab?: PayrollSubTab }) {
  const subTab = initialTab ?? 'records'
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [bankLogs, setBankLogs] = useState<BankLog[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loaded) return
    setLoading(true)
    fetch('/api/admin/back-office/payroll', { headers: adminHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setRecords(d.records as PayrollRecord[])
          setSummary(d.summary as Summary)
          setBankAccounts(d.bankAccounts as BankAccount[])
          setBankLogs(d.bankLogs as BankLog[])
        } else { setError(d.detail || d.error || 'API error') }
        setLoaded(true)
      })
      .catch(e => { setError(String(e)); setLoaded(true) })
      .finally(() => setLoading(false))
  }, [loaded])

  

  if (loading) return <Spinner />
  if (error) return (
    <div style={{ padding: 24, color: '#ef4444', fontSize: 13, background: '#ef444410', borderRadius: 8 }}>⚠ {error}</div>
  )

  return (
    <div>
      {subTab === 'records' && summary && <PayrollRecordsTab records={records} summary={summary} />}
      {subTab === 'accounts' && <BankAccountsTab accounts={bankAccounts} />}
      {subTab === 'logs' && <BankChangeHistoryTab logs={bankLogs} />}
    </div>
  )
}
