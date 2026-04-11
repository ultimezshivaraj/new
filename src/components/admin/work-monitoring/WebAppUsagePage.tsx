'use client'
// src/components/admin/work-monitoring/WebAppUsagePage.tsx

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/shared/PageShell'
import StatCard from '@/components/shared/StatCard'
import DataTable, { Column } from '@/components/shared/DataTable'
import TabBar from '@/components/shared/TabBar'
import { Badge, Spinner } from '@/components/shared/ui'
import { SessionPayload } from '@/lib/session'

function adminHeaders(): HeadersInit {
  const key = typeof window !== 'undefined' ? (localStorage.getItem('adminKey') ?? '') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
}

function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
function today() { return new Date().toISOString().split('T')[0] }
function sevenDaysAgo() {
  const d = new Date(); d.setDate(d.getDate() - 6)
  return d.toISOString().split('T')[0]
}
function catBadge(cat: string) {
  const map: Record<string, { color: string; bg: string }> = {
    Productive:   { color: '#22c55e', bg: '#22c55e22' },
    Unproductive: { color: '#ef4444', bg: '#ef444422' },
    Neutral:      { color: '#f59e0b', bg: '#f59e0b22' },
    Unclassified: { color: '#71717a', bg: '#71717a22' },
  }
  return map[cat] ?? map.Unclassified
}

interface UsageRow {
  agent_id: string; agent_name: string; department_name: string
  activity_date: string; item: string; type: string
  active_secs: string; category: string
}
interface Summary {
  productive_secs: number; unproductive_secs: number
  unclassified_secs: number; unique_employees: number
}
interface FilterOptions {
  employees: { agent_id: string; agent_name: string }[]
  departments: { department_id: string; department_name: string }[]
}

const SEL: React.CSSProperties = {
  background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)',
  borderRadius: 8, padding: '7px 10px', fontSize: 12, fontFamily: 'var(--font-sans)',
  outline: 'none', minWidth: 140,
}
const INP: React.CSSProperties = {
  background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)',
  borderRadius: 8, padding: '7px 10px', fontSize: 12, fontFamily: 'var(--font-mono)', outline: 'none',
}
const LBL: React.CSSProperties = {
  fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'block',
}

