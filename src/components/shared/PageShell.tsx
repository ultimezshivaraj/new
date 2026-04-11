'use client'
// src/components/shared/PageShell.tsx

import { useTheme } from '@/components/ThemeProvider'
import { useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { SessionPayload } from '@/lib/session'

// ── Nav item types ────────────────────────────────────────────
export interface NavLink {
  type?: 'link'
  key: string
  icon: string
  label: string
  badge?: string | number
}
export interface NavDropdown {
  type: 'dropdown'
  key: string
  icon: string
  label: string
  badge?: string | number
  children: { key: string; label: string; badge?: string | number }[]
}
export interface NavDividerItem {
  type: 'divider'
  label: string
  key?: string
  icon?: string
}
export type NavItem = NavLink | NavDropdown | NavDividerItem

type PanelType = 'admin' | 'employee' | 'client'

const ACCENT: Record<PanelType, string> = {
  admin: '#f59e0b',
  employee: '#8b5cf6',
  client: '#06b6d4',
}

// ── Employee nav ──────────────────────────────────────────────
export interface EmployeeNavBadges {
  alertCount?: number
  pendingLeaveCount?: number
  pendingITCount?: number
}

function buildEmployeeNav(badges: EmployeeNavBadges = {}): NavItem[] {
  const { alertCount = 0, pendingLeaveCount = 0, pendingITCount = 0 } = badges
  return [
    { type: 'link', key: 'dashboard', icon: '◈', label: 'Dashboard' },
    {
      type: 'dropdown', key: 'profile', icon: '◉', label: 'Profile',
      badge: alertCount > 0 ? alertCount : undefined,
      children: [
        { key: 'overview', label: 'Overview' },
        { key: 'achievements', label: 'Achievements' },
        { key: 'history', label: 'Work History' },
        { key: 'alerts', label: 'Alerts', badge: alertCount > 0 ? alertCount : undefined },
        { key: 'logins', label: 'Login History' },
        { key: 'web-app-usage', label: 'Web & App Usage' },
      ],
    },
    { type: 'divider', label: 'Back Office' },
    {
      type: 'dropdown', key: 'emp-leave', icon: '📋', label: 'Leave & Related',
      badge: pendingLeaveCount > 0 ? pendingLeaveCount : undefined,
      children: [
        { key: 'emp-leave-requests', label: 'My Leave Requests' },
        { key: 'emp-leave-holidays', label: 'Holiday Calendar' },
        { key: 'emp-leave-pending', label: 'My Pending', badge: pendingLeaveCount > 0 ? pendingLeaveCount : undefined },
      ],
    },
    {
      type: 'dropdown', key: 'emp-payroll', icon: '💰', label: 'Payroll',
      children: [
        { key: 'emp-payroll-payslips', label: 'My Payslips' },
        { key: 'emp-payroll-bank-account', label: 'My Bank Account' },
      ],
    },
    {
      type: 'dropdown', key: 'emp-it', icon: '🖥', label: 'IT Services',
      badge: pendingITCount > 0 ? pendingITCount : undefined,
      children: [
        { key: 'emp-it-requests', label: 'My IT Requests', badge: pendingITCount > 0 ? pendingITCount : undefined },
        { key: 'emp-it-device', label: 'My Device' },
      ],
    },
  ]
}

// ── Admin nav ─────────────────────────────────────────────────
function buildAdminNav(): NavItem[] {
  return [
    { type: 'link', key: 'dashboard', icon: '◈', label: 'Dashboard' },
    { type: 'divider', label: 'People' },
    { type: 'link', key: 'employees', icon: '◉', label: 'Employees' },
    { type: 'link', key: 'hr', icon: '♡', label: 'HR Module' },
    { type: 'link', key: 'low-performers', icon: '📉', label: 'Performance Msgs' },

    { type: 'divider', label: 'Back Office' },
    {
      type: 'dropdown', key: 'bo-leave', icon: '📋', label: 'Leave & Related',
      children: [
        { key: 'bo-leave-requests', label: 'Leave Requests' },
        { key: 'bo-leave-holidays-calendar', label: 'Holiday Calendar' },
        { key: 'bo-leave-pending', label: 'Pending Approvals' },
      ],
    },
    {
      type: 'dropdown', key: 'bo-payroll', icon: '💰', label: 'Payroll',
      children: [
        { key: 'bo-payroll-records', label: 'Payroll Records' },
        { key: 'bo-payroll-bank-accounts', label: 'Bank Accounts' },
        { key: 'bo-payroll-logs', label: 'Change History' },
      ],
    },
    {
      type: 'dropdown', key: 'bo-it', icon: '🖥', label: 'IT Services',
      children: [
        { key: 'bo-it-queries', label: 'System Queries' },
        { key: 'bo-it-devices', label: 'Device Inventory' },
        { key: 'bo-it-history', label: 'Query Status History' },
      ],
    },

    { type: 'divider', label: 'Content' },
    { type: 'link', key: 'companies', icon: '⬡', label: 'Companies' },
    { type: 'link', key: 'professionals', icon: '◎', label: 'Professionals' },
    { type: 'link', key: 'reviews', icon: '✦', label: 'Review Queue' },

    { type: 'divider', label: 'Work Monitoring' },
    { type: 'link', key: 'work-monitoring/web-app-usage',      icon: '◌', label: 'Web & App Usage' },
    { type: 'link', key: 'work-monitoring/productive-requests', icon: '◎', label: 'Productive Requests' },

    { type: 'divider', label: 'QD Tools' },
    { type: 'link', key: 'qd-dev', icon: '⌥', label: 'QD Dev' },
    { type: 'link', key: 'report', icon: '▲', label: 'QD Reports' },
  ]
}

// ── sessionStorage helpers ────────────────────────────────────
const STORAGE_KEYS: Record<PanelType, string> = {
  employee: 'emp_nav_open_dropdowns',
  admin: 'admin_nav_open_dropdowns',
  client: 'client_nav_open_dropdowns',
}

function loadPersistedDropdowns(panel: PanelType): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS[panel])
    if (!raw) return new Set()
    return new Set<string>(JSON.parse(raw))
  } catch { return new Set() }
}

