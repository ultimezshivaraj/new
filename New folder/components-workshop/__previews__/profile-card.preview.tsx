'use client'
import { ProfileCard } from '../ui/cards/index'
import { Button } from '../ui/Button'
import { PreviewShell, Section } from './_preview-shell'
export default function ProfileCardPreview() {
  return (
    <PreviewShell title="ProfileCard" file="cards/index.tsx">
      <Section title="With meta and actions">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <ProfileCard name="Priya Sharma" role="Senior Author" department="Content" initials="PS" status="success" statusLabel="Active" meta={{ Joined: '2023-06-01', Articles: '412', 'Avg Prod': '82%', Location: 'Mumbai' }} actions={<><Button variant="secondary" size="sm">View</Button><Button variant="primary" size="sm">Message</Button></>} />
          <ProfileCard name="Rahul Mehta" role="Full-Stack Developer" department="Technology" initials="RM" status="warning" statusLabel="On Leave" meta={{ Joined: '2022-03-14', PRs: '89', 'Avg Prod': '71%', Location: 'Bangalore' }} actions={<><Button variant="secondary" size="sm">View</Button></>} />
        </div>
      </Section>
      <Section title="Minimal">
        <div style={{ maxWidth: 320 }}><ProfileCard name="Anita Patel" role="Editor" initials="AP" status="danger" statusLabel="Inactive" /></div>
      </Section>
    </PreviewShell>
  )
}
