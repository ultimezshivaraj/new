'use client'
import { TrainingPathCard } from '../ui/cards/index'
import { Button } from '../ui/Button'
import { PreviewShell, Section } from './_preview-shell'
export default function TrainingPathCardPreview() {
  return (
    <PreviewShell title="TrainingPathCard" file="cards/index.tsx">
      <Section title="Academy courses">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <TrainingPathCard title="Crypto Fundamentals" description="Blockchain essentials" progress={65} totalLessons={12} completedLessons={8} tag="Junior" actions={<Button variant="primary" size="sm">Continue</Button>} />
          <TrainingPathCard title="DeFi & Protocols" description="Deep dive into DeFi" progress={30} totalLessons={18} completedLessons={5} tag="Senior" actions={<Button variant="primary" size="sm">Start</Button>} />
          <TrainingPathCard title="SEO & Content" description="Writing for crypto" progress={100} totalLessons={8} completedLessons={8} tag="Mandatory" />
          <TrainingPathCard title="Internal Tooling" description="How to use QD Dashboard" progress={15} totalLessons={6} completedLessons={1} tag="Onboarding" />
        </div>
      </Section>
    </PreviewShell>
  )
}
