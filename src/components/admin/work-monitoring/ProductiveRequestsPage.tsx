'use client'
// src/components/admin/work-monitoring/ProductiveRequestsPage.tsx

import { useState, useEffect, useCallback } from 'react'
import PageShell from '@/components/shared/PageShell'
import StatCard from '@/components/shared/StatCard'
import TabBar from '@/components/shared/TabBar'
import { Badge, Spinner, EmptyState } from '@/components/shared/ui'
import { SessionPayload } from '@/lib/session'

function adminHeaders(): HeadersInit {
  const key = typeof window !== 'undefined' ? (localStorage.getItem('adminKey') ?? '') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
}

const TH: React.CSSProperties = {
  padding: '9px 12px', fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1,
  textTransform: 'uppercase' as const, color: 'var(--text2)', background: 'var(--bg3)',
  textAlign: 'left' as const, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' as const,
}
const TD: React.CSSProperties = {
  padding: '9px 12px', fontSize: 12, borderBottom: '1px solid var(--border)',
  color: 'var(--text)', verticalAlign: 'top' as const,
}

interface Request {
  request_id: string; agent_name: string; department_name: string
  domain_or_app: string; is_app: boolean; reason: string
  status: string; admin_note: string; requested_at: string
}
interface StatusCounts { pending: number; approved: number; rejected: number }

export default function ProductiveRequestsPage({ session }: { session: SessionPayload }) {
  const [status, setStatus]       = useState('pending')
  const [page, setPage]           = useState(1)
  const [requests, setRequests]   = useState<Request[]>([])
  const [counts, setCounts]       = useState<StatusCounts>({ pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [acting, setActing]       = useState<string | null>(null)
  const [modal, setModal]         = useState<{ request: Request; action: string } | null>(null)
  const [adminNote, setAdminNote] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res  = await fetch(`/api/admin/productive-requests?status=${status}&page=${page}`, { headers: adminHeaders() })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); setLoading(false); return }
      setRequests(data.requests || [])
      if (data.statusCounts) setCounts(data.statusCounts)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [status, page])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleAction() {
    if (!modal) return
    setActing(modal.request.request_id)
    try {
      const res = await fetch(`/api/admin/productive-requests/${modal.request.request_id}`, {
        method: 'PUT', headers: adminHeaders(),
        body: JSON.stringify({ action: modal.action, admin_note: adminNote }),
      })
      if (res.ok) { setModal(null); setAdminNote(''); fetchData() }
      else { const d = await res.json(); setError(d.error || 'Action failed') }
    } catch (e: any) { setError(e.message) }
    setActing(null)
  }

  function fmtDate(d: string) {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
    catch { return d }
  }

  return (
    <PageShell panel="admin" session={session} activeKey="work-monitoring/productive-requests" title="QD Admin">

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Work Monitoring</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Productive Requests</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text2)' }}>Employees requesting to mark sites/apps as Productive</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Pending Review" value={counts.pending}  icon="⏳" color="#f59e0b" />
        <StatCard label="Approved"       value={counts.approved} icon="✓"  color="#22c55e" />
        <StatCard label="Rejected"       value={counts.rejected} icon="✕"  color="#ef4444" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <TabBar variant="underline" active={status} onChange={k => { setStatus(k); setPage(1) }} color="#f59e0b"
          tabs={[
            { key: 'pending',  label: 'Pending',  count: counts.pending },
            { key: 'approved', label: 'Approved', count: counts.approved },
            { key: 'rejected', label: 'Rejected', count: counts.rejected },
            { key: 'all',      label: 'All' },
          ]} />
      </div>

      {error && <div style={{ padding:'10px 14px', background:'#7f1d1d22', border:'1px solid #ef444444', borderRadius:8, color:'#fca5a5', fontSize:12, fontFamily:'var(--font-mono)', marginBottom:14 }}>⚠ {error}</div>}

      {loading ? <Spinner text="Loading requests…" /> : requests.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <EmptyState icon="◌" title={`No ${status === 'all' ? '' : status} requests`} />
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Employee', 'Dept', 'Domain / App', 'Type', 'Reason', 'Requested', 'Status', 'Action'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.request_id}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <td style={TD}><strong>{r.agent_name}</strong></td>
                  <td style={TD}><span style={{ color: 'var(--text2)', fontSize: 11 }}>{r.department_name || '—'}</span></td>
                  <td style={TD}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--code-color)' }}>{r.domain_or_app}</span></td>
                  <td style={TD}><Badge label={r.is_app ? '💻 App' : '🌐 Web'} color={r.is_app ? '#8b5cf6' : '#3b82f6'} bg={r.is_app ? '#8b5cf622' : '#3b82f622'} /></td>
                  <td style={{ ...TD, maxWidth: 200 }}><span style={{ color: 'var(--text2)', fontSize: 11 }} title={r.reason}>{r.reason.length > 60 ? r.reason.slice(0, 60) + '…' : r.reason}</span></td>
                  <td style={TD}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text2)' }}>{fmtDate(r.requested_at)}</span></td>
                  <td style={TD}>
                    <Badge
                      label={r.status}
                      color={r.status === 'approved' ? '#22c55e' : r.status === 'rejected' ? '#ef4444' : '#f59e0b'}
                      bg={r.status === 'approved' ? '#22c55e22' : r.status === 'rejected' ? '#ef444422' : '#f59e0b22'}
                    />
                  </td>
                  <td style={TD}>
                    {r.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setModal({ request: r, action: 'approve' }); setAdminNote('') }}
                          style={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                          Approve
                        </button>
                        <button onClick={() => { setModal({ request: r, action: 'reject' }); setAdminNote('') }}
                          style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>{r.admin_note || '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg3)', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>Page {page}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['← Prev', page - 1, page <= 1], ['Next →', page + 1, requests.length < 50]].map(([label, target, dis]) => (
                <button key={label as string} onClick={() => setPage(target as number)} disabled={dis as boolean}
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', opacity: dis ? 0.4 : 1 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Approve/Reject Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: modal.action === 'approve' ? '#22c55e' : '#ef4444' }}>
              {modal.action === 'approve' ? '✓ Approve Request' : '✕ Reject Request'}
            </h2>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text2)' }}>
              <strong style={{ color: 'var(--text)' }}>{modal.request.agent_name}</strong> →{' '}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--code-color)' }}>{modal.request.domain_or_app}</span>
            </p>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic' }}>"{modal.request.reason}"</span>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Admin Note (optional)</label>
              <input value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="e.g. Approved for development use"
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)}
                style={{ flex: 1, padding: 10, background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleAction} disabled={!!acting}
                style={{ flex: 1, padding: 10, background: modal.action === 'approve' ? '#22c55e22' : '#ef444422', border: `1px solid ${modal.action === 'approve' ? '#22c55e44' : '#ef444444'}`, color: modal.action === 'approve' ? '#22c55e' : '#ef4444', borderRadius: 8, fontSize: 12, cursor: acting ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: acting ? 0.6 : 1 }}>
                {acting ? 'Processing…' : modal.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
