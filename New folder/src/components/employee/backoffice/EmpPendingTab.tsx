'use client'
// src/components/employee/backoffice/EmpPendingTab.tsx

import { useMemo, useState } from 'react'
import { type LeaveRow } from './EmpLeaveRequestsTab'
import StatCard from '@/components/shared/StatCard'

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

function fmtDate(d: string) {
  if (!d || d < '2010') return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}
function daysUntil(dateStr: string): number {
  if (!dateStr) return 999
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}
function daysAgo(dateStr: string): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}
function dateRange(row: LeaveRow): string {
  const dt = row.day_type?.toLowerCase() || ''
  if (dt.includes('first half') && row.first_half_date) return fmtDate(row.first_half_date)
  if (dt.includes('second half') && row.second_half_date) return fmtDate(row.second_half_date)
  if (row.from_date && row.to_date && row.from_date !== row.to_date)
    return `${fmtDate(row.from_date)} – ${fmtDate(row.to_date)}`
  return row.from_date ? fmtDate(row.from_date) : '—'
}

function UrgencyBadge({ row }: { row: LeaveRow }) {
  const until = daysUntil(row.from_date)
  if (until < 0) return <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 7px', borderRadius: 10, background: '#ef444422', color: '#ef4444' }}>Leave started</span>
  if (until <= 1) return <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 7px', borderRadius: 10, background: '#ef444422', color: '#ef4444' }}>🔴 Urgent</span>
  if (until <= 3) return <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 7px', borderRadius: 10, background: '#f59e0b22', color: '#f59e0b' }}>⚠ In {until} days</span>
  return null
}

type SubTab = 'tl' | 'hr'

export default function EmpPendingTab({ leaves }: { leaves: LeaveRow[] }) {
  const [subTab, setSubTab] = useState<SubTab>('tl')

  // Pending TL — team_lead_approval_status = 0
  const pendingTL = useMemo(() =>
    leaves.filter(r => r.team_lead_approval_status === '0')
          .sort((a, b) => a.date_n_time.localeCompare(b.date_n_time))
  , [leaves])

  // Pending HR — TL approved but HR not yet
  const pendingHR = useMemo(() =>
    leaves.filter(r => r.team_lead_approval_status === '1' && r.approval_status === '0')
          .sort((a, b) => a.date_n_time.localeCompare(b.date_n_time))
  , [leaves])

  const urgentCount = useMemo(() =>
    [...pendingTL, ...pendingHR].filter(r => daysUntil(r.from_date) <= 2).length
  , [pendingTL, pendingHR])

  const staleCount = useMemo(() =>
    [...pendingTL, ...pendingHR].filter(r => daysAgo(r.date_n_time) > 3).length
  , [pendingTL, pendingHR])

  const subTabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px', border: 'none', fontSize: 12, fontWeight: 500,
    cursor: 'pointer', background: 'transparent',
    color: active ? '#8b5cf6' : 'var(--text3)',
    borderBottom: active ? '2px solid #8b5cf6' : '2px solid transparent',
    transition: 'all .15s', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' as const,
  })

  const rows = subTab === 'tl' ? pendingTL : pendingHR

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Awaiting Team Leader" value={pendingTL.length} color="#f59e0b" sub="team_lead_approval_status = 0" />
        <StatCard label="Awaiting HR"          value={pendingHR.length} color="#ef4444" sub="TL done · HR pending" />
        <StatCard label="Urgent (≤ 2 days)"   value={urgentCount}      color="#ef4444" sub="leave starts soon" />
        <StatCard label="Stale (> 3 days)"    value={staleCount}       color="#8b5cf6" sub="unapproved 3+ days" />
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

      {/* Table */}
      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 56, color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>All clear</div>
          <div style={{ fontSize: 13 }}>
            {subTab === 'tl' ? 'No leaves waiting for Team Leader approval.' : 'No leaves waiting for HR approval.'}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                {['#', 'Applied On', 'Apply Type', 'Request Type', 'Day Type / Date', 'Days',
                  ...(subTab === 'hr' ? ['TL Approved By'] : ['Team Leader']),
                  'Urgency'].map(h => (
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
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: isWfh ? '#3b82f618' : '#8b5cf618', color: isWfh ? '#3b82f6' : '#8b5cf6' }}>
                        {isWfh ? 'WFH' : (r.leave_type || 'Leave')}
                      </span>
                    </td>
                    <td style={TD}>{r.leave_type_name || '—'}</td>
                    <td style={TD}>
                      <div style={{ fontSize: 11, fontWeight: 500 }}>{r.day_type}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{dateRange(r)}</div>
                    </td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', textAlign: 'center' as const, fontWeight: 700 }}>{r.applied_leaves}</td>
                    <td style={TD}>
                      {subTab === 'hr' ? (
                        <div>
                          <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 500 }}>{r.team_lead_name || '—'}</div>
                          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '1px 7px', borderRadius: 10, background: '#22c55e18', color: '#22c55e' }}>Approved</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.team_lead_name || '—'}</div>
                      )}
                    </td>
                    <td style={TD}><UrgencyBadge row={r} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
