'use client'
// src/components/admin/Nav.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'

const NAV_LINKS = [
  { href: '/admin/report', label: 'Admin' }, // Updated path only
  { href: '/admin/employees', label: '👥 Employees' },
  { href: '/dashboard',    label: 'Employee View' },
  { href: '/report',       label: 'SQL Editor' },
  { href: '/',              label: 'Chatbot' },
]

export function Nav() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()

  return (
    <nav
      style={{ borderBottom: '1px solid var(--border)' }}
      className="flex justify-between items-center mb-8 pb-4 flex-wrap gap-3"
    >
      <h1
        className="text-xl font-bold"
        style={{ color: 'var(--accent-c)' }}
      >
        Admin Dashboard
      </h1>

      <div className="flex gap-2 items-center flex-wrap">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="text-[13px] px-[14px] py-[6px] rounded-md transition-all duration-150"
              style={{
                color:      active ? 'var(--accent-c)' : 'var(--text3)',
                background: active ? 'var(--bg2)'      : 'transparent',
                border:     active ? '1px solid var(--accent-c)' : '1px solid transparent',
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement
                  el.style.color      = 'var(--text)'
                  el.style.background = 'var(--bg2)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement
                  el.style.color      = 'var(--text3)'
                  el.style.background = 'transparent'
                }
              }}
            >
              {label}
            </Link>
          )
        })}

        <button
          onClick={toggle}
          title="Toggle theme"
          style={{
            background:   'var(--bg2)',
            border:       '1px solid var(--border)',
            color:        'var(--text2)',
            width:        '36px',
            height:       '36px',
            borderRadius: '8px',
            cursor:       'pointer',
            fontSize:     '16px',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            transition:   'all 0.2s',
            flexShrink:   0,
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.borderColor = 'var(--accent-c)'
            el.style.color       = 'var(--accent-c)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.borderColor = 'var(--border)'
            el.style.color       = 'var(--text2)'
          }}
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </div>
    </nav>
  )
}