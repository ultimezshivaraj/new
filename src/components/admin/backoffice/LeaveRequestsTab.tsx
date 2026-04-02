'use client'
// src/components/admin/backoffice/LeaveRequestsTab.tsx

import { useState, useEffect, useMemo } from 'react'

// ── Shared styles (same as EmployeeMonitoringPage) ────────────
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

function adminHeaders(): HeadersInit {
  const key = typeof window !== 'undefined' ? (localStorage.getItem('adminKey') ?? '') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase' as const, color: 'var(--text3)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, fontFamily: 'var(--font-mono)', color }}>{value}</div>
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

// ── Types ─────────────────────────────────────────────────────
interface LeaveRow {
  id: string
  employee_row_id: string
  employee_name: string
  position: string
  profile_image: string
  leave_type: string
  day_type: string
  leave_type_row_id: string
  leave_type_name: string
  from_date: string
  to_date: string
  first_half_date: string
  second_half_date: string
  applied_leaves: string
  extra_leaves: string
  team_lead_approval_status: string
  team_lead_name: string
  leader_comments: string
  approval_status: string
  hr_name: string
  hr_comments: string
  other_leave_type: string
  wfh_leave_type: string
  date_n_time: string
  compensation_date: string
  compensation_to: string
}

interface LeaveType { id: string; type: string }

interface Summary {
  total_requests: string
  total_days: string
  apply_type_count: string
  request_type_count: string
  total_lop_days: string
  pending_hr: string
  pending_tl: string
  awaiting_hr_only: string
}

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(d: string) {
  if (!d || d < '2010') return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}
function fmtDateTime(d: string) {
  if (!d || d < '2010') return '—'
  try {
    return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return d }
}

function dateRange(row: LeaveRow): string {
  const dt = row.day_type?.toLowerCase() || ''
  if (dt.includes('first half') && row.first_half_date) return fmtDate(row.first_half_date)
  if (dt.includes('second half') && row.second_half_date) return fmtDate(row.second_half_date)
  if (row.from_date && row.to_date && row.from_date !== row.to_date)
    return `${fmtDate(row.from_date)} – ${fmtDate(row.to_date)}`
  if (row.from_date) return fmtDate(row.from_date)
  return '—'
}

function ApprovalChip({ status, name, comment }: { status: string; name: string; comment: string }) {
  const s = parseInt(status)
  const cfg = s === 1
    ? { label: 'Approved', color: '#22c55e', bg: '#22c55e18' }
    : s === 2
    ? { label: 'Rejected', color: '#ef4444', bg: '#ef444418' }
    : { label: 'Pending',  color: '#f59e0b', bg: '#f59e0b18' }
  return (
    <div>
      {name && <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3 }}>{name}</div>}
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
      {comment && s === 2 && (
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, maxWidth: 140, lineHeight: 1.4 }}>{comment}</div>
      )}
    </div>
  )
}