export default function WebAppUsagePage({ session }: { session: SessionPayload }) {
  const router = useRouter()
  const [from, setFrom]         = useState(sevenDaysAgo())
  const [to, setTo]             = useState(today())
  const [type, setType]         = useState<'both'|'web'|'app'>('both')
  const [agentId, setAgentId]   = useState('')
  const [deptId, setDeptId]     = useState('')
  const [category, setCategory] = useState('')
  const [rows, setRows]         = useState<UsageRow[]>([])
  const [summary, setSummary]   = useState<Summary | null>(null)
  const [filters, setFilters]   = useState<FilterOptions>({ employees: [], departments: [] })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    fetch('/api/admin/web-app-usage', { method: 'POST', headers: adminHeaders() })
      .then(r => r.json()).then(d => { if (d.employees) setFilters(d) }).catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    const p = new URLSearchParams({ from, to, type })
    if (agentId)  p.set('agent_id', agentId)
    if (deptId)   p.set('dept_id', deptId)
    if (category) p.set('category', category)
    try {
      const res  = await fetch(`/api/admin/web-app-usage?${p}`, { headers: adminHeaders() })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); setLoading(false); return }
      setRows([...(data.webs || []), ...(data.apps || [])])
      setSummary(data.summary)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [from, to, type, agentId, deptId, category])

  useEffect(() => { fetchData() }, [fetchData])

  const columns: Column<any>[] = [
    { key: 'agent_name',      label: 'Employee',    width: 140 },
    { key: 'department_name', label: 'Department',  width: 120,
      render: r => <span style={{ color: 'var(--text2)', fontSize: 11 }}>{r.department_name || '—'}</span> },
    { key: 'item',            label: 'Domain / App',
      render: r => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--code-color)' }}>{r.item}</span> },
    { key: 'type',            label: 'Type',        width: 90,
      render: r => <Badge label={r.type === 'web' ? '🌐 Web' : '💻 App'} color={r.type === 'web' ? '#3b82f6' : '#8b5cf6'} bg={r.type === 'web' ? '#3b82f622' : '#8b5cf622'} /> },
    { key: 'activity_date',   label: 'Date',        width: 100,
      render: r => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text2)' }}>{r.activity_date}</span> },
    { key: 'active_secs',     label: 'Active Time', width: 110,
      render: r => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtTime(Number(r.active_secs))}</span> },
    { key: 'category',        label: 'Category',    width: 130,
      render: r => { const { color, bg } = catBadge(r.category); return <Badge label={r.category} color={color} bg={bg} /> } },
  ]

  return (
    <PageShell panel="admin" session={session} activeKey="work-monitoring/web-app-usage" title="QD Admin">

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Work Monitoring</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Web & App Usage</h1>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="Active Employees" value={summary.unique_employees}           icon="◉" color="var(--accent-c)" />
          <StatCard label="Productive Time"  value={fmtTime(summary.productive_secs)}   icon="✓" color="#22c55e" />
          <StatCard label="Unproductive"     value={fmtTime(summary.unproductive_secs)} icon="✕" color="#ef4444" />
          <StatCard label="Unclassified"     value={fmtTime(summary.unclassified_secs)} icon="◌" color="#71717a" />
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <TabBar variant="pill" active={type} onChange={k => setType(k as any)} color="var(--accent-c)"
          tabs={[{ key:'both', label:'Web + Apps' }, { key:'web', label:'🌐 Web' }, { key:'app', label:'💻 Apps' }]} />
      </div>

      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', marginBottom:14, display:'flex', flexWrap:'wrap', gap:12, alignItems:'flex-end' }}>
        <div><label style={LBL}>From</label><input type="date" value={from} style={INP} onChange={e => setFrom(e.target.value)} /></div>
        <div><label style={LBL}>To</label><input type="date" value={to} style={INP} onChange={e => setTo(e.target.value)} /></div>
        <div>
          <label style={LBL}>Employee</label>
          <select value={agentId} style={SEL} onChange={e => setAgentId(e.target.value)}>
            <option value="">All Employees</option>
            {filters.employees.map(e => <option key={e.agent_id} value={e.agent_id}>{e.agent_name}</option>)}
          </select>
        </div>
        <div>
          <label style={LBL}>Department</label>
          <select value={deptId} style={SEL} onChange={e => setDeptId(e.target.value)}>
            <option value="">All Departments</option>
            {filters.departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
          </select>
        </div>
        <div>
          <label style={LBL}>Category</label>
          <select value={category} style={SEL} onChange={e => setCategory(e.target.value)}>
            <option value="">All</option>
            <option value="Productive">Productive</option>
            <option value="Unproductive">Unproductive</option>
            <option value="Unclassified">Unclassified</option>
          </select>
        </div>
        <button onClick={fetchData} style={{ background:'linear-gradient(135deg,#f59e0b,#ef4444)', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-sans)' }}>⟳ Refresh</button>
      </div>

      {error && <div style={{ padding:'10px 14px', background:'#7f1d1d22', border:'1px solid #ef444444', borderRadius:8, color:'#fca5a5', fontSize:12, fontFamily:'var(--font-mono)', marginBottom:14 }}>⚠ {error}</div>}

      {loading ? <Spinner text="Loading web & app usage from BigQuery…" /> : (
        <DataTable columns={columns} rows={rows} pageSize={50} searchable emptyText="No usage data for this period" emptyIcon="◌" />
      )}

      <div style={{ marginTop:14, textAlign:'right' }}>
        <button onClick={() => router.push('/admin/work-monitoring/productive-requests')}
          style={{ background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text2)', borderRadius:8, padding:'7px 14px', fontSize:12, cursor:'pointer', fontFamily:'var(--font-sans)' }}>
          View Productive Requests →
        </button>
      </div>
    </PageShell>
  )
}
