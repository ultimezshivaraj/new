'use client'
// src/components/employee/EmployeeProfileClient.tsx

import { useState }      from 'react'
import { useRouter }     from 'next/navigation'
import PageShell, { NavItem } from '@/components/shared/PageShell'
import { SessionPayload } from '@/lib/session'

// ─── Nav (same structure as dashboard) ───────────────────────
const EMP_NAV: NavItem[] = [
  { type: 'divider', label: 'My Work' },
  { type: 'link', key: 'dashboard', icon: '◈', label: 'Overview'    },
  { type: 'link', key: 'profile',   icon: '◉', label: 'My Profile'  },

  { type: 'divider', label: 'Activity' },
  { type: 'link', key: 'reports',   icon: '📋', label: 'Work Reports' },
  { type: 'link', key: 'alerts',    icon: '⚠',  label: 'Alerts'       },
]

// ─── Helpers ──────────────────────────────────────────────────
const ROLE_MAP: Record<number, string> = {
  1:'Author',2:'Editor',3:'Event Manager',4:'Leads',5:'Marketing',
  6:'Pitch Dept',7:'Sales Dept',8:'Backlinks & Promo',9:'Developer',
  10:'Publisher',11:'Sys Admin',12:'Tasks',13:'Designer',14:'HR Mgmt',
  15:'BL Team Lead',16:'HR Head',17:'Community Mgr',18:'Partnership Mgr',
  19:'Listing Exec',20:'Page Views',21:'Biz Dev Mgr',22:'Data Analytics',
  23:'Jr Recruiter',24:'Profile Viewer',25:'Project Mgr',26:'Academy Jr',
  27:'DevOps',28:'Testing',29:'HR Coordinator',
}
const ROLE_COLOR: Record<string, string> = {
  'Author':'#6366f1','Editor':'#6366f1','Developer':'#3b82f6','Designer':'#ec4899',
  'Community Mgr':'#06b6d4','Backlinks & Promo':'#22c55e','BL Team Lead':'#22c55e',
  'Marketing':'#f59e0b','Sales Dept':'#f59e0b','HR Mgmt':'#8b5cf6','HR Head':'#8b5cf6',
  'Jr Recruiter':'#8b5cf6','HR Coordinator':'#8b5cf6','Data Analytics':'#14b8a6',
  'Project Mgr':'#14b8a6','Sys Admin':'#3b82f6','DevOps':'#3b82f6',
}
const TYPE_LABEL: Record<string, string> = {'1':'Employee','2':'Candidate','3':'Freelancer'}
const CAT_LABEL: Record<string, string>  = {'0':'Standard','1':'Freelancer','2':'Intern'}
const IMAGE_BASE = 'https://app.ultimez.com/uploads/employee/profile/'

function empRoles(str: string): string[] {
  return String(str || '').split(',')
    .map(x => parseInt(x.trim())).filter(n => !isNaN(n) && ROLE_MAP[n])
    .map(n => ROLE_MAP[n])
}
function roleColor(r: string) { return ROLE_COLOR[r] || '#64748b' }
function avatarBg(n: string) {
  const c = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#8b5cf6','#14b8a6']
  let h = 0; for (const ch of n) h = (h << 5) - h + ch.charCodeAt(0)
  return c[Math.abs(h) % c.length]
}
function initials(n: string) {
  return n.split(' ').filter(Boolean).map(x => x[0]).slice(0, 2).join('').toUpperCase()
}
function fmtDate(d: string) {
  if (!d || d < '2010-01-01') return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return '—' }
}
function tenure(d: string) {
  if (!d || d < '2010-01-01') return ''
  try {
    const yrs = (Date.now() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000)
    return yrs >= 1 ? `${Math.floor(yrs)}y ${Math.floor((yrs % 1) * 12)}m` : `${Math.floor(yrs * 12)}m`
  } catch { return '' }
}
function prodColor(p: number) { return p >= 70 ? '#22c55e' : p >= 40 ? '#f59e0b' : '#ef4444' }

// ─── Stat mini card ───────────────────────────────────────────
function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '14px 10px', background: 'var(--bg3)',
      borderRadius: 8, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6, fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase' as const, letterSpacing: 0.8 }}>{label}</div>
    </div>
  )
}

// ─── Info row ─────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text3)', flexShrink: 0, marginRight: 16 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', textAlign: 'right',
        wordBreak: 'break-all' as const }}>{value || '—'}</span>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────
interface Props {
  session: SessionPayload
  profile: Record<string, string>
  stats:   Record<string, string>
}

