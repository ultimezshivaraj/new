'use client'
import { useState } from 'react'
import { FormWrapper, TextInput, NumberInput, Textarea, SelectInput, Checkbox, FileInput, DatetimeInput, FormRow, FormDivider } from '../ui/forms/index'
import { Button } from '../ui/Button'
import { PreviewShell, Section } from './_preview-shell'
export default function FormsPreview() {
  const [name, setName]     = useState('')
  const [notes, setNotes]   = useState('')
  const [prod, setProd]     = useState<number>(0)
  const [dept, setDept]     = useState('')
  const [ok, setOk]         = useState(false)
  return (
    <PreviewShell title="Forms" file="forms/index.tsx">
      <Section title="Work report form">
        <FormWrapper title="Create Work Report" subtitle="Submit productivity data for today">
          <FormRow>
            <TextInput label="Employee Name" value={name} onChange={setName} placeholder="Full name" required />
            <SelectInput label="Department" placeholder="Select department" value={dept} onChange={setDept} options={[{ value: 'content', label: 'Content' }, { value: 'tech', label: 'Technology' }, { value: 'hr', label: 'HR' }]} />
          </FormRow>
          <FormDivider label="Work Details" />
          <FormRow columns={3}>
            <DatetimeInput label="Date" type="date" />
            <DatetimeInput label="Login Time" type="time" />
            <NumberInput label="Productivity (%)" min={0} max={100} value={prod} onChange={setProd} />
          </FormRow>
          <Textarea label="Notes" value={notes} onChange={setNotes} placeholder="Optional…" rows={3} containerStyle={{ marginTop: 16 }} />
          <Checkbox label="Mark as verified by HR" checked={ok} onChange={setOk} containerStyle={{ marginTop: 16 }} />
          <FileInput label="Attach Screenshot" accept="image/*" containerStyle={{ marginTop: 16 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <Button variant="primary">Save Report</Button>
            <Button variant="secondary">Cancel</Button>
          </div>
        </FormWrapper>
      </Section>
      <Section title="Field states">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
          <TextInput label="Normal field" placeholder="Type here…" />
          <TextInput label="With error" error="This field is required" placeholder="Empty…" />
          <TextInput label="With helper" helper="Must match employee records" placeholder="Employee ID…" mono />
        </div>
      </Section>
    </PreviewShell>
  )
}
