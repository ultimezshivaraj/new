'use client'
// src/components/employee/EmployeeDashboardClient.tsx

import { useState, useMemo } from 'react'
import PageShell, { NavItem } from '@/components/shared/PageShell'
import { SessionPayload } from '@/lib/session'
import { ROLE_MAP, ROLE_COLORS } from '@/components/employee/roleMap'

const IMAGE_BASE = 'https://app.ultimez.com/uploads/employee/profile/'
const OFFICE_IP  = '61.3.18.4'

// ── Daily messages from Qadir Kazi ────────────────────────────
// Rotates by day-of-year so each day brings something different
const FOUNDER_MESSAGES = [
  { msg: "Every great thing started with someone who believed — before it made sense.", tag: "Keep believing." },
  { msg: "The goal isn't to be perfect. The goal is to be better than yesterday.", tag: "One day at a time." },
  { msg: "Your work today is the foundation someone else will build on tomorrow.", tag: "Build something that lasts." },
  { msg: "Show up fully. Think clearly. Ship something real.", tag: "That's all it takes." },
  { msg: "The best teams aren't built by talent alone — they're built by trust.", tag: "Trust the process." },
  { msg: "Every problem is just an opportunity wearing a difficult disguise.", tag: "Embrace the challenge." },
  { msg: "Consistency is the rarest superpower in the world. Protect yours.", tag: "Stay consistent." },
  { msg: "You don't need to see the whole staircase. Just take the next step.", tag: "One step forward." },
  { msg: "Be the person on your team who makes others feel like they can.", tag: "Lift someone today." },
  { msg: "Clarity beats brilliance. Know what you're doing and why.", tag: "Work with intention." },
  { msg: "Small things done with great care compound into extraordinary outcomes.", tag: "Care about the details." },
  { msg: "Growth happens in the moments you choose effort over comfort.", tag: "Choose growth." },
  { msg: "What you create today has the power to outlast you. Create well.", tag: "Make it count." },
  { msg: "Speed without direction is just chaos. Know where you're going.", tag: "Direction first." },
  { msg: "The world rewards people who finish what they start.", tag: "Finish strong." },
  { msg: "Doubt is normal. Letting it stop you is a choice.", tag: "Keep moving." },
  { msg: "Coinpedia exists because a few people decided to care deeply. Thank you for caring.", tag: "You matter here." },
  { msg: "The greatest investment you can make is in the quality of your own thinking.", tag: "Think better." },
  { msg: "Feedback is a gift. Receive it with grace, act on it with courage.", tag: "Grow from it." },
  { msg: "Your reputation is built in the small moments nobody is watching.", tag: "Do good work always." },
  { msg: "Rest is not the opposite of productivity — it's the fuel for it.", tag: "Take care of yourself." },
  { msg: "Excellence is not a destination. It's a daily decision.", tag: "Decide again today." },
  { msg: "Ask better questions. They lead to better answers and better futures.", tag: "Question everything." },
  { msg: "Don't just execute tasks. Understand why they matter.", tag: "Find the meaning." },
  { msg: "A team that communicates well can solve almost anything.", tag: "Talk to each other." },
  { msg: "Every expert was once a beginner who chose not to quit.", tag: "Don't quit." },
  { msg: "Make someone's work easier today. That's leadership.", tag: "Lead from where you are." },
  { msg: "The compound effect is real. Your habits today define your trajectory.", tag: "Build good habits." },
  { msg: "Own your mistakes. Own your progress. Own your future.", tag: "Own it all." },
  { msg: "We are building something that informs millions. That is not a small thing.", tag: "Remember the mission." },
  { msg: "Time is the one resource you can't earn back. Use today wisely.", tag: "Use it well." },
]

function getTodayMessage() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return FOUNDER_MESSAGES[dayOfYear % FOUNDER_MESSAGES.length]
}

// ── Helpers ───────────────────────────────────────────────────
function parseIV(iv: string | null | undefined): { h: number; min: number } | null {
  if (!iv) return null
  const m = iv.match(/(\d+)-(\d+)\s+(\d+)\s+(\d+):(\d+):(\d+)/)
  if (!m) return null
  return { h: +m[4], min: +m[5] }
}
function fmtTime(iv: string | null | undefined): string {
  const p = parseIV(iv); if (!p) return '—'
  return `${String(p.h).padStart(2,'0')}:${String(p.min).padStart(2,'0')}`
}
function fmtHM(iv: string | null | undefined): string {
  const p = parseIV(iv); if (!p) return '—'
  if (p.h > 0) return `${p.h}h ${p.min}m`
  if (p.min > 0) return `${p.min}m`
  return '—'
}
function prodColor(pct: number): string {
  return pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
}
function getRoles(rolesStr: string): string[] {
  return String(rolesStr || '').split(',')
    .map(x => parseInt(x.trim()))
    .filter(n => !isNaN(n) && ROLE_MAP[n])
    .map(n => ROLE_MAP[n])
}
function deptFromRoles(rolesStr: string): string {
  const ids = String(rolesStr || '').split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n))
  const MAP: Record<number, string> = {
    1:'Content & Editorial',2:'Content & Editorial',3:'Content & Editorial',
    10:'Content & Editorial',12:'Content & Editorial',20:'Content & Editorial',
    9:'Development',27:'Development',28:'Development',
    8:'SEO & Backlinks',15:'SEO & Backlinks',19:'SEO & Backlinks',
    5:'Marketing & Growth',17:'Marketing & Growth',21:'Marketing & Growth',
    22:'Data & Analytics',25:'Data & Analytics',
    14:'HR',16:'HR',23:'HR',24:'HR',29:'HR',
    4:'Sales & BD',6:'Sales & BD',7:'Sales & BD',18:'Sales & BD',
    13:'Design',26:'Academy',11:'Management',
  }
  for (const id of ids) if (MAP[id]) return MAP[id]
  return '—'
}
function tenure(joinDate: string): string {
  if (!joinDate || joinDate < '2010-01-01') return ''
  const yrs = (Date.now() - new Date(joinDate).getTime()) / (365.25 * 24 * 3600 * 1000)
  return yrs >= 1 ? `${Math.floor(yrs)}y ${Math.floor((yrs % 1)*12)}m` : `${Math.floor(yrs*12)}m`
}
function fmtDate(d: string): string {
  if (!d || d < '2010') return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) }
  catch { return d }
}
function rtLabel(rt: string): { l: string; c: string; b: string } {
  if (rt === '1') return { l:'Full Report',  c:'#22c55e', b:'#22c55e22' }
  if (rt === '2') return { l:'Extended',     c:'#3b82f6', b:'#3b82f622' }
  return                  { l:'Session Log', c:'#f59e0b', b:'#f59e0b22' }
}

