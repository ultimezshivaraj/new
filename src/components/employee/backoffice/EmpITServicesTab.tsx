'use client'
// src/components/employee/backoffice/EmpITServicesTab.tsx

import { useState, useMemo } from 'react'

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

// ── Types ──────────────────────────────────────────────────────
export interface ITQueryRow {
  id: string; device_name: string; computer_name: string
  request_type: string; problem_id: string; accessory_id: string
  contact: string; note: string; quantity_required: string; expected_date: string
  upload_video: string; uploaded_resolved_video: string
  status: string; status_comment: string
  other_problem: string; other_accessory: string
  resolved_by_name: string
  created_date_n_time: string; updated_date_n_time: string
}
export interface ITQueryLogRow {
  id: string; query_id: string; employee_name: string
  query_status: string; comments: string; upload_video: string; date_n_time: string
}
export interface DeviceRow {
  id: string; device_type: string; device_name: string; computer_name: string
  ram: string; hard_disk: string; processor_details: string
  graphic_card: string; monitor: string; monitor_size: string
  os_version: string; os_last_updated_date: string
  monitoring: string; antivirus: string; antivirus_name: string; antivirus_expiry_date: string
  device_status: string; device_provided_date: string; return_date: string
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
  return s === '1' ? { label: 'Solved',   color: '#22c55e', bg: '#22c55e18' }
       : s === '2' ? { label: 'Rejected', color: '#ef4444', bg: '#ef444418' }
       :             { label: 'Pending',  color: '#f59e0b', bg: '#f59e0b18' }
}
function isExpired(d: string) {
  if (!d || d < '2010') return false
  return new Date(d) < new Date()
}

