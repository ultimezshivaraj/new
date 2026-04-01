'use client'
import { useState } from 'react'
import { TableWrapper, TableHead, TableBody, Tr, Td, RankNum, TableProgress, ProductivityPill, Pagination, type Column, type SortDirection } from '../ui/table/index'
import { Badge } from '../ui/Badge'
import { PreviewShell, Section } from './_preview-shell'
const COLS: Column[] = [
  { key: '#', label: '#', width: 44 },
  { key: 'name', label: 'Employee', sortable: true },
  { key: 'role', label: 'Position', sortable: true },
  { key: 'date', label: 'Date', sortable: true, mono: true },
  { key: 'prod', label: 'Productivity', sortable: true },
  { key: 'pill', label: 'Level' },
  { key: 'status', label: 'Status' },
]
const ROWS = [
  { id: 1, name: 'Priya Sharma',  role: 'Senior Author',     date: '2026-03-29', prod: 82 },
  { id: 2, name: 'Rahul Mehta',   role: 'Developer',         date: '2026-03-29', prod: 67 },
  { id: 3, name: 'Anita Patel',   role: 'Editor',            date: '2026-03-29', prod: 35 },
  { id: 4, name: 'Kiran Nair',    role: 'Designer',          date: '2026-03-29', prod: 91 },
  { id: 5, name: 'Suresh Kumar',  role: 'Community Manager', date: '2026-03-29', prod: 55 },
]
export default function TablePreview() {
  const [sort, setSort] = useState('')
  const [dir, setDir]   = useState<SortDirection>(null)
  const [page, setPage] = useState(1)
  const handleSort = (key: string) => {
    if (sort === key) setDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc')
    else { setSort(key); setDir('asc') }
  }
  return (
    <PreviewShell title="Table" file="table/index.tsx">
      <Section title="Sortable table with pagination">
        <TableWrapper footer={<Pagination page={page} totalPages={5} totalItems={25} pageSize={5} onPage={setPage} />}>
          <TableHead columns={COLS} sortKey={sort} sortDir={dir} onSort={handleSort} />
          <TableBody>
            {ROWS.map((row, i) => (
              <Tr key={row.id}>
                <Td><RankNum n={i + 1} /></Td>
                <Td bold>{row.name}</Td>
                <Td muted>{row.role}</Td>
                <Td mono muted>{row.date}</Td>
                <Td><TableProgress value={row.prod} /></Td>
                <Td><ProductivityPill value={row.prod} /></Td>
                <Td><Badge variant={row.prod >= 70 ? 'success' : row.prod >= 40 ? 'warning' : 'danger'}>{row.prod >= 70 ? 'High' : row.prod >= 40 ? 'Mid' : 'Low'}</Badge></Td>
              </Tr>
            ))}
          </TableBody>
        </TableWrapper>
      </Section>
      <Section title="Empty state">
        <TableWrapper>
          <TableHead columns={COLS} />
          <TableBody isEmpty emptyMessage="No records found for the selected filters." />
        </TableWrapper>
      </Section>
    </PreviewShell>
  )
}
