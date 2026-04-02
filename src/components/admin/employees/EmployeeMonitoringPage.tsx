'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import PageShell, { NavItem } from '@/components/shared/PageShell'
import { SessionPayload } from '@/lib/session'
import EmpCard, { Employee, empRoles, prodColor, fmtMins, fmtHM } from './EmpCard'
import EmpModal from './EmpModal'

// ─── Auth header ──────────────────────────────────────────────
function adminHeaders(): HeadersInit {
  const key = typeof window !== 'undefined' ? (localStorage.getItem('adminKey') ?? '') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
}

// ─── Shared admin nav — used by both Employees page and Back Office page ──────
export const ADMIN_NAV: NavItem[] = [
  { type: 'divider', label: 'People' },
  { type: 'link', key: 'employees',     icon: '◉', label: 'Employees' },
  { type: 'link', key: 'hr',            icon: '♡', label: 'HR Module' },

  { type: 'divider', label: 'Back Office' },
  { type: 'dropdown', key: 'bo-leave', icon: '📋', label: 'Leave & Related',
    children: [
      { key: 'bo-leave-requests', label: 'Leave Requests'    },
      { key: 'bo-leave-holidays-calendar', label: 'Holiday Calendar'  },
      { key: 'bo-leave-pending',  label: 'Pending Approvals' },
    ],
  },
  { type: 'dropdown', key: 'bo-payroll', icon: '💰', label: 'Payroll',
    children: [
      { key: 'bo-payroll-records',  label: 'Payroll Records' },
      { key: 'bo-payroll-bank-accounts', label: 'Bank Accounts'   },
      { key: 'bo-payroll-logs',     label: 'Change History'  },
    ],
  },
  { type: 'dropdown', key: 'bo-it', icon: '🖥', label: 'IT Services',
    children: [
      { key: 'bo-it-queries',  label: 'System Queries'       },
      { key: 'bo-it-devices',  label: 'Device Inventory'     },
      { key: 'bo-it-history',  label: 'Query Status History' },
    ],
  },

  { type: 'divider', label: 'Content' },
  { type: 'link', key: 'companies',     icon: '⬡', label: 'Companies' },
  { type: 'link', key: 'professionals', icon: '◎', label: 'Professionals' },
  { type: 'link', key: 'reviews',       icon: '✦', label: 'Review Queue' },

  { type: 'divider', label: 'Analytics' },
  { type: 'link', key: 'reports',       icon: '▲', label: 'QD Reports' },

  { type: 'divider', label: 'Developer' },
  { type: 'link', key: 'qd-dev',        icon: '⌥', label: 'QD Dev' },
  { type: 'link', key: 'qd-tools',      icon: '⚙', label: 'QD Tools' },
]

// ─── Shared style objects ─────────────────────────────────────
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

// ─── Shared primitives ────────────────────────────────────────
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

