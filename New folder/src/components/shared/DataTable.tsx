'use client'

import { useState, useMemo } from 'react'
import { EmptyState } from './ui'

// Column definition
export interface Column<T = Record<string, unknown>> {
  key:      string
  label:    string
  width?:   number
  render?:  (row: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T = Record<string, unknown>> {
  columns:    Column<T>[]
  rows:       T[]
  pageSize?:  number          // default 50
  searchable?: boolean
  emptyText?:  string
  emptyIcon?:  string
}

const TH: React.CSSProperties = {
  padding: '9px 12px', fontSize: 10,
  fontFamily: 'var(--font-mono)', letterSpacing: 1,
  textTransform: 'uppercase', color: 'var(--text2)',
  background: 'var(--bg3)', textAlign: 'left',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap', userSelect: 'none', cursor: 'pointer',
}
const TD: React.CSSProperties = {
  padding: '9px 12px', fontSize: 12,
  borderBottom: '1px solid var(--border)', color: 'var(--text)',
  verticalAlign: 'top',
}

export default function DataTable<T extends Record<string, unknown>>({
  columns, rows, pageSize = 50, searchable, emptyText = 'No data found', emptyIcon = '◈',
}: DataTableProps<T>) {
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState(1)

  const filtered = useMemo(() => {
    let list = [...rows]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q))
      )
    }
    if (sortKey) {
      list.sort((a, b) => {
        const av = String(a[sortKey] ?? '')
        const bv = String(b[sortKey] ?? '')
        const an = parseFloat(av), bn = parseFloat(bv)
        if (!isNaN(an) && !isNaN(bn)) return (an - bn) * sortDir
        return av.localeCompare(bv) * sortDir
      })
    }
    return list
  }, [rows, search, sortKey, sortDir, page])

  const pages   = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pages)
  const paged   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d * -1)
    else { setSortKey(key); setSortDir(1) }
    setPage(1)
  }

  return (
    <div>
      {searchable && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text2)', fontSize: 14 }}>⌕</span>
            <input
              style={{
                width: '100%', paddingLeft: 30, paddingRight: 10,
                paddingTop: 7, paddingBottom: 7,
                background: 'var(--bg3)', border: '1px solid var(--border2)',
                color: 'var(--text)', borderRadius: 8, fontSize: 12,
                fontFamily: 'var(--font-sans)', outline: 'none',
              }}
              placeholder="Search…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
            {filtered.length} of {rows.length}
          </span>
        </div>
      )}

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
        {paged.length === 0 ? (
          <EmptyState icon={emptyIcon} title={emptyText} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    style={{ ...TH, width: col.width }}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortKey === col.key && <span style={{ marginLeft: 4 }}>{sortDir > 0 ? '↑' : '↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((row, i) => (
                <tr key={i}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                >
                  {columns.map(col => (
                    <td key={col.key} style={{ ...TD, width: col.width }}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg3)', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>
              Page {safePage} of {pages} · {filtered.length} records
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['← Prev', safePage - 1], ['Next →', safePage + 1]].map(([label, target]) => (
                <button
                  key={label as string}
                  onClick={() => setPage(target as number)}
                  disabled={(label as string).includes('Prev') ? safePage <= 1 : safePage >= pages}
                  style={{
                    background: 'var(--bg3)', border: '1px solid var(--border2)',
                    color: 'var(--text2)', borderRadius: 6, padding: '4px 10px',
                    fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    opacity: ((label as string).includes('Prev') ? safePage <= 1 : safePage >= pages) ? 0.4 : 1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
