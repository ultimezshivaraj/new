'use client'
// src/components/employee/EmployeeDashboardClient.tsx

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageShell, { NavItem } from '@/components/shared/PageShell'
import { SessionPayload } from '@/lib/session'
import { ROLE_MAP, ROLE_COLORS } from '@/components/employee/roleMap'

const IMAGE_BASE = 'https://ultimez.com/team/uploads/profile/'
const OFFICE_IP = '61.3.18.4'

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
  return `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`
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
    1: 'Content & Editorial', 2: 'Content & Editorial', 3: 'Content & Editorial',
    10: 'Content & Editorial', 12: 'Content & Editorial', 20: 'Content & Editorial',
    9: 'Development', 27: 'Development', 28: 'Development',
    8: 'SEO & Backlinks', 15: 'SEO & Backlinks', 19: 'SEO & Backlinks',
    5: 'Marketing & Growth', 17: 'Marketing & Growth', 21: 'Marketing & Growth',
    22: 'Data & Analytics', 25: 'Data & Analytics',
    14: 'HR', 16: 'HR', 23: 'HR', 24: 'HR', 29: 'HR',
    4: 'Sales & BD', 6: 'Sales & BD', 7: 'Sales & BD', 18: 'Sales & BD',
    13: 'Design', 26: 'Academy', 11: 'Management',
  }
  for (const id of ids) if (MAP[id]) return MAP[id]
  return '—'
}
function tenure(joinDate: string): string {
  if (!joinDate || joinDate < '2010-01-01') return ''
  const yrs = (Date.now() - new Date(joinDate).getTime()) / (365.25 * 24 * 3600 * 1000)
  return yrs >= 1 ? `${Math.floor(yrs)}y ${Math.floor((yrs % 1) * 12)}m` : `${Math.floor(yrs * 12)}m`
}
function fmtDate(d: string): string {
  if (!d || d < '2010') return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}
function rtLabel(rt: string): { l: string; c: string; b: string } {
  if (rt === '1') return { l: 'Full Report', c: '#22c55e', b: '#22c55e22' }
  if (rt === '2') return { l: 'Extended', c: '#3b82f6', b: '#3b82f622' }
  return { l: 'Session Log', c: '#f59e0b', b: '#f59e0b22' }
}

// ── Types ─────────────────────────────────────────────────────
type WorkRow = Record<string, unknown>
type AlertRow = { date: string; alert_count: string; rule_names: string; rule_groups: string }
type LoginRow = { ip_address: string; browser_details: string; device_type: string; auth_date: string }
type Profile = Record<string, unknown>

interface Props {
  session: SessionPayload
  todayReports: WorkRow[]
  recentReports: WorkRow[]
  stats: Record<string, unknown>
  profile: Profile
  alerts: WorkRow[]
  loginHistory: WorkRow[]
}


// ── Shared table styles ───────────────────────────────────────
const TH: React.CSSProperties = {
  padding: '9px 12px', fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1,
  textTransform: 'uppercase' as const, color: 'var(--text2)', background: 'var(--bg3)',
  textAlign: 'left' as const, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' as const,
}
const TD: React.CSSProperties = {
  padding: '9px 12px', fontSize: 12, borderBottom: '1px solid var(--border)', verticalAlign: 'top' as const,
}