function Spinner({ text = 'Loading from BigQuery…' }: { text?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 56, color: 'var(--text3)', fontSize: 13 }}>
      <div style={{ fontSize: 24, marginBottom: 10, display: 'inline-block', animation: 'qd-spin 1s linear infinite' }}>⟳</div>
      <div>{text}</div>
      <style>{`@keyframes qd-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function LoadBtn({ onClick, loading, children }: { onClick: () => void; loading?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={!!loading} style={{
      background: loading ? 'var(--bg3)' : 'linear-gradient(135deg,#f59e0b,#ef4444)',
      color: loading ? 'var(--text3)' : '#fff',
      border: 'none', borderRadius: 8, padding: '9px 18px',
      fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
      fontFamily: 'var(--font-sans)', transition: 'all .15s',
    }}>
      {loading ? 'Loading…' : children}
    </button>
  )
}

function Empty({ icon, title, desc }: { icon: string; title: string; desc?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 56, color: 'var(--text3)' }}>
      <div style={{ fontSize: 30, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
      {desc && <div style={{ fontSize: 13, maxWidth: 380, margin: '0 auto', lineHeight: 1.7 }}>{desc}</div>}
    </div>
  )
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div style={{ padding: '12px 16px', background: '#7f1d1d22', border: '1px solid #ef444444', borderRadius: 8, color: '#fca5a5', fontSize: 12, fontFamily: 'var(--font-mono)', marginTop: 10 }}>
      ⚠ {msg}
    </div>
  )
}

// ─── API response interfaces (matched exactly to route.ts) ────
interface WorkRow {
  employee_id: string; full_name: string; position: string; location: string
  date: string; login_mins: string; logout_mins: string | null
  active_mins: string; worked_mins: string; overtime_mins: string
  idle_mins: string; prod_mins: string; unprod_mins: string
  productivity_pct: string; report_type: string; alert_count: string
}
interface IpEvent  { employee_id: string; full_name: string; email_id: string; position: string; ip_address: string; auth_date: string; browser_details: string; browser_type_label: string }
interface IpStats  { total_events: string; unique_employees: string; office_logins: string; remote_logins: string; unique_ips: string; today_events: string; teramind_logins: string; mobile_logins: string; desktop_logins: string }
interface AlertRow { employee_id: string; full_name: string; position: string; rule_names: string; rule_groups: string; alert_count: string; date: string }
interface DeptRow  { department_name: string; active_employees: string; retention_pct: string; avg_tenure_months: string; new_hires_90d: string; total_ever: string }
interface DeptEmp  { employee_id: string; full_name: string; email_id: string; position: string; login_status: string; department_name: string; location: string; ultimez_join_date: string; create_type_row_id: string; role_names: string; tenure_months: string }
interface RoleStat { role_id: string; role_name: string; total_employees: string; active_employees: string }

const RT_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  '1': { label: 'Full',     color: '#22c55e', bg: '#22c55e22' },
  '2': { label: 'Extended', color: '#3b82f6', bg: '#3b82f622' },
  '3': { label: 'Session',  color: '#f59e0b', bg: '#f59e0b22' },
}
const DEPT_COLORS = ['#6366f1','#22c55e','#f59e0b','#3b82f6','#ec4899','#14b8a6','#8b5cf6','#ef4444','#06b6d4','#f97316']

// ══════════════════════════════════════════════════════════════
//  TAB: EMPLOYEE LIST
// ══════════════════════════════════════════════════════════════
function EmployeeListTab({ employees, loading, empError }: { employees: Employee[]; loading: boolean; empError: string }) {
  const [tab, setTab]               = useState<'active' | 'ex'>('active')
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [selected, setSelected]     = useState<Employee | null>(null)

  const allRoles = useMemo(() => {
    const s = new Set<string>()
    employees.forEach(e => empRoles(e).forEach(r => s.add(r)))
    return [...s].sort()
  }, [employees])

  const filtered = useMemo(() => {
    let list = employees.filter(e => tab === 'ex' ? e.login_status === '0' : e.login_status === '1')
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.full_name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) || empRoles(e).some(r => r.toLowerCase().includes(q))
      )
    }
    if (roleFilter) list = list.filter(e => empRoles(e).includes(roleFilter))
    return list
  }, [employees, tab, search, roleFilter])

  const nActive  = employees.filter(e => e.login_status === '1').length
  const nEx      = employees.filter(e => e.login_status === '0').length
  const nReports = employees.filter(e => !!e.work_report).length
  const nAlerts  = employees.filter(e => parseInt(e.alert_count || '0') > 0).length

  if (loading) return <Spinner />
  if (empError) return <ErrBox msg={empError} />

  return (
    <div>
      {/* 6 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total"        value={employees.length} color="var(--accent-c)" />
        <StatCard label="Enabled"      value={nActive}  sub="login_status = 1"  color="#3b82f6" />
        <StatCard label="Active Today" value={employees.filter(e=>e.work_report!==null).length} sub="logged in today" color="#22c55e" />
        <StatCard label="With Reports" value={nReports}                          color="#06b6d4" />
        <StatCard label="Alerts Today" value={nAlerts}                           color="#ef4444" />
        <StatCard label="Avg Productivity" value={(() => { const r=employees.filter(e=>e.work_report!==null); return r.length>0?`${Math.round(r.reduce((s,e)=>s+(e.work_report?.prod||0),0)/r.length)}%`:"—" })()} sub="today's avg" color="#6366f1" />
      </div>

      {/* Active / Ex tabs */}
      <div style={{ display: 'flex', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 14 }}>
        {([{ k: 'active' as const, l: '🟢 Active', c: nActive }, { k: 'ex' as const, l: '✕ Ex Employees', c: nEx }]).map(({ k, l, c }) => {
          const on = tab === k
          return (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '6px 16px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all .15s',
              background: on ? '#f59e0b22' : 'transparent',
              color: on ? '#f59e0b' : 'var(--text3)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {l}
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 10, background: on ? '#f59e0b' : 'var(--border2)', color: on ? '#fff' : 'var(--text3)' }}>{c}</span>
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 14 }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, role, location…"
            style={{ width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-sans)', outline: 'none' }} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text3)', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          <option value="">All Roles</option>
          {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', whiteSpace: 'nowrap' }}>{filtered.length} of {employees.length}</span>
      </div>

      {/* Grid */}
      {filtered.length === 0
        ? <Empty icon="◈" title="No employees found" desc="Try clearing the search or filter" />
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(258px,1fr))', gap: 12 }}>
            {filtered.map(e => <EmpCard key={e.id} e={e} onOpen={setSelected} />)}
          </div>
      }

      {selected && <EmpModal e={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: EMPLOYEE WORK PRODUCTIVITY  (merged Today + 30-day Trends)
// ══════════════════════════════════════════════════════════════
function WorkProductivityTab() {
  const [rows, setRows]         = useState<WorkRow[]>([])
  const [loading, setLoading]   = useState(false)
  const [loaded, setLoaded]     = useState(false)
  const [error, setError]       = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [search, setSearch]     = useState('')
  const [sortBy, setSortBy]     = useState<'prod' | 'login' | 'name' | 'worked'>('prod')
  const [view, setView]         = useState<'detail' | 'summary'>('detail')
  const [page, setPage]         = useState(1)
  const PER_PAGE = 50

  // ── Preset date helpers ──
  function today() { return new Date().toISOString().slice(0, 10) }
  function setPreset(p: 'today' | 'week' | 'month' | '30d') {
    const t = today(), now = new Date()
    if (p === 'today') { setDateFrom(t); setDateTo(t) }
    if (p === 'week')  { const s = new Date(now); s.setDate(s.getDate() - 7);  setDateFrom(s.toISOString().slice(0,10)); setDateTo(t) }
    if (p === 'month') { setDateFrom(now.toISOString().slice(0,8)+'01'); setDateTo(t) }
    if (p === '30d')   { const s = new Date(now); s.setDate(s.getDate() - 30); setDateFrom(s.toISOString().slice(0,10)); setDateTo(t) }
  }

  // ── Load from API ──
  async function load(from = dateFrom, to = dateTo) {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to)   params.set('to', to)
      const res = await fetch(`/api/admin/work-today?${params}`, { headers: adminHeaders() })
      const data = await res.json()
      if (data.success) { setRows(data.reports as WorkRow[]); setLoaded(true); setPage(1) }
      else setError(data.detail || data.error || 'Failed to load')
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }

  // ── Top-level stats ──
  const totalReports  = rows.length
  const avg    = rows.length ? Math.round(rows.reduce((s,r) => s + parseFloat(r.productivity_pct), 0) / rows.length) : 0
  const high   = rows.filter(r => parseFloat(r.productivity_pct) >= 70).length
  const mid    = rows.filter(r => { const p = parseFloat(r.productivity_pct); return p >= 40 && p < 70 }).length
  const low    = rows.filter(r => parseFloat(r.productivity_pct) < 40).length
  const uniqEmps = new Set(rows.map(r => r.employee_id)).size
  const isMultiDay = new Set(rows.map(r => r.date)).size > 1

  // ── Daily chart data (client-side grouping) ──
  const dailyChart = useMemo(() => {
    const map = new Map<string, { total: number; count: number; high: number; mid: number; low: number }>()
    rows.forEach(r => {
      const p = parseFloat(r.productivity_pct) || 0
      const existing = map.get(r.date) ?? { total: 0, count: 0, high: 0, mid: 0, low: 0 }
      map.set(r.date, {
        total: existing.total + p, count: existing.count + 1,
        high: existing.high + (p >= 70 ? 1 : 0),
        mid:  existing.mid  + (p >= 40 && p < 70 ? 1 : 0),
        low:  existing.low  + (p < 40 ? 1 : 0),
      })
    })
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({ date, avg: Math.round(d.total / d.count), count: d.count, high: d.high, mid: d.mid, low: d.low }))
  }, [rows])

  // ── Per-employee summary (client-side grouping) ──
  const empSummary = useMemo(() => {
    const map = new Map<string, {
      name: string; position: string; days: number
      prods: number[]; totalWorked: number; totalIdle: number; totalProd: number
    }>()
    rows.forEach(r => {
      const p = parseFloat(r.productivity_pct) || 0
      const existing = map.get(r.employee_id) ?? { name: r.full_name, position: r.position, days: 0, prods: [], totalWorked: 0, totalIdle: 0, totalProd: 0 }
      map.set(r.employee_id, {
        ...existing, days: existing.days + 1,
        prods: [...existing.prods, p],
        totalWorked: existing.totalWorked + parseInt(r.worked_mins || '0'),
        totalIdle:   existing.totalIdle   + parseInt(r.idle_mins   || '0'),
        totalProd:   existing.totalProd   + parseInt(r.prod_mins   || '0'),
      })
    })
    return [...map.values()]
      .map(e => ({
        ...e,
        avg:   Math.round(e.prods.reduce((s,p) => s+p, 0) / e.prods.length),
        best:  Math.round(Math.max(...e.prods)),
        worst: Math.round(Math.min(...e.prods)),
        highDays: e.prods.filter(p => p >= 70).length,
        midDays:  e.prods.filter(p => p >= 40 && p < 70).length,
        lowDays:  e.prods.filter(p => p < 40).length,
      }))
      .sort((a, b) => b.avg - a.avg)
  }, [rows])

  // ── Filtered + sorted detail rows ──
  const sorted = useMemo(() => {
    let list = [...rows]
    if (search) { const q = search.toLowerCase(); list = list.filter(r => r.full_name.toLowerCase().includes(q) || r.position.toLowerCase().includes(q)) }
    if (sortBy === 'prod')   list.sort((a,b) => parseFloat(b.productivity_pct) - parseFloat(a.productivity_pct))
    if (sortBy === 'name')   list.sort((a,b) => a.full_name.localeCompare(b.full_name))
    if (sortBy === 'login')  list.sort((a,b) => parseInt(a.login_mins||'0') - parseInt(b.login_mins||'0'))
    if (sortBy === 'worked') list.sort((a,b) => parseInt(b.worked_mins||'0') - parseInt(a.worked_mins||'0'))
    return list
  }, [rows, search, sortBy])

  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const paged = sorted.slice((page-1)*PER_PAGE, page*PER_PAGE)

  // ── chart max ──
  const chartMax = dailyChart.length ? Math.max(...dailyChart.map(d => d.avg), 10) : 100

  return (
    <div>
      {/* ── Date range toolbar ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16,
        flexWrap:'wrap', padding:'12px 16px', background:'var(--bg3)',
        border:'1px solid var(--border)', borderRadius:10 }}>
        <span style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--font-mono)' }}>📅</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ padding:'6px 10px', background:'var(--card)', border:'1px solid var(--border2)',
            color:'var(--text)', borderRadius:6, fontSize:12 }} />
        <span style={{ color:'var(--text3)', fontFamily:'var(--font-mono)' }}>→</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ padding:'6px 10px', background:'var(--card)', border:'1px solid var(--border2)',
            color:'var(--text)', borderRadius:6, fontSize:12 }} />
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {([['today','Today'],['week','7 Days'],['month','This Month'],['30d','30 Days']] as const).map(([k,l]) => (
            <button key={k} onClick={() => setPreset(k)} style={{ padding:'5px 10px', fontSize:11,
              border:'1px solid var(--border2)', borderRadius:6, cursor:'pointer',
              background:'transparent', color:'var(--text3)', fontFamily:'var(--font-sans)' }}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={() => load()} style={{ padding:'6px 14px', fontSize:12,
          background:'var(--accent-c)', color:'#000', border:'none', borderRadius:6,
          fontWeight:600, cursor:'pointer' }}>
          {loading ? 'Loading…' : 'Load'}
        </button>
        {loaded && <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text3)', marginLeft:'auto' }}>
          {totalReports} records · {uniqEmps} employees
        </span>}
      </div>

      {error && (
        <div style={{ padding:'10px 14px', background:'#7f1d1d22', border:'1px solid #ef444444',
          borderRadius:8, color:'#fca5a5', fontSize:12, fontFamily:'var(--font-mono)', marginBottom:12 }}>
          ⚠ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:56, color:'var(--text3)', fontSize:13 }}>
          <div style={{ fontSize:24, marginBottom:10 }}>⟳</div>
          Loading from BigQuery…
        </div>
      ) : !loaded ? (
        <div style={{ textAlign:'center', padding:56, color:'var(--text3)' }}>
          <div style={{ fontSize:30, marginBottom:12 }}>⚡</div>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:6 }}>Employee Work Productivity</div>
          <div style={{ fontSize:13, maxWidth:380, margin:'0 auto', lineHeight:1.7 }}>
            Pick a date range and click Load — or use a preset to get started
          </div>
        </div>
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10, marginBottom:20 }}>
            {[
              { label:'Reports',     value:totalReports,  color:'var(--accent-c)' },
              { label:'Employees',   value:uniqEmps,      color:'#6366f1'         },
              { label:'Avg Score',   value:`${avg}%`,     color:'#22c55e'         },
              { label:'High ≥70%',   value:high,          color:'#22c55e'         },
              { label:'Mid 40–69',   value:mid,           color:'#f59e0b'         },
              { label:'Low <40%',    value:low,           color:'#ef4444'         },
            ].map(c => (
              <div key={c.label} style={{ background:'var(--card)', border:'1px solid var(--border)',
                borderRadius:10, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:c.color }} />
                <div style={{ fontSize:9, fontFamily:'var(--font-mono)', letterSpacing:1,
                  textTransform:'uppercase' as const, color:'var(--text3)', marginBottom:8 }}>{c.label}</div>
                <div style={{ fontSize:22, fontWeight:700, lineHeight:1, fontFamily:'var(--font-mono)', color:c.color }}>
                  {c.value}
                </div>
              </div>
            ))}
          </div>

          {/* ── Daily bar chart (only if multi-day) ── */}
          {dailyChart.length > 1 && (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)',
              borderRadius:10, padding:'16px 16px 12px', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>
                  Daily Avg Productivity — {dailyChart.length} days
                </span>
                <div style={{ display:'flex', gap:12, fontSize:9, fontFamily:'var(--font-mono)' }}>
                  <span style={{ color:'#22c55e' }}>■ High ≥70%</span>
                  <span style={{ color:'#f59e0b' }}>■ Mid 40–69</span>
                  <span style={{ color:'#ef4444' }}>■ Low &lt;40%</span>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:120, overflowX:'auto',
                paddingBottom:4 }}>
                {dailyChart.map(d => {
                  const pct = Math.round((d.avg / chartMax) * 100)
                  const col = d.avg >= 70 ? '#22c55e' : d.avg >= 40 ? '#f59e0b' : '#ef4444'
                  return (
                    <div key={d.date} style={{ flex:'0 0 auto', minWidth:14, display:'flex',
                      flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end',
                      cursor:'default' }}
                      title={`${d.date}: ${d.avg}% avg · ${d.count} employees · ${d.high}H ${d.mid}M ${d.low}L`}>
                      <div style={{ fontSize:8, fontFamily:'var(--font-mono)', color:col,
                        marginBottom:2, writingMode:'initial' }}>{d.avg}%</div>
                      <div style={{ width:'100%', height:`${pct}%`, minHeight:2,
                        background:col, borderRadius:'2px 2px 0 0',
                        transition:'height .2s' }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4,
                fontSize:9, fontFamily:'var(--font-mono)', color:'var(--text4)' }}>
                <span>{dailyChart[0]?.date}</span>
                <span>{dailyChart[dailyChart.length-1]?.date}</span>
              </div>
            </div>
          )}

          {/* ── View toggle (multi-day only) ── */}
          {isMultiDay && (
            <div style={{ display:'flex', gap:6, marginBottom:12 }}>
              {(['detail','summary'] as const).map(k => {
                const l = k === 'detail' ? '📋 Daily Records' : '📊 Employee Summary'
                return (
                  <button key={k} onClick={() => setView(k)} style={{ padding:'7px 16px',
                    border:'1px solid var(--border2)', borderRadius:8, cursor:'pointer',
                    fontSize:12, fontWeight:600, fontFamily:'var(--font-sans)',
                    background: view===k ? 'var(--accent-c)' : 'var(--bg3)',
                    color: view===k ? '#000' : 'var(--text3)', transition:'all .15s' }}>
                    {l}
                  </button>
                )
              })}
            </div>
          )}

          {/* ── DETAIL VIEW: full row table ── */}
          {(!isMultiDay || view === 'detail') && (
            <>
              <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search employee or position…"
                  style={{ flex:1, minWidth:180, padding:'7px 10px', background:'var(--bg3)',
                    border:'1px solid var(--border2)', color:'var(--text)', borderRadius:8,
                    fontSize:12, fontFamily:'var(--font-sans)', outline:'none' }} />
                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  style={{ padding:'7px 10px', background:'var(--bg3)', border:'1px solid var(--border2)',
                    color:'var(--text3)', borderRadius:8, fontSize:12, cursor:'pointer',
                    fontFamily:'var(--font-sans)' }}>
                  <option value="prod">Productivity ↓</option>
                  <option value="worked">Worked hours ↓</option>
                  <option value="login">Login time</option>
                  <option value="name">Name A–Z</option>
                </select>
                <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text3)',
                  alignSelf:'center', whiteSpace:'nowrap' }}>{sorted.length} records</span>
              </div>
              <div style={{ background:'var(--card)', border:'1px solid var(--border)',
                borderRadius:10, overflow:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
                  <thead>
                    <tr>
                      {['#','Employee','Date','Login','Logout','Active','Worked','Idle','Prod hrs','Unprod','OT','Score','Type'].map(h => (
                        <th key={h} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((r, i) => {
                      const prod = parseFloat(r.productivity_pct) || 0
                      const rt   = RT_LABEL[r.report_type] ?? RT_LABEL['1']
                      return (
                        <tr key={`${r.employee_id}-${r.date}-${i}`}
                          onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background='var(--bg3)' }}
                          onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background='' }}>
                          <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)', width:32 }}>
                            {(page-1)*PER_PAGE+i+1}
                          </td>
                          <td style={{ ...TD, fontWeight:600 }}>
                            <div style={{ whiteSpace:'nowrap' }}>{r.full_name}</div>
                            <div style={{ fontSize:10, color:'var(--text3)' }}>{r.position||''}</div>
                            {parseInt(r.alert_count)>0 && (
                              <span style={{ fontSize:9, background:'#7f1d1d44', color:'#fca5a5',
                                padding:'1px 5px', borderRadius:4, fontFamily:'var(--font-mono)' }}>
                                ⚠ {r.alert_count}
                              </span>
                            )}
                          </td>
                          <td style={{ ...TD, fontFamily:'var(--font-mono)', fontSize:10,
                            color:'var(--text3)', whiteSpace:'nowrap' }}>{r.date}</td>
                          <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#22c55e', whiteSpace:'nowrap' }}>
                            {fmtMins(parseInt(r.login_mins||'0'))}
                          </td>
                          <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text2)', whiteSpace:'nowrap' }}>
                            {r.logout_mins!=null ? fmtMins(parseInt(r.logout_mins)) : (
                              <span style={{ color:'#f59e0b', fontSize:10 }}>Active</span>
                            )}
                          </td>
                          <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#06b6d4', whiteSpace:'nowrap' }}>
                            {fmtHM(parseInt(r.active_mins||'0'))}
                          </td>
                          <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text2)', whiteSpace:'nowrap' }}>
                            {fmtHM(parseInt(r.worked_mins||'0'))}
                          </td>
                          <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)', whiteSpace:'nowrap' }}>
                            {fmtHM(parseInt(r.idle_mins||'0'))}
                          </td>
                          <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#22c55e', whiteSpace:'nowrap' }}>
                            {fmtHM(parseInt(r.prod_mins||'0'))}
                          </td>
                          <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#ef4444', whiteSpace:'nowrap' }}>
                            {fmtHM(parseInt(r.unprod_mins||'0'))}
                          </td>
                          <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#f59e0b', whiteSpace:'nowrap' }}>
                            {fmtHM(parseInt(r.overtime_mins||'0'))}
                          </td>
                          <td style={{ ...TD, minWidth:110 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <div style={{ flex:1, height:5, background:'var(--bg3)', borderRadius:3,
                                overflow:'hidden', minWidth:44 }}>
                                <div style={{ width:`${prod}%`, height:'100%',
                                  background:prodColor(prod), borderRadius:3 }} />
                              </div>
                              <span style={{ fontSize:11, fontFamily:'var(--font-mono)', fontWeight:700,
                                color:prodColor(prod), minWidth:36 }}>{prod}%</span>
                            </div>
                          </td>
                          <td style={TD}>
                            <span style={{ fontSize:9, padding:'2px 7px', borderRadius:8,
                              fontFamily:'var(--font-mono)', fontWeight:600,
                              background:rt.bg, color:rt.color }}>
                              {rt.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {pages > 1 && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'8px 12px', background:'var(--bg3)', borderTop:'1px solid var(--border)' }}>
                    <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text3)' }}>
                      Page {page} of {pages} · {sorted.length} records
                    </span>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page<=1}
                        style={{ background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text3)',
                          borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer',
                          opacity:page<=1?0.4:1 }}>← Prev</button>
                      <button onClick={() => setPage(p => Math.min(pages,p+1))} disabled={page>=pages}
                        style={{ background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text3)',
                          borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer',
                          opacity:page>=pages?0.4:1 }}>Next →</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── SUMMARY VIEW: per-employee aggregate ── */}
          {isMultiDay && view === 'summary' && (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)',
              borderRadius:10, overflow:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['Employee','Position','Days','Avg %','Best','Worst','High','Mid','Low','Total Worked','Idle','Productive'].map(h => (
                      <th key={h} style={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {empSummary.map((e, i) => (
                    <tr key={i}
                      onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background='var(--bg3)' }}
                      onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background='' }}>
                      <td style={{ ...TD, fontWeight:600 }}>{e.name}</td>
                      <td style={{ ...TD, color:'var(--text3)', fontSize:11 }}>{e.position||'—'}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)' }}>{e.days}</td>
                      <td style={TD}>
                        <span style={{ fontSize:12, fontWeight:700, fontFamily:'var(--font-mono)',
                          color:prodColor(e.avg), background:`${prodColor(e.avg)}22`,
                          padding:'2px 8px', borderRadius:10 }}>{e.avg}%</span>
                      </td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#22c55e' }}>{e.best}%</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#ef4444' }}>{e.worst}%</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#22c55e' }}>{e.highDays}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#f59e0b' }}>{e.midDays}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#ef4444' }}>{e.lowDays}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text2)' }}>{fmtHM(e.totalWorked)}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)' }}>{fmtHM(e.totalIdle)}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#22c55e' }}>{fmtHM(e.totalProd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: ALERTS
// ══════════════════════════════════════════════════════════════
function AlertsTab() {
  const [alerts, setAlerts]   = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded]   = useState(false)
  const [error, setError]     = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/alerts', { headers: adminHeaders() })
      const data = await res.json()
      if (data.success) { setAlerts(data.alerts as AlertRow[]); setLoaded(true) }
      else setError(data.detail || data.error || 'Failed to load')
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }

  return (
    <div>
      {!loaded && !loading && <LoadBtn onClick={load}>Load Alerts (30 days)</LoadBtn>}
      {error && <ErrBox msg={error} />}
      {loading ? <Spinner /> : !loaded ? <Empty icon="⚠" title="Click above to load Teramind alerts" /> :
       alerts.length === 0 ? <Empty icon="✓" title="No alerts in last 30 days" desc="All clear — no Teramind alerts recorded" /> : (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '3px solid #ef4444' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#7f1d1d44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>⚠</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.full_name || `Employee #${a.employee_id}`}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {a.position || '—'} · <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>{a.rule_names || '—'}</span>
                  {a.rule_groups && <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 4, background: 'var(--bg3)', color: 'var(--text4)', marginLeft: 6, border: '1px solid var(--border)' }}>{a.rule_groups}</span>}
                  <span style={{ color: 'var(--text4)', marginLeft: 4 }}>· {a.date}</span>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{a.alert_count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: IP MONITOR
// ══════════════════════════════════════════════════════════════
function IpMonitorTab() {
  const [events, setEvents]     = useState<IpEvent[]>([])
  const [stats, setStats]       = useState<IpStats | null>(null)
  const [officeIp, setOfficeIp] = useState('61.3.18.4')
  const [loading, setLoading]   = useState(false)
  const [loaded, setLoaded]     = useState(false)
  const [error, setError]       = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/ip-monitor', { headers: adminHeaders() })
      const data = await res.json()
      if (data.success) { setEvents(data.events as IpEvent[]); setStats(data.stats as IpStats); setOfficeIp(data.officeIp ?? '61.3.18.4'); setLoaded(true) }
      else setError(data.detail || data.error || 'Failed to load')
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }

  function ipBadge(ip: string) {
    if (ip === officeIp) return { label: 'OFFICE', color: '#22c55e',      bg: '#14532d44'  }
    if (ip.includes(':')) return { label: 'IPv6',   color: '#8b5cf6',      bg: '#8b5cf622'  }
    return                       { label: 'REMOTE', color: 'var(--text3)', bg: 'var(--bg3)' }
  }

  return (
    <div>
      {!loaded && !loading && <LoadBtn onClick={load}>Load IP Monitor Data</LoadBtn>}
      {error && <ErrBox msg={error} />}
      {loading ? <Spinner /> : !loaded ? <Empty icon="🔐" title="Click above to load IP authentication data" /> : (
        <>
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20, marginTop: 14 }}>
              <StatCard label="Total Auth Events" value={parseInt(stats.total_events || '0').toLocaleString('en-IN')} color="#8b5cf6" />
              <StatCard label="Office Logins"     value={stats.office_logins} sub={officeIp}   color="#22c55e"         />
              <StatCard label="Remote Logins"     value={stats.remote_logins} sub="non-office" color="#71717a"         />
              <StatCard label="Unique Employees"  value={stats.unique_employees}                color="#3b82f6"         />
              <StatCard label="Unique IPs"        value={stats.unique_ips}                      color="#06b6d4"         />
              <StatCard label="Today's Events"    value={stats.today_events}                    color="var(--accent-c)" />
            </div>
          )}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Employee','Position','IP Address','Type','Auth Time'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {events.map((ev, i) => {
                  const badge = ipBadge(ev.ip_address)
                  return (
                    <tr key={i}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                      <td style={{ ...TD, fontWeight: 600 }}>{ev.full_name || `Emp #${ev.employee_id}`}</td>
                      <td style={{ ...TD, color: 'var(--text3)', fontSize: 11 }}>{ev.position || '—'}</td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{ev.ip_address}</td>
                      <td style={TD}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: badge.bg, color: badge.color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{badge.label}</span></td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)' }}>{ev.auth_date?.replace('T', ' ').slice(0, 16) ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: DEPARTMENTS
