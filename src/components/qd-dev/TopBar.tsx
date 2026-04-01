'use client'

import Link from 'next/link'

interface Props {
  crumbs?: { label: string; href?: string }[]
}

export default function TopBar({ crumbs }: Props) {
  return (
    <header className="topbar">
      <Link href="/projects" className="topbar-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://c-sable-two.vercel.app/QDGold.png" alt="QD" />
        <span className="topbar-logo-text">QD <span>Dev</span></span>
      </Link>

      {crumbs && crumbs.length > 0 && (
        <>
          <span style={{ color: 'var(--text3)', fontSize: 13 }}>/</span>
          <nav className="topbar-breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ color: 'var(--text3)' }}>›</span>}
                {c.href
                  ? <Link href={c.href} style={{ color: 'var(--text2)' }}>{c.label}</Link>
                  : <span style={{ color: 'var(--text)' }}>{c.label}</span>}
              </span>
            ))}
          </nav>
        </>
      )}

      <span className="sep" />

      <span style={{
        fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
        background: 'rgba(245,158,11,.1)', color: 'var(--gold)',
        border: '1px solid rgba(245,158,11,.2)', fontFamily: 'var(--mono)',
      }}>
        Ultimez Internal
      </span>
    </header>
  )
}
