import type { CSSProperties, ReactNode, TdHTMLAttributes } from 'react'
import { colors, fonts, radius, spacing } from '../../lib/theme'

export function TableWrapper({ children, header, footer, style }: { children: ReactNode; header?: ReactNode; footer?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.xl, overflow: 'hidden', ...style }}>
      {header && <div style={{ padding: `${spacing[3]} ${spacing[4]}`, borderBottom: `1px solid ${colors.border}` }}>{header}</div>}
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fonts.sans }}>{children}</table></div>
      {footer && <div style={{ padding: `${spacing[3]} ${spacing[4]}`, borderTop: `1px solid ${colors.border}` }}>{footer}</div>}
    </div>
  )
}

export type SortDirection = 'asc' | 'desc' | null
export interface Column { key: string; label: string; sortable?: boolean; width?: string | number; align?: 'left' | 'center' | 'right'; mono?: boolean }

export function TableHead({ columns, sortKey, sortDir, onSort }: { columns: Column[]; sortKey?: string; sortDir?: SortDirection; onSort?: (key: string) => void }) {
  return (
    <thead><tr>
      {columns.map(col => (
        <th key={col.key} onClick={col.sortable ? () => onSort?.(col.key) : undefined} style={{ padding: `${spacing[2]} ${spacing[3]}`, textAlign: col.align ?? 'left', fontSize: '10px', fontFamily: fonts.mono, letterSpacing: '1px', textTransform: 'uppercase', color: colors.muted, background: colors.bg3, borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap', width: col.width, cursor: col.sortable ? 'pointer' : undefined, userSelect: col.sortable ? 'none' : undefined }}>
          {col.label}
          {col.sortable && <span style={{ marginLeft: 4, opacity: sortKey === col.key ? 1 : 0.4, color: sortKey === col.key ? colors.accent : 'inherit', fontSize: '9px' }}>{sortKey === col.key ? (sortDir === 'asc' ? '▲' : sortDir === 'desc' ? '▼' : '↕') : '↕'}</span>}
        </th>
      ))}
    </tr></thead>
  )
}

export function TableBody({ children, emptyMessage = 'No records found.', isEmpty }: { children?: ReactNode; emptyMessage?: string; isEmpty?: boolean }) {
  if (isEmpty) return <tbody><tr><td colSpan={999} style={{ textAlign: 'center', padding: '48px 20px', color: colors.muted, fontSize: '13px', fontStyle: 'italic' }}>{emptyMessage}</td></tr></tbody>
  return <tbody>{children}</tbody>
}

export function Tr({ children, onClick, style }: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  return <tr onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined, transition: 'background 0.1s', ...style }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = colors.bg3 }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>{children}</tr>
}

export function Td({ children, mono, muted, bold, align, style, ...rest }: { mono?: boolean; muted?: boolean; bold?: boolean; align?: 'left' | 'center' | 'right' } & TdHTMLAttributes<HTMLTableCellElement>) {
  return <td style={{ padding: `${spacing[2]} ${spacing[3]}`, fontSize: '13px', fontFamily: mono ? fonts.mono : fonts.sans, color: muted ? colors.muted : colors.text, fontWeight: bold ? 600 : undefined, textAlign: align, borderBottom: `1px solid ${colors.border}`, background: colors.card, ...style }} {...rest}>{children}</td>
}

export function RankNum({ n }: { n: number }) {
  return <span style={{ fontFamily: fonts.mono, fontSize: '11px', color: colors.muted, width: 28, display: 'inline-block', textAlign: 'right', marginRight: spacing[2] }}>{n}</span>
}

export function TableProgress({ value, showLabel = true, width = 120, style }: { value: number; showLabel?: boolean; width?: number; style?: CSSProperties }) {
  const color = value >= 70 ? colors.green : value >= 40 ? colors.amber : colors.red
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: spacing[2], verticalAlign: 'middle', ...style }}>
      <div style={{ width }}><div style={{ height: 6, background: colors.bg3, borderRadius: radius.full, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, Math.max(0, value))}%`, background: color, borderRadius: radius.full }} /></div></div>
      {showLabel && <span style={{ fontFamily: fonts.mono, fontSize: '11px', fontWeight: 700, color, minWidth: 36 }}>{value}%</span>}
    </div>
  )
}

export function ProductivityPill({ value }: { value: number }) {
  const cfg = value >= 70 ? { bg: colors.greenDim, color: colors.green } : value >= 40 ? { bg: colors.amberDim, color: colors.amber } : { bg: colors.redDim, color: colors.red }
  return <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: fonts.mono, fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: radius.lg, background: cfg.bg, color: cfg.color }}>{value}%</span>
}

export function Pagination({ page, totalPages, totalItems, pageSize, onPage, style }: { page: number; totalPages: number; totalItems: number; pageSize: number; onPage: (p: number) => void; style?: CSSProperties }) {
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => { if (totalPages <= 7) return i + 1; if (page <= 4) return i + 1; if (page >= totalPages - 3) return totalPages - 6 + i; return page - 3 + i })
  const btn = (active: boolean, disabled?: boolean): CSSProperties => ({ padding: '5px 12px', borderRadius: radius.sm, border: `1px solid ${active ? colors.accent : colors.border2}`, background: active ? colors.accent : colors.bg3, color: active ? '#fff' : disabled ? colors.subtle : colors.muted, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.3 : 1, fontSize: '12px', fontFamily: fonts.mono })
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...style }}>
      <span style={{ fontSize: '12px', color: colors.muted, fontFamily: fonts.mono }}>Showing {from}–{to} of {totalItems}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} style={btn(false, page <= 1)}>‹ Prev</button>
        {pages.map(p => <button key={p} onClick={() => onPage(p)} style={btn(p === page)}>{p}</button>)}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} style={btn(false, page >= totalPages)}>Next ›</button>
      </div>
    </div>
  )
}
