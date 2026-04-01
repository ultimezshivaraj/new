'use client'

import Link from 'next/link'
import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY — add a new entry here whenever you add a component to the workshop.
//
// status:
//   'draft'    → UX/UI team actively iterating
//   'review'   → ready for dev team review
//   'approved' → copy to live pages, open a "promote:" PR
// ─────────────────────────────────────────────────────────────────────────────

type Status = 'draft' | 'review' | 'approved'

interface Entry {
  slug: string
  name: string
  category: string
  status: Status
  description: string
  phpSource: string
}

const REGISTRY: Entry[] = [
  { slug: 'badge',               name: 'Badge',               category: 'Primitives',  status: 'approved', description: 'Status labels, IP type flags, OFFICE / SHARED / OK presets.',                                   phpSource: 'views/components/badge.php'             },
  { slug: 'button',              name: 'Button',              category: 'Primitives',  status: 'approved', description: '5 variants · 3 sizes · loading state · icon slots · preset buttons.',                          phpSource: 'views/components/button.php'            },
  { slug: 'count-card',         name: 'CountCard',           category: 'Cards',       status: 'approved', description: '6-up stat grid with coloured accent stripe per variant.',                                        phpSource: 'views/components/cards/count_cards.php' },
  { slug: 'profile-card',       name: 'ProfileCard',         category: 'Cards',       status: 'review',   description: 'Avatar + role + department + status badge + meta key-value grid + actions.',                    phpSource: 'views/components/cards/profile_cards.php'},
  { slug: 'report-card',        name: 'ReportCard',          category: 'Cards',       status: 'review',   description: 'Titled card shell with header, status badge, meta chip, and content slot.',                     phpSource: 'views/components/cards/report_card.php' },
  { slug: 'summary-count-table',name: 'SummaryCountTable',   category: 'Cards',       status: 'approved', description: 'Compact label → value table used in analytics side panels.',                                    phpSource: 'views/components/cards/summary_count_table.php'},
  { slug: 'training-path-card', name: 'TrainingPathCard',    category: 'Cards',       status: 'draft',    description: 'Course card with animated progress bar, lesson count, and tag.',                                phpSource: 'views/components/cards/trainingpath_card.php'},
  { slug: 'filter-bar',         name: 'FilterBar',           category: 'Filters',     status: 'review',   description: 'FilterWrapper · SearchFilter · SelectFilter · DateRangeFilter (+ presets) · ClearAll.',        phpSource: 'views/components/filter/'               },
  { slug: 'forms',              name: 'Forms',               category: 'Forms',       status: 'draft',    description: 'FormWrapper · TextInput · Textarea · SelectInput · Checkbox · FileInput · DatetimeInput.',      phpSource: 'views/components/forms/'                },
  { slug: 'table',              name: 'Table',               category: 'Table',       status: 'approved', description: 'Sortable TableHead · TableBody · Tr · Td · RankNum · TableProgress · ProductivityPill · Pagination.', phpSource: 'views/components/table/'           },
  { slug: 'tabs',               name: 'Tabs',                category: 'Navigation',  status: 'approved', description: 'TabBar · MainTab (count badges, 6 colour variants) · SubTab · PageSwitcher · CustomSubTab.',   phpSource: 'views/components/tabs/'                 },
  { slug: 'sidebar',            name: 'Sidebar',             category: 'Layout',      status: 'review',   description: 'Collapsible sidebar — nav groups, sub-items, live IST clock, collapse toggle.',                 phpSource: 'views/dash_menu_bar.php'                },
  { slug: 'misc',               name: 'Misc Utilities',      category: 'Utilities',   status: 'draft',    description: 'AlertInfoMessage · QueryBox · MembersGroup · Tags · AccordionBlock · MediaObject · NoDataMessage.', phpSource: 'views/components/misc.tsx'          },
]

const STATUS_CFG: Record<Status, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Draft',      color: '#f59e0b', bg: '#78350f' },
  review:   { label: 'In Review',  color: '#3b82f6', bg: '#1e3a8a' },
  approved: { label: 'Approved',   color: '#22c55e', bg: '#14532d' },
}

const CATEGORIES = ['All', ...Array.from(new Set(REGISTRY.map(r => r.category)))]

