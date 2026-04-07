'use client'
// src/components/admin/backoffice/ITServicesPage.tsx

import { useState, useEffect, useMemo } from 'react'
import StatCard from '@/components/shared/StatCard'

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
interface ITQuery {
  id: string; employee_row_id: string; employee_name: string; position: string
  device_row_id: string; device_name: string; computer_name: string
  request_type: string; problem_id: string; accessory_id: string
  contact: string; note: string; quantity_required: string; expected_date: string
  upload_video: string; uploaded_resolved_video: string
  status: string; status_comment: string
  other_problem: string; other_accessory: string
  status_updated_employee_row_id: string; resolved_by_name: string
  created_date_n_time: string; updated_date_n_time: string
}
interface QueryLog {
  id: string; query_id: string; employee_row_id: string; employee_name: string
  query_status: string; upload_video: string; comments: string; date_n_time: string
}
interface Device {
  id: string; employee_row_id: string; employee_name: string; position: string
  device_type: string; device_name: string; computer_name: string
  ram: string; hard_disk: string; processor_details: string
  graphic_card: string; monitor: string; monitor_size: string
  os_version: string; os_last_updated_date: string
  monitoring: string; antivirus: string; antivirus_name: string; antivirus_expiry_date: string
  device_status: string; device_provided_date: string; return_date: string; work_type: string
}
interface DeviceLog {
  id: string; device_row_id: string; device_name: string; computer_name: string
  employee_row_id: string; employee_name: string
  device_provided_date: string; return_date: string; date_n_time: string
}
interface QuerySummary {
  total: string; pending: string; solved: string; rejected: string
  system_issues: string; accessory_requests: string
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
function reqTypeLabel(t: string) {
  return t === '1' ? 'System Issue' : t === '2' ? 'Accessory Request' : `Type ${t}`
}
function deviceTypeLabel(t: string) {
  return t === '1' ? 'Laptop' : t === '2' ? 'Desktop' : t === '3' ? 'Mobile' : 'Other'
}
function statusCfg(s: string) {
  return s === '1' ? { label: 'Solved', color: '#22c55e', bg: '#22c55e18' }
    : s === '2' ? { label: 'Rejected', color: '#ef4444', bg: '#ef444418' }
      : { label: 'Pending', color: '#f59e0b', bg: '#f59e0b18' }
}
function isAntivirusExpired(expiry: string) {
  if (!expiry || expiry < '2010') return false
  return new Date(expiry) < new Date()
}

// ── Query Detail Modal ─────────────────────────────────────────
function QueryModal({ row, onClose }: { row: ITQuery; onClose: () => void }) {
  const cfg = statusCfg(row.status)
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{row.employee_name || 'Employee'}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{row.position || 'No position'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>
          </div>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {([
              ['Request Type', reqTypeLabel(row.request_type)],
              ['Problem / Item', row.problem_id || row.accessory_id || row.other_problem || row.other_accessory || '—'],
              ['Device', row.device_name || '—'],
              ['Computer Name', row.computer_name || '—'],
              ['Contact', row.contact || '—'],
              ['Quantity', row.quantity_required !== '0' ? row.quantity_required : '—'],
              ['Expected Date', fmtDate(row.expected_date)],
              ['Submitted On', fmtDateTime(row.created_date_n_time)],
              ['Last Updated', fmtDateTime(row.updated_date_n_time)],
              ['Resolved By', row.resolved_by_name || '—'],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text4)', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>
          {row.note && (
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text4)', marginBottom: 4 }}>Note</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{row.note}</div>
            </div>
          )}
          {row.status_comment && (
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text4)', marginBottom: 4 }}>Status Note</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{row.status_comment}</div>
            </div>
          )}
          {(row.upload_video || row.uploaded_resolved_video) && (
            <div style={{ display: 'flex', gap: 10 }}>
              {row.upload_video && (
                <a href={row.upload_video} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', color: '#3b82f6', textDecoration: 'none' }}>
                  🔗 Query Link
                </a>
              )}
              {row.uploaded_resolved_video && (
                <a href={row.uploaded_resolved_video} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', color: '#22c55e', textDecoration: 'none' }}>
                  ✅ Resolved Link
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── TAB 1: System Queries ──────────────────────────────────────
function SystemQueriesTab({ queries, summary }: { queries: ITQuery[]; summary: QuerySummary }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [selected, setSelected] = useState<ITQuery | null>(null)

  const filtered = useMemo(() => queries.filter(q => {
    if (search) {
      const s = search.toLowerCase()
      if (!q.employee_name.toLowerCase().includes(s) &&
        !q.problem_id.toLowerCase().includes(s) &&
        !q.note.toLowerCase().includes(s) &&
        !q.device_name.toLowerCase().includes(s)) return false
    }
    if (filterStatus && q.status !== filterStatus) return false
    if (filterType && q.request_type !== filterType) return false
    return true
  }), [queries, search, filterStatus, filterType])

  const selStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '6px 10px', cursor: 'pointer',
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total" value={summary.total} color="var(--accent-c)" />
        <StatCard label="Pending" value={summary.pending} color="#f59e0b" />
        <StatCard label="Solved" value={summary.solved} color="#22c55e" />
        <StatCard label="Rejected" value={summary.rejected} color="#ef4444" />
        <StatCard label="System Issues" value={summary.system_issues} color="#3b82f6" />
        <StatCard label="Accessory Req." value={summary.accessory_requests} color="#8b5cf6" />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee, problem, device…"
          style={{ ...selStyle, flex: 1, minWidth: 200 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="">All Status</option>
          <option value="0">Pending</option>
          <option value="1">Solved</option>
          <option value="2">Rejected</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selStyle}>
          <option value="">All Types</option>
          <option value="1">System Issue</option>
          <option value="2">Accessory Request</option>
        </select>
        {(search || filterStatus || filterType) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterType('') }}
            style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
            ✕ Clear
          </button>
        )}
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginLeft: 'auto' }}>
          {filtered.length} of {queries.length}
        </span>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead>
            <tr>
              {['#', 'Submitted', 'Employee', 'Request Type', 'Problem / Accessory', 'Device', 'Contact', 'Qty', 'Expected', 'Status', 'Action'].map(h => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No queries found</td></tr>
            ) : filtered.map((q, i) => {
              const cfg = statusCfg(q.status)
              const problem = q.problem_id || q.other_problem || q.accessory_id || q.other_accessory || '—'
              return (
                <tr key={q.id}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <td style={{ ...TD, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' as const }}>{fmtDate(q.created_date_n_time)}</td>
                  <td style={TD}>
                    <div style={{ fontWeight: 600 }}>{q.employee_name || '—'}</div>
                    {q.position && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{q.position}</div>}
                  </td>
                  <td style={TD}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: q.request_type === '1' ? '#3b82f618' : '#8b5cf618', color: q.request_type === '1' ? '#3b82f6' : '#8b5cf6' }}>
                      {reqTypeLabel(q.request_type)}
                    </span>
                  </td>
                  <td style={{ ...TD, maxWidth: 180 }}>
                    <div style={{ fontSize: 12 }}>{problem}</div>
                    {q.note && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, lineHeight: 1.4 }}>{q.note.slice(0, 60)}{q.note.length > 60 ? '…' : ''}</div>}
                  </td>
                  <td style={{ ...TD, fontSize: 11 }}>
                    <div>{q.device_name || '—'}</div>
                    {q.computer_name && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{q.computer_name}</div>}
                  </td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{q.contact || '—'}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', textAlign: 'center' as const }}>{q.quantity_required !== '0' ? q.quantity_required : '—'}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fmtDate(q.expected_date)}</td>
                  <td style={TD}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    {q.resolved_by_name && q.status === '1' && (
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{q.resolved_by_name}</div>
                    )}
                  </td>
                  <td style={TD}>
                    <button onClick={() => setSelected(q)} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text)', whiteSpace: 'nowrap' as const }}>
                      View
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {selected && <QueryModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

// ── TAB 2: Device Inventory ────────────────────────────────────
function DeviceInventoryTab({ devices }: { devices: Device[] }) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<Device | null>(null)

  const filtered = useMemo(() => devices.filter(d => {
    if (search) {
      const s = search.toLowerCase()
      if (!d.employee_name.toLowerCase().includes(s) &&
        !d.device_name.toLowerCase().includes(s) &&
        !d.computer_name.toLowerCase().includes(s)) return false
    }
    if (filterType && d.device_type !== filterType) return false
    if (filterStatus && d.device_status !== filterStatus) return false
    return true
  }), [devices, search, filterType, filterStatus])

  const expiredAV = devices.filter(d => isAntivirusExpired(d.antivirus_expiry_date)).length
  const withTeramind = devices.filter(d => d.monitoring === '1').length
  const active = devices.filter(d => d.device_status !== '2').length

  const selStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '6px 10px', cursor: 'pointer',
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Devices" value={devices.length} color="var(--accent-c)" />
        <StatCard label="Active" value={active} color="#22c55e" />
        <StatCard label="Teramind Installed" value={withTeramind} color="#8b5cf6" />
        <StatCard label="Antivirus Expired" value={expiredAV} color="#ef4444" sub={expiredAV > 0 ? 'needs renewal' : 'all good'} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee or device…"
          style={{ ...selStyle, flex: 1, minWidth: 180 }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selStyle}>
          <option value="">All Types</option>
          <option value="1">Laptop</option>
          <option value="2">Desktop</option>
          <option value="3">Mobile</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="">All Status</option>
          <option value="1">Active</option>
          <option value="2">Returned</option>
        </select>
        {(search || filterType || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterType(''); setFilterStatus('') }}
            style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
            ✕ Clear
          </button>
        )}
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginLeft: 'auto' }}>
          {filtered.length} of {devices.length}
        </span>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr>
              {['#', 'Employee', 'Device', 'Type', 'Specs', 'OS', 'Antivirus', 'Teramind', 'Assigned', 'Status', 'Action'].map(h => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No devices found</td></tr>
            ) : filtered.map((d, i) => {
              const expired = isAntivirusExpired(d.antivirus_expiry_date)
              const isActive = d.device_status !== '2'
              return (
                <tr key={d.id}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <td style={{ ...TD, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                  <td style={TD}>
                    <div style={{ fontWeight: 600 }}>{d.employee_name || '—'}</div>
                    {d.position && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{d.position}</div>}
                  </td>
                  <td style={TD}>
                    <div style={{ fontWeight: 500 }}>{d.device_name || '—'}</div>
                    {d.computer_name && <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{d.computer_name}</div>}
                  </td>
                  <td style={TD}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: 'var(--bg3)', color: 'var(--text3)' }}>
                      {deviceTypeLabel(d.device_type)}
                    </span>
                  </td>
                  <td style={{ ...TD, fontSize: 11 }}>
                    {d.ram !== '0' && <div>RAM: {d.ram} GB</div>}
                    {d.hard_disk && <div style={{ color: 'var(--text3)' }}>{d.hard_disk}</div>}
                    {d.processor_details && <div style={{ color: 'var(--text3)', fontSize: 10 }}>{d.processor_details.slice(0, 30)}{d.processor_details.length > 30 ? '…' : ''}</div>}
                  </td>
                  <td style={{ ...TD, fontSize: 11 }}>
                    <div>{d.os_version || '—'}</div>
                    {d.os_last_updated_date && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{fmtDate(d.os_last_updated_date)}</div>}
                  </td>
                  <td style={TD}>
                    {d.antivirus === '1' ? (
                      <>
                        <div style={{ fontSize: 11 }}>{d.antivirus_name || 'Installed'}</div>
                        {d.antivirus_expiry_date && (
                          <div style={{ fontSize: 10, color: expired ? '#ef4444' : '#22c55e', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                            {expired ? '⚠ Expired ' : '✓ '}{fmtDate(d.antivirus_expiry_date)}
                          </div>
                        )}
                      </>
                    ) : <span style={{ fontSize: 10, color: 'var(--text4)' }}>None</span>}
                  </td>
                  <td style={{ ...TD, textAlign: 'center' as const }}>
                    {d.monitoring === '1'
                      ? <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: '#8b5cf618', color: '#8b5cf6' }}>✓ Active</span>
                      : <span style={{ fontSize: 10, color: 'var(--text4)' }}>—</span>}
                  </td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fmtDate(d.device_provided_date)}</td>
                  <td style={TD}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: isActive ? '#22c55e18' : 'var(--bg3)', color: isActive ? '#22c55e' : 'var(--text4)' }}>
                      {isActive ? 'Active' : 'Returned'}
                    </span>
                  </td>
                  <td style={TD}>
                    <button onClick={() => setSelected(d)} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text)', whiteSpace: 'nowrap' as const }}>
                      View
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Device detail modal */}
      {selected && (
        <div onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{selected.device_name || 'Device'}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{selected.employee_name}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                ['Device Name', selected.device_name],
                ['Device Type', deviceTypeLabel(selected.device_type)],
                ['Computer Name', selected.computer_name],
                ['RAM', selected.ram !== '0' ? `${selected.ram} GB` : '—'],
                ['Hard Disk', selected.hard_disk],
                ['Processor', selected.processor_details],
                ['Graphic Card', selected.graphic_card],
                ['Monitor', selected.monitor],
                ['Monitor Size', selected.monitor_size],
                ['OS Version', selected.os_version],
                ['OS Updated', fmtDate(selected.os_last_updated_date)],
                ['Antivirus', selected.antivirus_name || (selected.antivirus === '1' ? 'Installed' : 'None')],
                ['AV Expiry', fmtDate(selected.antivirus_expiry_date)],
                ['Teramind', selected.monitoring === '1' ? 'Installed' : 'Not installed'],
                ['Assigned On', fmtDate(selected.device_provided_date)],
                ['Return Date', fmtDate(selected.return_date)],
              ] as [string, string][]).map(([l, v]) => (
                <div key={l} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text4)', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{v || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TAB 3: Query Status History ────────────────────────────────
function QueryStatusHistoryTab({ logs }: { logs: QueryLog[] }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const filtered = useMemo(() => logs.filter(l => {
    if (search) {
      const s = search.toLowerCase()
      if (!l.employee_name.toLowerCase().includes(s) &&
        !l.comments.toLowerCase().includes(s) &&
        !l.query_id.includes(s)) return false
    }
    if (filterStatus && l.query_status !== filterStatus) return false
    return true
  }), [logs, search, filterStatus])

  const selStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '6px 10px', cursor: 'pointer',
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by employee, comment, query ID…"
          style={{ ...selStyle, flex: 1, minWidth: 200 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="">All Status</option>
          <option value="0">Pending</option>
          <option value="1">Solved</option>
          <option value="2">Rejected</option>
        </select>
        {(search || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterStatus('') }}
            style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
            ✕ Clear
          </button>
        )}
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginLeft: 'auto' }}>
          {filtered.length} of {logs.length}
        </span>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr>
              {['#', 'Updated On', 'Updated By', 'Query #', 'Status Set To', 'Comment', 'Link'].map(h => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No logs found</td></tr>
            ) : filtered.map((l, i) => {
              const cfg = statusCfg(l.query_status)
              return (
                <tr key={l.id}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <td style={{ ...TD, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' as const }}>{fmtDateTime(l.date_n_time)}</td>
                  <td style={TD}>
                    <div style={{ fontWeight: 600 }}>{l.employee_name || '—'}</div>
                  </td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)' }}>#{l.query_id}</td>
                  <td style={TD}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  </td>
                  <td style={{ ...TD, fontSize: 11, color: 'var(--text3)', maxWidth: 240 }}>
                    {l.comments || '—'}
                  </td>
                  <td style={TD}>
                    {l.upload_video
                      ? <a href={l.upload_video} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#3b82f6', textDecoration: 'none' }}>🔗 View</a>
                      : <span style={{ color: 'var(--text4)', fontSize: 11 }}>—</span>}
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
type ITSubTab = 'queries' | 'devices' | 'history'

export default function ITServicesPage({ initialTab }: { initialTab?: ITSubTab }) {
  const subTab = initialTab ?? 'queries'
  const [queries, setQueries] = useState<ITQuery[]>([])
  const [querySummary, setQuerySummary] = useState<QuerySummary | null>(null)
  const [queryLogs, setQueryLogs] = useState<QueryLog[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [deviceLogs, setDeviceLogs] = useState<DeviceLog[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loaded) return
    setLoading(true)
    fetch('/api/admin/back-office/it', { headers: adminHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setQueries(d.queries as ITQuery[])
          setQuerySummary(d.querySummary as QuerySummary)
          setQueryLogs(d.queryLogs as QueryLog[])
          setDevices(d.devices as Device[])
          setDeviceLogs(d.deviceLogs as DeviceLog[])
        } else { setError(d.detail || d.error || 'API error') }
        setLoaded(true)
      })
      .catch(e => { setError(String(e)); setLoaded(true) })
      .finally(() => setLoading(false))
  }, [loaded])

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px', border: 'none', fontSize: 12, fontWeight: 500,
    cursor: 'pointer', background: 'transparent',
    color: active ? 'var(--accent-c)' : 'var(--text3)',
    borderBottom: active ? '2px solid var(--accent-c)' : '2px solid transparent',
    transition: 'all .15s', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' as const,
  })

  if (loading) return <Spinner />
  if (error) return (
    <div style={{ padding: 24, color: '#ef4444', fontSize: 13, background: '#ef444410', borderRadius: 8 }}>⚠ {error}</div>
  )

  return (
    <div>
      {subTab === 'queries' && querySummary && <SystemQueriesTab queries={queries} summary={querySummary} />}
      {subTab === 'devices' && <DeviceInventoryTab devices={devices} />}
      {subTab === 'history' && <QueryStatusHistoryTab logs={queryLogs} />}
    </div>
  )
}
