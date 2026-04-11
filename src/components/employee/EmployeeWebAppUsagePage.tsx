'use client'
// src/components/employee/EmployeeWebAppUsagePage.tsx

import { useState, useEffect, useCallback } from 'react'
import PageShell from '@/components/shared/PageShell'
import StatCard from '@/components/shared/StatCard'
import DataTable, { Column } from '@/components/shared/DataTable'
import TabBar from '@/components/shared/TabBar'
import { Badge, Spinner } from '@/components/shared/ui'
import { SessionPayload } from '@/lib/session'

function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
function today() { return new Date().toISOString().split('T')[0] }
function sevenDaysAgo() { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split('T')[0] }
function catBadge(cat: string) {
  const map: Record<string, { color: string; bg: string }> = {
    Productive:   { color: '#22c55e', bg: '#22c55e22' },
    Unproductive: { color: '#ef4444', bg: '#ef444422' },
    Neutral:      { color: '#f59e0b', bg: '#f59e0b22' },
    Unclassified: { color: '#71717a', bg: '#71717a22' },
  }
  return map[cat] ?? map.Unclassified
}

interface UsageRow { item: string; type: string; activity_date: string; active_secs: string; category: string }
interface Summary { total_secs: number; productive_secs: number; unproductive_secs: number; unclassified_secs: number; productivity_pct: number }
interface MyRequest { domain_or_app: string; status: string }

const INP: React.CSSProperties = {
  background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)',
  borderRadius: 8, padding: '7px 10px', fontSize: 12, fontFamily: 'var(--font-mono)', outline: 'none',
}
const LBL: React.CSSProperties = {
  fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'block',
}

