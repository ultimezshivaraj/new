'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/shared/PageShell'
import { ADMIN_NAV } from '@/components/admin/employees/EmployeeMonitoringPage'
import { SessionPayload } from '@/lib/session'

interface Tool {
  status: 'live' | 'dev'
  name: string
  tag: string
  title: string
  icon: string
  desc: string
  caps: string[]
  subLinks?: { href: string; label: string; color: string }[]
  btnHref?: string
  btnLabel?: string
  btnExternal?: boolean
  color: string
  glowColor: string
  iconBg: string
  iconBorder: string
  featured?: boolean
}

const TOOLS: Tool[] = [
  {
    status: 'live',
    name: 'QD Dev Projects Codebase Analyser SQL Editor BigQuery',
    tag: 'Developer Tool',
    title: 'QD Dev',
    icon: '💻',
    desc: 'The internal developer workbench for the Coinpedia platform. Upload a codebase ZIP and database schema to generate a fully structured AI-powered project report — covering architecture, tech stack, security, database design, and onboarding guides. Browse all project analyses with 9 populated tabs per report.',
    caps: ['AI Codebase Analysis', 'Schema Upload', '9-Tab Report', 'BigQuery Storage', 'Tech Stack Detection', 'Security Audit'],
    subLinks: [
      { href: '/admin/reports', label: '📈 QD Reports', color: '#6366f1' },
      { href: '/admin/qd-dev/analyser', label: '🛢 SQL Editor', color: '#6366f1' },
      { href: '/admin/dashboard', label: '🏠 Admin Dashboard', color: '#6366f1' },
    ],
    btnHref: '/admin/qd-dev/projects',
    btnLabel: 'Open QD Dev',
    color: '#6366f1',
    glowColor: 'rgba(99,102,241,.13)',
    iconBg: 'rgba(99,102,241,.13)',
    iconBorder: 'rgba(99,102,241,.28)',
    featured: true,
  },
  {
    status: 'live',
    name: 'QD Company Analyst Companies Enrichment Agent Review',
    tag: 'Company Intel',
    title: 'QD Company Analyst',
    icon: '🏢',
    desc: "AI-powered enrichment across Coinpedia's 3,070-company directory. Browse, score, and enrich companies across About, Funding, Team, and Products — then review every agent suggestion before it merges into production.",
    caps: ['3,070 Companies', 'AI Enrichment', 'Profile Score', 'Traffic Rank'],
    subLinks: [
      { href: '/admin/companies', label: '🏢 Admin View', color: '#06b6d4' },
      { href: '/admin/reviews', label: '📋 Employee Review', color: '#06b6d4' },
    ],
    btnHref: '/admin/companies',
    btnLabel: 'Open Tool',
    color: '#06b6d4',
    glowColor: 'rgba(6,182,212,.1)',
    iconBg: 'rgba(6,182,212,.11)',
    iconBorder: 'rgba(6,182,212,.25)',
  },
  {
    status: 'live',
    name: 'QD Professional Analyst Professionals Profiles cln_users',
    tag: 'People Intel',
    title: 'QD Professional Analyst',
    icon: '👤',
    desc: 'Profile intelligence for crypto professionals on app.coinpedia.org. Filter by status, visibility, and enrichment stage. Run the AI agent to score profiles and surface experience, social, and analytics data across the cln_users collection.',
    caps: ['Profile Score', 'AI Agent', 'cln_users', 'Social Intel', 'Enrichment'],
    btnHref: '/admin/professionals',
    btnLabel: 'Open Tool',
    color: '#8b5cf6',
    glowColor: 'rgba(139,92,246,.1)',
    iconBg: 'rgba(139,92,246,.11)',
    iconBorder: 'rgba(139,92,246,.22)',
  },
  {
    status: 'live',
    name: 'QD Keep Eye Fact Checker News Intelligence RSS Vector Search Sentiment',
    tag: 'News Intelligence',
    title: 'QD Keep Eye & Fact Checker',
    icon: '🔍',
    desc: 'A dedicated news intelligence platform powered by RSS/Atom/API sources. Search articles by keyword or vector similarity, filter by sentiment (positive / negative / neutral), and chat with the full article database via a RAG agentic pipeline. Add and manage sources with custom workflow types.',
    caps: ['RSS / Atom / API', 'Vector Search', 'Sentiment Filter', 'RAG Chat', 'Source Manager', 'Agentic Pipeline'],
    btnHref: 'http://newsintel.abnapps.in',
    btnLabel: 'Open NewsIntel',
    btnExternal: true,
    color: '#f59e0b',
    glowColor: 'rgba(245,158,11,.1)',
    iconBg: 'rgba(245,158,11,.11)',
    iconBorder: 'rgba(245,158,11,.25)',
  },
  {
    status: 'live',
    name: 'QD Employee Monitoring Ultimez Team Access Roles Admin Manager',
    tag: 'Team Management',
    title: 'QD Employee Monitoring',
    icon: '👥',
    desc: 'Ultimez team directory with role-based access control. View, manage, and filter all team members by role — Admin, Manager, and Employee. Track access levels and team structure across the Coinpedia platform.',
    caps: ['Role-based Access', 'Admin / Manager', 'Team Directory', 'Ultimez Team'],
    btnHref: '/admin/employees',
    btnLabel: 'Open Tool',
    color: '#10b981',
    glowColor: 'rgba(16,185,129,.1)',
    iconBg: 'rgba(16,185,129,.11)',
    iconBorder: 'rgba(16,185,129,.22)',
  },
  {
    status: 'dev',
    name: 'QD Community Analyst Sentiment Moderation Twitter',
    tag: 'Community',
    title: 'QD Community Analyst',
    icon: '💬',
    desc: "Community health dashboard backed by the CodeIgniter community manager panel. Tracks moderator activity, Twitter engagement, sentiment trends, and member growth across Coinpedia's social channels.",
    caps: ['Sentiment', 'Moderation', 'Twitter Intel', 'Growth Trends'],
    color: '#e879f9',
    glowColor: 'rgba(232,121,249,.1)',
    iconBg: 'rgba(232,121,249,.11)',
    iconBorder: 'rgba(232,121,249,.22)',
  },
  {
    status: 'dev',
    name: 'QD Markets Analyst Crypto Prices CoinGecko Whale',
    tag: 'Markets',
    title: 'QD Markets Analyst',
    icon: '📈',
    desc: 'Real-time crypto market intelligence powered by CoinGecko and CoinMarketCap feeds. Price trend analysis, volume anomaly detection, whale movement alerts, and narrative tracking for the editorial team.',
    caps: ['Price Feeds', 'Whale Alerts', 'Narratives', 'CoinGecko API'],
    color: '#ef4444',
    glowColor: 'rgba(239,68,68,.1)',
    iconBg: 'rgba(239,68,68,.11)',
    iconBorder: 'rgba(239,68,68,.25)',
  },
  {
    status: 'dev',
    name: 'QD Events Analyst Calendar Token Launch Conference',
    tag: 'Events',
    title: 'QD Events Analyst',
    icon: '🗓',
    desc: 'Crypto event calendar intelligence. Tracks conferences, token launches, protocol upgrades, and on-chain governance votes — with automated pre/post event coverage suggestions for the editorial team.',
    caps: ['Event Calendar', 'Coverage Suggest', 'On-chain Events'],
    color: '#f97316',
    glowColor: 'rgba(249,115,22,.1)',
    iconBg: 'rgba(249,115,22,.11)',
    iconBorder: 'rgba(249,115,22,.22)',
  },
  {
    status: 'dev',
    name: 'QD Regulations Tracker SEC MiCA Enforcement Policy',
    tag: 'Regulatory',
    title: 'QD Regulations Tracker',
    icon: '⚖️',
    desc: 'Global crypto regulatory intelligence. Monitors SEC, MiCA, MAS, and other regulatory bodies for enforcement actions, rulemaking, and policy shifts with jurisdiction-specific impact scoring.',
    caps: ['SEC / MiCA', 'Enforcement Log', 'Impact Score', 'Multi-jurisdiction'],
    color: '#64748b',
    glowColor: 'rgba(100,116,139,.1)',
    iconBg: 'rgba(100,116,139,.11)',
    iconBorder: 'rgba(100,116,139,.25)',
  },
  {
    status: 'dev',
    name: 'QD Image Video Builder Thumbnails Infographics Social Media',
    tag: 'Media Creation',
    title: 'QD Image & Video Builder',
    icon: '🎨',
    desc: 'AI-powered media generation for Coinpedia content teams. Creates thumbnails, infographics, social cards, and short explainer video clips from article data — consistent with Coinpedia brand guidelines.',
    caps: ['Thumbnails', 'Infographics', 'Social Cards', 'Video Clips'],
    color: '#ec4899',
    glowColor: 'rgba(236,72,153,.1)',
    iconBg: 'rgba(236,72,153,.11)',
    iconBorder: 'rgba(236,72,153,.22)',
  },
]

