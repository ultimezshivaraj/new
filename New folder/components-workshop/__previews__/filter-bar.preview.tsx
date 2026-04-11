'use client'
import { useState } from 'react'
import { FilterWrapper, SearchFilter, SelectFilter, DateRangeFilter, RangeFilter, ClearAll, FilterSep, type DatePreset } from '../ui/filters/index'
import { Button, ExportCsvButton } from '../ui/Button'
import { PreviewShell, Section } from './_preview-shell'
export default function FilterBarPreview() {
  const [search, setSearch] = useState('')
  const [role, setRole]     = useState('')
  const [from, setFrom]     = useState('')
  const [to, setTo]         = useState('')
  const [preset, setPreset] = useState<DatePreset>('today')
  const [threshold, setThreshold] = useState(50)
  return (
    <PreviewShell title="FilterBar" file="filters/index.tsx">
      <Section title="Search + select + clear">
        <FilterWrapper style={{ marginBottom: 0 }}>
          <SearchFilter value={search} onChange={setSearch} placeholder="Search name, email, position…" />
          <SelectFilter value={role} onChange={setRole} placeholder="All Roles" options={[{ value: 'author', label: 'Author' }, { value: 'editor', label: 'Editor' }, { value: 'developer', label: 'Developer' }]} />
          <FilterSep />
          <ClearAll onClick={() => { setSearch(''); setRole('') }} />
          <ExportCsvButton />
        </FilterWrapper>
      </Section>
      <Section title="Date range with preset pills">
        <FilterWrapper style={{ marginBottom: 0 }}>
          <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} activePreset={preset} onPreset={setPreset} />
          <FilterSep />
          <Button variant="primary" size="md">Apply</Button>
        </FilterWrapper>
      </Section>
      <Section title="RangeFilter">
        <div style={{ maxWidth: 360 }}><RangeFilter label="Minimum Productivity" value={threshold} onChange={setThreshold} unit="%" /></div>
      </Section>
    </PreviewShell>
  )
}
