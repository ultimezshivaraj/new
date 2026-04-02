'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/shared/PageShell'
import { ADMIN_NAV } from '@/components/admin/employees/EmployeeMonitoringPage'
import { SessionPayload } from '@/lib/session'

interface Endpoint {
  m: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  p: string
  d: string
  tag: '' | 'data'
  badge?: string
  btype?: 'warn' | 'new'
}

interface EndpointGroup {
  title: string
  endpoints: Endpoint[]
}

const GROUPS: EndpointGroup[] = [
  { title: 'Authentication', endpoints: [
    { m: 'POST', p: '/tm-api/token', d: 'Get JWT access token', tag: '' },
    { m: 'GET',  p: '/tm-api/agent/me', d: 'Current logged-in user profile', tag: '' },
  ]},
  { title: 'Employees (agents)', endpoints: [
    { m: 'GET',   p: '/tm-api/agent', d: 'List all employees', tag: 'data' },
    { m: 'GET',   p: '/tm-api/agent/:id', d: 'Get employee by ID', tag: 'data' },
    { m: 'GET',   p: '/tm-api/agent/:email', d: 'Get employee by email', tag: 'data', badge: '2024', btype: 'new' },
    { m: 'GET',   p: '/tm-api/agent/:id?fileds=f1,f2', d: 'Selective field fetch', tag: 'data', badge: 'typo: fileds', btype: 'warn' },
    { m: 'PATCH', p: '/tm-api/agent/:id', d: 'Update employee profile', tag: '' },
    { m: 'DELETE',p: '/tm-api/agent/:id', d: 'Delete employee', tag: '' },
  ]},
  { title: 'Computers', endpoints: [
    { m: 'GET', p: '/tm-api/computer', d: 'List all monitored computers', tag: 'data' },
    { m: 'GET', p: '/tm-api/computer/:id', d: 'Get computer by ID', tag: 'data' },
  ]},
  { title: 'Tasks (time tracking)', endpoints: [
    { m: 'GET', p: '/tm-api/v1/tasks', d: 'List all tasks', tag: 'data' },
    { m: 'GET', p: '/tm-api/v1/time-tracker/status', d: 'Time tracker status', tag: 'data' },
  ]},
  { title: 'Monitoring settings', endpoints: [
    { m: 'GET',  p: '/tm-api/monitoring-settings', d: 'List monitoring profiles', tag: 'data' },
    { m: 'POST', p: '/tm-api/monitoring-settings', d: 'Create monitoring profile', tag: '' },
  ]},
  { title: 'Behavior policies', endpoints: [
    { m: 'POST', p: '/tm-api/behavior-policy', d: 'Create behavior policy', tag: '' },
    { m: 'GET',  p: '/tm-api/behavior-policy', d: 'List behavior policies', tag: 'data' },
  ]},
  { title: 'Dashboards', endpoints: [
    { m: 'GET', p: '/tm-api/dashboards', d: 'List dashboards', tag: 'data' },
    { m: 'GET', p: '/tm-api/dashboards/:id', d: 'Get full dashboard entity', tag: 'data' },
  ]},
  { title: 'LDAP / Active Directory', endpoints: [
    { m: 'GET',  p: '/tm-api/ldap/groups/content', d: 'List AD LDAP groups', tag: 'data' },
    { m: 'POST', p: '/tm-api/ldap/groups/content', d: 'Update LDAP group', tag: '' },
    { m: 'GET',  p: '/tm-api/ldap/:server_id/attr', d: 'Get LDAP attributes', tag: 'data' },
    { m: 'POST', p: '/tm-api/ldap/:server_id/attr', d: 'Add/update LDAP attributes', tag: '' },
  ]},
  { title: 'Data search (Elasticsearch / mining)', endpoints: [
    { m: 'POST', p: '/tm-api/elastic-search-screen', d: 'Search screen records in Elasticsearch', tag: 'data', badge: 'KEY ENDPOINT', btype: 'new' },
    { m: 'POST', p: '/tm-api/mining-data/search', d: 'Search OCR / mining data', tag: 'data' },
  ]},
  { title: 'Agent downloads', endpoints: [
    { m: 'GET', p: '/tm-api/download/links', d: 'Agent download links (all platforms)', tag: 'data', badge: '?fullPaths=true', btype: 'warn' },
  ]},
  { title: 'Notifications / scheduling', endpoints: [
    { m: 'GET', p: '/tm-api/send-schedule', d: 'Send schedule notification email', tag: '' },
    { m: 'GET', p: '/tm-api/send-instructions', d: 'Send agent instructions', tag: '' },
  ]},
]