// ── Types ─────────────────────────────────────────────────────
type WorkRow  = Record<string, unknown>
type AlertRow = { date: string; alert_count: string; rule_names: string; rule_groups: string }
type LoginRow = { ip_address: string; browser_details: string; device_type: string; auth_date: string }
type Profile  = Record<string, unknown>

interface Props {
  session:       SessionPayload
  todayReports:  WorkRow[]
  recentReports: WorkRow[]
  stats:         Record<string, unknown>
  profile:       Profile
  alerts:        WorkRow[]
  loginHistory:  WorkRow[]
}

// ── Shared table styles ───────────────────────────────────────
const TH: React.CSSProperties = {
  padding:'9px 12px', fontSize:10, fontFamily:'var(--font-mono)', letterSpacing:1,
  textTransform:'uppercase' as const, color:'var(--text2)', background:'var(--bg3)',
  textAlign:'left' as const, borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' as const,
}
const TD: React.CSSProperties = {
  padding:'9px 12px', fontSize:12, borderBottom:'1px solid var(--border)', verticalAlign:'top' as const,
}

// ════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function EmployeeDashboardClient({
  session, todayReports, recentReports, stats, profile, alerts, loginHistory,
}: Props) {
  type Page = 'dashboard' | 'overview' | 'history' | 'alerts' | 'logins' | 'achievements'
  const [page, setPage] = useState<Page>('dashboard')

  const roles    = getRoles(session.roles || '')
  const dept     = deptFromRoles(session.roles || '')
  const today    = todayReports[0]
  const prod     = today ? parseFloat(today.productivity_percentage as string) || 0 : 0
  const avgProd  = parseFloat(String(stats.avg_productivity || 0))
  const totalDays = parseInt(String(stats.total_days || 0))
  const highDays  = parseInt(String(stats.high_perf_days || 0))

  // ── This month's calculations (from recentReports, filtered client-side) ──
  const thisMonth     = new Date().getMonth()
  const thisYear      = new Date().getFullYear()
  const monthReports  = recentReports.filter(r => {
    const d = new Date(r.date as string)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear &&
           parseFloat(r.productivity_percentage as string) > 0
  })
  const monthAvg      = monthReports.length
    ? Math.round(monthReports.reduce((s, r) =>
        s + (parseFloat(r.productivity_percentage as string) || 0), 0
      ) / monthReports.length * 10) / 10
    : 0
  const monthHighDays = monthReports.filter(r => parseFloat(r.productivity_percentage as string) >= 70).length
  const monthLowDays  = monthReports.filter(r => parseFloat(r.productivity_percentage as string) < 40).length
  const monthDays     = monthReports.length

  // ── Week-over-week ────────────────────────────────────────────
  const last7    = recentReports.slice(0, 7).filter(r => parseFloat(r.productivity_percentage as string) > 0)
  const prev7    = recentReports.slice(7, 14).filter(r => parseFloat(r.productivity_percentage as string) > 0)
  const avg7     = last7.length  ? Math.round(last7.reduce((s,r)  => s + (parseFloat(r.productivity_percentage as string)||0), 0) / last7.length)  : 0
  const avgPrev7 = prev7.length  ? Math.round(prev7.reduce((s,r)  => s + (parseFloat(r.productivity_percentage as string)||0), 0) / prev7.length)  : 0
  const weekDelta = avg7 - avgPrev7

  // ── Streak: consecutive days ≥70% from most recent ───────────
  let streak = 0
  for (const r of recentReports) {
    if (parseFloat(r.productivity_percentage as string) >= 70) streak++
    else break
  }
  const hasPhoto  = !!(profile.profile_image as string)

  // ── Badge calculations ────────────────────────────────────────

  // 🔥 On Fire — current streak ≥5 days ≥70%
  const badgeOnFire = streak >= 5

  // 🎯 Perfect Day — any day ≥90%
  const badgePerfectDay = recentReports.some(r => parseFloat(r.productivity_percentage as string) >= 90)

  // 📈 Improving — last 7d avg > previous 7d avg
  const badgeImproving = avg7 > avgPrev7 && avg7 > 0

  // 👴 Veteran — joined 2+ years ago
  const _joinDate   = (profile.ultimez_join_date as string) || ''
  const tenureYears = _joinDate ? (Date.now() - new Date(_joinDate).getTime()) / (365.25*86400000) : 0
  const badgeVeteran = tenureYears >= 2

  // 🧩 Multi-Tasker — 3+ roles
  const roleIds = String(session.roles||'').split(',').filter(x=>x.trim()&&!isNaN(parseInt(x.trim())))
  const badgeMultiTasker = roleIds.length >= 3

  // 🌟 OT Hero — overtime >0 on 3+ days this month
  const otDays = monthReports.filter(r => { const p = parseIV(r.over_time as string); return p && (p.h>0||p.min>0) }).length
  const badgeOtHero = otDays >= 3

  // 🏆 Consistency King — 25+ days reported this month (no big gaps)
  const badgeConsistency = monthDays >= 25

  // ⚡ Productive Pro — 7 consecutive days ≥80%
  let proStreak = 0, maxProStreak = 0
  for (const r of recentReports) {
    if (parseFloat(r.productivity_percentage as string) >= 80) { proStreak++; maxProStreak = Math.max(maxProStreak, proStreak) }
    else proStreak = 0
  }
  const badgeProductivePro = maxProStreak >= 7

  // 💎 Zero Alerts — no alerts this month
  const monthAlertCount = (alerts as AlertRow[]).filter(a => {
    const d = new Date(a.date); return d.getMonth()===thisMonth && d.getFullYear()===thisYear
  }).length
  const badgeZeroAlerts = monthAlertCount === 0 && monthDays > 0

  // 🌅 Early Bird — login before 09:00 on 5+ days
  const earlyDays = monthReports.filter(r => { const p = parseIV(r.login_time as string); return p && p.h < 9 }).length
  const badgeEarlyBird = earlyDays >= 5

  // ── Level system ──────────────────────────────────────────────
  const level = avgProd >= 90 ? 'Diamond' : avgProd >= 80 ? 'Platinum' : avgProd >= 65 ? 'Gold' : avgProd >= 50 ? 'Silver' : 'Bronze'
  const levelColor = avgProd >= 90 ? '#E24B4A' : avgProd >= 80 ? '#7F77DD' : avgProd >= 65 ? '#BA7517' : avgProd >= 50 ? '#1D9E75' : '#888780'
  const nextLevel = avgProd >= 90 ? null : avgProd >= 80 ? {name:'Diamond',target:90} : avgProd >= 65 ? {name:'Platinum',target:80} : avgProd >= 50 ? {name:'Gold',target:65} : {name:'Silver',target:50}
  const levelPct  = nextLevel ? Math.round(Math.min((avgProd / nextLevel.target)*100, 100)) : 100

  // ── Best day this month ───────────────────────────────────────
  const bestDayRow = monthReports.length ? monthReports.reduce((b,r) =>
    parseFloat(r.productivity_percentage as string) > parseFloat(b.productivity_percentage as string) ? r : b
  ) : null
  const bestDayScore = bestDayRow ? Math.round(parseFloat(bestDayRow.productivity_percentage as string)*10)/10 : 0
  const bestDayDate  = bestDayRow ? (bestDayRow.date as string) : '—'

  // ── Monthly goal progress (target 70%) ───────────────────────
  const monthGoal    = 70
  const goalPct      = Math.min(Math.round((monthAvg / monthGoal) * 100), 100)

  const joinDate  = (profile.ultimez_join_date as string) || ''
  const todayMsg  = useMemo(() => getTodayMessage(), [])

  const chartMax = recentReports.length
    ? Math.max(...recentReports.map(r => parseFloat(r.productivity_percentage as string) || 0), 10)
    : 100

  // ── Nav items ─────────────────────────────────────────────
  const NAV: NavItem[] = [
    {
      type: 'link',
      key: 'dashboard',
      icon: '◈',
      label: 'Dashboard',
    },
    {
      type: 'dropdown',
      key: 'profile',
      icon: '◉',
      label: 'Profile',
      badge: alerts.length > 0 ? alerts.length : undefined,
      children: [
        { key: 'overview',      label: 'Overview'      },
        { key: 'achievements',  label: 'Achievements'  },
        { key: 'history',       label: 'Work History'  },
        { key: 'alerts',        label: 'Alerts', badge: alerts.length > 0 ? alerts.length : undefined },
        { key: 'logins',        label: 'Login History' },
      ],
    },
  ]

  function handleNav(key: string) {
    setPage(key as Page)
  }

  // Active key for PageShell — 'profile' dropdown key vs child key
  const activeKey = page === 'dashboard' ? 'dashboard' : page

  return (
    <PageShell
      panel="employee"
      session={session}
      navItems={NAV}
      activeKey={activeKey}
      onNav={handleNav}
      title="Team Panel"
    >

      {/* ════════════════════════════════════════════════
          DASHBOARD — Welcome from Qadir Kazi
      ════════════════════════════════════════════════ */}
      {page === 'dashboard' && (
        <div style={{ maxWidth: 700, margin: '0 auto', paddingTop: 20 }}>

          {/* ── Founder message ── */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)',
            borderRadius:16, padding:'32px 36px', marginBottom:16,
            borderLeft:'4px solid #8b5cf6', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:12, right:20, fontSize:72,
              fontFamily:'Georgia,serif', color:'#8b5cf622', lineHeight:1, userSelect:'none' as const }}>"</div>
            <div style={{ fontSize:9, fontFamily:'var(--font-mono)', letterSpacing:1.5,
              textTransform:'uppercase' as const, color:'#8b5cf6', marginBottom:14, fontWeight:600 }}>
              A message for today
            </div>
            <div style={{ fontSize:20, fontWeight:500, lineHeight:1.55, color:'var(--text)',
              marginBottom:20, letterSpacing:-0.3 }}>
              "{todayMsg.msg}"
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:34, height:34, borderRadius:'50%',
                background:'linear-gradient(135deg,#8b5cf6,#06b6d4)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 }}>QK</div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>Qadir Kazi</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>Founder, Ultimez / Coinpedia</div>
              </div>
              <div style={{ marginLeft:'auto', fontSize:10, fontFamily:'var(--font-mono)',
                color:'#8b5cf6', background:'#8b5cf620', padding:'4px 10px',
                borderRadius:20, border:'1px solid #8b5cf640' }}>{todayMsg.tag}</div>
            </div>
          </div>

          {/* ── This Month's Productive Score — headline card ── */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)',
            borderLeft:`4px solid ${prodColor(monthAvg)}`,
            borderRadius:12, padding:'18px 20px', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9, fontFamily:'var(--font-mono)', letterSpacing:1,
                  textTransform:'uppercase' as const, color:'var(--text3)', marginBottom:6 }}>
                  This month's productive score
                </div>
                <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:10 }}>
                  <div style={{ fontSize:44, fontWeight:700, fontFamily:'var(--font-mono)',
                    color:prodColor(monthAvg), lineHeight:1 }}>
                    {monthDays > 0 ? `${monthAvg}%` : '—'}
                  </div>
                  {monthDays > 0 && (
                    <div>
                      <div style={{ fontSize:11, fontFamily:'var(--font-mono)',
                        color: weekDelta >= 0 ? '#22c55e' : '#ef4444', fontWeight:600 }}>
                        {weekDelta >= 0 ? '↑' : '↓'} {Math.abs(weekDelta)}% vs last week
                      </div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                        {monthDays} working {monthDays === 1 ? 'day' : 'days'} in {new Date().toLocaleString('en-IN', { month:'long' })}
                      </div>
                    </div>
                  )}
                </div>
                {/* Monthly progress bar */}
                <div style={{ height:7, background:'var(--bg3)', borderRadius:4, overflow:'hidden', marginBottom:8 }}>
                  <div style={{ width:`${monthAvg}%`, height:'100%',
                    background:prodColor(monthAvg), borderRadius:4 }} />
                </div>
                {/* Sub-stats chips */}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' as const }}>
                  <span style={{ fontSize:10, fontFamily:'var(--font-mono)', padding:'2px 8px',
                    borderRadius:20, background:'#22c55e20', color:'#22c55e' }}>
                    {monthHighDays} high days ≥70%
                  </span>
                  {monthLowDays > 0 && (
                    <span style={{ fontSize:10, fontFamily:'var(--font-mono)', padding:'2px 8px',
                      borderRadius:20, background:'#ef444420', color:'#ef4444' }}>
                      {monthLowDays} low days &lt;40%
                    </span>
                  )}
                  {streak > 0 && (
                    <span style={{ fontSize:10, fontFamily:'var(--font-mono)', padding:'2px 8px',
                      borderRadius:20, background:'#3b82f620', color:'#3b82f6' }}>
                      🔥 {streak} day streak
                    </span>
                  )}
                </div>
              </div>

              {/* 4 mini time chips from today's report */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, flexShrink:0 }}>
                {([
                  ['Productive', today ? fmtHM(today.productive_hours as string) : '—', '#22c55e'],
                  ['Idle',       today ? fmtHM(today.idle_hours as string)       : '—', 'var(--text3)'],
                  ['Worked',     today ? fmtHM(today.total_worked_hours as string): '—', 'var(--text)'],
                  ['OT',         today ? fmtHM(today.over_time as string)         : '—', '#f59e0b'],
                ] as [string,string,string][]).map(([l,v,col]) => (
                  <div key={l} style={{ background:'var(--bg3)', borderRadius:8, padding:'7px 10px',
                    minWidth:70 }}>
                    <div style={{ fontSize:8, fontFamily:'var(--font-mono)',
                      textTransform:'uppercase' as const, letterSpacing:.8,
                      color:'var(--text4)', marginBottom:3 }}>{l}</div>
                    <div style={{ fontSize:14, fontWeight:700, fontFamily:'var(--font-mono)',
                      color:col }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 7-day mini bar chart + week comparison ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>

            {/* 7-day bars */}
            <div style={{ background:'var(--card)', border:'1px solid var(--border)',
              borderRadius:10, padding:'12px 14px' }}>
              <div style={{ fontSize:9, fontFamily:'var(--font-mono)', letterSpacing:1,
                textTransform:'uppercase' as const, color:'var(--text3)', marginBottom:8 }}>
                Last 7 days
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:56 }}>
                {[...recentReports].slice(0,7).reverse().map((r, i) => {
                  const p   = parseFloat(r.productivity_percentage as string) || 0
                  const pct = p > 0 ? Math.max(Math.round(p), 4) : 4
                  const isToday = i === 6
                  return (
                    <div key={i} title={`${r.date as string}: ${p}%`}
                      style={{ flex:1, height:'100%', display:'flex', flexDirection:'column',
                        justifyContent:'flex-end', cursor:'default' }}>
                      <div style={{ width:'100%', height:`${pct}%`, minHeight:p>0?3:0,
                        background: p === 0 ? 'var(--border)' : prodColor(p),
                        borderRadius:'2px 2px 0 0',
                        opacity: isToday ? 1 : 0.7,
                        border: isToday ? `1px solid ${prodColor(p)}` : 'none' }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between',
                fontSize:8, fontFamily:'var(--font-mono)', color:'var(--text4)', marginTop:4 }}>
                <span>7d ago</span><span>Today</span>
              </div>
            </div>

            {/* Week over week */}
            <div style={{ background:'var(--card)', border:'1px solid var(--border)',
              borderRadius:10, padding:'12px 14px' }}>
              <div style={{ fontSize:9, fontFamily:'var(--font-mono)', letterSpacing:1,
                textTransform:'uppercase' as const, color:'var(--text3)', marginBottom:8 }}>
                Week vs last week
              </div>
              {avg7 > 0 ? (
                <>
                  <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:10 }}>
                    <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--font-mono)',
                      color: weekDelta >= 0 ? '#22c55e' : '#ef4444' }}>
                      {weekDelta >= 0 ? '+' : ''}{weekDelta}%
                    </div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>
                      {weekDelta >= 0 ? 'improvement' : 'decline'}
                    </div>
                  </div>
                  {[['This week', avg7, '#22c55e'], ['Last week', avgPrev7, 'var(--border2)']].map(([l,v,col]) => (
                    <div key={l as string} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                      <div style={{ fontSize:10, color:'var(--text3)', minWidth:65 }}>{l as string}</div>
                      <div style={{ flex:1, height:5, background:'var(--bg3)',
                        borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${v as number}%`, height:'100%',
                          background:col as string, borderRadius:3 }} />
                      </div>
                      <div style={{ fontSize:11, fontFamily:'var(--font-mono)',
                        color:'var(--text2)', minWidth:30 }}>{v as number}%</div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ fontSize:12, color:'var(--text4)', paddingTop:8 }}>
                  Not enough data yet
                </div>
              )}
            </div>
          </div>

          {/* ── Bottom stat cards ── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[
              { label:'30-day avg',     val:`${avgProd}%`,        color:'#6366f1' },
              { label:'Personal best',  val:`${stats.best_productivity || 0}%`, color:'#22c55e' },
              { label:'High perf days', val:String(highDays),     color:'#3b82f6',
                sub:`of ${totalDays} days` },
              { label:'Alerts this month', val:String(alerts.filter(a => {
                const d = new Date((a as WorkRow).date as string)
                return d.getMonth() === thisMonth && d.getFullYear() === thisYear
              }).length), color: alerts.length > 0 ? '#ef4444' : '#22c55e' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--card)', border:'1px solid var(--border)',
                borderRadius:10, padding:'12px 14px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:s.color }} />
                <div style={{ fontSize:8, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const,
                  letterSpacing:1, color:'var(--text3)', marginBottom:5 }}>{s.label}</div>
                <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--font-mono)',
                  color:s.color, lineHeight:1 }}>{s.val}</div>
                {'sub' in s && <div style={{ fontSize:10, color:'var(--text4)', marginTop:3 }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          PROFILE → OVERVIEW
      ════════════════════════════════════════════════ */}
      {page === 'overview' && (
        <>
          {/* Profile card */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)',
            borderRadius:12, padding:20, marginBottom:16,
            display:'flex', gap:18, alignItems:'flex-start' }}>
            {hasPhoto ? (
              <img src={`${IMAGE_BASE}${profile.profile_image as string}`} alt={session.name}
                style={{ width:56, height:56, borderRadius:12, objectFit:'cover',
                  flexShrink:0, border:'2px solid var(--border2)' }} />
            ) : (
              <div style={{ width:56, height:56, borderRadius:12, background:'#8b5cf6',
                color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:20, fontWeight:700, flexShrink:0 }}>
                {session.name.split(' ').map((x:string)=>x[0]).slice(0,2).join('').toUpperCase()}
              </div>
            )}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:16, fontWeight:700 }}>{session.name}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
                {(profile.position as string) || 'No position set'}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:8 }}>
                {roles.map(r => (
                  <span key={r} style={{ fontSize:10, fontFamily:'var(--font-mono)', padding:'2px 8px',
                    borderRadius:10, background:`${ROLE_COLORS[r]||'#64748b'}20`,
                    color:ROLE_COLORS[r]||'#64748b', border:`1px solid ${ROLE_COLORS[r]||'#64748b'}40` }}>
                    {r}
                  </span>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px 24px', marginTop:14 }}>
                {[
                  ['Department', dept],
                  ['Team Leader', (profile.team_leader as string) || '—'],
                  ['Location', (profile.location as string) || '—'],
                  ['Joined', fmtDate(joinDate)],
                  ['Tenure', tenure(joinDate) || '—'],
                  ['Employee ID', `#${session.id}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize:9, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const,
                      letterSpacing:.8, color:'var(--text4)', marginBottom:2 }}>{label}</div>
                    <div style={{ fontSize:12, fontWeight:500 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
            {[
              { label:"Today's Score",  val: today?`${prod}%`:'—',      color:prodColor(prod),  sub: today?rtLabel(today.report_type as string).l:'No report yet' },
              { label:'30-Day Avg',     val: `${avgProd}%`,              color:'#6366f1',        sub:`${totalDays} days tracked` },
              { label:'High Perf Days', val: String(highDays),           color:'#22c55e',        sub:'Productivity ≥ 70%' },
              { label:'Alerts (30d)',   val: String(alerts.length),      color:alerts.length>0?'#ef4444':'#22c55e', sub:alerts.length>0?'Requires attention':'All clear' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--card)', border:'1px solid var(--border)',
                borderRadius:10, padding:16, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:s.color }} />
                <div style={{ fontSize:9, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const,
                  letterSpacing:1, color:'var(--text3)', marginBottom:8 }}>{s.label}</div>
                <div style={{ fontSize:26, fontWeight:700, fontFamily:'var(--font-mono)', color:s.color, lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Today's report */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)',
            borderRadius:12, padding:20, marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:600 }}>Today's Work Report</div>
              {today && (
                <span style={{ fontSize:9, fontFamily:'var(--font-mono)', padding:'2px 8px', borderRadius:8,
                  background:rtLabel(today.report_type as string).b, color:rtLabel(today.report_type as string).c }}>
                  {rtLabel(today.report_type as string).l}
                </span>
              )}
            </div>
            {!today ? (
              <div style={{ textAlign:'center', padding:24, color:'var(--text3)', fontSize:13 }}>
                No report generated yet for today.
              </div>
            ) : (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:8 }}>
                  {([['Login', fmtTime(today.login_time as string),'#22c55e'],['Logout',fmtTime(today.logout_time as string),'var(--text)'],['Active',fmtHM(today.active_hours as string),'#06b6d4'],['OT',fmtHM(today.over_time as string),'#f59e0b']] as [string,string,string][]).map(([l,v,c]) => (
                    <div key={l} style={{ background:'var(--bg3)', borderRadius:8, padding:'10px 12px' }}>
                      <div style={{ fontSize:8, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const, letterSpacing:.8, color:'var(--text4)' }}>{l}</div>
                      <div style={{ fontSize:16, fontWeight:700, fontFamily:'var(--font-mono)', marginTop:4, color:c }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
                  {([['Worked',fmtHM(today.total_worked_hours as string),'var(--text)'],['Idle',fmtHM(today.idle_hours as string),'var(--text3)'],['Productive',fmtHM(today.productive_hours as string),'#22c55e'],['Unproductive',fmtHM(today.unproductive_hours as string),'#ef4444']] as [string,string,string][]).map(([l,v,c]) => (
                    <div key={l} style={{ background:'var(--bg3)', borderRadius:8, padding:'10px 12px' }}>
                      <div style={{ fontSize:8, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const, letterSpacing:.8, color:'var(--text4)' }}>{l}</div>
                      <div style={{ fontSize:16, fontWeight:700, fontFamily:'var(--font-mono)', marginTop:4, color:c }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:5 }}>
                  <span style={{ color:'var(--text3)', fontFamily:'var(--font-mono)' }}>Productivity Score</span>
                  <span style={{ fontWeight:700, color:prodColor(prod) }}>{prod}%</span>
                </div>
                <div style={{ height:8, background:'var(--bg3)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${prod}%`, background:prodColor(prod), borderRadius:4 }} />
                </div>
              </>
            )}
          </div>

          {/* 30-day bar chart */}
          {recentReports.length > 1 && (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>30-Day Productivity History</div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:100, marginBottom:6 }}>
                {[...recentReports].reverse().map((r, i) => {
                  const p   = parseFloat(r.productivity_percentage as string) || 0
                  const pct = Math.round((p / chartMax) * 100)
                  return (
                    <div key={i} title={`${r.date as string}: ${p}%`}
                      style={{ flex:'0 0 auto', minWidth:14, height:'100%',
                        display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                      <div style={{ width:'100%', height:`${pct}%`, minHeight:p>0?2:0,
                        background:prodColor(p), borderRadius:'2px 2px 0 0' }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:9,
                fontFamily:'var(--font-mono)', color:'var(--text4)' }}>
                <span>{recentReports[recentReports.length-1]?.date as string}</span>
                <span>{recentReports[0]?.date as string}</span>
              </div>
              <div style={{ display:'flex', gap:12, marginTop:8, fontSize:10 }}>
                {[['🟢','High ≥70%'],['🟡','Mid 40–69%'],['🔴','Low <40%']].map(([e,l]) => (
                  <span key={l} style={{ color:'var(--text4)', fontFamily:'var(--font-mono)' }}>{e} {l}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════
          PROFILE → WORK HISTORY
      ════════════════════════════════════════════════ */}
      {page === 'history' && (
        <>
          <div style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>Work History</div>
          <div style={{ fontSize:13, color:'var(--text3)', marginBottom:20 }}>Last 30 days — all time fields</div>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, overflow:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:820 }}>
              <thead>
                <tr>{['Date','Login','Logout','Worked','Active','Idle','Productive','Unprod','OT','Score','Type'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {recentReports.length === 0 ? (
                  <tr><td colSpan={11} style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>No reports found</td></tr>
                ) : recentReports.map((r, i) => {
                  const p  = parseFloat(r.productivity_percentage as string) || 0
                  const rt = rtLabel(r.report_type as string)
                  return (
                    <tr key={i}
                      onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background='var(--bg3)' }}
                      onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background='' }}>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', fontWeight:600 }}>{r.date as string}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#22c55e' }}>{fmtTime(r.login_time as string)}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)' }}>{fmtTime(r.logout_time as string)}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)' }}>{fmtHM(r.total_worked_hours as string)}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#06b6d4' }}>{fmtHM(r.active_hours as string)}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'var(--text3)' }}>{fmtHM(r.idle_hours as string)}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#22c55e' }}>{fmtHM(r.productive_hours as string)}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#ef4444' }}>{fmtHM(r.unproductive_hours as string)}</td>
                      <td style={{ ...TD, fontFamily:'var(--font-mono)', color:'#f59e0b' }}>{fmtHM(r.over_time as string)}</td>
                      <td style={TD}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:44, height:5, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ width:`${p}%`, height:'100%', background:prodColor(p), borderRadius:3 }} />
                          </div>
                          <span style={{ fontSize:11, fontFamily:'var(--font-mono)', fontWeight:700, color:prodColor(p) }}>{p}%</span>
                        </div>
                      </td>
                      <td style={TD}>
                        <span style={{ fontSize:9, padding:'2px 6px', borderRadius:8,
                          fontFamily:'var(--font-mono)', fontWeight:600, background:rt.b, color:rt.c }}>{rt.l}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════
          PROFILE → ALERTS
      ════════════════════════════════════════════════ */}
      {page === 'alerts' && (
        <>
          <div style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>Alerts</div>
          <div style={{ fontSize:13, color:'var(--text3)', marginBottom:20 }}>Teramind flagged activity — last 30 days</div>
          {alerts.length === 0 ? (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)',
              borderRadius:12, padding:48, textAlign:'center' }}>
              <div style={{ fontSize:28, marginBottom:12 }}>✓</div>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>No alerts</div>
              <div style={{ fontSize:13, color:'var(--text3)' }}>No Teramind alerts in the last 30 days.</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(alerts as AlertRow[]).map((a, i) => (
                <div key={i} style={{ background:'#7f1d1d22', border:'1px solid #ef444444',
                  borderLeft:'3px solid #ef4444', borderRadius:10, padding:'14px 16px',
                  display:'flex', alignItems:'flex-start', gap:14 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:'#7f1d1d44',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>⚠</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#fca5a5', marginBottom:3 }}>
                      {a.rule_names || 'Alert'}
                    </div>
                    {a.rule_groups && (
                      <div style={{ fontSize:9, fontFamily:'var(--font-mono)', color:'var(--text4)', marginBottom:4 }}>
                        {a.rule_groups}
                      </div>
                    )}
                    <div style={{ fontSize:11, color:'var(--text3)' }}>{a.date}</div>
                  </div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:20, fontWeight:700,
                    color:'#ef4444', flexShrink:0 }}>{a.alert_count}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════
          PROFILE → LOGIN HISTORY
      ════════════════════════════════════════════════ */}
      {page === 'logins' && (
        <>
          <div style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>Login History</div>
          <div style={{ fontSize:13, color:'var(--text3)', marginBottom:20 }}>Your last 30 authentication events</div>
          {loginHistory.length === 0 ? (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)',
              borderRadius:12, padding:48, textAlign:'center', color:'var(--text3)' }}>
              No login records found.
            </div>
          ) : (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, overflow:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>{['Date & Time','IP Address','Network','Browser','Device'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {(loginHistory as LoginRow[]).map((l, i) => {
                    const isOffice = l.ip_address === OFFICE_IP
                    const isIPv6   = l.ip_address.includes(':')
                    const net = isOffice
                      ? { label:'Office', color:'#22c55e', bg:'#14532d44' }
                      : isIPv6
                      ? { label:'IPv6',   color:'#8b5cf6', bg:'#8b5cf622' }
                      : { label:'Remote', color:'var(--text3)', bg:'var(--bg3)' }
                    const devColor = l.device_type==='Mobile'?'#f59e0b':l.device_type==='Desktop'?'#3b82f6':'var(--text3)'
                    return (
                      <tr key={i}
                        onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background='var(--bg3)' }}
                        onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background='' }}>
                        <td style={{ ...TD, fontFamily:'var(--font-mono)', fontSize:11 }}>
                          {(l.auth_date||'').replace('T',' ').slice(0,16)}
                        </td>
                        <td style={{ ...TD, fontFamily:'var(--font-mono)', fontSize:11 }}>{l.ip_address}</td>
                        <td style={TD}>
                          <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10,
                            fontFamily:'var(--font-mono)', fontWeight:600,
                            background:net.bg, color:net.color }}>{net.label}</span>
                        </td>
                        <td style={{ ...TD, fontSize:11, color:'var(--text3)' }}>{l.browser_details || '—'}</td>
                        <td style={{ ...TD, fontFamily:'var(--font-mono)', fontSize:10, color:devColor }}>
                          {l.device_type}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════
          PROFILE → ACHIEVEMENTS
      ════════════════════════════════════════════════ */}
      {page === 'achievements' && (
        <>
          <div style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>Achievements</div>
          <div style={{ fontSize:13, color:'var(--text3)', marginBottom:20 }}>
            Your badges, level, and progress — all calculated from your work data
          </div>

          {/* ── Level card ── */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)',
            borderRadius:12, padding:20, marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
              gap:16, marginBottom:16 }}>
              <div>
                <div style={{ fontSize:9, fontFamily:'var(--font-mono)', letterSpacing:1,
                  textTransform:'uppercase' as const, color:'var(--text3)', marginBottom:4 }}>
                  Performance level
                </div>
                <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
                  <div style={{ fontSize:30, fontWeight:700, color:levelColor }}>{level}</div>
                  <div style={{ fontSize:13, color:'var(--text3)' }}>
                    {avgProd > 0 ? `${avgProd}% 30-day avg` : 'No data yet'}
                  </div>
                </div>
              </div>
              {nextLevel && (
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:9, fontFamily:'var(--font-mono)', letterSpacing:1,
                    textTransform:'uppercase' as const, color:'var(--text3)', marginBottom:4 }}>
                    Next level
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text2)' }}>
                    {nextLevel.name} · {nextLevel.target}%
                  </div>
                </div>
              )}
            </div>

            {/* Level pips */}
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
              {([['Bronze','#888780'],['Silver','#1D9E75'],['Gold','#BA7517'],['Platinum','#7F77DD'],['Diamond','#E24B4A']] as [string,string][]).map(([lv,col]) => {
                const isActive = lv === level
                return (
                  <div key={lv} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                    <div style={{ width:12, height:12, borderRadius:'50%', background:col,
                      opacity: isActive ? 1 : 0.25,
                      boxShadow: isActive ? `0 0 0 3px ${col}30` : 'none' }} />
                    <div style={{ fontSize:9, fontFamily:'var(--font-mono)', color: isActive ? col : 'var(--text4)' }}>
                      {lv.slice(0,4)}
                    </div>
                  </div>
                )
              })}
              <div style={{ flex:1, height:6, background:'var(--bg3)', borderRadius:3,
                overflow:'hidden', marginLeft:4 }}>
                <div style={{ width:`${levelPct}%`, height:'100%',
                  background:levelColor, borderRadius:3 }} />
              </div>
              {nextLevel && (
                <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text3)',
                  minWidth:36 }}>{levelPct}%</div>
              )}
            </div>

            <div style={{ fontSize:11, color:'var(--text3)' }}>
              {nextLevel
                ? `${Math.round(nextLevel.target - avgProd * 10) / 10}% more avg needed to reach ${nextLevel.name}`
                : 'Maximum level reached — Diamond Elite!'}
            </div>
          </div>

          {/* ── Badges grid ── */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)',
            borderRadius:12, padding:20, marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>Badges</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
              {([
                { icon:'🔥', name:'On Fire',          desc:'5-day streak ≥70%',          earned:badgeOnFire },
                { icon:'🎯', name:'Perfect Day',       desc:'Any day scored 90%+',         earned:badgePerfectDay },
                { icon:'📈', name:'Improving',         desc:'Better than last week',       earned:badgeImproving },
                { icon:'👴', name:'Veteran',           desc:'2+ years at Ultimez',         earned:badgeVeteran },
                { icon:'🧩', name:'Multi-Tasker',      desc:'3+ roles assigned',            earned:badgeMultiTasker },
                { icon:'🌟', name:'OT Hero',           desc:'3+ OT days this month',       earned:badgeOtHero },
                { icon:'🏆', name:'Consistency King',  desc:'25+ days reported',           earned:badgeConsistency },
                { icon:'⚡', name:'Productive Pro',    desc:'7 days in a row ≥80%',        earned:badgeProductivePro },
                { icon:'💎', name:'Zero Alerts',       desc:'No flags this month',         earned:badgeZeroAlerts },
                { icon:'🌅', name:'Early Bird',        desc:'Before 9AM, 5+ days',         earned:badgeEarlyBird },
              ] as { icon:string; name:string; desc:string; earned:boolean }[]).map(b => (
                <div key={b.name} style={{ border:'1px solid var(--border)',
                  borderRadius:10, padding:'10px 8px',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                  opacity: b.earned ? 1 : 0.35,
                  filter: b.earned ? 'none' : 'grayscale(1)',
                  background: b.earned ? 'var(--bg3)' : 'transparent',
                  transition:'opacity .2s' }}>
                  <div style={{ fontSize:22, lineHeight:1 }}>{b.icon}</div>
                  <div style={{ fontSize:11, fontWeight:600, textAlign:'center',
                    color:'var(--text)' }}>{b.name}</div>
                  <div style={{ fontSize:10, textAlign:'center', color:'var(--text3)',
                    lineHeight:1.4 }}>{b.desc}</div>
                  {b.earned && (
                    <div style={{ fontSize:9, fontFamily:'var(--font-mono)', padding:'1px 6px',
                      borderRadius:10, background:'#22c55e20', color:'#22c55e', fontWeight:600 }}>
                      earned
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ fontSize:11, color:'var(--text4)', marginTop:12 }}>
              Faded badges are locked — see progress below to unlock them.
            </div>
          </div>

          {/* ── Progress towards locked badges ── */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)',
            borderRadius:12, padding:20, marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>Progress towards next badges</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {([
                !badgeConsistency  && { icon:'🏆', name:'Consistency King',  current:monthDays,    target:25,  unit:'days',  hint:`${Math.max(0,25-monthDays)} more days this month`, color:'#639922' },
                !badgeProductivePro && { icon:'⚡', name:'Productive Pro',   current:maxProStreak, target:7,   unit:'days',  hint:`Score ≥80% for ${Math.max(0,7-maxProStreak)} more days in a row`, color:'#378ADD' },
                !badgeOnFire       && { icon:'🔥', name:'On Fire',           current:streak,       target:5,   unit:'days',  hint:`${Math.max(0,5-streak)} more days ≥70% in a row`, color:'#D85A30' },
                !badgeEarlyBird    && { icon:'🌅', name:'Early Bird',        current:earlyDays,    target:5,   unit:'days',  hint:`${Math.max(0,5-earlyDays)} more logins before 9AM this month`, color:'#BA7517' },
                !badgeZeroAlerts   && { icon:'💎', name:'Zero Alerts',       current:Math.max(0,1-monthAlertCount), target:1, unit:'check', hint:monthAlertCount>0?'Avoid Teramind alerts for rest of month':'On track — keep it up!', color:'#7F77DD' },
              ].filter(Boolean) as { icon:string; name:string; current:number; target:number; unit:string; hint:string; color:string }[]).map(p => (
                <div key={p.name} style={{ borderLeft:'3px solid',
                  borderColor:p.color, borderRadius:'0 8px 8px 0',
                  padding:'10px 14px', background:'var(--bg3)' }}>
                  <div style={{ display:'flex', alignItems:'center',
                    justifyContent:'space-between', marginBottom:6 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{p.icon} {p.name}</div>
                    <div style={{ fontSize:11, fontFamily:'var(--font-mono)',
                      color:'var(--text3)' }}>{p.current} / {p.target}</div>
                  </div>
                  <div style={{ height:6, background:'var(--border)',
                    borderRadius:3, overflow:'hidden', marginBottom:5 }}>
                    <div style={{ width:`${Math.min(Math.round(p.current/p.target*100),100)}%`,
                      height:'100%', background:p.color, borderRadius:3 }} />
                  </div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{p.hint}</div>
                </div>
              ))}
              {[badgeConsistency, badgeProductivePro, badgeOnFire, badgeEarlyBird, badgeZeroAlerts].every(Boolean) && (
                <div style={{ textAlign:'center', padding:20, color:'var(--text3)', fontSize:13 }}>
                  All tracked badges earned! Keep going to maintain them.
                </div>
              )}
            </div>
          </div>

          {/* ── Monthly summary ── */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)',
            borderRadius:12, padding:20 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>
              Monthly summary · {new Date().toLocaleString('en-IN', { month:'long', year:'numeric', timeZone:'Asia/Kolkata' })}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
              {[
                { label:'Best day',      val: bestDayScore > 0 ? `${bestDayScore}%` : '—', sub: bestDayDate, color:'#22c55e' },
                { label:'Days worked',   val: String(monthDays), sub:'reports submitted', color:'#6366f1' },
                { label:'Current streak',val: `${streak}d`, sub:'days ≥70% in a row', color: streak >= 5 ? '#D85A30' : 'var(--text2)' },
                { label:'Monthly goal',  val: `${monthAvg}%`, sub:`target: ${monthGoal}%`, color: monthAvg >= monthGoal ? '#22c55e' : '#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ background:'var(--bg3)', borderRadius:10,
                  padding:'10px 12px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:s.color }} />
                  <div style={{ fontSize:8, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const,
                    letterSpacing:1, color:'var(--text4)', marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:20, fontWeight:700, fontFamily:'var(--font-mono)',
                    color:s.color, lineHeight:1 }}>{s.val}</div>
                  <div style={{ fontSize:10, color:'var(--text4)', marginTop:3 }}>{s.sub}</div>
                </div>
              ))}
            </div>
            {/* Monthly goal bar */}
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11,
              color:'var(--text3)', marginBottom:5 }}>
              <span>Monthly goal progress — target {monthGoal}%</span>
              <span style={{ fontFamily:'var(--font-mono)', fontWeight:600,
                color: monthAvg >= monthGoal ? '#22c55e' : '#f59e0b' }}>{goalPct}%</span>
            </div>
            <div style={{ height:8, background:'var(--bg3)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ width:`${goalPct}%`, height:'100%',
                background: monthAvg >= monthGoal ? '#22c55e' : '#f59e0b',
                borderRadius:4 }} />
            </div>
            {monthAvg >= monthGoal
              ? <div style={{ fontSize:11, color:'#22c55e', marginTop:6 }}>
                  Goal reached! You're {Math.round((monthAvg - monthGoal)*10)/10}% above target.
                </div>
              : <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>
                  {Math.round((monthGoal - monthAvg)*10)/10}% more needed to hit the {monthGoal}% monthly goal.
                </div>
            }
          </div>
        </>
      )}

    </PageShell>
  )
}
