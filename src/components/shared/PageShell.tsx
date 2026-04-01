'use client'
// src/components/shared/PageShell.tsx

import { useTheme } from '@/components/ThemeProvider'
import { useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { SessionPayload } from '@/lib/session'



// ── Nav item types ────────────────────────────────────────────
export interface NavLink {
  type?: 'link'
  key:    string
  icon:   string
  label:  string
  badge?: string | number
}
export interface NavDropdown {
  type:   'dropdown'
  key:    string
  icon:   string
  label:  string
  badge?: string | number
  children: { key: string; label: string; badge?: string | number }[]
}
export interface NavDividerItem {
  type:  'divider'
  label: string
  key?:  string
  icon?: string
}
export type NavItem = NavLink | NavDropdown | NavDividerItem

type PanelType = 'admin' | 'employee' | 'client'

const ACCENT: Record<PanelType, string> = {
  admin:    '#f59e0b',
  employee: '#8b5cf6',
  client:   '#06b6d4',
}


interface PageShellProps {
  panel:      PanelType
  session:    SessionPayload
  navItems:   NavItem[]
  activeKey:  string
  onNav:      (key: string) => void
  title:      string
  subtitle?:  string
  topRight?:  ReactNode
  children:   ReactNode
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(x => x[0]).slice(0, 2).join('').toUpperCase()
}

export default function PageShell({
  panel, session, navItems, activeKey, onNav,
  title, subtitle, topRight, children,
}: PageShellProps) {
  const router  = useRouter()
  const [out, setOut] = useState(false)
  const accent  = ACCENT[panel]
  const { theme, toggle } = useTheme()

  // Track which dropdowns are open — auto-open if a child is active
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(() => {
    const s = new Set<string>()
    navItems.forEach(item => {
      if (item.type === 'dropdown') {
        if (item.children.some(c => c.key === activeKey)) s.add(item.key)
      }
    })
    return s
  })

  function toggleDropdown(key: string) {
    setOpenDropdowns(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function logout() {
    setOut(true)
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
      color:      active ? accent : 'var(--text2)',
    }
  }

  // Determine topbar subtitle from active key
  function topbarLabel(): string {
    if (subtitle) return subtitle
    for (const item of navItems) {
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
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10 }}>
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
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: `${accent}22`, color: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700,
          }}>
            {initials(session.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.email}</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 8px', display: 'flex',
          flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {navItems.map((item, idx) => {

            // ── Divider ──
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

            // ── Dropdown ──
            if (item.type === 'dropdown') {
              const isOpen    = openDropdowns.has(item.key)
              const childActive = item.children.some(c => c.key === activeKey)
              return (
                <div key={item.key}>
                  {/* Dropdown trigger */}
                  <button
                    style={navBtn(childActive && !isOpen)}
                    onClick={() => toggleDropdown(item.key)}
                  >
                    <span style={{ fontSize: 15, width: 20, textAlign: 'center' as const, flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge !== undefined && (
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)',
                        padding: '1px 6px', borderRadius: 10,
                        background: childActive ? accent : 'var(--border2)',
                        color:      childActive ? '#fff' : 'var(--text2)' }}>
                        {item.badge}
                      </span>
                    )}
                    {/* Chevron */}
                    <span style={{
                      fontSize: 10, color: 'var(--text3)', marginLeft: 2,
                      transition: 'transform .2s',
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      display: 'inline-block',
                    }}>›</span>
                  </button>

                  {/* Children */}
                  {isOpen && (
                    <div style={{ marginTop: 2 }}>
                      {item.children.map(child => (
                        <button key={child.key} style={navBtn(child.key === activeKey, true)}
                          onClick={() => onNav(child.key)}>
                          <span style={{ flex: 1 }}>{child.label}</span>
                          {child.badge !== undefined && (
                            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)',
                              padding: '1px 6px', borderRadius: 10,
                              background: child.key === activeKey ? accent : 'var(--border2)',
                              color:      child.key === activeKey ? '#fff' : 'var(--text2)' }}>
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

            // ── Regular link ──
            const active = item.key === activeKey
            return (
              <button key={item.key} style={navBtn(active)} onClick={() => onNav(item.key)}>
                <span style={{ fontSize: 15, width: 20, textAlign: 'center' as const, flexShrink: 0 }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge !== undefined && (
                  <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)',
                    padding: '1px 6px', borderRadius: 10,
                    background: active ? accent : 'var(--border2)',
                    color:      active ? '#fff' : 'var(--text2)' }}>
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
            {out ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
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
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