export default function WorkshopPage() {
  const [cat, setCat]     = useState('All')
  const [query, setQuery] = useState('')

  const visible = REGISTRY.filter(c =>
    (cat === 'All' || c.category === cat) &&
    `${c.name} ${c.description}`.toLowerCase().includes(query.toLowerCase())
  )

  const counts = {
    draft:    REGISTRY.filter(r => r.status === 'draft').length,
    review:   REGISTRY.filter(r => r.status === 'review').length,
    approved: REGISTRY.filter(r => r.status === 'approved').length,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d14', fontFamily: "'DM Sans', sans-serif", color: '#e2e8f0' }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header style={{ background: '#0f1320', borderBottom: '1px solid #1e2a45', padding: '0 32px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: '#fff' }}>QD</div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Component Workshop</span>
          <span style={{ padding: '2px 8px', borderRadius: 4, background: '#78350f', color: '#f59e0b', border: '1px solid #f59e0b', fontSize: 9, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1px' }}>UX / UI TEAM</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {(Object.entries(counts) as [Status, number][]).map(([k, n]) => {
            const s = STATUS_CFG[k]
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'monospace' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />
                <span style={{ color: '#64748b' }}>{s.label}</span>
                <span style={{ color: s.color, fontWeight: 700 }}>{n}</span>
              </div>
            )
          })}
        </div>
      </header>

      <main style={{ padding: '36px 32px', maxWidth: 1280, margin: '0 auto' }}>

        {/* ── Heading ──────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>Component Library</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>
            UX/UI team works in{' '}
            <code style={{ color: '#f59e0b', fontFamily: 'monospace', fontSize: 12 }}>components-workshop/ui/</code>
            . Once approved, the component goes live in the existing pages.
          </p>
        </div>

        {/* ── Search + category filter ──────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 280, flexShrink: 0 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 14, pointerEvents: 'none' }}>⌕</span>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search components…"
              style={{ width: '100%', background: '#151b2e', border: '1px solid #263354', borderRadius: 8, padding: '8px 12px 8px 34px', color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCat(c)} style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${cat === c ? '#6366f1' : '#263354'}`, background: cat === c ? '#6366f1' : '#151b2e', color: cat === c ? '#fff' : '#64748b', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                {c}
              </button>
            ))}
          </div>
          <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 11, color: '#334155' }}>{visible.length} / {REGISTRY.length}</span>
        </div>

        {/* ── Grid ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16, marginBottom: 44 }}>
          {visible.map(comp => {
            const s = STATUS_CFG[comp.status]
            return (
              <Link key={comp.slug} href={`/employee/components-workshop/${comp.slug}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{ background: '#111827', border: '1px solid #1e2a45', borderRadius: 10, padding: '18px 20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, height: '100%', transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#6366f1'; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 28px rgba(99,102,241,0.18)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#1e2a45'; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#334155', marginBottom: 5 }}>{comp.category}</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0' }}>{comp.name}</div>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color, border: `1px solid ${s.color}`, fontSize: 9, fontFamily: 'monospace', fontWeight: 700, flexShrink: 0 }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.65, flex: 1 }}>{comp.description}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#334155', borderTop: '1px solid #1e2a45', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span>← {comp.phpSource}</span>
                    <span style={{ color: '#6366f1' }}>Preview →</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* ── Promote guide ──────────────────────────────────────────────── */}
        <div style={{ background: '#151b2e', border: '1px solid #263354', borderRadius: 12, padding: '22px 26px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>🚀 How to use a component in the live app</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { n: '1', t: 'Iterate here',  b: 'Edit files in components-workshop/ui/ and preview at this URL.' },
              { n: '2', t: 'Approve it',    b: 'Set status: "approved" in the REGISTRY at the top of this file.' },
              { n: '3', t: 'Import it',     b: 'Copy the component into the relevant page or shared file in the live app.' },
              { n: '4', t: 'Open a PR',     b: 'Title: "promote: ComponentName" — merge to main → Vercel redeploys.' },
            ].map(step => (
              <div key={step.n} style={{ background: '#111827', border: '1px solid #1e2a45', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#6366f1', fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>STEP {step.n}</div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{step.t}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.55 }}>{step.b}</div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}
