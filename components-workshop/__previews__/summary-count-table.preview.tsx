'use client'
import { SummaryCountTable } from '../ui/cards/index'
import { PreviewShell, Section } from './_preview-shell'
export default function SummaryCountTablePreview() {
  return (
    <PreviewShell title="SummaryCountTable" file="cards/index.tsx">
      <Section title="With title">
        <div style={{ maxWidth: 340 }}>
          <SummaryCountTable title="March 2026 Overview" rows={[{ label: 'Total Employees', value: '24' }, { label: 'Active Today', value: '17', color: '#22c55e' }, { label: 'Avg Productivity', value: '68%', color: '#f59e0b' }, { label: 'High Performers', value: '9', color: '#06b6d4' }, { label: 'Flagged Alerts', value: '1', color: '#ef4444' }]} />
        </div>
      </Section>
      <Section title="Without title">
        <div style={{ maxWidth: 300 }}>
          <SummaryCountTable rows={[{ label: 'BigQuery Tables', value: '100' }, { label: 'Datasets', value: '29' }, { label: 'ML Models', value: '2', color: '#6366f1' }]} />
        </div>
      </Section>
    </PreviewShell>
  )
}