export default function EmployeeWebAppUsagePage({ session }: { session: SessionPayload }) {
  const [from, setFrom]           = useState(sevenDaysAgo())
  const [to, setTo]               = useState(today())
  const [type, setType]           = useState<'both'|'web'|'app'>('both')
  const [rows, setRows]           = useState<UsageRow[]>([])
  const [summary, setSummary]     = useState<Summary | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [myRequests, setMyRequests] = useState<MyRequest[]>([])
  const [modal, setModal]         = useState<UsageRow | null>(null)
  const [reason, setReason]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]         = useState('')

  const fetchMyRequests = useCallback(async () => {
    try { const res = await fetch('/api/employee/tool-request'); const d = await res.json(); setMyRequests(d.requests || []) } catch {}
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    const p = new URLSearchParams({ from, to, type })
    try {
      const res = await fetch(`/api/employee/web-app-usage?${p}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); setLoading(false); return }
      setRows([...(data.webs || []), ...(data.apps || [])])
      setSummary(data.summary)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [from, to, type])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchMyRequests() }, [fetchMyRequests])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  async function handleSubmit() {
    if (!reason.trim() || !modal) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/employee/tool-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_or_app: modal.item, is_app: modal.type === 'app', reason: reason.trim() }),
      })
      const data = await res.json()
      res.ok ? showToast('✓ Request submitted — admin will review shortly.') : showToast(`⚠ ${data.error || 'Failed'}`)
      if (res.ok) fetchMyRequests()
    } catch (e: any) { showToast(`⚠ ${e.message}`) }
    setSubmitting(false); setModal(null); setReason('')
  }

  const isPending  = (item: string) => myRequests.some(r => r.domain_or_app === item && r.status === 'pending')
  const isApproved = (item: string) => myRequests.some(r => r.domain_or_app === item && r.status === 'approved')
  const pct = summary?.productivity_pct || 0
  const C = 2 * Math.PI * 28

  const columns: Column<any>[] = [
    { key: 'item', label: 'Domain / App',
      render: r => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--code-color)' }}>{r.item}</span> },
    { key: 'type', label: 'Type', width: 90,
      render: r => <Badge label={r.type === 'web' ? '🌐 Web' : '💻 App'} color={r.type === 'web' ? '#3b82f6' : '#8b5cf6'} bg={r.type === 'web' ? '#3b82f622' : '#8b5cf622'} /> },
    { key: 'activity_date', label: 'Date', width: 100,
      render: r => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text2)' }}>{r.activity_date}</span> },
    { key: 'active_secs', label: 'Active Time', width: 110,
      render: r => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtTime(Number(r.active_secs))}</span> },
    { key: 'category', label: 'Category', width: 130,
      render: r => { const { color, bg } = catBadge(r.category); return <Badge label={r.category} color={color} bg={bg} /> } },
    { key: 'action', label: 'Action', width: 170,
      render: r => {
        if (r.category !== 'Unclassified') return null
        if (isApproved(r.item)) return <Badge label="✓ Approved" color="#22c55e" bg="#22c55e22" />
        if (isPending(r.item))  return <Badge label="⏳ Pending"  color="#f59e0b" bg="#f59e0b22" />
        return (
          <button onClick={() => { setModal(r); setReason('') }}
            style={{ background: 'var(--accent-dim)', color: 'var(--accent-c)', border: '1px solid var(--accent-c)44', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
            + Request Productive
          </button>
        )
      }},
  ]

  return (
    <PageShell panel="employee" session={session} activeKey="web-app-usage" title="QD Employee">

      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 10, padding: '12px 18px', fontSize: 13, color: 'var(--text)', boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>{toast}</div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Profile</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>My Web & App Usage</h1>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {/* Productivity ring */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444', borderRadius: '10px 10px 0 0' }} />
            <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }} viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--border2)" strokeWidth="6" />
              <circle cx="32" cy="32" r="28" fill="none" stroke={pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="6" strokeDasharray={`${pct / 100 * C} ${C}`} strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444', marginTop: 4 }}>{pct}%</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Productive</div>
          </div>
          <StatCard label="Total Tracked"  value={fmtTime(summary.total_secs)}        icon="◷" color="var(--accent-c)" />
          <StatCard label="Productive"     value={fmtTime(summary.productive_secs)}   icon="✓" color="#22c55e" />
          <StatCard label="Unproductive"   value={fmtTime(summary.unproductive_secs)} icon="✕" color="#ef4444" />
          <StatCard label="Unclassified"   value={fmtTime(summary.unclassified_secs)} icon="◌" color="#71717a" />
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <TabBar variant="pill" active={type} onChange={k => setType(k as any)} color="var(--accent-c)"
          tabs={[{ key: 'both', label: 'Web + Apps' }, { key: 'web', label: '🌐 Web' }, { key: 'app', label: '💻 Apps' }]} />
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div><label style={LBL}>From</label><input type="date" value={from} style={INP} onChange={e => setFrom(e.target.value)} /></div>
        <div><label style={LBL}>To</label><input type="date" value={to} style={INP} onChange={e => setTo(e.target.value)} /></div>
        <button onClick={fetchData} style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>⟳ Refresh</button>
      </div>

      <div style={{ marginBottom: 10, padding: '8px 12px', background: '#8b5cf622', border: '1px solid #8b5cf644', borderRadius: 8 }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#c4b5fd' }}>◌ Unclassified sites can be requested as Productive — admin will review.</span>
      </div>

      {error && <div style={{ padding: '10px 14px', background: '#7f1d1d22', border: '1px solid #ef444444', borderRadius: 8, color: '#fca5a5', fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 14 }}>⚠ {error}</div>}

      {loading ? <Spinner text="Loading your usage data…" /> : (
        <DataTable columns={columns} rows={rows} pageSize={50} searchable emptyText="No usage data for this period" emptyIcon="◌" />
      )}

      {/* Request Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Request Productive Classification</h2>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text2)' }}>Admin will review and approve your request.</p>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge label={modal.type === 'web' ? '🌐 Web' : '💻 App'} color={modal.type === 'web' ? '#3b82f6' : '#8b5cf6'} bg={modal.type === 'web' ? '#3b82f622' : '#8b5cf622'} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--code-color)' }}>{modal.item}</span>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={LBL}>Why should this be marked Productive? *</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                placeholder="e.g. I use this for AI research and code generation"
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: 10, background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSubmit} disabled={submitting || !reason.trim()}
                style={{ flex: 1, padding: 10, background: 'var(--accent-dim)', color: 'var(--accent-c)', border: '1px solid var(--accent-c)44', borderRadius: 8, fontSize: 12, cursor: submitting || !reason.trim() ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: submitting || !reason.trim() ? 0.5 : 1 }}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
