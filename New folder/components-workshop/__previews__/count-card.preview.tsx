'use client'
import { CountCard, CountCardMulti } from '../ui/cards/index'
import { PreviewShell, Section } from './_preview-shell'
export default function CountCardPreview() {
  return (
    <PreviewShell title="CountCard" file="cards/index.tsx">
      <Section title="6-up stat grid">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <CountCard label="Total Employees" value="24" subLabel="All records" variant="total" />
          <CountCard label="Enabled Accounts" value="20" subLabel="login_status = 1" variant="enabled" />
          <CountCard label="Active Today" value="17" subLabel="Logged in today" variant="active" />
          <CountCard label="With Reports" value="15" subLabel="Have work data" variant="online" />
          <CountCard label="Alerts Today" value="1" subLabel="Flagged employees" variant="alerts" />
          <CountCard label="Avg Productivity" value="68%" subLabel="From work reports" variant="productive" />
        </div>
      </Section>
      <Section title="CountCardMulti — inline chips">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <CountCardMulti value="38" label="Records Shown" color="#6366f1" />
          <CountCardMulti value="31" label="With Report" color="#22c55e" />
          <CountCardMulti value="7" label="No Report" color="#f59e0b" />
          <CountCardMulti value="68%" label="Avg Productivity" color="#06b6d4" />
        </div>
      </Section>
    </PreviewShell>
  )
}
