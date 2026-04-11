'use client'
import { useState } from 'react'
import { TabBar, MainTab, SubTabBar, SubTab, CustomSubTab, PageSwitcher, TabPanel } from '../ui/tabs/index'
import { PreviewShell, Section } from './_preview-shell'
import { colors } from '../lib/theme'
export default function TabsPreview() {
  const [main, setMain]   = useState('active_today')
  const [sub, setSub]     = useState('today')
  const [page, setPage]   = useState('emp')
  const [custom, setCustom] = useState('overview')
  return (
    <PreviewShell title="Tabs" file="tabs/index.tsx">
      <Section title="MainTab — coloured count badges">
        <TabBar>
          <MainTab label="Active Today" icon="🟢" count={17} color="green"  active={main === 'active_today'}  onClick={() => setMain('active_today')} />
          <MainTab label="Enabled"      icon="●"  count={20} color="blue"   active={main === 'enabled'}       onClick={() => setMain('enabled')} />
          <MainTab label="Ex Employees" icon="✕"  count={4}  color="red"    active={main === 'ex_employees'}  onClick={() => setMain('ex_employees')} />
          <MainTab label="All"          icon="◎"  count={24} color="accent" active={main === 'all'}           onClick={() => setMain('all')} />
        </TabBar>
      </Section>
      <Section title="SubTab — underline style">
        <SubTabBar>
          {[{ k: 'today', l: '⚡ Today' }, { k: 'trends', l: '📈 30-day Trends' }, { k: 'appweb', l: '💻 App & Web' }, { k: 'alerts', l: '⚠ Alerts' }, { k: 'ip', l: '🔐 IP Monitor' }].map(t => (
            <SubTab key={t.k} label={t.l} active={sub === t.k} onClick={() => setSub(t.k)} />
          ))}
        </SubTabBar>
      </Section>
      <Section title="PageSwitcher — toggle views">
        <PageSwitcher options={[{ value: 'emp', label: '👥 Employee List' }, { value: 'work', label: '📊 Work Monitoring' }]} value={page} onChange={setPage} />
      </Section>
      <Section title="CustomSubTab — sidebar sub-nav style">
        <div style={{ maxWidth: 200, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[{ k: 'overview', l: 'Overview' }, { k: 'reports', l: 'Work Reports' }, { k: 'attendance', l: 'Attendance' }, { k: 'alerts', l: 'Alerts' }].map(t => (
            <CustomSubTab key={t.k} label={t.l} active={custom === t.k} onClick={() => setCustom(t.k)} />
          ))}
        </div>
      </Section>
      <Section title="TabPanel — conditional content">
        <TabBar style={{ marginBottom: 16 }}>
          <MainTab label="Panel A" color="accent" active={page === 'emp'}  onClick={() => setPage('emp')} />
          <MainTab label="Panel B" color="blue"   active={page === 'work'} onClick={() => setPage('work')} />
        </TabBar>
        <TabPanel active={page === 'emp'}><div  style={{ padding: 16, background: colors.bg3, borderRadius: 8, fontSize: 13, color: colors.muted }}>Content for Panel A</div></TabPanel>
        <TabPanel active={page === 'work'}><div style={{ padding: 16, background: colors.bg3, borderRadius: 8, fontSize: 13, color: colors.muted }}>Content for Panel B</div></TabPanel>
      </Section>
    </PreviewShell>
  )
}