export default function QDToolsPage({ session }: { session: SessionPayload }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'live' | 'dev'>('all')

  function handleNav(key: string) {
    if (key.startsWith('qd-dev-')) router.push(`/admin/qd-dev/${key.slice(7)}`)
    else if (key.startsWith('bo-')) router.push(`/admin/backoffice?tab=${key}`)
    else router.push(`/admin/${key}`)
  }

  const filtered = TOOLS.filter(t => {
    const matchFilter = filter === 'all' || t.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const ArrowIcon = () => (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 11, height: 11 }}>
      <path d="M2 10L10 2M10 2H5M10 2v5" />
    </svg>
  )

  return (
    <PageShell
      panel="admin"
      session={session}
      navItems={ADMIN_NAV}
      activeKey="qd-dev-tools"
      onNav={handleNav}
      title="QD Tools"
    >
      <div style={{ padding: '32px 32px 80px', maxWidth: 1260, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.3)',
          borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700,
          color: 'var(--accent-c)', letterSpacing: '.6px', textTransform: 'uppercase',
          marginBottom: 18, fontFamily: 'var(--font-mono)',
        }}>
          <span style={{ width: 6, height: 6, background: 'var(--accent-c)', borderRadius: '50%', display: 'inline-block' }} />
          QD Intelligence Suite
        </div>

        <h1 style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 12, color: 'var(--text)' }}>
          <span style={{ background: 'linear-gradient(135deg,#6366f1,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            QD Tools
          </span>
          {' '}— Analyst Workspace
        </h1>

        <p style={{ color: 'var(--text3)', fontSize: 14, maxWidth: 560, lineHeight: 1.65, marginBottom: 22 }}>
          All of Coinpedia's AI-powered internal tools in one place — dev, company intelligence, professional profiles, news fact-checking, employee monitoring, and more.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 38 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text2)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            10 tools · 5 live
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>// coinpedia internal</span>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 34 }}>
          {[
            { icon: '🛠', num: 10, label: 'Total Tools' },
            { icon: '⚡', num: 5, label: 'Live' },
            { icon: '🔧', num: 5, label: 'In Development' },
            { icon: '🌐', num: 2, label: 'External Domains' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 38, height: 38, background: 'var(--bg3)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -1, lineHeight: 1, marginBottom: 2, color: 'var(--text)' }}>{s.num}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 12, pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              placeholder="Search tools…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text)', fontFamily: 'inherit', fontSize: 13,
                padding: '8px 12px 8px 34px', outline: 'none',
              }}
            />
          </div>
          {(['all', 'live', 'dev'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? 'rgba(99,102,241,.18)' : 'var(--bg2)',
                border: `1px solid ${filter === f ? '#6366f1' : 'var(--border)'}`,
                borderRadius: 8, color: filter === f ? '#6366f1' : 'var(--text3)',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                padding: '7px 13px', cursor: 'pointer',
              }}
            >
              {f === 'all' ? 'All' : f === 'live' ? 'Live' : 'In Development'}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
            {filtered.length} tool{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Section label */}
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          color: 'var(--text3)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          All tools
          <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 18 }}>
          {filtered.map((tool, i) => (
            <div
              key={tool.title}
              style={{
                background: tool.featured
                  ? 'linear-gradient(135deg,var(--bg2) 55%,var(--bg3))'
                  : 'var(--bg2)',
                border: `1px solid ${tool.featured ? 'rgba(99,102,241,.28)' : 'var(--border)'}`,
                borderRadius: 12, padding: 26, position: 'relative', overflow: 'hidden',
                display: 'flex', flexDirection: tool.featured ? 'row' : 'column',
                alignItems: tool.featured ? 'flex-start' : undefined,
                gap: tool.featured ? 26 : 14,
                gridColumn: tool.featured ? 'span 2' : undefined,
              }}
            >
              {/* Icon */}
              <div style={{
                width: tool.featured ? 66 : 50,
                height: tool.featured ? 66 : 50,
                borderRadius: tool.featured ? 16 : 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: tool.featured ? 28 : 21, flexShrink: 0,
                background: tool.iconBg, border: `1px solid ${tool.iconBorder}`,
              }}>
                {tool.icon}
              </div>

              {/* Body */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Meta */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.7px', textTransform: 'uppercase', color: tool.color, marginBottom: 3, fontFamily: 'var(--font-mono)' }}>
                    {tool.tag}
                  </div>
                  <div style={{ fontSize: tool.featured ? 20 : 16.5, fontWeight: 700, letterSpacing: -.3, lineHeight: 1.2, color: 'var(--text)' }}>
                    {tool.title}
                  </div>
                </div>

                {/* Desc */}
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
                  {tool.desc}
                </div>

                {/* Caps */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {tool.caps.map(c => (
                    <span key={c} style={{
                      background: 'var(--bg3)', border: '1px solid var(--border)',
                      borderRadius: 5, fontSize: 11, fontWeight: 500, color: 'var(--text2)',
                      padding: '2px 9px', fontFamily: 'var(--font-mono)',
                    }}>
                      {c}
                    </span>
                  ))}
                </div>

                {/* Sub-links */}
                {tool.subLinks && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {tool.subLinks.map(sl => (
                      <a key={sl.href} href={sl.href} style={{
                        fontSize: 12, color: sl.color, textDecoration: 'none', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: 'var(--bg3)', border: '1px solid var(--border)',
                        borderRadius: 6, padding: '4px 10px',
                      }}>
                        {sl.label}
                      </a>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderTop: '1px solid var(--border)', paddingTop: 13, marginTop: 'auto',
                }}>
                  {tool.status === 'live' ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '3px 10px',
                      background: 'rgba(16,185,129,.12)', color: '#10b981',
                      border: '1px solid rgba(16,185,129,.25)',
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                      Live
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '3px 10px',
                      background: 'rgba(245,158,11,.10)', color: '#f59e0b',
                      border: '1px solid rgba(245,158,11,.22)',
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                      In Development
                    </span>
                  )}

                  {tool.btnHref ? (
                    <a
                      href={tool.btnHref}
                      target={tool.btnExternal ? '_blank' : undefined}
                      rel={tool.btnExternal ? 'noopener noreferrer' : undefined}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                        background: 'transparent', border: '1px solid var(--border2)',
                        borderRadius: 7, color: 'var(--text2)', cursor: 'pointer',
                        padding: '5px 13px', textDecoration: 'none',
                      }}
                    >
                      {tool.btnLabel}
                      <ArrowIcon />
                    </a>
                  ) : (
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text3)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text3)', display: 'inline-block' }} />
                      Coming soon
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
