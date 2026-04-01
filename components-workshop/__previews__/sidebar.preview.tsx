'use client'
import { useState } from 'react'
import { Sidebar, TopBar, MainLayout, LiveClock, CollapseToggle, type NavGroup } from '../ui/layout/index'
import { DateChip } from '../ui/misc'
import { PreviewShell, Section } from './_preview-shell'
import { colors } from '../lib/theme'
const NAV: NavGroup[] = [
  { items: [{ icon: '◈', label: 'Dashboard', href: '#' }] },
  { label: 'People', items: [{ icon: '◉', label: 'Employees', active: true, sub: [{ label: 'Employee List', active: true }, { label: 'Work Monitoring' }] }, { icon: '♡', label: 'HR Module' }] },
  { label: 'Content', items: [{ icon: '⬡', label: 'Companies' }, { icon: '✦', label: 'Articles' }] },
  { label: 'Developer', items: [{ icon: '⌥', label: 'QD Dev' }, { icon: '⚙', label: 'QD Tools' }] },
]
export default function SidebarPreview() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <PreviewShell title="Sidebar + TopBar + MainLayout" file="layout/index.tsx">
      <Section title="Full layout (interactive — click Collapse)">
        <div style={{ height: 520, display: 'flex', overflow: 'hidden', borderRadius: 10, border: `1px solid ${colors.border}` }}>
          <MainLayout
            containerStyle={{ padding: 24 }}
            sidebar={
              <Sidebar groups={NAV} collapsed={collapsed} bottom={<><LiveClock collapsed={collapsed} /><CollapseToggle collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} /></>} />
            }
            topBar={<TopBar breadcrumb={[{ label: 'Ultimez' }]} activePage="Employees" right={<DateChip>Sunday, 29 March 2026</DateChip>} />}
          >
            <div style={{ color: colors.muted, fontSize: 13, fontFamily: 'var(--mono)' }}>← Toggle sidebar with Collapse button at bottom left.</div>
          </MainLayout>
        </div>
      </Section>
    </PreviewShell>
  )
}
