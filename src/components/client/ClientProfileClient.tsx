'use client'
// src/components/client/ClientProfileClient.tsx

import { useRouter }      from 'next/navigation'
import PageShell, { NavItem } from '@/components/shared/PageShell'
import { SessionPayload }  from '@/lib/session'
import StatCard from '@/components/shared/StatCard'

// ─── Nav (matches client dashboard) ──────────────────────────
const CLIENT_NAV: NavItem[] = [
  { type: 'divider', label: 'Projects' },
  { type: 'link', key: 'dashboard', icon: '◈',  label: 'Overview'       },
  { type: 'link', key: 'profile',   icon: '◉',  label: 'My Profile'     },

  { type: 'divider', label: 'Communication' },
  { type: 'link', key: 'messages',  icon: '💬', label: 'Messages'        },
]

// ─── Helpers ──────────────────────────────────────────────────
const IMAGE_BASE = 'https://app.ultimez.com/uploads/client/profile/'

function avatarBg(n: string) {
  const c = ['#06b6d4','#3b82f6','#8b5cf6','#14b8a6','#f59e0b']
  let h = 0; for (const ch of n) h = (h << 5) - h + ch.charCodeAt(0)
  return c[Math.abs(h) % c.length]
}
function initials(n: string) {
  return n.split(' ').filter(Boolean).map(x => x[0]).slice(0, 2).join('').toUpperCase()
}
function fmtDate(d: string) {
  if (!d || d === 'None') return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return '—' }
}

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
export default function ClientProfileClient({ session, profile, stats }: Props) {
  const router   = useRouter()
  const hasPhoto = !!profile.profile_image
  const bg       = avatarBg(profile.client_name || session.name)

  function handleNav(key: string) {
    if (key === 'profile') return
    router.push(`/client/${key}`)
  }

  const total     = parseInt(stats.total_projects     || '0')
  const active    = parseInt(stats.active_projects    || '0')
  const completed = parseInt(stats.completed_projects || '0')
  const pending   = parseInt(stats.pending_projects   || '0')

  return (
    <PageShell
      panel="client"
      session={session}
      navItems={CLIENT_NAV}
      activeKey="profile"
      onNav={handleNav}
      title="Client Portal"
      subtitle="My Profile"
    >
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>My Profile</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
          Your account details and project summary
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── LEFT: identity card ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden' }}>

            {/* Avatar */}
            <div style={{ padding: '28px 24px 20px', textAlign: 'center',
              borderBottom: '1px solid var(--border)' }}>
              {hasPhoto ? (
                <img
                  src={`${IMAGE_BASE}${profile.profile_image}`}
                  alt={profile.client_name}
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                    border: '3px solid var(--border2)' }}
                />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: bg,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', margin: '0 auto',
                  border: '3px solid var(--border2)' }}>
                  {initials(profile.client_name || session.name)}
                </div>
              )}

              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginTop: 12 }}>
                {profile.client_name || session.name}
              </div>
              {profile.company_name && (
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
                  {profile.company_name}
                </div>
              )}

              {/* Active status */}
              <div style={{ marginTop: 10 }}>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 10px',
                  borderRadius: 4,
                  ...(profile.login_status === '1'
                    ? { background: '#0c4a6e44', color: '#06b6d4', border: '1px solid #06b6d444' }
                    : { background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)' })
                }}>
                  {profile.login_status === '1' ? '● ACTIVE' : '○ INACTIVE'}
                </span>
              </div>
            </div>

            {/* Fields */}
            <div style={{ padding: '4px 16px 12px' }}>
              <InfoRow label="Client ID"  value={`#${profile.client_id}`} />
              <InfoRow label="Email"      value={profile.email_id}         />
              <InfoRow label="Mobile"     value={profile.mobile_number}    />
              <InfoRow label="Company"    value={profile.company_name}     />
              <InfoRow label="Address"    value={profile.address}          />
              <InfoRow label="Member since" value={fmtDate(profile.created_at)} />
            </div>
          </div>
        </div>

        {/* ── RIGHT: project stats ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Project stats */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
              Project summary
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              <StatCard label="Total"      value={String(total)}     color="#06b6d4"        />
              <StatCard label="Active"     value={String(active)}    color="#3b82f6"        />
              <StatCard label="Completed"  value={String(completed)} color="#22c55e"        />
              <StatCard label="Pending"    value={String(pending)}   color="var(--text3)"   />
            </div>
          </div>

          {/* Project breakdown visual */}
          {total > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
                Project breakdown
              </div>

              {/* Progress bar */}
              <div style={{ height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex',
                marginBottom: 14, background: 'var(--border)' }}>
                {[
                  { count: completed, color: '#22c55e' },
                  { count: active,    color: '#3b82f6' },
                  { count: pending,   color: '#f59e0b' },
                ].map((seg, i) => seg.count > 0 && (
                  <div key={i} style={{ height: '100%', flex: seg.count,
                    background: seg.color, transition: 'flex .5s' }} />
                ))}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
                {[
                  { label: 'Completed', count: completed, color: '#22c55e' },
                  { label: 'Active',    count: active,    color: '#3b82f6' },
                  { label: 'Pending',   count: pending,   color: '#f59e0b' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{l.label}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
                      color: l.color }}>{l.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
              Quick actions
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/client/dashboard" style={{ padding: '8px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: 500, textDecoration: 'none',
                background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text3)' }}
                onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.borderColor = '#06b6d4'; (ev.currentTarget as HTMLElement).style.color = '#06b6d4' }}
                onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (ev.currentTarget as HTMLElement).style.color = 'var(--text3)' }}>
                ← Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
