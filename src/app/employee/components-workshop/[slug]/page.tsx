import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'

// Maps each slug → its preview file in components-workshop/__previews__/
// Add a new entry here when you add a new component.
const PREVIEWS: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  'badge':               () => import('@/components-workshop/__previews__/badge.preview'),
  'button':              () => import('@/components-workshop/__previews__/button.preview'),
  'count-card':          () => import('@/components-workshop/__previews__/count-card.preview'),
  'profile-card':        () => import('@/components-workshop/__previews__/profile-card.preview'),
  'report-card':         () => import('@/components-workshop/__previews__/report-card.preview'),
  'summary-count-table': () => import('@/components-workshop/__previews__/summary-count-table.preview'),
  'training-path-card':  () => import('@/components-workshop/__previews__/training-path-card.preview'),
  'filter-bar':          () => import('@/components-workshop/__previews__/filter-bar.preview'),
  'forms':               () => import('@/components-workshop/__previews__/forms.preview'),
  'table':               () => import('@/components-workshop/__previews__/table.preview'),
  'tabs':                () => import('@/components-workshop/__previews__/tabs.preview'),
  'sidebar':             () => import('@/components-workshop/__previews__/sidebar.preview'),
  'misc':                () => import('@/components-workshop/__previews__/misc.preview'),
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  return { title: `Workshop · ${slug} — QD Dashboard` }
}

export default async function PreviewPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const loader = PREVIEWS[slug]
  if (!loader) notFound()
  const { default: Preview } = await loader()

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d14' }}>

      {/* Breadcrumb bar */}
      <div style={{
        background: '#0f1320',
        borderBottom: '1px solid #1e2a45',
        padding: '0 24px',
        height: 44,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        fontFamily: 'monospace',
        fontSize: 12,
      }}>
        <Link
          href="/employee/components-workshop"
          style={{ color: '#64748b', textDecoration: 'none' }}
        >
          ← Workshop
        </Link>
        <span style={{ color: '#263354' }}>›</span>
        <span style={{ color: '#e2e8f0' }}>{slug}</span>
        <span style={{
          marginLeft: 'auto',
          padding: '1px 7px',
          borderRadius: 4,
          background: '#151b2e',
          color: '#334155',
          fontSize: 10,
        }}>
          components-workshop/ui/
        </span>
      </div>

      {/* Live component output */}
      <Preview />
    </div>
  )
}