function persistDropdowns(panel: PanelType, open: Set<string>) {
  if (typeof window === 'undefined') return
  try { sessionStorage.setItem(STORAGE_KEYS[panel], JSON.stringify([...open])) }
  catch { /* ignore */ }
}

function resolveOpenDropdowns(nav: NavItem[], activeKey: string, persisted: Set<string>): Set<string> {
  const next = new Set<string>(persisted)
  nav.forEach(item => {
    if (item.type === 'dropdown' && item.children.some(c => c.key === activeKey)) {
      next.add(item.key)
    }
  })
  return next
}

// ── Props ─────────────────────────────────────────────────────
interface PageShellProps {
  panel: PanelType
  session: SessionPayload
  navItems?: NavItem[]          // not needed for admin or employee panels
  activeKey: string
  onNav?: (key: string) => void  // only needed when page handles its own tab switching
  title: string
  subtitle?: string
  topRight?: ReactNode
  children: ReactNode
  employeeNavBadges?: EmployeeNavBadges
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(x => x[0]).slice(0, 2).join('').toUpperCase()
}

export default function PageShell({
  panel, session, navItems, activeKey, onNav,
  title, subtitle, topRight, children, employeeNavBadges,
}: PageShellProps) {
  const router = useRouter()
  const [out, setOut] = useState(false)
  const accent = ACCENT[panel]
  const { theme, toggle } = useTheme()

  const isEmployee = panel === 'employee'
  const isAdmin = panel === 'admin'

  // ── Resolve nav items ─────────────────────────────────────────
  const resolvedNav: NavItem[] = isEmployee
    ? buildEmployeeNav(employeeNavBadges)
    : isAdmin
      ? buildAdminNav()
      : (navItems ?? [])

  // ── Default nav handlers ──────────────────────────────────────
  function defaultEmployeeNav(key: string) {
    if (key === 'dashboard') { router.push('/employee/dashboard'); return }
    if (key === 'web-app-usage') { router.push('/employee/profile/web-app-usage'); return }
    if (['profile', 'overview', 'achievements', 'history', 'alerts', 'logins'].includes(key)) {
      router.push(`/employee/dashboard?page=${key}`)
      return
    }
    if (key.startsWith('emp-leave-') || key.startsWith('emp-payroll-') || key.startsWith('emp-it-')) {
      router.push(`/employee/backoffice?tab=${key}`)
      return
    }
  }

  function defaultAdminNav(key: string) {
    if (key === 'employees') { router.push('/admin/employees'); return }
    if (key.startsWith('bo-')) { router.push(`/admin/backoffice?tab=${key}`); return }
    router.push(`/admin/${key}`)
  }

  const resolvedOnNav = onNav ?? (
    isEmployee ? defaultEmployeeNav :
      isAdmin ? defaultAdminNav :
        (() => { })
  )

  // ── Dropdown open state (persisted across page navigations) ───
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(() => {
    const persisted = loadPersistedDropdowns(panel)
    return resolveOpenDropdowns(resolvedNav, activeKey, persisted)
  })

  useEffect(() => {
    setOpenDropdowns(prev => {
      const next = resolveOpenDropdowns(resolvedNav, activeKey, prev)
      persistDropdowns(panel, next)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey])

  function toggleDropdown(key: string) {
    setOpenDropdowns(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      persistDropdowns(panel, next)
      return next
    })
  }

  async function logout() {
    setOut(true)
    try { sessionStorage.removeItem(STORAGE_KEYS[panel]) } catch { /* ignore */ }
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ panel }),
    })
    router.push(`/${panel}/login`)
  }

  function navBtn(active: boolean, indent = false): React.CSSProperties {
    return {
      display: 'flex', alignItems: 'center', gap: 10,
      padding: indent ? '7px 10px 7px 36px' : '8px 10px',
      borderRadius: 8, border: 'none',
      fontSize: indent ? 12 : 13, fontWeight: 500, width: '100%',
      textAlign: 'left' as const, cursor: 'pointer', transition: 'all .15s',
      fontFamily: 'var(--font-sans)',
      background: active ? `${accent}20` : 'transparent',
      color: active ? accent : 'var(--text2)',
    }
  }

  function topbarLabel(): string {
    if (subtitle) return subtitle
    for (const item of resolvedNav) {
      if (item.type === 'dropdown') {
        const child = item.children.find(c => c.key === activeKey)
        if (child) return `${item.label} · ${child.label}`
        if (item.key === activeKey) return item.label
      } else if (item.type !== 'divider' && item.key === activeKey) {
        return item.label
      }
    }
    return ''
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Logo */}
        <div style={{
          padding: '16px 14px 12px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7, flexShrink: 0,
            background: `${accent}22`, color: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
          }}>QD</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)' }}>Ultimez Team</div>
          </div>
        </div>

        {/* User */}
        <div style={{
          padding: '12px 14px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: `${accent}22`, color: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700,
          }}>
            {initials(session.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{session.name}</div>
            <div style={{
              fontSize: 10, color: 'var(--text2)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{session.email}</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{
          flex: 1, padding: '8px 8px', display: 'flex',
          flexDirection: 'column', gap: 2, overflowY: 'auto',
        }}>
          {resolvedNav.map((item, idx) => {

            if (item.type === 'divider') {
              return (
                <div key={`div-${idx}`} style={{
                  padding: '8px 10px 3px',
                  fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1.2,
                  textTransform: 'uppercase' as const, color: 'var(--text4)',
                  fontWeight: 600,
                }}>
                  {item.label}
                </div>
              )
            }

            if (item.type === 'dropdown') {
              const isOpen = openDropdowns.has(item.key)
              const childActive = item.children.some(c => c.key === activeKey)
              return (
                <div key={item.key}>
                  <button style={navBtn(childActive && !isOpen)} onClick={() => toggleDropdown(item.key)}>
                    <span style={{ fontSize: 15, width: 20, textAlign: 'center' as const, flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge !== undefined && (
                      <span style={{
                        fontSize: 9, fontFamily: 'var(--font-mono)',
                        padding: '1px 6px', borderRadius: 10,
                        background: childActive ? accent : 'var(--border2)',
                        color: childActive ? '#fff' : 'var(--text2)',
                      }}>
                        {item.badge}
                      </span>
                    )}
                    <span style={{
                      fontSize: 10, color: 'var(--text3)', marginLeft: 2,
                      transition: 'transform .2s',
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      display: 'inline-block',
                    }}>›</span>
                  </button>

                  {isOpen && (
                    <div style={{ marginTop: 2 }}>
                      {item.children.map(child => (
                        <button
                          key={child.key}
                          style={navBtn(child.key === activeKey, true)}
                          onClick={() => resolvedOnNav(child.key)}
                        >
                          <span style={{ flex: 1 }}>{child.label}</span>
                          {child.badge !== undefined && (
                            <span style={{
                              fontSize: 9, fontFamily: 'var(--font-mono)',
                              padding: '1px 6px', borderRadius: 10,
                              background: child.key === activeKey ? accent : 'var(--border2)',
                              color: child.key === activeKey ? '#fff' : 'var(--text2)',
                            }}>
                              {child.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            const active = item.key === activeKey
            return (
              <button key={item.key} style={navBtn(active)} onClick={() => resolvedOnNav(item.key)}>
                <span style={{ fontSize: 15, width: 20, textAlign: 'center' as const, flexShrink: 0 }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge !== undefined && (
                  <span style={{
                    fontSize: 9, fontFamily: 'var(--font-mono)',
                    padding: '1px 6px', borderRadius: 10,
                    background: active ? accent : 'var(--border2)',
                    color: active ? '#fff' : 'var(--text2)',
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '8px 8px', borderTop: '1px solid var(--border)' }}>
          <button onClick={logout} disabled={out} style={navBtn(false)}>
            <span style={{ fontSize: 15, width: 20, textAlign: 'center' as const }}>↩</span>
            {out ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{
          height: 52, flexShrink: 0,
          background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text2)' }}>
            {title}
            {topbarLabel() && (
              <> · <span style={{ color: 'var(--text)', fontWeight: 500 }}>{topbarLabel()}</span></>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {topRight}
            <div style={{
              fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text2)',
              background: 'var(--bg3)', border: '1px solid var(--border)',
              padding: '3px 10px', borderRadius: 6,
            }}>
              {new Date().toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
              })}
            </div>
            <button onClick={toggle} style={{
              padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
              border: '1px solid var(--border2)', background: 'var(--bg3)',
              color: 'var(--text2)', fontSize: 11, fontWeight: 600,
              fontFamily: 'var(--font-mono)',
            }}>
              {theme === 'dark' ? '○ Light' : '◑ Dark'}
            </button>
          </div>
        </div>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
