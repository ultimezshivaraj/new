'use client'
import { Button, CopyButton, ExportCsvButton, ApplyButton } from '../ui/Button'
import { PreviewShell, Section, Row } from './_preview-shell'
export default function ButtonPreview() {
  return (
    <PreviewShell title="Button" file="Button.tsx">
      <Section title="Variants"><Row><Button variant="primary">Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Delete</Button><Button variant="success">Approve</Button></Row></Section>
      <Section title="Sizes"><Row><Button variant="primary" size="sm">Small</Button><Button variant="primary" size="md">Medium</Button><Button variant="primary" size="lg">Large</Button></Row></Section>
      <Section title="States"><Row><Button variant="primary" loading>Saving…</Button><Button variant="primary" disabled>Disabled</Button></Row></Section>
      <Section title="Presets"><Row><CopyButton /><ExportCsvButton /><ApplyButton /></Row></Section>
      <Section title="Full width"><Button variant="primary" fullWidth>Submit Work Report</Button></Section>
    </PreviewShell>
  )
}
