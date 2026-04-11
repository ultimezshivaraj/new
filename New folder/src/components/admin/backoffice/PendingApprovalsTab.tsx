'use client'
// src/components/admin/backoffice/PendingApprovalsTab.tsx

import { useState, useEffect, useMemo } from 'react'
import StatCard from '@/components/shared/StatCard'

// ── Shared helpers ────────────────────────────────────────────
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
}

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

function daysAgo(dateStr: string): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return 999
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
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

function UrgencyBadge({ row }: { row: LeaveRow }) {
  const until = daysUntil(row.from_date)
  if (until < 0) return (
    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 7px', borderRadius: 10, background: '#ef444422', color: '#ef4444' }}>
      Leave started
    </span>
  )
  if (until <= 1) return (
    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 7px', borderRadius: 10, background: '#ef444422', color: '#ef4444' }}>
      🔴 {until === 0 ? 'Tomorrow' : 'Today'} — urgent
    </span>
  )
  if (until <= 3) return (
    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 7px', borderRadius: 10, background: '#f59e0b22', color: '#f59e0b' }}>
      ⚠ In {until} days
    </span>
  )
  return null
}

// ── Detail Modal ──────────────────────────────────────────────
function DetailModal({ row, onClose }: { row: LeaveRow; onClose: () => void }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{row.employee_name}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{row.position || 'No position'}</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['Apply Type',   row.leave_type || '—'],
              ['Request Type', row.leave_type_name || '—'],
              ['Day Type',     row.day_type || '—'],
              ['Date',         dateRange(row)],
              ['Days',         row.applied_leaves],
              ['Applied On',   fmtDateTime(row.date_n_time)],
            ].map(([l, v]) => (
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
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text3)', marginBottom: 10 }}>Current Approval Status</div>
            {[
              { label: 'Team Leader', name: row.team_lead_name, status: row.team_lead_approval_status, comment: row.leader_comments },
              { label: 'HR',          name: row.hr_name,         status: row.approval_status,           comment: row.hr_comments },
            ].map(step => {
              const s = parseInt(step.status)
              const cfg = s === 1 ? { label: 'Approved', color: '#22c55e', bg: '#22c55e18' }
                        : s === 2 ? { label: 'Rejected', color: '#ef4444', bg: '#ef444418' }
                        :           { label: 'Pending',  color: '#f59e0b', bg: '#f59e0b18' }
              return (
                <div key={step.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', minWidth: 90, paddingTop: 2 }}>{step.label}</div>
                  <div>
                    {step.name && <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3 }}>{step.name}</div>}
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    {step.comment && s === 2 && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, lineHeight: 1.4 }}>{step.comment}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-tab: rows awaiting TL ─────────────────────────────────
function AwaitingTLTab({ rows }: { rows: LeaveRow[] }) {
  const [selected, setSelected] = useState<LeaveRow | null>(null)

  if (rows.length === 0) return (
    <div style={{ textAlign: 'center', padding: 56, color: 'var(--text3)' }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>All clear</div>
      <div style={{ fontSize: 13 }}>No leaves awaiting Team Leader approval.</div>
    </div>
  )

  return (
    <>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              {['#', 'Applied On', 'Employee', 'Type', 'Date', 'Days', 'Team Leader', 'Urgency', 'Action'].map(h => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const ago = daysAgo(r.date_n_time)
              const isWfh = r.wfh_leave_type === '1'
              return (
                <tr key={r.id}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <td style={{ ...TD, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' as const }}>
                    <div>{fmtDate(r.date_n_time)}</div>
                    <div style={{ color: ago > 3 ? '#ef4444' : 'var(--text3)', fontSize: 10, marginTop: 2 }}>
                      {ago === 0 ? 'Today' : `${ago}d ago`}
                    </div>
                  </td>
                  <td style={TD}>
                    <div style={{ fontWeight: 600 }}>{r.employee_name}</div>
                    {r.position && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{r.position}</div>}
                  </td>
                  <td style={TD}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: isWfh ? '#3b82f618' : '#6366f118', color: isWfh ? '#3b82f6' : '#6366f1' }}>
                      {isWfh ? 'WFH' : (r.leave_type || 'Leave')}
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{r.leave_type_name || '—'}</div>
                  </td>
                  <td style={TD}>
                    <div style={{ fontSize: 11, fontWeight: 500 }}>{r.day_type}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{dateRange(r)}</div>
                  </td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', textAlign: 'center' as const, fontWeight: 700 }}>
                    {r.applied_leaves}
                  </td>
                  <td style={{ ...TD, fontSize: 11, color: 'var(--text3)' }}>
                    {r.team_lead_name || '—'}
                  </td>
                  <td style={TD}>
                    <UrgencyBadge row={r} />
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
      {selected && <DetailModal row={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

// ── Sub-tab: rows awaiting HR ─────────────────────────────────
function AwaitingHRTab({ rows }: { rows: LeaveRow[] }) {
  const [selected, setSelected] = useState<LeaveRow | null>(null)

  if (rows.length === 0) return (
    <div style={{ textAlign: 'center', padding: 56, color: 'var(--text3)' }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>All clear</div>
      <div style={{ fontSize: 13 }}>No leaves awaiting HR approval.</div>
    </div>
  )

  return (
    <>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              {['#', 'Applied On', 'Employee', 'Type', 'Date', 'Days', 'TL Approved By', 'HR Approver', 'Urgency', 'Action'].map(h => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const ago = daysAgo(r.date_n_time)
              const isWfh = r.wfh_leave_type === '1'
              return (
                <tr key={r.id}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <td style={{ ...TD, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' as const }}>
                    <div>{fmtDate(r.date_n_time)}</div>
                    <div style={{ color: ago > 3 ? '#ef4444' : 'var(--text3)', fontSize: 10, marginTop: 2 }}>
                      {ago === 0 ? 'Today' : `${ago}d ago`}
                    </div>
                  </td>
                  <td style={TD}>
                    <div style={{ fontWeight: 600 }}>{r.employee_name}</div>
                    {r.position && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{r.position}</div>}
                  </td>
                  <td style={TD}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: isWfh ? '#3b82f618' : '#6366f118', color: isWfh ? '#3b82f6' : '#6366f1' }}>
                      {isWfh ? 'WFH' : (r.leave_type || 'Leave')}
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{r.leave_type_name || '—'}</div>
                  </td>
                  <td style={TD}>
                    <div style={{ fontSize: 11, fontWeight: 500 }}>{r.day_type}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{dateRange(r)}</div>
                  </td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', textAlign: 'center' as const, fontWeight: 700 }}>
                    {r.applied_leaves}
                  </td>
                  <td style={{ ...TD, fontSize: 11 }}>
                    <div style={{ color: '#22c55e', fontWeight: 500 }}>{r.team_lead_name || '—'}</div>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '1px 7px', borderRadius: 10, background: '#22c55e18', color: '#22c55e' }}>Approved</span>
                  </td>
                  <td style={{ ...TD, fontSize: 11, color: 'var(--text3)' }}>
                    {r.hr_name || '—'}
                  </td>
                  <td style={TD}>
                    <UrgencyBadge row={r} />
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
      {selected && <DetailModal row={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

// ── Main Component ────────────────────────────────────────────
type SubTab = 'tl' | 'hr'

export default function PendingApprovalsTab() {
  const [leaves,  setLeaves]  = useState<LeaveRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded,  setLoaded]  = useState(false)
  const [error,   setError]   = useState('')
  const [subTab,  setSubTab]  = useState<SubTab>('tl')

  useEffect(() => {
    if (loaded) return
    setLoading(true)
    fetch('/api/admin/back-office/leave', { headers: adminHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.success) setLeaves(d.leaves as LeaveRow[])
        else setError(d.detail || d.error || 'API error')
        setLoaded(true)
      })
      .catch(e => { setError(String(e)); setLoaded(true) })
      .finally(() => setLoading(false))
  }, [loaded])

  // Pending TL — team_lead_approval_status = 0, sorted oldest first
  const pendingTL = useMemo(() =>
    leaves
      .filter(r => r.team_lead_approval_status === '0')
      .sort((a, b) => a.date_n_time.localeCompare(b.date_n_time))
  , [leaves])

  // Pending HR — TL approved (1) but HR not yet (0), sorted oldest first
  const pendingHR = useMemo(() =>
    leaves
      .filter(r => r.team_lead_approval_status === '1' && r.approval_status === '0')
      .sort((a, b) => a.date_n_time.localeCompare(b.date_n_time))
  , [leaves])

  // Urgent — leave starts within 2 days and still pending
  const urgentCount = useMemo(() =>
    [...pendingTL, ...pendingHR].filter(r => daysUntil(r.from_date) <= 2).length
  , [pendingTL, pendingHR])

  // Pending > 3 days
  const stalePending = useMemo(() =>
    [...pendingTL, ...pendingHR].filter(r => daysAgo(r.date_n_time) > 3).length
  , [pendingTL, pendingHR])

  const subTabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px', border: 'none', fontSize: 12, fontWeight: 500,
    cursor: 'pointer', background: 'transparent',
    color: active ? 'var(--accent-c)' : 'var(--text3)',
    borderBottom: active ? '2px solid var(--accent-c)' : '2px solid transparent',
    transition: 'all .15s', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' as const,
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Awaiting TL Approval"  value={pendingTL.length} color="#f59e0b" sub="team_lead_approval_status = 0" />
        <StatCard label="Awaiting HR Approval"  value={pendingHR.length} color="#ef4444" sub="TL done · HR pending" />
        <StatCard label="Urgent (≤ 2 days)"     value={urgentCount}      color="#ef4444" sub="leave starts very soon" />
        <StatCard label="Stale (> 3 days)"      value={stalePending}     color="#8b5cf6" sub="sitting unapproved 3+ days" />
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        <button style={subTabStyle(subTab === 'tl')} onClick={() => setSubTab('tl')}>
          ⏳ Awaiting Team Leader
          {pendingTL.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 7px', borderRadius: 10, background: '#f59e0b22', color: '#f59e0b' }}>
              {pendingTL.length}
            </span>
          )}
        </button>
        <button style={subTabStyle(subTab === 'hr')} onClick={() => setSubTab('hr')}>
          ⏳ Awaiting HR
          {pendingHR.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 7px', borderRadius: 10, background: '#ef444422', color: '#ef4444' }}>
              {pendingHR.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {subTab === 'tl' && <AwaitingTLTab rows={pendingTL} />}
      {subTab === 'hr' && <AwaitingHRTab rows={pendingHR} />}
    </div>
  )
}