// ── Detail Modal ──────────────────────────────────────────────
function DetailModal({ row, onClose }: { row: LeaveRow; onClose: () => void }) {
  const isWfh = row.wfh_leave_type === '1'
  const lop = parseFloat(row.extra_leaves || '0')

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{row.employee_name || 'Employee'}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{row.position || 'No position'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isWfh && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: '#3b82f618', color: '#3b82f6' }}>WFH</span>}
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Leave info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['Apply Type',    row.leave_type || '—'],
              ['Request Type',  row.leave_type_name || '—'],
              ['Day Type',      row.day_type || '—'],
              ['Date Range',    dateRange(row)],
              ['Days Applied',  row.applied_leaves],
              ['Applied On',    fmtDateTime(row.date_n_time)],
              ...(lop > 0 ? [['Loss of Payment', `${lop} days`] as [string,string]] : []),
              ...(row.compensation_date ? [['Compensation From', fmtDate(row.compensation_date)], ['Compensation To', fmtDate(row.compensation_to)]] as [string,string][] : []),
            ].map(([label, val]) => (
              <div key={label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text4)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Reason */}
          {row.other_leave_type && (
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text4)', marginBottom: 4 }}>Reason</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{row.other_leave_type}</div>
            </div>
          )}

          {/* Approval timeline */}
          <div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text3)', marginBottom: 10 }}>Approval Timeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Team Leader', name: row.team_lead_name, status: row.team_lead_approval_status, comment: row.leader_comments },
                { label: 'HR',          name: row.hr_name,         status: row.approval_status,           comment: row.hr_comments },
              ].map(step => (
                <div key={step.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', minWidth: 90, paddingTop: 2 }}>{step.label}</div>
                  <ApprovalChip status={step.status} name={step.name} comment={step.comment} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function LeaveRequestsTab() {
  const [leaves,     setLeaves]     = useState<LeaveRow[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [summary,    setSummary]    = useState<Summary | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [loaded,     setLoaded]     = useState(false)
  const [error,      setError]      = useState('')

  // Filters
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType,   setFilterType]   = useState('')
  const [filterApply,  setFilterApply]  = useState('')
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')

  // Detail modal
  const [selected, setSelected] = useState<LeaveRow | null>(null)

  useEffect(() => {
    if (loaded) return
    setLoading(true)
    fetch('/api/admin/back-office/leave', { headers: adminHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setLeaves(d.leaves as LeaveRow[])
          setLeaveTypes(d.leaveTypes as LeaveType[])
          setSummary(d.summary as Summary)
        } else { setError(d.detail || d.error || 'API error') }
        setLoaded(true)
      })
      .catch(e => { setError(String(e)); setLoaded(true) })
      .finally(() => setLoading(false))
  }, [loaded])

  // Filtered list
  const filtered = useMemo(() => {
    return leaves.filter(r => {
      if (search) {
        const q = search.toLowerCase()
        if (!r.employee_name.toLowerCase().includes(q) &&
            !r.leave_type_name.toLowerCase().includes(q) &&
            !r.position.toLowerCase().includes(q)) return false
      }
      if (filterStatus) {
        if (filterStatus === '0' && r.approval_status !== '0') return false
        if (filterStatus === '1' && r.approval_status !== '1') return false
        if (filterStatus === '2' && r.approval_status !== '2') return false
      }
      if (filterType && r.leave_type_row_id !== filterType) return false
      if (filterApply && r.leave_type.toLowerCase() !== filterApply.toLowerCase()) return false
      if (dateFrom && r.date_n_time < dateFrom) return false
      if (dateTo   && r.date_n_time.slice(0,10) > dateTo) return false
      return true
    })
  }, [leaves, search, filterStatus, filterType, filterApply, dateFrom, dateTo])

  const clearFilters = () => { setSearch(''); setFilterStatus(''); setFilterType(''); setFilterApply(''); setDateFrom(''); setDateTo('') }
  const hasFilters = !!(search || filterStatus || filterType || filterApply || dateFrom || dateTo)

  const sel = (s: React.CSSProperties): React.CSSProperties => ({
    ...s, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '6px 10px', cursor: 'pointer',
  })

  if (loading) return <Spinner />
  if (error) return (
    <div style={{ padding: 24, color: '#ef4444', fontSize: 13, background: '#ef444410', borderRadius: 8 }}>
      ⚠ {error}
    </div>
  )

  return (
    <div>
      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 20 }}>
          <StatCard label="Total Requests"   value={summary.total_requests}   color="var(--accent-c)" />
          <StatCard label="Total Days"       value={summary.total_days}       color="#3b82f6" sub="days applied" />
          <StatCard label="Apply Types"      value={summary.apply_type_count} color="#06b6d4" />
          <StatCard label="Request Types"    value={summary.request_type_count} color="#8b5cf6" />
          <StatCard label="Loss of Payment"  value={summary.total_lop_days}   color="#f59e0b" sub="extra days" />
          <StatCard label="Pending HR"       value={summary.pending_hr}       color="#ef4444" sub="awaiting approval" />
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search employee, position…"
          style={{ ...sel({}), flex: 1, minWidth: 180, padding: '7px 10px' }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={sel({})}>
          <option value="">All Status</option>
          <option value="0">Pending</option>
          <option value="1">Approved</option>
          <option value="2">Rejected</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={sel({})}>
          <option value="">All Request Types</option>
          {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.type}</option>)}
        </select>
        <select value={filterApply} onChange={e => setFilterApply(e.target.value)} style={sel({})}>
          <option value="">All Apply Types</option>
          <option value="Leave">Leave</option>
          <option value="WFH">WFH</option>
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={sel({})} />
        <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={sel({})} />
        {hasFilters && (
          <button onClick={clearFilters} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
            ✕ Clear all
          </button>
        )}
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginLeft: 'auto' }}>
          {filtered.length} of {leaves.length} records
        </span>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead>
            <tr>
              {['#', 'Applied On', 'Employee', 'Apply Type', 'Request Type', 'Day Type / Date', 'Days', 'Team Leader', 'HR Approval', 'Action'].map(h => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                {hasFilters ? 'No records match your filters' : 'No leave records found'}
              </td></tr>
            ) : filtered.map((r, i) => {
              const lop = parseFloat(r.extra_leaves || '0')
              const isWfh = r.wfh_leave_type === '1'
              return (
                <tr key={r.id}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <td style={{ ...TD, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' as const }}>{fmtDateTime(r.date_n_time)}</td>
                  <td style={TD}>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{r.employee_name || '—'}</div>
                    {r.position && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{r.position}</div>}
                  </td>
                  <td style={TD}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: isWfh ? '#3b82f618' : '#6366f118', color: isWfh ? '#3b82f6' : '#6366f1' }}>
                      {isWfh ? 'WFH' : (r.leave_type || 'Leave')}
                    </span>
                  </td>
                  <td style={TD}>
                    <div style={{ fontSize: 12 }}>{r.leave_type_name || '—'}</div>
                    {r.other_leave_type && (
                      <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 2, cursor: 'pointer' }} onClick={() => setSelected(r)}>
                        📄 View Reason
                      </div>
                    )}
                  </td>
                  <td style={TD}>
                    <div style={{ fontSize: 11, fontWeight: 500 }}>{r.day_type || '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{dateRange(r)}</div>
                  </td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', textAlign: 'center' as const }}>
                    <div style={{ fontWeight: 700, color: parseFloat(r.applied_leaves) > 2 ? '#ef4444' : 'var(--text)' }}>{r.applied_leaves}</div>
                    {lop > 0 && <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 2 }}>+{lop} LOP</div>}
                  </td>
                  <td style={TD}>
                    <ApprovalChip status={r.team_lead_approval_status} name={r.team_lead_name} comment={r.leader_comments} />
                  </td>
                  <td style={TD}>
                    {r.hr_name
                      ? <ApprovalChip status={r.approval_status} name={r.hr_name} comment={r.hr_comments} />
                      : <span style={{ fontSize: 10, color: 'var(--text4)' }}>—</span>
                    }
                  </td>
                  <td style={TD}>
                    <button
                      onClick={() => setSelected(r)}
                      style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text)', whiteSpace: 'nowrap' as const }}>
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
      {selected && <DetailModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
