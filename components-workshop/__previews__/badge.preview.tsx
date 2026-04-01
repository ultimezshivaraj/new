'use client'
import { Badge, OfficeBadge, SharedBadge, OkBadge, IPv4Badge, IPv6Badge } from '../ui/Badge'
import { PreviewShell, Section, Row } from './_preview-shell'
export default function BadgePreview() {
  return (
    <PreviewShell title="Badge" file="Badge.tsx">
      <Section title="Status variants"><Row><Badge variant="success">Active</Badge><Badge variant="warning">Pending</Badge><Badge variant="danger">Rejected</Badge><Badge variant="info">Enabled</Badge><Badge variant="accent">Premium</Badge><Badge variant="muted">Disabled</Badge></Row></Section>
      <Section title="With dot indicator"><Row><Badge variant="success" dot>Online</Badge><Badge variant="warning" dot>Pending</Badge><Badge variant="danger" dot>Flagged</Badge></Row></Section>
      <Section title="Pill shape"><Row><Badge variant="success" pill>Active</Badge><Badge variant="danger" pill mono>🚨 Alert</Badge><Badge variant="info" pill mono>ℹ Info</Badge></Row></Section>
      <Section title="Sizes"><Row><Badge variant="accent" size="sm">Small</Badge><Badge variant="accent" size="md">Medium</Badge></Row></Section>
      <Section title="Preset variants"><Row><OfficeBadge /><SharedBadge /><OkBadge /><IPv4Badge /><IPv6Badge /></Row></Section>
    </PreviewShell>
  )
}