// ══════════════════════════════════════════════════════════════
function DeptTab() {
  const [depts, setDepts]         = useState<DeptRow[]>([])
  const [emps, setEmps]           = useState<DeptEmp[]>([])
  const [roleStats, setRoleStats] = useState<RoleStat[]>([])
  const [loading, setLoading]     = useState(false)
  const [loaded, setLoaded]       = useState(false)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [view, setView]           = useState<'directory' | 'roles'>('directory')

  const DEPT_COLOR: Record<string,string> = {
    'Content & Editorial':'#6366f1','Development':'#3b82f6','SEO & Backlinks':'#22c55e',
    'Marketing & Growth':'#06b6d4','Data & Analytics':'#14b8a6','HR':'#8b5cf6',
    'Sales & BD':'#f59e0b','Design':'#ec4899','Academy':'#f97316','Management':'#ef4444','Other':'#64748b',
  }

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/departments', { headers: adminHeaders() })
      const data = await res.json()
      if (data.success) {
        setDepts(data.depts as DeptRow[])
        setEmps(data.employees as DeptEmp[])
        setRoleStats(data.roleStats as RoleStat[])
        setLoaded(true)
      } else setError(data.detail || data.error || 'Failed to load')
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }

  const filteredEmps = useMemo(() => {
    let list = emps
    if (deptFilter) list = list.filter(e => e.department_name === deptFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.full_name.toLowerCase().includes(q) ||
        (e.department_name ?? '').toLowerCase().includes(q) ||
        (e.role_names ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [emps, search, deptFilter])

  return (
    <div>
      {!loaded && !loading && <LoadBtn onClick={load}>Load Department Data</LoadBtn>}
      {error && <ErrBox msg={error} />}
      {loading ? <Spinner /> : !loaded ? <Empty icon="🏢" title="Click above to load live department data from BigQuery" /> : (
        <>
          {/* Dept stat cards — coloured by real department */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:10, marginBottom:18, marginTop:14 }}>
            {depts.map(d => {
              const col = DEPT_COLOR[d.department_name] || '#64748b'
              return (
                <div key={d.department_name}
                  onClick={() => setDeptFilter(deptFilter === d.department_name ? '' : d.department_name)}
                  style={{ background:'var(--card)',
                    border:`1px solid ${deptFilter===d.department_name ? col : 'var(--border)'}`,
                    borderRadius:10, padding:'14px 16px', borderTop:`3px solid ${col}`,
                    cursor:'pointer', transition:'border-color .15s' }}>
                  {/* Dept name */}
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:8 }}>
                    {d.department_name}
                  </div>
                  {/* Active count */}
                  <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--font-mono)', color:col, marginBottom:8 }}>
                    {d.active_employees}
                    <span title="Employees currently active — login_status = 1" style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--text4)', fontWeight:400, marginLeft:4 }}>active</span>
                  </div>
                  {/* Retention bar */}
                  {(() => {
                    const ret = parseFloat(d.retention_pct || '0')
                    const retCol = ret >= 60 ? '#22c55e' : ret >= 30 ? '#f59e0b' : '#ef4444'
                    return (
                      <div style={{ marginBottom:8 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                          <span title="Active employees ÷ total ever hired in this department × 100. Low % means high turnover." style={{ fontSize:8, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const, letterSpacing:.8, color:'var(--text4)', cursor:'help' }}>Retention ⓘ</span>
                          <span style={{ fontSize:10, fontFamily:'var(--font-mono)', fontWeight:700, color:retCol }}>{ret}%</span>
                        </div>
                        <div style={{ height:4, background:'var(--border)', borderRadius:2, overflow:'hidden' }}>
                          <div style={{ width:`${ret}%`, height:'100%', background:retCol, borderRadius:2 }} />
                        </div>
                        <div title="total_ever = all employees ever assigned to this department, including those who left" style={{ fontSize:8, color:'var(--text4)', marginTop:2, cursor:'help' }}>
                          {d.active_employees} active of {d.total_ever} ever hired
                        </div>
                      </div>
                    )
                  })()}
                  {/* Tenure + new hires */}
                  <div style={{ display:'flex', gap:12 }}>
                    <div>
                      <div title="Average time active employees have been at Ultimez, calculated from ultimez_join_date to today" style={{ fontSize:8, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const, color:'var(--text4)', marginBottom:2, cursor:'help' }}>Avg Tenure ⓘ</div>
                      <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text2)', fontWeight:600 }}>
                        {(() => { const m = parseFloat(d.avg_tenure_months||'0'); return m >= 12 ? `${Math.floor(m/12)}y ${Math.round(m%12)}m` : `${Math.round(m)}m` })()}
                      </div>
                    </div>
                    {parseInt(d.new_hires_90d||'0') > 0 && (
                      <div>
                        <div title="Employees who joined in the last 90 days (ultimez_join_date >= today - 90 days)" style={{ fontSize:8, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const, color:'var(--text4)', marginBottom:2, cursor:'help' }}>New (90d) ⓘ</div>
                        <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'#22c55e', fontWeight:600 }}>
                          +{d.new_hires_90d}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* View toggle */}
          <div style={{ display:'flex', gap:6, marginBottom:12 }}>
            {(['directory','roles'] as const).map(k => (
              <button key={k} onClick={() => setView(k)} style={{ padding:'6px 14px',
                border:'1px solid var(--border2)', borderRadius:8, cursor:'pointer',
                fontSize:12, fontWeight:600, fontFamily:'var(--font-sans)',
                background:view===k?'var(--accent-c)':'var(--bg3)',
                color:view===k?'#000':'var(--text3)', transition:'all .15s' }}>
                {k === 'directory' ? '👤 Employee Directory' : '🏷 Role Breakdown'}
              </button>
            ))}
          </div>

          {/* EMPLOYEE DIRECTORY VIEW */}
          {view === 'directory' && (
            <>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search name, department, role…"
                  style={{ flex:1, padding:'7px 10px', background:'var(--bg3)', border:'1px solid var(--border2)',
                    color:'var(--text)', borderRadius:8, fontSize:12, fontFamily:'var(--font-sans)', outline:'none' }} />
                {deptFilter && (
                  <button onClick={() => setDeptFilter('')} style={{ padding:'7px 12px',
                    background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8,
                    fontSize:12, color:'var(--text3)', cursor:'pointer', fontFamily:'var(--font-sans)' }}>
                    ✕ {deptFilter}
                  </button>
                )}
                <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text3)', alignSelf:'center' }}>
                  {filteredEmps.length} employees
                </span>
              </div>
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, overflow:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>{[
                      { h:'Employee',   t:'Full name from tbl_employees.full_name' },
                      { h:'Department', t:'Derived from role IDs — which department group the employee belongs to' },
                      { h:'Roles',      t:'Official role names from tbl_employees_create_types' },
                      { h:'Location',   t:'City or region from tbl_employees.location' },
                      { h:'Tenure',     t:'Time at Ultimez — DATE_DIFF from ultimez_join_date to today' },
                    ].map(({ h, t }) => <th key={h} title={t} style={{ ...TH, cursor:'help' }}>{h} ⓘ</th>)}</tr>
                  </thead>
                  <tbody>
                    {filteredEmps.map((e, i) => {
                      const col = DEPT_COLOR[e.department_name] || '#64748b'
                      return (
                        <tr key={e.employee_id || i}
                          onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background='var(--bg3)' }}
                          onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background='' }}>
                          <td style={{ ...TD, fontWeight:600 }}>{e.full_name}</td>
                          <td style={TD}>
                            <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10,
                              fontFamily:'var(--font-mono)', fontWeight:600,
                              background:`${col}20`, color:col }}>
                              {e.department_name || 'Unassigned'}
                            </span>
                          </td>
                          <td style={{ ...TD, fontSize:10, color:'var(--text3)' }}>
                            {(e.role_names || '').split(',').map(r => r.trim()).filter(Boolean).map(r => (
                              <span key={r} style={{ display:'inline-block', marginRight:3, marginBottom:2,
                                fontSize:9, padding:'1px 5px', borderRadius:4,
                                background:'var(--bg3)', border:'1px solid var(--border2)',
                                color:'var(--text3)', fontFamily:'var(--font-mono)' }}>{r}</span>
                            ))}
                          </td>
                          <td style={{ ...TD, color:'var(--text3)', fontSize:11 }}>{e.location || '—'}</td>
                          <td style={{ ...TD, fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)' }}>
                            {(() => { const m = parseInt(e.tenure_months||'0'); return m >= 12 ? `${Math.floor(m/12)}y ${Math.round(m%12)}m` : `${m}m` })()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ROLE BREAKDOWN VIEW */}
          {view === 'roles' && (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, overflow:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>{[
                      { h:'ID',                   t:'Role ID stored in tbl_employees.create_type_row_id' },
                      { h:'Role (official name)',  t:'Official name from tbl_employees_create_types.create_type_name' },
                      { h:'Active employees',      t:'Employees with this role and login_status = 1' },
                      { h:'Total employees',       t:'All employees ever assigned this role (active + ex)' },
                    ].map(({ h, t }) => <th key={h} title={t} style={{ ...TH, cursor:'help' }}>{h} ⓘ</th>)}</tr>
                </thead>
                <tbody>
                  {roleStats.map((r, i) => {
                    const active = parseInt(r.active_employees || '0')
                    const total  = parseInt(r.total_employees  || '0')
                    const pct    = total > 0 ? Math.round(active/total*100) : 0
                    return (
                      <tr key={i}
                        onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background='var(--bg3)' }}
                        onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background='' }}>
                        <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)', width:40 }}>{r.role_id}</td>
                        <td style={{ ...TD, fontWeight:500 }}>{r.role_name}</td>
                        <td style={TD}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:80, height:5, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ width:`${pct}%`, height:'100%', background:'#22c55e', borderRadius:3 }} />
                            </div>
                            <span style={{ fontSize:12, fontFamily:'var(--font-mono)', fontWeight:700, color:'#22c55e' }}>{active}</span>
                          </div>
                        </td>
                        <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)' }}>{total}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: APP & WEB USAGE
// ══════════════════════════════════════════════════════════════

// Interfaces
interface AppRow    { app_n_web_name: string; total_secs: string; usage_count: string; employee_count: string; category: string }
interface WebDomain { domain: string; total_secs: string; visit_count: string; employee_count: string }
interface WebPage   { page_title: string; tab_url: string; domain: string; total_secs: string; visit_count: string; employee_count: string }
interface AppEmpRow { full_name: string; position: string; employee_id: string; top_app: string; total_secs: string; app_count: string }
interface WebEmpRow { full_name: string; position: string; employee_id: string; top_domain: string; total_secs: string; page_count: string }
interface UsageSummary { total_records: string; total_employees: string; unique_apps?: string; total_secs: string; data_from: string; data_to: string }

function fmtSecs(s: number): string {
  if (!s || s <= 0) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}

function AppWebTab() {
  const [subTab, setSubTab]       = useState<'apps' | 'webs'>('webs')
  const [view, setView]           = useState<'overview' | 'employees'>('overview')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')

  // Apps state
  const [topApps, setTopApps]           = useState<AppRow[]>([])
  const [appEmps, setAppEmps]           = useState<AppEmpRow[]>([])
  const [appSummary, setAppSummary]     = useState<UsageSummary | null>(null)
  const [appsLoaded, setAppsLoaded]     = useState(false)
  const [appsLoading, setAppsLoading]   = useState(false)
  const [appsError, setAppsError]       = useState('')

  // Webs state
  const [topDomains, setTopDomains]     = useState<WebDomain[]>([])
  const [topPages, setTopPages]         = useState<WebPage[]>([])
  const [webEmps, setWebEmps]           = useState<WebEmpRow[]>([])
  const [webSummary, setWebSummary]     = useState<UsageSummary | null>(null)
  const [websLoaded, setWebsLoaded]     = useState(false)
  const [websLoading, setWebsLoading]   = useState(false)
  const [websError, setWebsError]       = useState('')

  function today() { return new Date().toISOString().slice(0,10) }
  function preset(p: '7d'|'30d'|'month'|'all') {
    const t = today(), now = new Date()
    if (p === '7d')    { const s=new Date(now); s.setDate(s.getDate()-7);   setDateFrom(s.toISOString().slice(0,10)); setDateTo(t) }
    if (p === '30d')   { const s=new Date(now); s.setDate(s.getDate()-30);  setDateFrom(s.toISOString().slice(0,10)); setDateTo(t) }
    if (p === 'month') { setDateFrom(now.toISOString().slice(0,8)+'01');    setDateTo(t) }
    if (p === 'all')   { setDateFrom('2023-12-01'); setDateTo('2024-07-05') }
  }

  async function loadApps() {
    setAppsLoading(true); setAppsError('')
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo)   params.set('to', dateTo)
      const res  = await fetch(`/api/admin/app-usage?${params}`, { headers: adminHeaders() })
      const data = await res.json()
      if (data.success) {
        setTopApps(data.topApps as AppRow[])
        setAppEmps(data.perEmployee as AppEmpRow[])
        setAppSummary(data.summary as UsageSummary)
        setAppsLoaded(true)
      } else setAppsError(data.detail || data.error || 'Failed to load')
    } catch (e) { setAppsError(String(e)) }
    finally { setAppsLoading(false) }
  }

  async function loadWebs() {
    setWebsLoading(true); setWebsError('')
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo)   params.set('to', dateTo)
      const res  = await fetch(`/api/admin/web-usage?${params}`, { headers: adminHeaders() })
      const data = await res.json()
      if (data.success) {
        setTopDomains(data.topDomains as WebDomain[])
        setTopPages(data.topPages as WebPage[])
        setWebEmps(data.perEmployee as WebEmpRow[])
        setWebSummary(data.summary as UsageSummary)
        setWebsLoaded(true)
      } else setWebsError(data.detail || data.error || 'Failed to load')
    } catch (e) { setWebsError(String(e)) }
    finally { setWebsLoading(false) }
  }

  function load() {
    if (subTab === 'apps') loadApps()
    else loadWebs()
  }

  const isLoaded   = subTab === 'apps' ? appsLoaded   : websLoaded
  const isLoading  = subTab === 'apps' ? appsLoading  : websLoading
  const error      = subTab === 'apps' ? appsError    : websError
  const summary    = subTab === 'apps' ? appSummary   : webSummary

  const catColor = (cat: string) =>
    cat === 'Productive' ? '#22c55e' : cat === 'App' ? '#3b82f6' : '#64748b'

  return (
    <div>
      {/* ── Sub-tab: Apps vs Webs ── */}
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {(['webs','apps'] as const).map(k => (
          <button key={k} onClick={() => { setSubTab(k); setView('overview') }}
            style={{ padding:'7px 18px', border:'1px solid var(--border2)', borderRadius:8,
              cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'var(--font-sans)',
              background: subTab===k ? 'var(--accent-c)' : 'var(--bg3)',
              color: subTab===k ? '#000' : 'var(--text3)', transition:'all .15s' }}>
            {k === 'webs' ? '🌐 Web Usage' : '🖥 App Usage'}
          </button>
        ))}
      </div>

      {/* ── Date picker ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14,
        flexWrap:'wrap', padding:'10px 14px', background:'var(--bg3)',
        border:'1px solid var(--border)', borderRadius:10 }}>
        <span style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--font-mono)' }}>📅</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ padding:'5px 9px', background:'var(--card)', border:'1px solid var(--border2)',
            color:'var(--text)', borderRadius:6, fontSize:12 }} />
        <span style={{ color:'var(--text3)' }}>→</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ padding:'5px 9px', background:'var(--card)', border:'1px solid var(--border2)',
            color:'var(--text)', borderRadius:6, fontSize:12 }} />
        <div style={{ display:'flex', gap:4 }}>
          {([['7d','7 Days'],['30d','30 Days'],['month','This Month']] as const).map(([k,l]) => (
            <button key={k} onClick={() => preset(k)}
              style={{ padding:'4px 9px', fontSize:11, border:'1px solid var(--border2)',
                borderRadius:6, cursor:'pointer', background:'transparent',
                color:'var(--text3)', fontFamily:'var(--font-sans)' }}>{l}</button>
          ))}
          {subTab === 'apps' && (
            <button onClick={() => preset('all')}
              style={{ padding:'4px 9px', fontSize:11, border:'1px solid var(--border2)',
                borderRadius:6, cursor:'pointer', background:'#f59e0b22',
                color:'#f59e0b', fontFamily:'var(--font-sans)' }}>Full Range</button>
          )}
        </div>
        <button onClick={load} style={{ padding:'6px 14px', fontSize:12,
          background:'var(--accent-c)', color:'#000', border:'none', borderRadius:6,
          fontWeight:600, cursor:'pointer' }}>
          {isLoading ? 'Loading…' : 'Load'}
        </button>
        {subTab === 'apps' && (
          <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'#f59e0b',
            alignSelf:'center' }}>
            ⚠ App data: Dec 2023 – Jul 2024 only
          </span>
        )}
      </div>

      {error && <div style={{ padding:'10px 14px', background:'#7f1d1d22',
        border:'1px solid #ef444444', borderRadius:8, color:'#fca5a5',
        fontSize:12, fontFamily:'var(--font-mono)', marginBottom:12 }}>⚠ {error}</div>}

      {isLoading ? (
        <div style={{ textAlign:'center', padding:56, color:'var(--text3)', fontSize:13 }}>
          <div style={{ fontSize:24, marginBottom:10 }}>⟳</div>
          Scanning {subTab === 'apps' ? '809k app records' : '553k web records'}…
        </div>
      ) : !isLoaded ? (
        <div style={{ textAlign:'center', padding:56, color:'var(--text3)' }}>
          <div style={{ fontSize:30, marginBottom:12 }}>{subTab === 'webs' ? '🌐' : '🖥'}</div>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:6 }}>
            {subTab === 'webs' ? 'Browser Web Usage' : 'Desktop App Usage'}
          </div>
          <div style={{ fontSize:13, maxWidth:400, margin:'0 auto', lineHeight:1.7, color:'var(--text3)' }}>
            {subTab === 'webs'
              ? 'Live data Jan 2024 → today. Pick a date range and click Load.'
              : 'Historical data Dec 2023 → Jul 2024. Click "Full Range" then Load.'}
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          {summary && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',
              gap:10, marginBottom:16 }}>
              {[
                { label:'Records',   value:parseInt(summary.total_records||'0').toLocaleString('en-IN'), color:'var(--accent-c)' },
                { label:'Employees', value:summary.total_employees, color:'#6366f1' },
                { label:'Total Time',value:fmtSecs(parseInt(summary.total_secs||'0')), color:'#3b82f6' },
                ...(summary.unique_apps ? [{ label:'Unique Apps', value:summary.unique_apps, color:'#06b6d4' }] : []),
                { label:'From',      value:summary.data_from||'—', color:'var(--text3)' },
                { label:'To',        value:summary.data_to||'—',   color:'var(--text3)' },
              ].map(s => (
                <div key={s.label} style={{ background:'var(--card)', border:'1px solid var(--border)',
                  borderRadius:10, padding:'12px 14px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:s.color }} />
                  <div style={{ fontSize:8, fontFamily:'var(--font-mono)', letterSpacing:1,
                    textTransform:'uppercase' as const, color:'var(--text3)', marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontSize:18, fontWeight:700, fontFamily:'var(--font-mono)', color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* View toggle */}
          <div style={{ display:'flex', gap:6, marginBottom:12 }}>
            {(['overview','employees'] as const).map(k => (
              <button key={k} onClick={() => setView(k)}
                style={{ padding:'6px 14px', border:'1px solid var(--border2)', borderRadius:8,
                  cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'var(--font-sans)',
                  background: view===k ? 'var(--accent-c)' : 'var(--bg3)',
                  color: view===k ? '#000' : 'var(--text3)', transition:'all .15s' }}>
                {k === 'overview' ? (subTab==='apps'?'📊 Top Apps':'🌐 Top Domains') : '👤 By Employee'}
              </button>
            ))}
            {subTab === 'webs' && view === 'overview' && (
              <button onClick={() => setView('overview')}
                style={{ padding:'6px 14px', border:'1px solid var(--border2)', borderRadius:8,
                  cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'var(--font-sans)',
                  background:'var(--bg3)', color:'var(--text3)' }}>
                📄 Top Pages
              </button>
            )}
          </div>

          {/* APPS — Overview */}
          {subTab === 'apps' && view === 'overview' && (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)',
              borderRadius:10, overflow:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['#','App / Executable','Time Used','Sessions','Employees','Category'].map(h =>
                  <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {topApps.map((r, i) => {
                    const secs = parseInt(r.total_secs||'0')
                    const maxSecs = parseInt(topApps[0]?.total_secs||'1')
                    return (
                      <tr key={i}
                        onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background='var(--bg3)' }}
                        onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background='' }}>
                        <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)', width:32 }}>{i+1}</td>
                        <td style={{ ...TD, fontWeight:500 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:5, background:'var(--bg3)', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                              <div style={{ width:`${(secs/maxSecs)*100}%`, height:'100%', background:catColor(r.category), borderRadius:3 }} />
                            </div>
                            <span style={{ fontSize:12, minWidth:120 }}>{r.app_n_web_name}</span>
                          </div>
                        </td>
                        <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#3b82f6', fontWeight:600 }}>{fmtSecs(secs)}</td>
                        <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)' }}>{parseInt(r.usage_count).toLocaleString()}</td>
                        <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)' }}>{r.employee_count}</td>
                        <td style={TD}>
                          <span style={{ fontSize:9, padding:'2px 7px', borderRadius:8,
                            fontFamily:'var(--font-mono)', fontWeight:600,
                            background:`${catColor(r.category)}20`, color:catColor(r.category) }}>
                            {r.category}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* APPS — Per Employee */}
          {subTab === 'apps' && view === 'employees' && (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)',
              borderRadius:10, overflow:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Employee','Position','Total Time','Apps Used','Top App'].map(h =>
                  <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {appEmps.map((r, i) => (
                    <tr key={i}
                      onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background='var(--bg3)' }}
                      onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background='' }}>
                      <td style={{ ...TD, fontWeight:600 }}>{r.full_name}</td>
                      <td style={{ ...TD, color:'var(--text3)', fontSize:11 }}>{r.position||'—'}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#3b82f6', fontWeight:700 }}>{fmtSecs(parseInt(r.total_secs||'0'))}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)' }}>{r.app_count}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)' }}>{r.top_app}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* WEBS — Top Domains */}
          {subTab === 'webs' && view === 'overview' && (
            <>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:8 }}>Top Domains</div>
              <div style={{ background:'var(--card)', border:'1px solid var(--border)',
                borderRadius:10, overflow:'auto', marginBottom:16 }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>{['#','Domain','Active Time','Visits','Employees'].map(h =>
                    <th key={h} style={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {topDomains.map((r, i) => {
                      const secs = parseInt(r.total_secs||'0')
                      const maxSecs = parseInt(topDomains[0]?.total_secs||'1')
                      return (
                        <tr key={i}
                          onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background='var(--bg3)' }}
                          onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background='' }}>
                          <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)', width:32 }}>{i+1}</td>
                          <td style={{ ...TD, fontWeight:500 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:80, height:5, background:'var(--bg3)', borderRadius:3, overflow:'hidden', flexShrink:0 }}>
                                <div style={{ width:`${(secs/maxSecs)*100}%`, height:'100%', background:'#3b82f6', borderRadius:3 }} />
                              </div>
                              <span style={{ fontSize:12 }}>{r.domain}</span>
                            </div>
                          </td>
                          <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#3b82f6', fontWeight:700 }}>{fmtSecs(secs)}</td>
                          <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)' }}>{parseInt(r.visit_count).toLocaleString()}</td>
                          <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)' }}>{r.employee_count}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:8 }}>Top Pages</div>
              <div style={{ background:'var(--card)', border:'1px solid var(--border)',
                borderRadius:10, overflow:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>{['#','Page Title','Domain','Active Time','Visits'].map(h =>
                    <th key={h} style={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {topPages.map((r, i) => (
                      <tr key={i}
                        onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background='var(--bg3)' }}
                        onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background='' }}>
                        <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)', width:32 }}>{i+1}</td>
                        <td style={{ ...TD, maxWidth:300 }}>
                          <div style={{ fontSize:12, fontWeight:500, color:'var(--text)',
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {r.page_title}
                          </div>
                          <div style={{ fontSize:10, color:'var(--text4)', marginTop:1,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {r.tab_url}
                          </div>
                        </td>
                        <td style={{ ...TD, fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)' }}>{r.domain}</td>
                        <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#3b82f6', fontWeight:700 }}>{fmtSecs(parseInt(r.total_secs||'0'))}</td>
                        <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)' }}>{r.visit_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* WEBS — Per Employee */}
          {subTab === 'webs' && view === 'employees' && (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)',
              borderRadius:10, overflow:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Employee','Position','Total Browse Time','Pages Visited','Top Domain'].map(h =>
                  <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {webEmps.map((r, i) => (
                    <tr key={i}
                      onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background='var(--bg3)' }}
                      onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background='' }}>
                      <td style={{ ...TD, fontWeight:600 }}>{r.full_name}</td>
                      <td style={{ ...TD, color:'var(--text3)', fontSize:11 }}>{r.position||'—'}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#3b82f6', fontWeight:700 }}>{fmtSecs(parseInt(r.total_secs||'0'))}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)' }}>{r.page_count}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)' }}>{r.top_domain}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════
type TopPage = 'emplist' | 'workmon'
type WmTab   = 'productivity' | 'appweb' | 'alerts' | 'ipmon' | 'dept'

const WM_TABS: { key: WmTab; label: string }[] = [
  { key: 'productivity', label: '⚡ Employee Work Productivity' },
  { key: 'appweb',       label: '💻 App & Web Usage'           },
  { key: 'alerts',       label: '⚠ Alerts'                    },
  { key: 'ipmon',        label: '🔐 IP Monitor'                },
  { key: 'dept',         label: '🏢 Departments'               },
]

export default function EmployeeMonitoringPage({ session }: { session: SessionPayload }) {
  const router = useRouter()
  const [page, setPage]           = useState<TopPage>('emplist')
  const [wmTab, setWmTab]         = useState<WmTab>('productivity')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [empLoading, setEmpLoading] = useState(false)
  const [empLoaded, setEmpLoaded]   = useState(false)
  const [empError, setEmpError]     = useState('')

  // Navigate to other admin pages via router
  function handleNav(key: string) {
    if (key === 'employees') return // already here
    // Back Office tab keys → navigate to backoffice with tab param
    if (key.startsWith('bo-')) { router.push(`/admin/backoffice?tab=${key}`); return }
    router.push(`/admin/${key}`)
  }

  const loadEmployees = useCallback(async () => {
    if (empLoaded) return
    setEmpLoading(true); setEmpError('')
    try {
      const res = await fetch('/api/admin/employees', { headers: adminHeaders() })
      const data = await res.json()
      if (data.success) {
        setEmployees(
          (data.employees as Record<string, string>[]).map(e => ({
            ...e,
            id: e.employee_id,
            work_report: (() => {
              const hasReport = e.wr_login_mins !== '' && e.wr_login_mins !== '0'
              if (!hasReport) return null
              return {
                login:       parseInt(e.wr_login_mins   || '0'),
                logout:      e.wr_logout_mins !== '' ? parseInt(e.wr_logout_mins) : null,
                active_mins: parseInt(e.wr_active_mins  || '0'),
                worked_mins: parseInt(e.wr_worked_mins  || '0'),
                ot_mins:     parseInt(e.wr_ot_mins      || '0'),
                idle_mins:   parseInt(e.wr_idle_mins    || '0'),
                prod_mins:   parseInt(e.wr_prod_mins    || '0'),
                unprod_mins: parseInt(e.wr_unprod_mins  || '0'),
                prod:        parseFloat(e.wr_prod       || '0'),
                report_type: parseInt(e.wr_report_type  || '1'),
              }
            })(),
          })) as unknown as Employee[]
        )
        setEmpLoaded(true)
      } else {
        setEmpError(data.detail || data.error || 'API error')
        setEmpLoaded(true)
      }
    } catch (e) { setEmpError(`Network error: ${String(e)}`); setEmpLoaded(true) }
    finally { setEmpLoading(false) }
  }, [empLoaded])

  useEffect(() => { loadEmployees() }, [loadEmployees])

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '12px 20px', border: 'none', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', background: 'transparent',
    color: active ? 'var(--accent-c)' : 'var(--text3)',
    borderBottom: active ? '2px solid var(--accent-c)' : '2px solid transparent',
    transition: 'all .15s', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' as const,
  })
  const wmTabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 18px', border: 'none', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', background: 'transparent',
    color: active ? 'var(--accent-c)' : 'var(--text3)',
    borderBottom: active ? '2px solid var(--accent-c)' : '2px solid transparent',
    transition: 'all .15s', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' as const,
  })

  // Subtitle shown in PageShell topbar
  const subtitle = page === 'emplist'
    ? 'Employee List'
    : WM_TABS.find(t => t.key === wmTab)?.label ?? 'Work Monitoring'

  return (
    <PageShell
      panel="admin"
      session={session}
      navItems={ADMIN_NAV}
      activeKey="employees"
      onNav={handleNav}
      title="Admin Dashboard"
      subtitle={subtitle}
    >
      {/* Inner header: Employee List | Work Monitoring tabs */}
      <div style={{ margin: '-24px -24px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ padding: '14px 24px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Employee Monitoring</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
              Ultimez Team — Live work tracking &amp; productivity overview
            </div>
          </div>
          <span style={{
            fontSize: 11, fontFamily: 'var(--font-mono)', paddingBottom: 14,
            color: empError ? '#ef4444' : 'var(--text3)',
            maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
          }}>
            {empError ? `⚠ ${empError}` : empLoaded ? `${employees.length} employees loaded` : ''}
          </span>
        </div>

        {/* Top-level tabs */}
        <div style={{ display: 'flex', padding: '0 24px' }}>
          <button style={tabStyle(page === 'emplist')} onClick={() => setPage('emplist')}>👥 Employee List</button>
          <button style={tabStyle(page === 'workmon')} onClick={() => setPage('workmon')}>📊 Work Monitoring</button>
        </div>

        {/* Work Monitoring sub-tabs */}
        {page === 'workmon' && (
          <div style={{ padding: '0 24px', display: 'flex', overflowX: 'auto', borderTop: '1px solid var(--border)' }}>
            {WM_TABS.map(t => (
              <button key={t.key} style={wmTabStyle(wmTab === t.key)} onClick={() => setWmTab(t.key)}>{t.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Page content */}
      {page === 'emplist' && <EmployeeListTab employees={employees} loading={empLoading} empError={empError} />}
      {page === 'workmon' && wmTab === 'productivity' && <WorkProductivityTab />}
      {page === 'workmon' && wmTab === 'alerts' && <AlertsTab />}
      {page === 'workmon' && wmTab === 'ipmon'  && <IpMonitorTab />}
      {page === 'workmon' && wmTab === 'dept'   && <DeptTab />}
      {page === 'workmon' && wmTab === 'appweb' && <AppWebTab />}
    </PageShell>
  )
}