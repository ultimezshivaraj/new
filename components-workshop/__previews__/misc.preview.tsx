'use client'
import { Breadcrumb, ContentHeader, SectionTitle, Status, Tags, AccordionBlock, MediaObject, MembersGroup, AlertInfoMessage, DateChip, NoDataMessage, QueryBox, ProfileActionButton } from '../ui/misc'
import { Button } from '../ui/Button'
import { PreviewShell, Section, Row } from './_preview-shell'
const SQL = `SELECT e.full_name, ROUND(AVG(wr.productivity_percentage), 2) AS avg_prod
FROM \`qd_ul_ultimez_team.employees_work_reports\` wr
JOIN \`qd_ul_ultimez_team.employees\` e ON e.id = wr.employee_row_id
WHERE wr.date >= DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 30 DAY)
GROUP BY e.full_name ORDER BY avg_prod DESC`
export default function MiscPreview() {
  return (
    <PreviewShell title="Misc Utilities" file="misc.tsx">
      <Section title="Breadcrumb"><Breadcrumb items={[{ label: 'Ultimez' }, { label: 'Employees' }, { label: 'Work Monitoring' }]} /></Section>
      <Section title="ContentHeader"><ContentHeader title="Employee Monitoring" subtitle="Ultimez Team — Live work tracking" right={<DateChip>Sunday, 29 March 2026</DateChip>} /></Section>
      <Section title="Status"><Row><Status variant="success" label="Active" pulse /><Status variant="warning" label="Pending" /><Status variant="danger" label="Flagged" /><Status variant="info" label="Enabled" /><Status variant="accent" label="Premium" /><Status variant="muted" label="Disabled" /></Row></Section>
      <Section title="Tags"><Tags tags={['Blockchain', 'DeFi', 'NFT', 'Web3', 'Layer2']} variant="accent" removable onRemove={t => console.log('remove', t)} /></Section>
      <Section title="AlertInfoMessage">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AlertInfoMessage variant="success" message="Report saved successfully" description="24 records updated." />
          <AlertInfoMessage variant="warning" message="Data not yet uploaded" description="Run query → export JSON → upload here." dismissible />
          <AlertInfoMessage variant="danger"  message="Alert type 86 triggered" description="Meenaz Hanagi — HR Co-Ordinator" />
          <AlertInfoMessage variant="info"    message="Sync running" description="BigQuery → MongoDB CDC pipeline active." />
        </div>
      </Section>
      <Section title="MembersGroup"><MembersGroup members={[{ name: 'Priya Sharma', initials: 'PS' }, { name: 'Rahul Mehta', initials: 'RM' }, { name: 'Anita Patel', initials: 'AP' }, { name: 'Kiran Nair', initials: 'KN' }, { name: 'Suresh Kumar', initials: 'SK' }, { name: 'Extra One', initials: 'E1' }, { name: 'Extra Two', initials: 'E2' }]} /></Section>
      <Section title="MediaObject">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <MediaObject icon="📊" title="Work Reports" subtitle="newultimez_team_tbl_employees_work_reports" meta="38,171 rows" right={<Button variant="secondary" size="sm">View</Button>} />
          <MediaObject icon="👤" title="Priya Sharma" subtitle="Senior Author · Content" meta="Joined 2023-06-01" right={<Button variant="ghost" size="sm">Profile</Button>} />
        </div>
      </Section>
      <Section title="AccordionBlock + QueryBox"><AccordionBlock title="BigQuery — avg productivity last 30 days" defaultOpen><QueryBox code={SQL} /></AccordionBlock></Section>
      <Section title="NoDataMessage"><NoDataMessage title="Live data not yet uploaded" description="Run the query → export JSON → upload here to populate the chart." /></Section>
      <Section title="ProfileActionButton"><Row><ProfileActionButton actions={[{ label: 'View Profile', icon: '👤', onClick: () => {} }, { label: 'Edit', icon: '✏', onClick: () => {} }, { label: 'Delete', icon: '🗑', variant: 'danger', onClick: () => {} }]} /><span style={{ fontSize: 12, color: '#64748b', fontFamily: 'var(--mono)' }}>← Click the ⋯ button</span></Row></Section>
      <Section title="SectionTitle"><SectionTitle>Section heading — used between content blocks</SectionTitle><div style={{ fontSize: 13, color: '#64748b' }}>Content below...</div></Section>
    </PreviewShell>
  )
}