// ════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function EmployeeDashboardClient({
  session, todayReports, recentReports, stats, profile, alerts, loginHistory,
}: Props) {
  type Page = 'dashboard' | 'overview' | 'history' | 'alerts' | 'logins' | 'achievements'
  const VALID_PAGES = new Set<string>(['dashboard', 'overview', 'history', 'alerts', 'logins', 'achievements'])
  const router = useRouter()
  const searchParams = useSearchParams()

  // 3. Derive page directly from URL — always in sync
  const pageParam = searchParams.get('page')
  const currentPage: Page = (pageParam && VALID_PAGES.has(pageParam))
    ? pageParam as Page
    : 'dashboard'

  const [monthOffset, setMonthOffset] = useState(0) // 0 = current month, 1 = last month, ... 5 = 5 months ago
  const [achieveOffset, setAchieveOffset] = useState(0) // independent navigation for achievements page
  const [qdFriendOpen, setQdFriendOpen] = useState(false)
  const [qdFriendAnswer, setQdFriendAnswer] = useState<{ q: string; a: string } | null>(null)

  const roles = getRoles(session.roles || '')
  const dept = deptFromRoles(session.roles || '')
  const today = todayReports[0]
  const prod = today ? parseFloat(today.productivity_percentage as string) || 0 : 0
  const avgProd = parseFloat(String(stats.avg_productivity || 0))
  const totalDays = parseInt(String(stats.total_days || 0))
  const highDays = parseInt(String(stats.high_perf_days || 0))

  // ── This month's calculations (from recentReports, filtered client-side) ──
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const viewDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
  const viewMonth = viewDate.getMonth()
  const viewYear = viewDate.getFullYear()
  const viewMonthName = viewDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  const monthReports = recentReports.filter(r => {
    const d = new Date(r.date as string)
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear &&
      parseFloat(r.productivity_percentage as string) > 0
  })
  const monthAvg = monthReports.length
    ? Math.round(monthReports.reduce((s, r) =>
      s + (parseFloat(r.productivity_percentage as string) || 0), 0
    ) / monthReports.length * 10) / 10
    : 0
  const monthHighDays = monthReports.filter(r => parseFloat(r.productivity_percentage as string) >= 70).length
  const monthLowDays = monthReports.filter(r => parseFloat(r.productivity_percentage as string) < 40).length
  const monthDays = monthReports.length

  // ── Previous month avg for delta comparison ───────────────────
  const prevViewDate = new Date(now.getFullYear(), now.getMonth() - monthOffset - 1, 1)
  const prevMonthReports = recentReports.filter(r => {
    const d = new Date(r.date as string)
    return d.getMonth() === prevViewDate.getMonth() && d.getFullYear() === prevViewDate.getFullYear() &&
      parseFloat(r.productivity_percentage as string) > 0
  })
  const prevMonthAvg = prevMonthReports.length
    ? Math.round(prevMonthReports.reduce((s, r) =>
      s + (parseFloat(r.productivity_percentage as string) || 0), 0
    ) / prevMonthReports.length * 10) / 10
    : null
  const monthDelta = prevMonthAvg !== null
    ? Math.round((monthAvg - prevMonthAvg) * 10) / 10
    : null

  // ── Week-over-week ────────────────────────────────────────────
  const last7 = recentReports.slice(0, 7).filter(r => parseFloat(r.productivity_percentage as string) > 0)
  const prev7 = recentReports.slice(7, 14).filter(r => parseFloat(r.productivity_percentage as string) > 0)
  const avg7 = last7.length ? Math.round(last7.reduce((s, r) => s + (parseFloat(r.productivity_percentage as string) || 0), 0) / last7.length) : 0
  const avgPrev7 = prev7.length ? Math.round(prev7.reduce((s, r) => s + (parseFloat(r.productivity_percentage as string) || 0), 0) / prev7.length) : 0
  const weekDelta = avg7 - avgPrev7

  // ── Streak: consecutive days ≥70% from most recent ───────────
  let streak = 0
  for (const r of recentReports) {
    if (parseFloat(r.productivity_percentage as string) >= 70) streak++
    else break
  }
  const hasPhoto = !!(profile.profile_image as string)

  // ── Current-month reports — always pinned to TODAY's month for badge calculations ──
  // Separate from monthReports which shifts with monthOffset navigation
  const currentMonthReports = recentReports.filter(r => {
    const d = new Date(r.date as string)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear &&
      parseFloat(r.productivity_percentage as string) > 0
  })
  const currentMonthDays = currentMonthReports.length

  // ── Badge calculations ────────────────────────────────────────

  // 🔥 On Fire — current streak ≥5 days ≥70% (always from today, not viewed month)
  const badgeOnFire = streak >= 5

  // 🎯 Perfect Day — any day ≥90% in last 180 days
  const badgePerfectDay = recentReports.some(r => parseFloat(r.productivity_percentage as string) >= 90)

  // 📈 Improving — last 7d avg > previous 7d avg
  const badgeImproving = avg7 > avgPrev7 && avg7 > 0

  // 👴 Veteran — joined 2+ years ago
  const _joinDate = (profile.ultimez_join_date as string) || ''
  const tenureYears = _joinDate ? (Date.now() - new Date(_joinDate).getTime()) / (365.25 * 86400000) : 0
  const badgeVeteran = tenureYears >= 2

  // 🧩 Multi-Tasker — 3+ roles
  const roleIds = String(session.roles || '').split(',').filter(x => x.trim() && !isNaN(parseInt(x.trim())))
  const badgeMultiTasker = roleIds.length >= 3

  // 🌟 OT Hero — overtime >0 on 3+ days CURRENT month (not viewed month)
  const currentOtDays = currentMonthReports.filter(r => { const p = parseIV(r.over_time as string); return p && (p.h > 0 || p.min > 0) }).length
  const badgeOtHero = currentOtDays >= 3

  // 🏆 Consistency King — 22+ days reported CURRENT month (Mon–Sat, ~26 working days; allows 4 absences)
  const badgeConsistency = currentMonthDays >= 22

  // ⚡ Productive Pro — 7 consecutive days ≥80% (rolling across all loaded reports)
  let proStreak = 0, maxProStreak = 0
  for (const r of recentReports) {
    if (parseFloat(r.productivity_percentage as string) >= 80) { proStreak++; maxProStreak = Math.max(maxProStreak, proStreak) }
    else proStreak = 0
  }
  const badgeProductivePro = maxProStreak >= 7

  // 💎 Zero Alerts — no alerts CURRENT calendar month
  const monthAlertCount = (alerts as AlertRow[]).filter(a => {
    const d = new Date(a.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  }).length
  const badgeZeroAlerts = monthAlertCount === 0 && currentMonthDays > 0

  // 🌅 Early Bird — login before 09:00 on 5+ days CURRENT month (login_time stored in IST)
  const currentEarlyDays = currentMonthReports.filter(r => { const p = parseIV(r.login_time as string); return p && p.h < 9 }).length
  const badgeEarlyBird = currentEarlyDays >= 5

  // ── Level system ──────────────────────────────────────────────
  const level = avgProd >= 90 ? 'Diamond' : avgProd >= 80 ? 'Platinum' : avgProd >= 65 ? 'Gold' : avgProd >= 50 ? 'Silver' : 'Bronze'
  const levelColor = avgProd >= 90 ? '#E24B4A' : avgProd >= 80 ? '#7F77DD' : avgProd >= 65 ? '#BA7517' : avgProd >= 50 ? '#1D9E75' : '#888780'
  const nextLevel = avgProd >= 90 ? null : avgProd >= 80 ? { name: 'Diamond', target: 90 } : avgProd >= 65 ? { name: 'Platinum', target: 80 } : avgProd >= 50 ? { name: 'Gold', target: 65 } : { name: 'Silver', target: 50 }
  const LEVEL_THRESHOLDS: Record<string, [number, number]> = {
    Bronze: [0, 50],
    Silver: [50, 65],
    Gold: [65, 80],
    Platinum: [80, 90],
    Diamond: [90, 100],
  }
  const [levelMin, levelMax] = LEVEL_THRESHOLDS[level]
  const levelPct = level === 'Diamond'
    ? 100
    : Math.round(Math.min(Math.max((avgProd - levelMin) / (levelMax - levelMin) * 100, 0), 100))

  // ── Best day this month ───────────────────────────────────────
  const bestDayRow = monthReports.length ? monthReports.reduce((b, r) =>
    parseFloat(r.productivity_percentage as string) > parseFloat(b.productivity_percentage as string) ? r : b
  ) : null
  const bestDayScore = bestDayRow ? Math.round(parseFloat(bestDayRow.productivity_percentage as string) * 10) / 10 : 0
  // Fix 4: format properly instead of raw YYYY-MM-DD string
  const bestDayDate = bestDayRow
    ? new Date(bestDayRow.date as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  // ── Monthly goal progress (target 70%) ───────────────────────
  const monthGoal = 70
  // Fix 3: bar width = actual monthAvg out of 100 (not monthAvg/70*100 which inflates the bar)
  const goalBarPct = Math.min(Math.round(monthAvg), 100)

  // ── Achievements page — independent month navigation ─────────
  // achOffset 0 = current month, 1 = last month, max 5
  const achDate = new Date(now.getFullYear(), now.getMonth() - achieveOffset, 1)
  const achMonth = achDate.getMonth()
  const achYear = achDate.getFullYear()
  const achMonthName = achDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  // Reports for the achieve-viewed month (from 180-day loaded data)
  const achReports = recentReports.filter(r => {
    const d = new Date(r.date as string)
    return d.getMonth() === achMonth && d.getFullYear() === achYear &&
      parseFloat(r.productivity_percentage as string) > 0
  })
  const achMonthDays = achReports.length
  const achHighDays = achReports.filter(r => parseFloat(r.productivity_percentage as string) >= 70).length
  const achMonthAvg = achMonthDays
    ? Math.round(achReports.reduce((s, r) => s + (parseFloat(r.productivity_percentage as string) || 0), 0) / achMonthDays * 10) / 10
    : 0

  // Previous month for delta
  const achPrevDate = new Date(now.getFullYear(), now.getMonth() - achieveOffset - 1, 1)
  const achPrevReports = recentReports.filter(r => {
    const d = new Date(r.date as string)
    return d.getMonth() === achPrevDate.getMonth() && d.getFullYear() === achPrevDate.getFullYear() &&
      parseFloat(r.productivity_percentage as string) > 0
  })
  const achPrevAvg = achPrevReports.length
    ? Math.round(achPrevReports.reduce((s, r) => s + (parseFloat(r.productivity_percentage as string) || 0), 0) / achPrevReports.length * 10) / 10
    : null
  const achDelta = achPrevAvg !== null ? Math.round((achMonthAvg - achPrevAvg) * 10) / 10 : null

  // Level from achieve month avg
  const achLevel = achMonthAvg >= 90 ? 'Diamond' : achMonthAvg >= 80 ? 'Platinum' : achMonthAvg >= 65 ? 'Gold' : achMonthAvg >= 50 ? 'Silver' : 'Bronze'
  const achLevelColor = achMonthAvg >= 90 ? '#E24B4A' : achMonthAvg >= 80 ? '#7F77DD' : achMonthAvg >= 65 ? '#BA7517' : achMonthAvg >= 50 ? '#1D9E75' : '#888780'
  const achNextLevel = achMonthAvg >= 90 ? null : achMonthAvg >= 80 ? { name: 'Diamond', target: 90 } : achMonthAvg >= 65 ? { name: 'Platinum', target: 80 } : achMonthAvg >= 50 ? { name: 'Gold', target: 65 } : { name: 'Silver', target: 50 }
  const [achLvMin, achLvMax] = LEVEL_THRESHOLDS[achLevel]
  const achLevelPct = achLevel === 'Diamond' ? 100
    : Math.round(Math.min(Math.max((achMonthAvg - achLvMin) / (achLvMax - achLvMin) * 100, 0), 100))

  // Best day in achieve month
  const achBestRow = achReports.length ? achReports.reduce((b, r) =>
    parseFloat(r.productivity_percentage as string) > parseFloat(b.productivity_percentage as string) ? r : b
  ) : null
  const achBestScore = achBestRow ? Math.round(parseFloat(achBestRow.productivity_percentage as string) * 10) / 10 : 0
  const achBestDate = achBestRow
    ? new Date(achBestRow.date as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  // Streak within achieve month (consecutive ≥70% from most recent)
  let achStreak = 0
  const achSorted = [...achReports].sort((a, b) => (b.date as string).localeCompare(a.date as string))
  for (const r of achSorted) {
    if (parseFloat(r.productivity_percentage as string) >= 70) achStreak++
    else break
  }

  // Max productive streak within achieve month
  let achProS = 0, achMaxProS = 0
  for (const r of achSorted) {
    if (parseFloat(r.productivity_percentage as string) >= 80) { achProS++; achMaxProS = Math.max(achMaxProS, achProS) }
    else achProS = 0
  }

  // Badge calculations for achieve month
  const achOtDays = achReports.filter(r => { const p = parseIV(r.over_time as string); return p && (p.h > 0 || p.min > 0) }).length
  const achEarlyDays = achReports.filter(r => { const p = parseIV(r.login_time as string); return p && p.h < 9 }).length
  const achAlertCount = (alerts as AlertRow[]).filter(a => { const d = new Date(a.date); return d.getMonth() === achMonth && d.getFullYear() === achYear }).length
  const achAlertsValid = achieveOffset <= 1 // alerts only reliable for current & last month

  const achBadgeOnFire = achStreak >= 5
  const achBadgePerfectDay = achReports.some(r => parseFloat(r.productivity_percentage as string) >= 90)
  const achBadgeImproving = achDelta !== null && achDelta > 0
  const achBadgeVeteran = badgeVeteran   // static — same for all months
  const achBadgeMultiTasker = badgeMultiTasker // static — same for all months
  const achBadgeOtHero = achOtDays >= 3
  const achBadgeConsistency = achMonthDays >= 22
  const achBadgeProductivePro = achMaxProS >= 7
  const achBadgeZeroAlerts = achAlertsValid ? (achAlertCount === 0 && achMonthDays > 0) : false
  const achBadgeEarlyBird = achEarlyDays >= 5

  const joinDate = (profile.ultimez_join_date as string) || ''
  const todayMsg = useMemo(() => getTodayMessage(), [])

  const chartMax = recentReports.length
    ? Math.max(...recentReports.map(r => parseFloat(r.productivity_percentage as string) || 0), 10)
    : 100

  // ── QD Friend — static answers built from live data ──────────
  const qdQuestions: { q: string; a: string }[] = [
    {
      q: 'How is my month going?',
      a: monthDays > 0
        ? `You've averaged <b>${monthAvg}%</b> across <b>${monthDays} working ${monthDays === 1 ? 'day' : 'days'}</b> in ${viewDate.toLocaleString('en-IN', { month: 'long' })}. ${monthAvg >= 70 ? 'Great work — you\'re above the 70% target!' : monthAvg >= 50 ? 'You\'re in the average range. Push for more ≥70% days to finish strong.' : 'It\'s been a tough month. Focus on reducing idle time and closing distracting tabs.'}`
        : `No data yet for ${viewDate.toLocaleString('en-IN', { month: 'long' })}. Check back once your first report is generated.`,
    },
    {
      q: 'Am I improving vs last month?',
      a: monthDelta !== null
        ? monthDelta > 0
          ? `Yes! You're up <b>↑${Math.abs(monthDelta)}%</b> compared to last month (${prevMonthAvg}% → ${monthAvg}%). Keep the momentum going.`
          : monthDelta < 0
            ? `You're down <b>↓${Math.abs(monthDelta)}%</b> compared to last month (${prevMonthAvg}% → ${monthAvg}%). Try to identify what changed and get back on track.`
            : `Your score is the same as last month at <b>${monthAvg}%</b>. Consistency is good — now push it higher.`
        : `Not enough data to compare with the previous month yet.`,
    },
    {
      q: 'How was my week?',
      a: avg7 > 0
        ? `Your last 7 days averaged <b>${avg7}%</b>. ${weekDelta > 0 ? `That's <b>+${weekDelta}% better</b> than the week before — great improvement!` : weekDelta < 0 ? `That's <b>${weekDelta}% lower</b> than the week before. Try to identify what slipped.` : `That matches the week before exactly.`}`
        : `No data for the last 7 days yet.`,
    },
    {
      q: "What's my current streak?",
      a: streak > 0
        ? `You're on a <b>${streak}-day streak</b> of ≥70% productivity. ${streak >= 5 ? '🔥 On fire! Keep it going.' : 'Keep it up — reach 5 days to earn the On Fire badge.'}`
        : `No active streak right now. Hit ≥70% today to start one!`,
    },
    {
      q: 'Do I have any alerts?',
      a: monthAlertCount === 0
        ? `No alerts this month — <b>you're clean!</b> Keep avoiding flagged apps and sites.`
        : `You have <b>${monthAlertCount} alert${monthAlertCount > 1 ? 's' : ''}</b> this month. Check your Alerts page to see the rule names and what triggered them.`,
    },
    {
      q: 'How can I improve my score?',
      a: `Your current average is <b>${monthAvg > 0 ? monthAvg : avgProd}%</b>. ${monthAvg < 70 ? 'To reach the 70% target: ' : 'To go even higher: '}log in on time, close non-work tabs during focus hours, and reduce idle gaps between tasks. Even <b>20 fewer idle minutes</b> a day can add ~5% to your score.`,
    },
  ]

  // ── Nav items ─────────────────────────────────────────────
  // ── Nav items ─────────────────────────────────────────────
  // const NAV: NavItem[] = [
  //   {
  //     type: 'link',
  //     key: 'dashboard',
  //     icon: '◈',
  //     label: 'Dashboard',
  //   },
  //   {
  //     type: 'dropdown',
  //     key: 'profile',
  //     icon: '◉',
  //     label: 'Profile',
  //     badge: alerts.length > 0 ? alerts.length : undefined,
  //     children: [
  //       { key: 'overview', label: 'Overview' },
  //       { key: 'achievements', label: 'Achievements' },
  //       { key: 'history', label: 'Work History' },
  //       { key: 'alerts', label: 'Alerts', badge: alerts.length > 0 ? alerts.length : undefined },
  //       { key: 'logins', label: 'Login History' },
  //     ],
  //   },

  //   { type: 'divider', label: 'Back Office' },
  //   {
  //     type: 'dropdown', key: 'emp-leave', icon: '📋', label: 'Leave & Related',
  //     children: [
  //       { key: 'emp-leave-requests', label: 'My Leave Requests' },
  //       { key: 'emp-leave-holidays', label: 'Holiday Calendar' },
  //       { key: 'emp-leave-pending', label: 'My Pending' },
  //     ],
  //   },
  //   {
  //     type: 'dropdown', key: 'emp-payroll', icon: '💰', label: 'Payroll',
  //     children: [
  //       { key: 'emp-payroll-payslips', label: 'My Payslips' },
  //       { key: 'emp-payroll-bank-account', label: 'My Bank Account' },
  //     ],
  //   },
  //   {
  //     type: 'dropdown', key: 'emp-it', icon: '🖥', label: 'IT Services',
  //     children: [
  //       { key: 'emp-it-requests', label: 'My IT Requests' },
  //       { key: 'emp-it-device', label: 'My Device' },
  //     ],
  //   },
  // ]

  // function goTo(p: Page) {
  //   if (p === 'dashboard') {
  //     router.push('/employee/dashboard')
  //   } else {
  //     router.push(`/employee/dashboard?page=${p}`)
  //   }
  // }

  const activeKey = currentPage === 'dashboard' ? 'dashboard' : currentPage



  return (
    <PageShell
      panel="employee"
      session={session}
      activeKey={activeKey}
      employeeNavBadges={{ alertCount: alerts.length }}
      title="Team Panel"
    >

      {/* ════════════════════════════════════════════════
          DASHBOARD — Welcome from Qadir Kazi
      ════════════════════════════════════════════════ */}
      {currentPage === 'dashboard' && (
        <div style={{ maxWidth: 700, margin: '0 auto', paddingTop: 20 }}>

          {/* ── Founder message ── */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '32px 36px', marginBottom: 16,
            borderLeft: '4px solid #8b5cf6', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', top: 12, right: 20, fontSize: 72,
              fontFamily: 'Georgia,serif', color: '#8b5cf622', lineHeight: 1, userSelect: 'none' as const
            }}>"</div>
            <div style={{
              fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1.5,
              textTransform: 'uppercase' as const, color: '#8b5cf6', marginBottom: 14, fontWeight: 600
            }}>
              A message for today
            </div>
            <div style={{
              fontSize: 20, fontWeight: 500, lineHeight: 1.55, color: 'var(--text)',
              marginBottom: 20, letterSpacing: -0.3
            }}>
              "{todayMsg.msg}"
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0
              }}>QK</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Qadir Kazi</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Founder, Ultimez / Coinpedia</div>
              </div>
              <div style={{
                marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)',
                color: '#8b5cf6', background: '#8b5cf620', padding: '4px 10px',
                borderRadius: 20, border: '1px solid #8b5cf640'
              }}>{todayMsg.tag}</div>
            </div>
          </div>

          {/* ── QD Friend — plain text link + tooltip above score card ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6, position: 'relative' }}>
            <span
              onClick={() => { setQdFriendOpen(o => !o); setQdFriendAnswer(null) }}
              style={{
                fontSize: 12, color: '#8b5cf6', cursor: 'pointer', fontWeight: 500,
                borderBottom: '1px dashed #8b5cf660', userSelect: 'none' as const,
                transition: 'color 0.15s'
              }}>
              What Is My Productivity
            </span>

            {qdFriendOpen && (
              <div style={{
                position: 'absolute', top: 26, right: 0, width: 300,
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 14, zIndex: 20, overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(0,0,0,0.10)'
              }}>

                {/* Tooltip header */}
                <div style={{
                  padding: '11px 14px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0
                    }}>QD</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Productivity AI</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>Ask me about your work</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setQdFriendOpen(false)}
                    style={{
                      width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border)',
                      background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text3)',
                      fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                    ✕
                  </button>
                </div>

                {/* Questions list */}
                {!qdFriendAnswer ? (
                  <>
                    <div style={{
                      padding: '8px 14px 4px', fontSize: 9, fontFamily: 'var(--font-mono)',
                      color: 'var(--text3)', letterSpacing: .8, textTransform: 'uppercase' as const
                    }}>
                      Quick questions
                    </div>
                    {qdQuestions.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => setQdFriendAnswer(item)}
                        style={{
                          padding: '9px 14px', fontSize: 11, cursor: 'pointer',
                          color: 'var(--text2)', borderBottom: i < qdQuestions.length - 1 ? '1px solid var(--border)' : 'none',
                          display: 'flex', alignItems: 'center', gap: 8,
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                        <div style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: '#8b5cf6', flexShrink: 0
                        }} />
                        {item.q}
                      </div>
                    ))}
                  </>
                ) : (
                  /* Answer view */
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{
                      alignSelf: 'flex-end', background: 'var(--bg3)',
                      border: '1px solid var(--border)', borderRadius: 10,
                      padding: '7px 11px', fontSize: 11, color: 'var(--text2)', maxWidth: '85%'
                    }}>
                      {qdFriendAnswer.q}
                    </div>
                    <div style={{
                      background: '#8b5cf608', border: '1px solid #8b5cf625',
                      borderRadius: 10, padding: '10px 12px', fontSize: 11,
                      color: 'var(--text)', lineHeight: 1.6
                    }}
                      dangerouslySetInnerHTML={{ __html: qdFriendAnswer.a }} />
                    <button
                      onClick={() => setQdFriendAnswer(null)}
                      style={{
                        width: '100%', marginTop: 2, padding: 7, borderRadius: 8,
                        border: '1px solid var(--border)', background: 'var(--bg3)',
                        fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)',
                        cursor: 'pointer'
                      }}>
                      ← ask another question
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── This Month's Productive Score — headline card ── */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderLeft: `4px solid ${prodColor(monthAvg)}`,
            borderRadius: 12, padding: '18px 20px', marginBottom: 12
          }}>

            {/* Header: label + month nav buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{
                fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1,
                textTransform: 'uppercase' as const, color: 'var(--text3)'
              }}>
                This month's productive score
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)',
                  minWidth: 110, textAlign: 'right' as const
                }}>{viewMonthName}</span>
                <button
                  onClick={() => setMonthOffset(o => Math.min(o + 1, 5))}
                  disabled={monthOffset >= 5}
                  style={{
                    width: 28, height: 28, borderRadius: 6, border: '0.5px solid var(--border)',
                    background: 'var(--bg3)', cursor: monthOffset >= 5 ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: monthOffset >= 5 ? 0.3 : 1, flexShrink: 0,
                    color: 'var(--text)', fontSize: 16, lineHeight: 1
                  }}>
                  ‹
                </button>
                <button
                  onClick={() => setMonthOffset(o => Math.max(o - 1, 0))}
                  disabled={monthOffset <= 0}
                  style={{
                    width: 28, height: 28, borderRadius: 6, border: '0.5px solid var(--border)',
                    background: 'var(--bg3)', cursor: monthOffset <= 0 ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: monthOffset <= 0 ? 0.3 : 1, flexShrink: 0,
                    color: 'var(--text)', fontSize: 16, lineHeight: 1
                  }}>
                  ›
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    fontSize: 44, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: prodColor(monthAvg), lineHeight: 1
                  }}>
                    {monthDays > 0 ? `${monthAvg}%` : '—'}
                  </div>
                  {monthDays > 0 && (
                    <div>
                      {monthDelta !== null && (
                        <div style={{
                          fontSize: 11, fontFamily: 'var(--font-mono)',
                          color: monthDelta >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600
                        }}>
                          {monthDelta >= 0 ? '↑' : '↓'} {Math.abs(monthDelta)}% vs last month
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        {monthDays} working {monthDays === 1 ? 'day' : 'days'} in {viewDate.toLocaleString('en-IN', { month: 'long' })}
                      </div>
                    </div>
                  )}
                </div>
                {/* Monthly progress bar */}
                <div style={{ height: 7, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{
                    width: `${monthAvg}%`, height: '100%',
                    background: prodColor(monthAvg), borderRadius: 4
                  }} />
                </div>
                {/* Sub-stats chips */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                  <span style={{
                    fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px',
                    borderRadius: 20, background: '#22c55e20', color: '#22c55e'
                  }}>
                    {monthHighDays} high days ≥70%
                  </span>
                  {monthLowDays > 0 && (
                    <span style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px',
                      borderRadius: 20, background: '#ef444420', color: '#ef4444'
                    }}>
                      {monthLowDays} low days &lt;40%
                    </span>
                  )}
                  {streak > 0 && monthOffset === 0 && (
                    <span style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px',
                      borderRadius: 20, background: '#3b82f620', color: '#3b82f6'
                    }}>
                      🔥 {streak} day streak
                    </span>
                  )}
                </div>
              </div>

              {/* 4 mini time chips from today's report */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, flexShrink: 0 }}>
                {([
                  ['Productive', today ? fmtHM(today.productive_hours as string) : '—', '#22c55e'],
                  ['Idle', today ? fmtHM(today.idle_hours as string) : '—', 'var(--text3)'],
                  ['Worked', today ? fmtHM(today.total_worked_hours as string) : '—', 'var(--text)'],
                  ['OT', today ? fmtHM(today.over_time as string) : '—', '#f59e0b'],
                ] as [string, string, string][]).map(([l, v, col]) => (
                  <div key={l} style={{
                    background: 'var(--bg3)', borderRadius: 8, padding: '7px 10px',
                    minWidth: 70
                  }}>
                    <div style={{
                      fontSize: 8, fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase' as const, letterSpacing: .8,
                      color: 'var(--text4)', marginBottom: 3
                    }}>{l}</div>
                    <div style={{
                      fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)',
                      color: col
                    }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Month dot indicators — oldest left, newest right */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 7, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)'
            }}>
              {Array.from({ length: 6 }, (_, i) => {
                const dotOffset = 5 - i // i=0 → oldest (offset 5), i=5 → newest (offset 0)
                const dotDate = new Date(now.getFullYear(), now.getMonth() - dotOffset, 1)
                const isActive = dotOffset === monthOffset
                const dotRpts = recentReports.filter(r => {
                  const d = new Date(r.date as string)
                  return d.getMonth() === dotDate.getMonth() && d.getFullYear() === dotDate.getFullYear() &&
                    parseFloat(r.productivity_percentage as string) > 0
                })
                const dotAvg = dotRpts.length
                  ? dotRpts.reduce((s, r) => s + (parseFloat(r.productivity_percentage as string) || 0), 0) / dotRpts.length
                  : 0
                return (
                  <div
                    key={i}
                    onClick={() => setMonthOffset(dotOffset)}
                    title={dotDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                    style={{
                      width: isActive ? 10 : 7,
                      height: isActive ? 10 : 7,
                      borderRadius: '50%',
                      background: isActive ? prodColor(dotAvg) : 'var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                    }}
                  />
                )
              })}
            </div>
          </div>

          {/* ── 7-day mini bar chart + week comparison ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>

            {/* 7-day bars */}
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px'
            }}>
              <div style={{
                fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1,
                textTransform: 'uppercase' as const, color: 'var(--text3)', marginBottom: 8
              }}>
                Last 7 days
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 56 }}>
                {[...recentReports].slice(0, 7).reverse().map((r, i) => {
                  const p = parseFloat(r.productivity_percentage as string) || 0
                  const pct = p > 0 ? Math.max(Math.round(p), 4) : 4
                  const isToday = i === 6
                  return (
                    <div key={i} title={`${r.date as string}: ${p}%`}
                      style={{
                        flex: 1, height: '100%', display: 'flex', flexDirection: 'column',
                        justifyContent: 'flex-end', cursor: 'default'
                      }}>
                      <div style={{
                        width: '100%', height: `${pct}%`, minHeight: p > 0 ? 3 : 0,
                        background: p === 0 ? 'var(--border)' : prodColor(p),
                        borderRadius: '2px 2px 0 0',
                        opacity: isToday ? 1 : 0.7,
                        border: isToday ? `1px solid ${prodColor(p)}` : 'none'
                      }} />
                    </div>
                  )
                })}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text4)', marginTop: 4
              }}>
                <span>7d ago</span><span>Today</span>
              </div>
            </div>

            {/* Week over week */}
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px'
            }}>
              <div style={{
                fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1,
                textTransform: 'uppercase' as const, color: 'var(--text3)', marginBottom: 8
              }}>
                Week vs last week
              </div>
              {avg7 > 0 ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                    <div style={{
                      fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)',
                      color: weekDelta >= 0 ? '#22c55e' : '#ef4444'
                    }}>
                      {weekDelta >= 0 ? '+' : ''}{weekDelta}%
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {weekDelta >= 0 ? 'improvement' : 'decline'}
                    </div>
                  </div>
                  {[['This week', avg7, '#22c55e'], ['Last week', avgPrev7, 'var(--border2)']].map(([l, v, col]) => (
                    <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', minWidth: 65 }}>{l as string}</div>
                      <div style={{
                        flex: 1, height: 5, background: 'var(--bg3)',
                        borderRadius: 3, overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${v as number}%`, height: '100%',
                          background: col as string, borderRadius: 3
                        }} />
                      </div>
                      <div style={{
                        fontSize: 11, fontFamily: 'var(--font-mono)',
                        color: 'var(--text2)', minWidth: 30
                      }}>{v as number}%</div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text4)', paddingTop: 8 }}>
                  Not enough data yet
                </div>
              )}
            </div>
          </div>

          {/* ── Bottom stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[
              { label: '30-day avg', val: `${avgProd}%`, color: '#6366f1' },
              { label: 'Personal best', val: `${stats.best_productivity || 0}%`, color: '#22c55e' },
              {
                label: 'High perf days', val: String(highDays), color: '#3b82f6',
                sub: `of ${totalDays} days`
              },
              {
                label: 'Alerts this month', val: String(alerts.filter(a => {
                  const d = new Date((a as WorkRow).date as string)
                  return d.getMonth() === thisMonth && d.getFullYear() === thisYear
                }).length), color: alerts.length > 0 ? '#ef4444' : '#22c55e'
              },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 14px', position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.color }} />
                <div style={{
                  fontSize: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const,
                  letterSpacing: 1, color: 'var(--text3)', marginBottom: 5
                }}>{s.label}</div>
                <div style={{
                  fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: s.color, lineHeight: 1
                }}>{s.val}</div>
                {'sub' in s && <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 3 }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          PROFILE → OVERVIEW
      ════════════════════════════════════════════════ */}
      {currentPage === 'overview' && (
        <>
          {/* Profile card */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, marginBottom: 16,
            display: 'flex', gap: 18, alignItems: 'flex-start'
          }}>
            {hasPhoto ? (
              <img src={`${IMAGE_BASE}${profile.profile_image as string}`} alt={session.name}
                style={{
                  width: 56, height: 56, borderRadius: 12, objectFit: 'cover',
                  flexShrink: 0, border: '2px solid var(--border2)'
                }} />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: 12, background: '#8b5cf6',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700, flexShrink: 0
              }}>
                {session.name.split(' ').map((x: string) => x[0]).slice(0, 2).join('').toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{session.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                {(profile.position as string) || 'No position set'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {roles.map(r => (
                  <span key={r} style={{
                    fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px',
                    borderRadius: 10, background: `${ROLE_COLORS[r] || '#64748b'}20`,
                    color: ROLE_COLORS[r] || '#64748b', border: `1px solid ${ROLE_COLORS[r] || '#64748b'}40`
                  }}>
                    {r}
                  </span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px 24px', marginTop: 14 }}>
                {[
                  ['Department', dept],
                  ['Team Leader', (profile.team_leader as string) || '—'],
                  ['Location', (profile.location as string) || '—'],
                  ['Joined', fmtDate(joinDate)],
                  ['Tenure', tenure(joinDate) || '—'],
                  ['Employee ID', `#${session.id}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{
                      fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const,
                      letterSpacing: .8, color: 'var(--text4)', marginBottom: 2
                    }}>{label}</div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: "Today's Score", val: today ? `${prod}%` : '—', color: prodColor(prod), sub: today ? rtLabel(today.report_type as string).l : 'No report yet' },
              { label: '30-Day Avg', val: `${avgProd}%`, color: '#6366f1', sub: `${totalDays} days tracked` },
              { label: 'High Perf Days', val: String(highDays), color: '#22c55e', sub: 'Productivity ≥ 70%' },
              { label: 'Alerts (30d)', val: String(alerts.length), color: alerts.length > 0 ? '#ef4444' : '#22c55e', sub: alerts.length > 0 ? 'Requires attention' : 'All clear' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 16, position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.color }} />
                <div style={{
                  fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const,
                  letterSpacing: 1, color: 'var(--text3)', marginBottom: 8
                }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Today's report */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Today's Work Report</div>
              {today && (
                <span style={{
                  fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 8,
                  background: rtLabel(today.report_type as string).b, color: rtLabel(today.report_type as string).c
                }}>
                  {rtLabel(today.report_type as string).l}
                </span>
              )}
            </div>
            {!today ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 13 }}>
                No report generated yet for today.
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 8 }}>
                  {([['Login', fmtTime(today.login_time as string), '#22c55e'], ['Logout', fmtTime(today.logout_time as string), 'var(--text)'], ['Active', fmtHM(today.active_hours as string), '#06b6d4'], ['OT', fmtHM(today.over_time as string), '#f59e0b']] as [string, string, string][]).map(([l, v, c]) => (
                    <div key={l} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: .8, color: 'var(--text4)' }}>{l}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 4, color: c }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
                  {([['Worked', fmtHM(today.total_worked_hours as string), 'var(--text)'], ['Idle', fmtHM(today.idle_hours as string), 'var(--text3)'], ['Productive', fmtHM(today.productive_hours as string), '#22c55e'], ['Unproductive', fmtHM(today.unproductive_hours as string), '#ef4444']] as [string, string, string][]).map(([l, v, c]) => (
                    <div key={l} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: .8, color: 'var(--text4)' }}>{l}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 4, color: c }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                  <span style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Productivity Score</span>
                  <span style={{ fontWeight: 700, color: prodColor(prod) }}>{prod}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${prod}%`, background: prodColor(prod), borderRadius: 4 }} />
                </div>
              </>
            )}
          </div>

          {/* 30-day bar chart */}
          {recentReports.length > 1 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>30-Day Productivity History</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100, marginBottom: 6, overflowX: 'auto' }}>
                {[...recentReports].reverse().map((r, i) => {
                  const p = parseFloat(r.productivity_percentage as string) || 0
                  const pct = Math.round((p / chartMax) * 100)
                  return (
                    <div key={i} title={`${r.date as string}: ${p}%`}
                      style={{
                        flex: '0 0 auto', minWidth: 6, height: '100%',
                        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
                      }}>
                      <div style={{
                        width: '100%', height: `${pct}%`, minHeight: p > 0 ? 2 : 0,
                        background: prodColor(p), borderRadius: '2px 2px 0 0'
                      }} />
                    </div>
                  )
                })}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontSize: 9,
                fontFamily: 'var(--font-mono)', color: 'var(--text4)'
              }}>
                <span>{recentReports[recentReports.length - 1]?.date as string}</span>
                <span>{recentReports[0]?.date as string}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10 }}>
                {[['🟢', 'High ≥70%'], ['🟡', 'Mid 40–69%'], ['🔴', 'Low <40%']].map(([e, l]) => (
                  <span key={l} style={{ color: 'var(--text4)', fontFamily: 'var(--font-mono)' }}>{e} {l}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════
          PROFILE → WORK HISTORY
      ════════════════════════════════════════════════ */}
      {currentPage === 'history' && (
        <>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Work History</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Last 30 days — all time fields</div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
              <thead>
                <tr>{['Date', 'Login', 'Logout', 'Worked', 'Active', 'Idle', 'Productive', 'Unprod', 'OT', 'Score', 'Type'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {recentReports.length === 0 ? (
                  <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>No reports found</td></tr>
                ) : recentReports.map((r, i) => {
                  const p = parseFloat(r.productivity_percentage as string) || 0
                  const rt = rtLabel(r.report_type as string)
                  return (
                    <tr key={i}
                      onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
                      onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = '' }}>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.date as string}</td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: '#22c55e' }}>{fmtTime(r.login_time as string)}</td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>{fmtTime(r.logout_time as string)}</td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>{fmtHM(r.total_worked_hours as string)}</td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>{fmtHM(r.active_hours as string)}</td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>{fmtHM(r.idle_hours as string)}</td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: '#22c55e' }}>{fmtHM(r.productive_hours as string)}</td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: '#ef4444' }}>{fmtHM(r.unproductive_hours as string)}</td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>{fmtHM(r.over_time as string)}</td>
                      <td style={TD}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 44, height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${p}%`, height: '100%', background: prodColor(p), borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: prodColor(p) }}>{p}%</span>
                        </div>
                      </td>
                      <td style={TD}>
                        <span style={{
                          fontSize: 9, padding: '2px 6px', borderRadius: 8,
                          fontFamily: 'var(--font-mono)', fontWeight: 600, background: rt.b, color: rt.c
                        }}>{rt.l}</span>
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
      {currentPage === 'alerts' && (
        <>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Alerts</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Teramind flagged activity — last 30 days</div>
          {alerts.length === 0 ? (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 48, textAlign: 'center'
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No alerts</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>No Teramind alerts in the last 30 days.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(alerts as AlertRow[]).map((a, i) => (
                <div key={i} style={{
                  background: '#7f1d1d22', border: '1px solid #ef444444',
                  borderLeft: '3px solid #ef4444', borderRadius: 10, padding: '14px 16px',
                  display: 'flex', alignItems: 'flex-start', gap: 14
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: '#7f1d1d44',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0
                  }}>⚠</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5', marginBottom: 3 }}>
                      {a.rule_names || 'Alert'}
                    </div>
                    {a.rule_groups && (
                      <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text4)', marginBottom: 4 }}>
                        {a.rule_groups}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.date}</div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700,
                    color: '#ef4444', flexShrink: 0
                  }}>{a.alert_count}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════
          PROFILE → LOGIN HISTORY
      ════════════════════════════════════════════════ */}
      {currentPage === 'logins' && (
        <>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Login History</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Your last 30 authentication events</div>
          {loginHistory.length === 0 ? (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--text3)'
            }}>
              No login records found.
            </div>
          ) : (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Date & Time', 'IP Address', 'Network', 'Browser', 'Device'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {(loginHistory as LoginRow[]).map((l, i) => {
                    const isOffice = l.ip_address === OFFICE_IP
                    const isIPv6 = l.ip_address.includes(':')
                    const net = isOffice
                      ? { label: 'Office', color: '#22c55e', bg: '#14532d44' }
                      : isIPv6
                        ? { label: 'IPv6', color: '#8b5cf6', bg: '#8b5cf622' }
                        : { label: 'Remote', color: 'var(--text3)', bg: 'var(--bg3)' }
                    const devColor = l.device_type === 'Mobile' ? '#f59e0b' : l.device_type === 'Desktop' ? '#3b82f6' : 'var(--text3)'
                    return (
                      <tr key={i}
                        onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
                        onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = '' }}>
                        <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                          {(l.auth_date || '').replace('T', ' ').slice(0, 16)}
                        </td>
                        <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{l.ip_address}</td>
                        <td style={TD}>
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 10,
                            fontFamily: 'var(--font-mono)', fontWeight: 600,
                            background: net.bg, color: net.color
                          }}>{net.label}</span>
                        </td>
                        <td style={{ ...TD, fontSize: 11, color: 'var(--text3)' }}>{l.browser_details || '—'}</td>
                        <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 10, color: devColor }}>
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
      {currentPage === 'achievements' && (
        <>
          {/* ── Header row with month navigation ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Achievements</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
                Your badges, level, and progress — all calculated from your work data
              </div>
            </div>
            {/* Month navigation — top right, above Performance Level card */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 2, flexShrink: 0 }}>
              <button
                onClick={() => setAchieveOffset(o => Math.min(o + 1, 5))}
                disabled={achieveOffset >= 5}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg3)', cursor: achieveOffset >= 5 ? 'default' : 'pointer',
                  color: 'var(--text2)', fontSize: 14, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', opacity: achieveOffset >= 5 ? 0.3 : 1, flexShrink: 0
                }}>
                ‹
              </button>
              <span style={{
                fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text2)',
                minWidth: 110, textAlign: 'center' as const
              }}>
                {achieveOffset === 0 ? 'This month' : achMonthName}
              </span>
              <button
                onClick={() => setAchieveOffset(o => Math.max(o - 1, 0))}
                disabled={achieveOffset <= 0}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg3)', cursor: achieveOffset <= 0 ? 'default' : 'pointer',
                  color: 'var(--text2)', fontSize: 14, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', opacity: achieveOffset <= 0 ? 0.3 : 1, flexShrink: 0
                }}>
                ›
              </button>
            </div>
          </div>

          {/* ── No data state ── */}
          {achMonthDays === 0 && (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
              padding: 32, textAlign: 'center', color: 'var(--text3)', marginBottom: 12
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>No data for {achMonthName}</div>
              <div style={{ fontSize: 12 }}>No work reports found for this month.</div>
            </div>
          )}

          {achMonthDays > 0 && (<>

            {/* ── Level card ── */}
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 20, marginBottom: 12, marginTop: 16
            }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                gap: 16, marginBottom: 16
              }}>
                <div>
                  <div style={{
                    fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1,
                    textTransform: 'uppercase' as const, color: 'var(--text3)', marginBottom: 4
                  }}>
                    Performance level · {achMonthName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <div style={{ fontSize: 30, fontWeight: 700, color: achLevelColor }}>{achLevel}</div>
                    <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                      {achMonthAvg > 0 ? `${achMonthAvg}% monthly avg` : 'No data yet'}
                    </div>
                  </div>
                </div>
                {achNextLevel && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1,
                      textTransform: 'uppercase' as const, color: 'var(--text3)', marginBottom: 4
                    }}>
                      Next level
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>
                      {achNextLevel.name} · {achNextLevel.target}%
                    </div>
                  </div>
                )}
              </div>

              {/* Level pips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                {([['Bronze', '#888780'], ['Silver', '#1D9E75'], ['Gold', '#BA7517'], ['Platinum', '#7F77DD'], ['Diamond', '#E24B4A']] as [string, string][]).map(([lv, col]) => {
                  const isActive = lv === achLevel
                  return (
                    <div key={lv} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: '50%', background: col,
                        opacity: isActive ? 1 : 0.25,
                        boxShadow: isActive ? `0 0 0 3px ${col}30` : 'none'
                      }} />
                      <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: isActive ? col : 'var(--text4)' }}>
                        {lv.slice(0, 4)}
                      </div>
                    </div>
                  )
                })}
                <div style={{
                  flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 3,
                  overflow: 'hidden', marginLeft: 4
                }}>
                  <div style={{
                    width: `${achLevelPct}%`, height: '100%',
                    background: achLevelColor, borderRadius: 3
                  }} />
                </div>
                {achNextLevel && (
                  <div style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)',
                    minWidth: 36
                  }}>{achLevelPct}%</div>
                )}
              </div>

              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                {achNextLevel
                  ? `${Math.round((achNextLevel.target - achMonthAvg) * 10) / 10}% more avg needed to reach ${achNextLevel.name}`
                  : 'Maximum level reached — Diamond Elite!'}
              </div>
            </div>

            {/* ── Badges grid ── */}
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 20, marginBottom: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Badges</div>
                {achieveOffset > 0 && <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>{achMonthName}</div>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                {([
                  { icon: '🔥', name: 'On Fire', desc: '5-day streak ≥70%', earned: achBadgeOnFire },
                  { icon: '🎯', name: 'Perfect Day', desc: 'Any day scored 90%+', earned: achBadgePerfectDay },
                  { icon: '📈', name: 'Improving', desc: 'Better than prev month', earned: achBadgeImproving },
                  { icon: '👴', name: 'Veteran', desc: '2+ years at Ultimez', earned: achBadgeVeteran },
                  { icon: '🧩', name: 'Multi-Tasker', desc: '3+ roles assigned', earned: achBadgeMultiTasker },
                  { icon: '🌟', name: 'OT Hero', desc: '3+ OT days this month', earned: achBadgeOtHero },
                  { icon: '🏆', name: 'Consistency King', desc: '22+ days reported', earned: achBadgeConsistency },
                  { icon: '⚡', name: 'Productive Pro', desc: '7 days in a row ≥80%', earned: achBadgeProductivePro },
                  { icon: '💎', name: 'Zero Alerts', desc: achAlertsValid ? 'No flags this month' : 'Alert data unavailable', earned: achBadgeZeroAlerts },
                  { icon: '🌅', name: 'Early Bird', desc: 'Before 9AM, 5+ days', earned: achBadgeEarlyBird },
                ] as { icon: string; name: string; desc: string; earned: boolean }[]).map(b => (
                  <div key={b.name} style={{
                    border: '1px solid var(--border)',
                    borderRadius: 10, padding: '10px 8px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    opacity: b.earned ? 1 : 0.35,
                    filter: b.earned ? 'none' : 'grayscale(1)',
                    background: b.earned ? 'var(--bg3)' : 'transparent',
                    transition: 'opacity .2s'
                  }}>
                    <div style={{ fontSize: 22, lineHeight: 1 }}>{b.icon}</div>
                    <div style={{
                      fontSize: 11, fontWeight: 600, textAlign: 'center',
                      color: 'var(--text)'
                    }}>{b.name}</div>
                    <div style={{
                      fontSize: 10, textAlign: 'center', color: 'var(--text3)',
                      lineHeight: 1.4
                    }}>{b.desc}</div>
                    {b.earned && (
                      <div style={{
                        fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 6px',
                        borderRadius: 10, background: '#22c55e20', color: '#22c55e', fontWeight: 600
                      }}>
                        earned
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 12 }}>
                Faded badges are locked — see progress below to unlock them.
              </div>
            </div>

            {/* ── Progress towards locked badges ── */}
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 20, marginBottom: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Progress towards next badges</div>
                {achieveOffset > 0 && <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>{achMonthName}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([
                  !achBadgeConsistency && { icon: '🏆', name: 'Consistency King', current: achMonthDays, target: 22, unit: 'days', hint: `${Math.max(0, 22 - achMonthDays)} more days this month`, color: '#639922' },
                  !achBadgeProductivePro && { icon: '⚡', name: 'Productive Pro', current: achMaxProS, target: 7, unit: 'days', hint: `Score ≥80% for ${Math.max(0, 7 - achMaxProS)} more days in a row`, color: '#378ADD' },
                  !achBadgeOnFire && { icon: '🔥', name: 'On Fire', current: achStreak, target: 5, unit: 'days', hint: `${Math.max(0, 5 - achStreak)} more days ≥70% in a row`, color: '#D85A30' },
                  !achBadgeEarlyBird && { icon: '🌅', name: 'Early Bird', current: achEarlyDays, target: 5, unit: 'days', hint: `${Math.max(0, 5 - achEarlyDays)} more logins before 9AM this month`, color: '#BA7517' },
                  !achBadgeZeroAlerts && achAlertsValid && { icon: '💎', name: 'Zero Alerts', current: achAlertCount === 0 ? 1 : 0, target: 1, unit: 'check', hint: achAlertCount > 0 ? `${achAlertCount} alert(s) this month — badge cannot be earned` : '✓ Clean so far — stay alert-free to earn this badge', color: '#7F77DD' },
                ].filter(Boolean) as { icon: string; name: string; current: number; target: number; unit: string; hint: string; color: string }[]).map(p => (
                  <div key={p.name} style={{
                    borderLeft: '3px solid',
                    borderColor: p.color, borderRadius: '0 8px 8px 0',
                    padding: '10px 14px', background: 'var(--bg3)'
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', marginBottom: 6
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.icon} {p.name}</div>
                      <div style={{
                        fontSize: 11, fontFamily: 'var(--font-mono)',
                        color: 'var(--text3)'
                      }}>{p.current} / {p.target}</div>
                    </div>
                    <div style={{
                      height: 6, background: 'var(--border)',
                      borderRadius: 3, overflow: 'hidden', marginBottom: 5
                    }}>
                      <div style={{
                        width: `${Math.min(Math.round(p.current / p.target * 100), 100)}%`,
                        height: '100%', background: p.color, borderRadius: 3
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.hint}</div>
                  </div>
                ))}
                {[achBadgeConsistency, achBadgeProductivePro, achBadgeOnFire, achBadgeEarlyBird, achBadgeZeroAlerts].every(Boolean) && (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)', fontSize: 13 }}>
                    All tracked badges earned! Keep going to maintain them.
                  </div>
                )}
              </div>
            </div>

            {/* ── Monthly summary ── */}
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 20
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
                Monthly summary · {achMonthName}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 14 }}>
                {[
                  { label: 'Best day', val: achBestScore > 0 ? `${achBestScore}%` : '—', sub: achBestDate, color: '#22c55e' },
                  { label: 'Days worked', val: String(achMonthDays), sub: 'reports submitted', color: '#6366f1' },
                  { label: 'High days', val: String(achHighDays), sub: 'days ≥70%', color: '#22c55e' },
                  { label: 'vs prev month', val: achDelta !== null ? `${achDelta > 0 ? '+' : ''}${achDelta}%` : '—', sub: achDelta !== null ? (achDelta > 0 ? 'improved' : achDelta < 0 ? 'declined' : 'same') : 'no data', color: achDelta !== null && achDelta > 0 ? '#22c55e' : achDelta !== null && achDelta < 0 ? '#ef4444' : 'var(--text2)' },
                  { label: 'Monthly avg', val: achMonthAvg > 0 ? `${achMonthAvg}%` : '—', sub: `goal: ${monthGoal}%`, color: achMonthAvg >= monthGoal ? '#22c55e' : '#f59e0b' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'var(--bg3)', borderRadius: 10,
                    padding: '10px 12px', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.color }} />
                    <div style={{
                      fontSize: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const,
                      letterSpacing: 1, color: 'var(--text4)', marginBottom: 4
                    }}>{s.label}</div>
                    <div style={{
                      fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)',
                      color: s.color, lineHeight: 1
                    }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 3 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontSize: 11,
                color: 'var(--text3)', marginBottom: 5
              }}>
                <span>Monthly average — {achMonthAvg}% <span style={{ color: 'var(--text4)' }}>(target {monthGoal}%)</span></span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontWeight: 600,
                  color: achMonthAvg >= monthGoal ? '#22c55e' : '#f59e0b'
                }}>{achMonthAvg}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: `${Math.min(Math.round(achMonthAvg), 100)}%`, height: '100%',
                  background: achMonthAvg >= monthGoal ? '#22c55e' : '#f59e0b', borderRadius: 4
                }} />
                <div style={{ position: 'absolute', top: 0, left: '70%', width: 2, height: '100%', background: 'var(--text3)', opacity: 0.5 }} />
              </div>
              {achMonthAvg >= monthGoal
                ? <div style={{ fontSize: 11, color: '#22c55e', marginTop: 6 }}>
                  Goal reached! You're {Math.round((achMonthAvg - monthGoal) * 10) / 10}% above the {monthGoal}% target.
                </div>
                : <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                  {Math.round((monthGoal - achMonthAvg) * 10) / 10}% more needed to hit the {monthGoal}% monthly goal.
                </div>
              }
            </div>

          </>)}
        </>
      )}

    </PageShell>
  )
}
