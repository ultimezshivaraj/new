'use client'
// src/components/admin/employees/EmpModal.tsx

import { useState, useEffect } from 'react'
import { Employee, WorkReport, empRoles, roleColor, prodColor,
  fmtMins, fmtHM, fmtDate, tenure, initials, avatarBg, IMAGE_BASE } from './EmpCard'

function adminHeaders(): HeadersInit {
  const key = typeof window !== 'undefined' ? (localStorage.getItem('adminKey') ?? '') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
}

const TYPE_LABEL: Record<string,string> = { '1':'Employee','2':'Candidate','3':'Freelancer' }
const CAT_LABEL:  Record<string,string> = { '0':'Standard','1':'Freelancer','2':'Intern'    }
const RT_BADGE: Record<number,{l:string;c:string;b:string}> = {
  1:{l:'Full Report',c:'#22c55e',b:'#22c55e22'},
  2:{l:'Extended',  c:'#3b82f6',b:'#3b82f622'},
  3:{l:'Session Log',c:'#f59e0b',b:'#f59e0b22'},
}

// ── Types ─────────────────────────────────────────────────────
interface WorkRow7d {
  date: string; login_mins: string; logout_mins: string | null
  active_mins: string; worked_mins: string; ot_mins: string
  idle_mins: string; prod_mins: string; unprod_mins: string
  prod_pct: string; report_type: string
}
interface Stats30d {
  total_days: string; avg_prod: string; best_day: string; worst_day: string
  high_days: string; mid_days: string; low_days: string
  total_worked_mins: string; total_ot_mins: string
  total_idle_mins: string; total_prod_mins: string
}
interface AlertDetail { date: string; alert_count: string; rule_names: string; rule_groups: string }

// ── Shared sub-components ─────────────────────────────────────
function Row({ label, value, mono=false, color }: { label:string; value:string; mono?:boolean; color?:string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
      padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:11, color:'var(--text3)', flexShrink:0, marginRight:16 }}>{label}</span>
      <span style={{ fontSize:11, fontFamily:mono?'var(--font-mono)':'inherit',
        color:color||'var(--text)', textAlign:'right', wordBreak:'break-all' }}>
        {value || '—'}
      </span>
    </div>
  )
}

function SectionTitle({ label, right }: { label:string; right?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
      marginTop:20, marginBottom:10 }}>
      <span style={{ fontSize:9, fontFamily:'var(--font-mono)', letterSpacing:1.2,
        textTransform:'uppercase' as const, color:'var(--text4)', fontWeight:600 }}>
        {label}
      </span>
      {right}
    </div>
  )
}

function Chip({ label, value, color }: { label:string; value:string; color:string }) {
  return (
    <div style={{ textAlign:'center', padding:'10px 6px',
      background:'var(--bg3)', borderRadius:8, border:'1px solid var(--border)' }}>
      <div style={{ fontSize:8, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const,
        letterSpacing:.8, color:'var(--text4)', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:700, fontFamily:'var(--font-mono)', color }}>{value}</div>
    </div>
  )
}

function Tab({ label, active, onClick }: { label:string; active:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{ padding:'6px 14px', border:'none', fontSize:11,
      fontWeight:600, cursor:'pointer', fontFamily:'var(--font-sans)',
      background: active ? 'var(--accent-c)' : 'var(--bg3)',
      color: active ? '#000' : 'var(--text3)',
      borderRadius:6, transition:'all .15s', whiteSpace:'nowrap' as const }}>
      {label}
    </button>
  )
}

function NoReport() {
  return (
    <div style={{ padding:'20px', background:'var(--bg3)', borderRadius:8,
      border:'1px solid var(--border)', textAlign:'center', color:'var(--text4)', fontSize:12 }}>
      <div style={{ fontSize:18, marginBottom:6 }}>—</div>
      No report available
    </div>
  )
}