type FilterKey = 'all' | 'GET' | 'POST' | 'PATCH' | 'data'

function methodStyle(m: string): React.CSSProperties {
  const styles: Record<string, React.CSSProperties> = {
    GET:    { background: '#EEF4FF', color: '#1D6EE8', border: '1px solid #C2D5FF' },
    POST:   { background: '#EDFAF4', color: '#0F7B4F', border: '1px solid #A8E8CB' },
    PATCH:  { background: '#FFF4E8', color: '#A0560A', border: '1px solid #F6CF9A' },
    DELETE: { background: '#FEF0F2', color: '#C0142B', border: '1px solid #F9B9C2' },
  }
  return styles[m] || styles.GET
}

function fmtPath(p: string): React.ReactNode[] {
  const parts = p.split(/(:[a-zA-Z_]+|\?[^?]+)/)
  return parts.map((part, i) => {
    if (part.startsWith(':')) return <span key={i} style={{ color: '#00C2ED' }}>{part}</span>
    if (part.startsWith('?')) return <span key={i} style={{ color: '#6B7189' }}>{part}</span>
    return <span key={i}>{part}</span>
  })
}

export default function APIEndpointsPage({ session }: { session: SessionPayload }) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>('all')

  function handleNav(key: string) {
    if (key.startsWith('qd-dev-')) router.push(`/admin/qd-dev/${key.slice(7)}`)
    else if (key.startsWith('bo-')) router.push(`/admin/backoffice?tab=${key}`)
    else router.push(`/admin/${key}`)
  }

  const visibleGroups = useMemo(() => {
    return GROUPS.map(g => {
      const rows = g.endpoints.filter(e => {
        if (filter === 'all') return true
        if (filter === 'data') return e.tag === 'data'
        if (filter === 'PATCH') return e.m === 'PATCH' || e.m === 'DELETE'
        return e.m === filter
      })
      return { ...g, endpoints: rows }
    }).filter(g => g.endpoints.length > 0)
  }, [filter])

  const allRows = visibleGroups.flatMap(g => g.endpoints)
  const stats = {
    total: allRows.length,
    get: allRows.filter(e => e.m === 'GET').length,
    post: allRows.filter(e => e.m === 'POST').length,
    other: allRows.filter(e => e.m === 'PATCH' || e.m === 'DELETE').length,
    data: allRows.filter(e => e.tag === 'data').length,
  }

  const filterButtons: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'GET', label: 'GET' },
    { key: 'POST', label: 'POST' },
    { key: 'PATCH', label: 'PATCH / DELETE' },
    { key: 'data', label: 'Data sync only' },
  ]

  return (
    <PageShell
      panel="admin"
      session={session}
      navItems={ADMIN_NAV}
      activeKey="qd-dev-api"
      onNav={handleNav}
      title="API Endpoints"
    >
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 32px 64px' }}>

        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg,#F0F2FF 0%,#FBF0FF 50%,#F0FAFF 100%)',
          borderBottom: '1px solid var(--border)', padding: '36px 0 28px', marginBottom: 28,
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em',
            textTransform: 'uppercase', color: '#00C2ED', background: '#fff',
            padding: '3px 10px', borderRadius: 100, border: '1px solid #C5EEFA', marginBottom: 12,
          }}>
            QD Expecting Data · Doc 1 of 4
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -.02*26, color: 'var(--text)', marginBottom: 6 }}>
            Teramind{' '}
            <span style={{ background: 'linear-gradient(90deg,#0003AA,#6A0A5C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              API Endpoints
            </span>
          </h1>
          <p style={{ fontSize: 13, color: '#6B7189', maxWidth: 600, lineHeight: 1.6, marginBottom: 16 }}>
            Every confirmed API endpoint extracted from Teramind's Knowledge Base and release notes. DevOps needs to supply the access token and instance URL. Dev team uses these routes to build the sync service feeding BigQuery.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { color: '#1D6EE8', label: 'Confirmed from KB' },
              { color: '#0F7B4F', label: 'Auth: x-access-token header' },
              { color: '#00C2ED', label: 'Last updated Mar 2026' },
            ].map(b => (
              <span key={b.label} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px',
                background: '#fff', border: '1px solid #E2E5EE', borderRadius: 100,
                fontSize: 11, color: '#6B7189', fontFamily: 'var(--font-mono)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: b.color, display: 'inline-block' }} />
                {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* DevOps note */}
        <div style={{
          display: 'flex', gap: 12, padding: '14px 16px',
          background: '#EEF7FF', border: '1px solid #BDD9F8', borderRadius: 10,
          marginBottom: 24, fontSize: 12, color: '#1D5490', lineHeight: 1.6,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>🔧</span>
          <div>
            <strong>DevOps must provide:</strong> Teramind instance subdomain (e.g.{' '}
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: '#D6EAFC', padding: '1px 6px', borderRadius: 4 }}>acme.teramind.co</code>
            ) and an access token created at <strong>Administrator menu → Access Tokens</strong>. Token inherits the access level of the creating admin. Store as{' '}
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: '#D6EAFC', padding: '1px 6px', borderRadius: 4 }}>TERAMIND_INSTANCE</code>
            {' '}and{' '}
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: '#D6EAFC', padding: '1px 6px', borderRadius: 4 }}>TERAMIND_TOKEN</code>
            {' '}environment variables on Vercel.
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
          gap: 1, background: '#E2E5EE', border: '1px solid #E2E5EE',
          borderRadius: 10, overflow: 'hidden', marginBottom: 20,
        }}>
          {[
            { num: stats.total, label: 'Endpoints', color: '#0003AA' },
            { num: stats.get,   label: 'GET',        color: '#1D6EE8' },
            { num: stats.post,  label: 'POST',       color: '#0F7B4F' },
            { num: stats.other, label: 'PATCH/DELETE', color: '#A0560A' },
            { num: stats.data,  label: 'Data sync',  color: '#00C2ED' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', padding: '12px 14px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: -.02*20, color: s.color }}>{s.num}</div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9CA3B8', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#9CA3B8', fontFamily: 'var(--font-mono)', marginRight: 4 }}>Filter:</span>
          {filterButtons.map(fb => (
            <button
              key={fb.key}
              onClick={() => setFilter(fb.key)}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, padding: '4px 12px', borderRadius: 100,
                border: `1px solid ${filter === fb.key ? '#0003AA' : '#C8CCDB'}`,
                background: filter === fb.key ? '#0003AA' : '#fff',
                color: filter === fb.key ? '#fff' : '#6B7189',
                cursor: 'pointer', fontWeight: filter === fb.key ? 500 : 400,
              }}
            >
              {fb.label}
            </button>
          ))}
        </div>

        {/* Endpoint groups */}
        {visibleGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9CA3B8', fontFamily: 'var(--font-mono)', fontSize: 12, border: '1px dashed #E2E5EE', borderRadius: 10 }}>
            No endpoints match this filter
          </div>
        ) : (
          visibleGroups.map(g => (
            <div key={g.title} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: '#9CA3B8' }}>{g.title}</span>
                <div style={{ flex: 1, height: 1, background: '#E2E5EE' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 7px', borderRadius: 100, background: '#F1F3F8', color: '#6B7189' }}>{g.endpoints.length}</span>
              </div>
              {g.endpoints.map((e, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px',
                  background: '#fff', border: '1px solid #E2E5EE', borderRadius: 10,
                  marginBottom: 4,
                }}>
                  {e.tag === 'data' && (
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00C2ED', flexShrink: 0, opacity: .7, display: 'inline-block' }} />
                  )}
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                    padding: '3px 8px', borderRadius: 6, minWidth: 52, textAlign: 'center',
                    letterSpacing: '.04em', flexShrink: 0, ...methodStyle(e.m),
                  }}>
                    {e.m}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#1A1D2E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fmtPath(e.p)}
                    {e.badge && (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 7px', borderRadius: 100,
                        marginLeft: 6, letterSpacing: '.03em',
                        ...(e.btype === 'new'
                          ? { background: '#EDFAF4', color: '#0F7B4F', border: '1px solid #A8E8CB' }
                          : { background: '#FFF4E8', color: '#A0560A', border: '1px solid #F6CF9A' }),
                      }}>
                        {e.badge}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 12, color: '#6B7189', textAlign: 'right', flexShrink: 0, maxWidth: 210 }}>{e.d}</span>
                </div>
              ))}
            </div>
          ))
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #E2E5EE', paddingTop: 20, marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#9CA3B8' }}>Teramind API · Confirmed · qd_teramind BigQuery dataset</span>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { href: '/admin/qd-dev/fields', label: 'Fields Reference →' },
              { href: '/admin/qd-dev/planner', label: 'Page Planner →' },
              { href: '/admin/qd-dev/setup', label: 'Setup Guide →' },
            ].map(l => (
              <a key={l.href} href={l.href} style={{ fontSize: 11, color: '#6B7189', textDecoration: 'none' }}>{l.label}</a>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