// ─── Component ────────────────────────────────────────────────
export default function EmployeeProfileClient({ session, profile, stats }: Props) {
  const router   = useRouter()
  const roles    = empRoles(profile.create_type_row_id || '')
  const bg       = avatarBg(profile.full_name || session.name)
  const hasPhoto = !!profile.profile_image
  const avgProd  = parseFloat(stats.avg_productivity || '0') || 0
  const bestDay  = parseFloat(stats.best_day || '0') || 0

  function handleNav(key: string) {
    if (key === 'profile') return
    router.push(`/employee/${key === 'dashboard' ? 'dashboard' : key}`)
  }

  return (
    <PageShell
      panel="employee"
      session={session}
      navItems={EMP_NAV}
      activeKey="profile"
      onNav={handleNav}
      title="Employee Portal"
      subtitle="My Profile"
    >
      {/* ── Page header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>My Profile</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
          Your account details, roles, and 30-day performance
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── LEFT: identity card ── */}
        <div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>

            {/* Avatar / photo */}
            <div style={{ padding: '28px 24px 20px', textAlign: 'center',
              borderBottom: '1px solid var(--border)' }}>
              {hasPhoto ? (
                <img
                  src={`${IMAGE_BASE}${profile.profile_image}`}
                  alt={profile.full_name}
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                    border: '3px solid var(--border2)' }}
                />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: bg,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', margin: '0 auto',
                  border: '3px solid var(--border2)' }}>
                  {initials(profile.full_name || session.name)}
                </div>
              )}

              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginTop: 12 }}>
                {profile.full_name || session.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
                {profile.position || 'No position set'}
              </div>

              {/* Enabled status */}
              <div style={{ marginTop: 10 }}>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 10px',
                  borderRadius: 4,
                  ...(profile.login_status === '1'
                    ? { background: '#14532d44', color: '#22c55e', border: '1px solid #22c55e44' }
                    : { background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)' })
                }}>
                  {profile.login_status === '1' ? '● ENABLED' : '○ DISABLED'}
                </span>
              </div>

              {/* Tenure badge */}
              {tenure(profile.ultimez_join_date) && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--bg3)',
                    padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>
                    {tenure(profile.ultimez_join_date)} at Ultimez
                  </span>
                </div>
              )}
            </div>

            {/* Profile fields */}
            <div style={{ padding: '4px 16px 12px' }}>
              <InfoRow label="Employee ID" value={`#${profile.employee_id}`} />
              <InfoRow label="Email"       value={profile.email_id}           />
              <InfoRow label="Mobile"      value={profile.mobile_number}       />
              <InfoRow label="Location"    value={profile.location}            />
              <InfoRow label="Joined"      value={fmtDate(profile.ultimez_join_date)} />
              <InfoRow label="Team Leader" value={profile.team_leader}         />
              <InfoRow label="Type"        value={TYPE_LABEL[profile.employee_type] || '—'}     />
              <InfoRow label="Category"    value={CAT_LABEL[profile.employee_category_type] || '—'} />
            </div>
          </div>

          {/* Roles card */}
          {roles.length > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1,
                textTransform: 'uppercase' as const, color: 'var(--text4)', marginBottom: 10 }}>
                Roles ({roles.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {roles.map(r => (
                  <span key={r} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 14,
                    fontFamily: 'var(--font-mono)', fontWeight: 600,
                    background: `${roleColor(r)}20`, color: roleColor(r),
                    border: `1px solid ${roleColor(r)}50` }}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: stats + performance ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 30-day summary */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
              30-day Performance
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
              <MiniStat label="Days tracked"  value={stats.total_days || '—'}                         color="var(--accent-c)"            />
              <MiniStat label="Avg score"     value={`${avgProd}%`}                                    color={prodColor(avgProd)}         />
              <MiniStat label="Best day"      value={`${Math.round(bestDay)}%`}                        color="#22c55e"                    />
              <MiniStat label="High-perf days" value={stats.high_days || '0'}                         color="#3b82f6"                    />
            </div>

            {/* Productivity bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Average productivity</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: prodColor(avgProd) }}>{avgProd}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${avgProd}%`, height: '100%',
                  background: prodColor(avgProd), borderRadius: 4,
                  transition: 'width .5s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text4)' }}>Low</span>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text4)' }}>High</span>
              </div>
            </div>
          </div>

          {/* Performance tier */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
              Performance tier
            </div>
            {[
              { label: 'High performer',    range: '≥ 70%',   color: '#22c55e', active: avgProd >= 70, days: stats.high_days || '0' },
              { label: 'On track',          range: '40–69%',  color: '#f59e0b', active: avgProd >= 40 && avgProd < 70, days: String(parseInt(stats.total_days||'0') - parseInt(stats.high_days||'0') - parseInt(stats.low_days||'0')) },
              { label: 'Needs improvement', range: '< 40%',   color: '#ef4444', active: avgProd < 40,  days: stats.low_days  || '0' },
            ].map(tier => (
              <div key={tier.label} style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 8, marginBottom: 6,
                background: tier.active ? `${tier.color}12` : 'var(--bg3)',
                border: `1px solid ${tier.active ? `${tier.color}44` : 'var(--border)'}` }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: tier.active ? tier.color : 'var(--border2)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: tier.active ? 600 : 400,
                    color: tier.active ? tier.color : 'var(--text3)' }}>{tier.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text4)' }}>{tier.range}</div>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)',
                  color: tier.active ? tier.color : 'var(--text4)' }}>
                  {tier.days} days
                </div>
              </div>
            ))}
          </div>

          {/* Quick links */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
              Quick actions
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {[
                { label: '← Back to Overview', href: '/employee/dashboard' },
              ].map(a => (
                <a key={a.label} href={a.href} style={{ padding: '8px 14px', borderRadius: 8,
                  fontSize: 12, fontWeight: 500, textDecoration: 'none',
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  color: 'var(--text3)', transition: 'all .15s' }}
                  onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.borderColor = '#8b5cf6'; (ev.currentTarget as HTMLElement).style.color = '#8b5cf6' }}
                  onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (ev.currentTarget as HTMLElement).style.color = 'var(--text3)' }}>
                  {a.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
