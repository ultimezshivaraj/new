'use client'
import { ReportCard, SummaryCountTable, TrainingPathCard } from '../ui/cards/index'
import { Button } from '../ui/Button'
import { PreviewShell, Section } from './_preview-shell'

// ── ReportCard
export function ReportCardPreview() {
  return (
    <PreviewShell title="ReportCard" file="cards/index.tsx">
      <Section title="With nested SummaryCountTable">
        <ReportCard title="Work Reports" subtitle="newultimez_team_tbl_employees_work_reports" meta="38,171 rows" status="success" statusLabel="LIVE">
          <SummaryCountTable rows={[{ label: 'Total Active Days', value: '22', color: '#22c55e' }, { label: 'Avg Productivity', value: '68%', color: '#f59e0b' }, { label: 'High Performers', value: '9', color: '#06b6d4' }, { label: 'Low Performers', value: '3', color: '#ef4444' }]} />
        </ReportCard>
      </Section>
      <Section title="Warning status"><ReportCard title="IP Monitor" subtitle="Shared IP alerts" meta="3 alerts" status="warning" statusLabel="NEEDS REVIEW" /></Section>
    </PreviewShell>
  )
}

// ── SummaryCountTable
export function SummaryCountTablePreview() {
  return (
    <PreviewShell title="SummaryCountTable" file="cards/index.tsx">
      <Section title="With title">
        <div style={{ maxWidth: 340 }}>
          <SummaryCountTable title="March 2026 Overview" rows={[{ label: 'Total Employees', value: '24' }, { label: 'Active Today', value: '17', color: '#22c55e' }, { label: 'Avg Productivity', value: '68%', color: '#f59e0b' }, { label: 'Flagged Alerts', value: '1', color: '#ef4444' }]} />
        </div>
      </Section>
    </PreviewShell>
  )
}

// ── TrainingPathCard
export function TrainingPathCardPreview() {
  return (
    <PreviewShell title="TrainingPathCard" file="cards/index.tsx">
      <Section title="Academy courses">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <TrainingPathCard title="Crypto Fundamentals" description="Blockchain essentials for new analysts" progress={65} totalLessons={12} completedLessons={8} tag="Academy Junior" actions={<Button variant="primary" size="sm">Continue</Button>} />
          <TrainingPathCard title="DeFi & Protocols" description="Deep dive into decentralised finance" progress={30} totalLessons={18} completedLessons={5} tag="Academy Senior" actions={<Button variant="primary" size="sm">Start</Button>} />
          <TrainingPathCard title="SEO & Content Strategy" description="Writing for crypto audiences" progress={100} totalLessons={8} completedLessons={8} tag="Mandatory" />
          <TrainingPathCard title="Internal Tooling" description="How to use the QD Dashboard" progress={15} totalLessons={6} completedLessons={1} tag="Onboarding" />
        </div>
      </Section>
    </PreviewShell>
  )
}

// Default export for router: we only need one per file, so point to ReportCard
export default ReportCardPreview