// ── Query Detail Modal ─────────────────────────────────────────
function QueryModal({ row, logs, onClose }: { row: ITQueryRow; logs: ITQueryLogRow[]; onClose: () => void }) {
  const cfg = statusCfg(row.status)
  const myLogs = logs.filter(l => l.query_id === row.id)
  const problem = row.problem_id || row.other_problem || row.accessory_id || row.other_accessory || '—'
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Ticket #{row.id}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{reqTypeLabel(row.request_type)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>
          </div>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {([
              ['Problem / Item',  problem],
              ['Device',          row.device_name || '—'],
              ['Contact',         row.contact || '—'],
              ['Quantity',        row.quantity_required !== '0' ? row.quantity_required : '—'],
              ['Expected Date',   fmtDate(row.expected_date)],
              ['Submitted On',    fmtDateTime(row.created_date_n_time)],
              ['Last Updated',    fmtDateTime(row.updated_date_n_time)],
              ['Resolved By',     row.resolved_by_name || '—'],
            ] as [string,string][]).map(([l, v]) => (
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
              <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text4)', marginBottom: 4 }}>Resolution Note</div>
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
          {/* Status timeline */}
          {myLogs.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text3)', marginBottom: 10 }}>Status History</div>
              {myLogs.map(l => {
                const lcfg = statusCfg(l.query_status)
                return (
                  <div key={l.id} style={{ display: 'flex', gap: 12, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8, marginBottom: 6, fontSize: 11 }}>
                    <div style={{ color: 'var(--text3)', whiteSpace: 'nowrap' as const, minWidth: 120 }}>{fmtDateTime(l.date_n_time)}</div>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '1px 7px', borderRadius: 10, background: lcfg.bg, color: lcfg.color, whiteSpace: 'nowrap' as const }}>{lcfg.label}</span>
                    {l.comments && <div style={{ color: 'var(--text2)', flex: 1 }}>{l.comments}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── TAB 1: My IT Requests ──────────────────────────────────────
function MyITRequestsTab({ queries, logs }: { queries: ITQueryRow[]; logs: ITQueryLogRow[] }) {
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType,   setFilterType]   = useState('')
  const [selected,     setSelected]     = useState<ITQueryRow | null>(null)

  const pending = queries.filter(q => q.status === '0').length
  const solved  = queries.filter(q => q.status === '1').length
  const rejected = queries.filter(q => q.status === '2').length

  const filtered = useMemo(() => queries.filter(q => {
    if (filterStatus && q.status       !== filterStatus) return false
    if (filterType   && q.request_type !== filterType)   return false
    return true
  }), [queries, filterStatus, filterType])

  const selStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '6px 10px', cursor: 'pointer',
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Tickets" value={queries.length} color="#8b5cf6" />
        <StatCard label="Pending"       value={pending}        color="#f59e0b" />
        <StatCard label="Solved"        value={solved}         color="#22c55e" />
        <StatCard label="Rejected"      value={rejected}       color="#ef4444" />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
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
        {(filterStatus || filterType) && (
          <button onClick={() => { setFilterStatus(''); setFilterType('') }}
            style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
            ✕ Clear
          </button>
        )}
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginLeft: 'auto' }}>
          {filtered.length} of {queries.length}
        </span>
      </div>

      {queries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 56, color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>🔧</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No IT tickets yet</div>
          <div style={{ fontSize: 13 }}>Your submitted IT requests will appear here.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                {['#', 'Submitted', 'Type', 'Problem / Item', 'Device', 'Expected', 'Status', 'Action'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, i) => {
                const cfg = statusCfg(q.status)
                const problem = q.problem_id || q.other_problem || q.accessory_id || q.other_accessory || '—'
                return (
                  <tr key={q.id}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <td style={{ ...TD, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' as const }}>{fmtDate(q.created_date_n_time)}</td>
                    <td style={TD}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: q.request_type === '1' ? '#3b82f618' : '#8b5cf618', color: q.request_type === '1' ? '#3b82f6' : '#8b5cf6' }}>
                        {reqTypeLabel(q.request_type)}
                      </span>
                    </td>
                    <td style={{ ...TD, maxWidth: 200 }}>
                      <div>{problem}</div>
                      {q.note && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{q.note.slice(0, 50)}{q.note.length > 50 ? '…' : ''}</div>}
                    </td>
                    <td style={{ ...TD, fontSize: 11 }}>
                      <div>{q.device_name || '—'}</div>
                      {q.computer_name && <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{q.computer_name}</div>}
                    </td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fmtDate(q.expected_date)}</td>
                    <td style={TD}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      {q.resolved_by_name && q.status === '1' && (
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{q.resolved_by_name}</div>
                      )}
                    </td>
                    <td style={TD}>
                      <button onClick={() => setSelected(q)} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text)' }}>
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
      {selected && <QueryModal row={selected} logs={logs} onClose={() => setSelected(null)} />}
    </div>
  )
}

// ── TAB 2: My Device ──────────────────────────────────────────
function MyDeviceTab({ device }: { device: DeviceRow | null }) {
  if (!device) return (
    <div style={{ textAlign: 'center', padding: 56, color: 'var(--text3)' }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>💻</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No device assigned</div>
      <div style={{ fontSize: 13 }}>Contact IT if you need a device assigned.</div>
    </div>
  )

  const expired = isExpired(device.antivirus_expiry_date)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Device header card */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: '#8b5cf618', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
          {device.device_type === '1' ? '💻' : device.device_type === '2' ? '🖥' : '📱'}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{device.device_name || deviceTypeLabel(device.device_type)}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{device.computer_name || 'No computer name'}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: 'var(--bg3)', color: 'var(--text3)' }}>{deviceTypeLabel(device.device_type)}</span>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: device.device_status !== '2' ? '#22c55e18' : 'var(--bg3)', color: device.device_status !== '2' ? '#22c55e' : 'var(--text4)' }}>
              {device.device_status !== '2' ? 'Active' : 'Returned'}
            </span>
            {device.monitoring === '1' && (
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: '#8b5cf618', color: '#8b5cf6' }}>Monitoring Active</span>
            )}
          </div>
        </div>
      </div>

      {/* Specs grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {([
          ['RAM',          device.ram !== '0' ? `${device.ram} GB` : '—'],
          ['Hard Disk',    device.hard_disk],
          ['Processor',    device.processor_details],
          ['Graphic Card', device.graphic_card],
          ['Monitor',      device.monitor],
          ['Monitor Size', device.monitor_size],
          ['OS Version',   device.os_version],
          ['OS Updated',   fmtDate(device.os_last_updated_date)],
          ['Assigned On',  fmtDate(device.device_provided_date)],
        ] as [string,string][]).map(([l, v]) => (
          <div key={l} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text4)', marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{v || '—'}</div>
          </div>
        ))}
      </div>

      {/* Antivirus status */}
      <div style={{ background: 'var(--card)', border: `1px solid ${expired ? '#ef444430' : '#22c55e30'}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 24 }}>{expired ? '⚠️' : '🛡'}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Antivirus: {device.antivirus === '1' ? (device.antivirus_name || 'Installed') : 'Not installed'}</div>
          {device.antivirus_expiry_date && (
            <div style={{ fontSize: 11, color: expired ? '#ef4444' : '#22c55e', marginTop: 3 }}>
              {expired ? `⚠ Expired on ${fmtDate(device.antivirus_expiry_date)} — contact IT` : `Valid until ${fmtDate(device.antivirus_expiry_date)}`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────
export type ITSubTab = 'requests' | 'device'

export default function EmpITServicesTab({
  queries, queryLogs, device, initialTab,
}: {
  queries:   ITQueryRow[]
  queryLogs: ITQueryLogRow[]
  device:    DeviceRow | null
  initialTab?: ITSubTab
}) {
  const subTab = initialTab ?? 'requests'

  return (
    <div>
      {subTab === 'requests' && <MyITRequestsTab queries={queries} logs={queryLogs} />}
      {subTab === 'device'   && <MyDeviceTab device={device} />}
    </div>
  )
}