// ── Today's work report chips (from EmpCard data) ─────────────
function TodaySection({ wr }: { wr: WorkReport | null }) {
  if (!wr) return <NoReport />
  const rt = RT_BADGE[wr.report_type] || RT_BADGE[1]
  return (
    <div style={{ background:'var(--bg3)', borderRadius:10, border:'1px solid var(--border)', overflow:'hidden' }}>
      {/* Row 1: time chips */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderBottom:'1px solid var(--border)' }}>
        {([
          ['Login',  fmtMins(wr.login),        '#22c55e'    ],
          ['Logout', fmtMins(wr.logout),        wr.logout==null?'#f59e0b':'var(--text2)'],
          ['Active', fmtHM(wr.active_mins),     '#06b6d4'    ],
          ['OT',     fmtHM(wr.ot_mins)||'—',   '#f59e0b'    ],
        ] as [string,string,string][]).map(([l,v,c]) => (
          <div key={l} style={{ padding:'10px 8px', textAlign:'center', borderRight:'1px solid var(--border)' }}>
            <div style={{ fontSize:8, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const,
              letterSpacing:.8, color:'var(--text4)', marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:14, fontWeight:700, fontFamily:'var(--font-mono)', color:c }}>{v}</div>
          </div>
        ))}
      </div>
      {/* Row 2: worked/idle/productive/unproductive */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderBottom:'1px solid var(--border)' }}>
        {([
          ['Worked',   fmtHM(wr.worked_mins),  'var(--text2)'],
          ['Idle',     fmtHM(wr.idle_mins),     'var(--text3)'],
          ['Prod',     fmtHM(wr.prod_mins),     '#22c55e'    ],
          ['Unprod',   fmtHM(wr.unprod_mins),   '#ef4444'    ],
        ] as [string,string,string][]).map(([l,v,c]) => (
          <div key={l} style={{ padding:'10px 8px', textAlign:'center', borderRight:'1px solid var(--border)' }}>
            <div style={{ fontSize:8, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const,
              letterSpacing:.8, color:'var(--text4)', marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:14, fontWeight:700, fontFamily:'var(--font-mono)', color:c }}>{v}</div>
          </div>
        ))}
      </div>
      {/* Productivity bar */}
      <div style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:11, color:'var(--text3)' }}>Productivity</span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:9, padding:'2px 7px', borderRadius:8,
              fontFamily:'var(--font-mono)', fontWeight:600, background:rt.b, color:rt.c }}>
              {rt.l}
            </span>
            <span style={{ fontSize:16, fontWeight:700, fontFamily:'var(--font-mono)',
              color:prodColor(wr.prod) }}>{wr.prod}%</span>
          </div>
        </div>
        <div style={{ height:8, background:'var(--border)', borderRadius:4, overflow:'hidden' }}>
          <div style={{ width:`${wr.prod}%`, height:'100%', background:prodColor(wr.prod), borderRadius:4 }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
          <span style={{ fontSize:9, fontFamily:'var(--font-mono)', color:'var(--text4)' }}>
            {fmtHM(wr.worked_mins)} worked
          </span>
          <span style={{ fontSize:9, fontFamily:'var(--font-mono)', color:'var(--text4)' }}>
            {wr.prod >= 70 ? '🟢 High' : wr.prod >= 40 ? '🟡 Mid' : '🔴 Low'} performer
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Last 7 days table ─────────────────────────────────────────
function Week7Section({ rows }: { rows: WorkRow7d[] }) {
  if (rows.length === 0) return <NoReport />
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, overflow:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            {['Date','Login','Logout','Active','Worked','Idle','Prod','Unprod','Score'].map(h => (
              <th key={h} style={{ padding:'7px 10px', fontSize:8, fontFamily:'var(--font-mono)',
                letterSpacing:1, textTransform:'uppercase' as const, color:'var(--text3)',
                background:'var(--bg3)', textAlign:'left', borderBottom:'1px solid var(--border)',
                whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const prod = parseFloat(r.prod_pct) || 0
            return (
              <tr key={i}>
                <td style={{ padding:'7px 10px', fontSize:11, borderBottom:'1px solid var(--border)',
                  fontFamily:'var(--font-mono)', fontWeight:600, color:'var(--text)' }}>{r.date}</td>
                <td style={{ padding:'7px 10px', fontSize:10, borderBottom:'1px solid var(--border)',
                  fontFamily:'var(--font-mono)', color:'#22c55e' }}>{fmtMins(parseInt(r.login_mins||'0'))}</td>
                <td style={{ padding:'7px 10px', fontSize:10, borderBottom:'1px solid var(--border)',
                  fontFamily:'var(--font-mono)', color:'var(--text2)' }}>
                  {r.logout_mins ? fmtMins(parseInt(r.logout_mins)) : 'Active'}
                </td>
                <td style={{ padding:'7px 10px', fontSize:10, borderBottom:'1px solid var(--border)',
                  fontFamily:'var(--font-mono)', color:'#06b6d4' }}>{fmtHM(parseInt(r.active_mins||'0'))}</td>
                <td style={{ padding:'7px 10px', fontSize:10, borderBottom:'1px solid var(--border)',
                  fontFamily:'var(--font-mono)', color:'var(--text2)' }}>{fmtHM(parseInt(r.worked_mins||'0'))}</td>
                <td style={{ padding:'7px 10px', fontSize:10, borderBottom:'1px solid var(--border)',
                  fontFamily:'var(--font-mono)', color:'var(--text3)' }}>{fmtHM(parseInt(r.idle_mins||'0'))}</td>
                <td style={{ padding:'7px 10px', fontSize:10, borderBottom:'1px solid var(--border)',
                  fontFamily:'var(--font-mono)', color:'#22c55e' }}>{fmtHM(parseInt(r.prod_mins||'0'))}</td>
                <td style={{ padding:'7px 10px', fontSize:10, borderBottom:'1px solid var(--border)',
                  fontFamily:'var(--font-mono)', color:'#ef4444' }}>{fmtHM(parseInt(r.unprod_mins||'0'))}</td>
                <td style={{ padding:'7px 10px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:40, height:5, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${prod}%`, height:'100%', background:prodColor(prod), borderRadius:3 }} />
                    </div>
                    <span style={{ fontSize:10, fontFamily:'var(--font-mono)', fontWeight:700,
                      color:prodColor(prod) }}>{prod}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Last 30 days stats ────────────────────────────────────────
function Stats30Section({ s }: { s: Stats30d }) {
  if (!s.total_days || s.total_days === '0') return <NoReport />
  const avg = parseFloat(s.avg_prod) || 0
  const best = parseFloat(s.best_day) || 0
  const worst = parseFloat(s.worst_day) || 0
  return (
    <div>
      {/* Stat chips */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
        <Chip label="Days tracked"   value={s.total_days}            color="var(--accent-c)" />
        <Chip label="Avg prod"       value={`${avg}%`}               color={prodColor(avg)}   />
        <Chip label="Best day"       value={`${Math.round(best)}%`}  color="#22c55e"          />
        <Chip label="Worst day"      value={`${Math.round(worst)}%`} color="#ef4444"          />
      </div>
      {/* Performer breakdown */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
        <Chip label="High ≥70%"  value={s.high_days}  color="#22c55e" />
        <Chip label="Mid 40–69"  value={s.mid_days}   color="#f59e0b" />
        <Chip label="Low <40%"   value={s.low_days}   color="#ef4444" />
      </div>
      {/* Time totals */}
      <div style={{ background:'var(--bg3)', borderRadius:8, border:'1px solid var(--border)', padding:'10px 14px' }}>
        <div style={{ fontSize:9, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const,
          letterSpacing:.8, color:'var(--text4)', marginBottom:8 }}>Total time (30 days)</div>
        {([
          ['Total worked',  s.total_worked_mins,  'var(--text2)'],
          ['Overtime',      s.total_ot_mins,       '#f59e0b'    ],
          ['Idle',          s.total_idle_mins,     'var(--text3)'],
          ['Productive',    s.total_prod_mins,     '#22c55e'    ],
        ] as [string,string,string][]).map(([l,v,c]) => (
          <div key={l} style={{ display:'flex', justifyContent:'space-between',
            padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:11, color:'var(--text3)' }}>{l}</span>
            <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:c }}>
              {fmtHM(parseInt(v||'0'))}
            </span>
          </div>
        ))}
      </div>
      {/* Productivity bar */}
      <div style={{ marginTop:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
          <span style={{ fontSize:11, color:'var(--text3)' }}>30-day avg productivity</span>
          <span style={{ fontSize:14, fontWeight:700, fontFamily:'var(--font-mono)', color:prodColor(avg) }}>
            {avg}%
          </span>
        </div>
        <div style={{ height:8, background:'var(--border)', borderRadius:4, overflow:'hidden' }}>
          <div style={{ width:`${avg}%`, height:'100%', background:prodColor(avg), borderRadius:4 }} />
        </div>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────
export default function EmpModal({ e, onClose }: { e: Employee | null; onClose: () => void }) {
  const [wrTab, setWrTab] = useState<'today'|'week'|'month'>('today')
  const [detail, setDetail] = useState<{
    reports7d: WorkRow7d[]
    stats30d: Stats30d
    alerts: AlertDetail[]
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  // Fetch detail data when modal opens
  useEffect(() => {
    if (!e) { setDetail(null); setDetailError(''); return }
    setDetailLoading(true); setDetailError('')
    fetch(`/api/admin/employee-detail?id=${e.id}`, { headers: adminHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setDetail({ reports7d: data.reports7d, stats30d: data.stats30d, alerts: data.alerts })
        } else {
          setDetailError(data.detail || data.error || 'Failed to load')
        }
      })
      .catch(err => setDetailError(String(err)))
      .finally(() => setDetailLoading(false))
  }, [e?.id])

  if (!e) return null

  const roles    = empRoles(e)
  const bg       = avatarBg(e.full_name)
  const wr       = e.work_report
  const hasAlert = parseInt(e.alert_count || '0') > 0
  const hasPhoto = !!e.profile_image

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
        backdropFilter:'blur(6px)', zIndex:2000,
        display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={ev => { if (ev.target === ev.currentTarget) onClose() }}
    >
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:16,
        width:'100%', maxWidth:520, maxHeight:'92vh', overflowY:'auto',
        display:'flex', flexDirection:'column' }}>

        {/* ── Modal header ── */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{e.full_name}</div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:6, cursor:'pointer',
            background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text3)',
            fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        <div style={{ padding:'18px 20px', overflowY:'auto' }}>

          {/* ── SECTION 1: Identity block ── */}
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:14,
            background:'var(--bg3)', borderRadius:10, border:'1px solid var(--border)' }}>
            {hasPhoto ? (
              <img src={`${IMAGE_BASE}${e.profile_image}`} alt={e.full_name}
                style={{ width:54, height:54, borderRadius:12, objectFit:'cover',
                  flexShrink:0, border:'2px solid var(--border2)' }}
                onError={ev => {
                  const img = ev.currentTarget; img.style.display='none'
                  const next = img.nextElementSibling as HTMLElement|null
                  if (next) next.style.display='flex'
                }} />
            ) : null}
            <div style={{ width:54, height:54, borderRadius:12, background:bg, color:'#fff',
              flexShrink:0, display:hasPhoto?'none':'flex',
              alignItems:'center', justifyContent:'center',
              fontSize:20, fontWeight:700, fontFamily:'var(--font-mono)' }}>
              {initials(e.full_name)}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>{e.full_name}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
                {e.position || 'No position set'}
              </div>
              <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                <span style={{ fontSize:10, fontFamily:'var(--font-mono)', padding:'2px 8px', borderRadius:4,
                  ...(e.login_status==='1'
                    ?{background:'#14532d44',color:'#22c55e',border:'1px solid #22c55e44'}
                    :{background:'var(--bg3)',color:'var(--text3)',border:'1px solid var(--border)'}) }}>
                  {e.login_status==='1'?'● ENABLED':'○ DISABLED'}
                </span>
                {hasAlert && (
                  <span style={{ fontSize:10, fontFamily:'var(--font-mono)', padding:'2px 8px', borderRadius:4,
                    background:'#7f1d1d44', color:'#fca5a5', border:'1px solid #ef444444' }}>
                    ⚠ {e.alert_count} alert{parseInt(e.alert_count)>1?'s':''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 2: Profile ── */}
          <SectionTitle label="Profile" />
          <Row label="Employee ID"  value={`#${e.id}`}                              mono />
          <Row label="Username"     value={e.username}                               mono />
          <Row label="Email"        value={e.email_id}                               mono />
          <Row label="Mobile"       value={e.mobile_number}                               />
          <Row label="Location"     value={e.location}                                    />
          <Row label="Joined"       value={fmtDate(e.ultimez_join_date)}                  />
          {tenure(e.ultimez_join_date) && <Row label="Tenure" value={tenure(e.ultimez_join_date)} mono />}
          <Row label="Team Leader"  value={e.team_leader}                                 />
          <Row label="Type"         value={TYPE_LABEL[e.employee_type]     || '—'}       />
          <Row label="Category"     value={CAT_LABEL[e.employee_category_type] || '—'}  />
          {parseInt(e.salary    ||'0')>0 && <Row label="Salary"     value={`₹${parseInt(e.salary).toLocaleString('en-IN')}`}     mono color="#22c55e" />}
          {parseInt(e.allowances||'0')>0 && <Row label="Allowances" value={`₹${parseInt(e.allowances).toLocaleString('en-IN')}`} mono color="#06b6d4" />}

          {/* ── Roles ── */}
          {roles.length > 0 && (
            <>
              <SectionTitle label={`Roles (${roles.length})`} />
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:4 }}>
                {roles.map(r => (
                  <span key={r} style={{ fontSize:11, padding:'4px 11px', borderRadius:14,
                    fontFamily:'var(--font-mono)', fontWeight:600,
                    background:`${roleColor(r)}20`, color:roleColor(r),
                    border:`1px solid ${roleColor(r)}50` }}>
                    {r}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* ── SECTION 3: Work Report (Today | Last 7 Days | Last 30 Days) ── */}
          <SectionTitle
            label="Work Report"
            right={
              <div style={{ display:'flex', gap:4 }}>
                <Tab label="Today"     active={wrTab==='today'} onClick={()=>setWrTab('today')} />
                <Tab label="Last 7 Days" active={wrTab==='week'} onClick={()=>setWrTab('week')} />
                <Tab label="Last 30 Days" active={wrTab==='month'} onClick={()=>setWrTab('month')} />
              </div>
            }
          />

          {wrTab === 'today' && <TodaySection wr={wr} />}

          {wrTab === 'week' && (
            detailLoading
              ? <div style={{ textAlign:'center', padding:24, color:'var(--text3)', fontSize:12 }}>Loading…</div>
              : detailError
                ? <div style={{ padding:10, color:'#fca5a5', fontSize:11, fontFamily:'var(--font-mono)' }}>⚠ {detailError}</div>
                : <Week7Section rows={detail?.reports7d || []} />
          )}

          {wrTab === 'month' && (
            detailLoading
              ? <div style={{ textAlign:'center', padding:24, color:'var(--text3)', fontSize:12 }}>Loading…</div>
              : detailError
                ? <div style={{ padding:10, color:'#fca5a5', fontSize:11, fontFamily:'var(--font-mono)' }}>⚠ {detailError}</div>
                : <Stats30Section s={detail?.stats30d || {} as Stats30d} />
          )}

          {/* ── SECTION 4: Alerts (ALWAYS SHOWN) ── */}
          <SectionTitle
            label="Alerts — Last 30 Days"
            right={
              hasAlert
                ? <span style={{ fontSize:10, fontFamily:'var(--font-mono)', padding:'2px 8px',
                    borderRadius:8, background:'#7f1d1d44', color:'#fca5a5' }}>
                    {e.alert_count} today
                  </span>
                : undefined
            }
          />

          {detailLoading ? (
            <div style={{ textAlign:'center', padding:16, color:'var(--text3)', fontSize:12 }}>Loading alerts…</div>
          ) : detail?.alerts && detail.alerts.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {detail.alerts.map((a, i) => (
                <div key={i} style={{ background:'var(--bg3)', borderRadius:8, padding:'10px 12px',
                  border:'1px solid var(--border)', borderLeft:'3px solid #ef4444',
                  display:'flex', alignItems:'flex-start', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--text)',
                      fontWeight:600 }}>
                      {a.rule_names || 'Alert'}
                    </div>
                    {a.rule_groups && (
                      <div style={{ fontSize:9, fontFamily:'var(--font-mono)', color:'var(--text4)',
                        marginTop:2 }}>{a.rule_groups}</div>
                    )}
                    <div style={{ fontSize:10, color:'var(--text3)', marginTop:3 }}>{a.date}</div>
                  </div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:18, fontWeight:700,
                    color:'#ef4444', flexShrink:0 }}>{a.alert_count}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding:'14px 0', color:'var(--text4)', fontSize:12, textAlign:'center' }}>
              ✓ No alerts in the last 30 days
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
