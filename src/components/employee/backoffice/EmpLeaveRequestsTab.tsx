'use client'
// src/components/employee/backoffice/EmpLeaveRequestsTab.tsx

import { useState, useMemo } from 'react'

// ── Shared styles ─────────────────────────────────────────────
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
      <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, fontFamily: 'var(--font-mono)', color }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────
export interface LeaveRow {
  id: string; leave_type: string; day_type: string
  leave_type_row_id: string; leave_type_name: string
  from_date: string; to_date: string; first_half_date: string; second_half_date: string
  applied_leaves: string; extra_leaves: string
  team_lead_approval_status: string; team_lead_name: string; leader_comments: string
  approval_status: string; hr_name: string; hr_comments: string
  other_leave_type: string; wfh_leave_type: string; date_n_time: string
  compensation_date: string; compensation_to: string
}
export interface LeaveType { id: string; type: string }

// ── Helpers ───────────────────────────────────────────────────
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
function dateRange(row: LeaveRow): string {
  const dt = row.day_type?.toLowerCase() || ''
  if (dt.includes('first half') && row.first_half_date) return fmtDate(row.first_half_date)
  if (dt.includes('second half') && row.second_half_date) return fmtDate(row.second_half_date)
  if (row.from_date && row.to_date && row.from_date !== row.to_date)
    return `${fmtDate(row.from_date)} – ${fmtDate(row.to_date)}`
  return row.from_date ? fmtDate(row.from_date) : '—'
}

function ApprovalStep({ label, name, status, comment }: { label: string; name: string; status: string; comment: string }) {
  const s = parseInt(status)
  const cfg = s === 1 ? { label: 'Approved', color: '#22c55e', bg: '#22c55e18' }
            : s === 2 ? { label: 'Rejected', color: '#ef4444', bg: '#ef444418' }
            :           { label: 'Pending',  color: '#f59e0b', bg: '#f59e0b18' }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 8, marginBottom: 6 }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', minWidth: 90, paddingTop: 2 }}>{label}</div>
      <div>
        {name && <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3 }}>{name}</div>}
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
        {comment && s === 2 && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, lineHeight: 1.4 }}>{comment}</div>}
      </div>
    </div>
  )
}

// ── Detail Modal ──────────────────────────────────────────────
function DetailModal({ row, onClose }: { row: LeaveRow; onClose: () => void }) {
  const lop = parseFloat(row.extra_leaves || '0')
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Leave Details</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {([
              ['Apply Type',   row.leave_type || '—'],
              ['Request Type', row.leave_type_name || '—'],
              ['Day Type',     row.day_type || '—'],
              ['Date',         dateRange(row)],
              ['Days Applied', row.applied_leaves],
              ['Applied On',   fmtDateTime(row.date_n_time)],
              ...(lop > 0 ? [['Loss of Payment', `${lop} days`]] : []),
              ...(row.compensation_date ? [['Compensation From', fmtDate(row.compensation_date)], ['Compensation To', fmtDate(row.compensation_to)]] : []),
            ] as [string,string][]).map(([l, v]) => (
              <div key={l} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text4)', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>
          {row.other_leave_type && (
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text4)', marginBottom: 4 }}>Reason</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{row.other_leave_type}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text3)', marginBottom: 10 }}>Approval Status</div>
            <ApprovalStep label="Team Leader" name={row.team_lead_name} status={row.team_lead_approval_status} comment={row.leader_comments} />
            <ApprovalStep label="HR"          name={row.hr_name}        status={row.approval_status}           comment={row.hr_comments} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function EmpLeaveRequestsTab({ leaves, leaveTypes }: { leaves: LeaveRow[]; leaveTypes: LeaveType[] }) {
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType,   setFilterType]   = useState('')
  const [selected,     setSelected]     = useState<LeaveRow | null>(null)

  // Summary
  const totalDays  = leaves.reduce((s, r) => s + parseFloat(r.applied_leaves || '0'), 0)
  const lopDays    = leaves.reduce((s, r) => s + parseFloat(r.extra_leaves || '0'), 0)
  const pendingTL  = leaves.filter(r => r.team_lead_approval_status === '0').length
  const pendingHR  = leaves.filter(r => r.approval_status === '0' && r.team_lead_approval_status === '1').length
  const approved   = leaves.filter(r => r.approval_status === '1').length

  const filtered = useMemo(() => leaves.filter(r => {
    if (filterStatus && r.approval_status !== filterStatus) return false
    if (filterType   && r.leave_type_row_id !== filterType) return false
    return true
  }), [leaves, filterStatus, filterType])

  const selStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '6px 10px', cursor: 'pointer',
  }

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Requests"  value={leaves.length}           color="#8b5cf6" />
        <StatCard label="Total Days"      value={totalDays.toFixed(1)}    color="#3b82f6" sub="days applied" />
        <StatCard label="Approved"        value={approved}                color="#22c55e" />
        <StatCard label="Pending"         value={pendingTL + pendingHR}   color="#f59e0b" sub={`TL: ${pendingTL} · HR: ${pendingHR}`} />
        <StatCard label="Loss of Payment" value={lopDays.toFixed(1)}      color="#ef4444" sub="extra days" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="">All Status</option>
          <option value="0">Pending</option>
          <option value="1">Approved</option>
          <option value="2">Rejected</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selStyle}>
          <option value="">All Request Types</option>
          {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.type}</option>)}
        </select>
        {(filterStatus || filterType) && (
          <button onClick={() => { setFilterStatus(''); setFilterType('') }}
            style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
            ✕ Clear
          </button>
        )}
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginLeft: 'auto' }}>
          {filtered.length} of {leaves.length} records
        </span>
      </div>

      {/* Table */}
      {leaves.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 56, color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No leave requests yet</div>
          <div style={{ fontSize: 13 }}>Your leave applications will appear here once submitted.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                {['#', 'Applied On', 'Apply Type', 'Request Type', 'Day Type / Date', 'Days', 'Team Leader', 'HR Approval', 'Action'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No records match your filters</td></tr>
              ) : filtered.map((r, i) => {
                const lop = parseFloat(r.extra_leaves || '0')
                const isWfh = r.wfh_leave_type === '1'
                const tlS = parseInt(r.team_lead_approval_status)
                const hrS = parseInt(r.approval_status)
                const statusCfg = (s: number) => s === 1 ? { label: 'Approved', color: '#22c55e', bg: '#22c55e18' }
                                              : s === 2 ? { label: 'Rejected', color: '#ef4444', bg: '#ef444418' }
                                              :           { label: 'Pending',  color: '#f59e0b', bg: '#f59e0b18' }
                const tlCfg = statusCfg(tlS)
                const hrCfg = statusCfg(hrS)
                return (
                  <tr key={r.id}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <td style={{ ...TD, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' as const }}>{fmtDate(r.date_n_time)}</td>
                    <td style={TD}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: isWfh ? '#3b82f618' : '#8b5cf618', color: isWfh ? '#3b82f6' : '#8b5cf6' }}>
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
                      <div style={{ fontWeight: 700 }}>{r.applied_leaves}</div>
                      {lop > 0 && <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 2 }}>+{lop} LOP</div>}
                    </td>
                    <td style={TD}>
                      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3 }}>{r.team_lead_name || '—'}</div>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: tlCfg.bg, color: tlCfg.color }}>{tlCfg.label}</span>
                    </td>
                    <td style={TD}>
                      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3 }}>{r.hr_name || '—'}</div>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: hrCfg.bg, color: hrCfg.color }}>{hrCfg.label}</span>
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
      )}
      {selected && <DetailModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
