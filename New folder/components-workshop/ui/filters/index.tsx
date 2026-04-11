'use client'
import type { CSSProperties, ReactNode, ChangeEvent } from 'react'
import { colors, fonts, radius, spacing } from '../../lib/theme'

const inputBase: CSSProperties = { background: colors.bg3, border: `1px solid ${colors.border2}`, color: colors.text, fontFamily: fonts.sans, fontSize: '13px', borderRadius: radius.md, outline: 'none', transition: 'border-color 0.2s' }

export function FilterWrapper({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: `${spacing[4]} ${spacing[5]}`, display: 'flex', alignItems: 'center', gap: spacing[3], flexWrap: 'wrap', ...style }}>{children}</div>
}

export function SearchFilter({ value, onChange, placeholder = 'Search…', style }: { value: string; onChange: (v: string) => void; placeholder?: string; style?: CSSProperties }) {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: '180px', maxWidth: '380px', ...style }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.muted, fontSize: '14px', pointerEvents: 'none' }}>⌕</span>
      <input type="text" value={value} placeholder={placeholder} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        style={{ ...inputBase, width: '100%', padding: '8px 14px 8px 36px' }}
        onFocus={e => (e.currentTarget.style.borderColor = colors.accent)}
        onBlur={e => (e.currentTarget.style.borderColor = colors.border2)} />
    </div>
  )
}

export interface SelectOption { value: string; label: string }

export function SelectFilter({ value, onChange, options, placeholder = 'All', style }: { value: string; onChange: (v: string) => void; options: SelectOption[]; placeholder?: string; style?: CSSProperties }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputBase, padding: '8px 12px', cursor: 'pointer', minWidth: 140, colorScheme: 'dark', ...style }}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function SelectMultiple({ value, onChange, options, label, style }: { value: string[]; onChange: (v: string[]) => void; options: SelectOption[]; label?: string; style?: CSSProperties }) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  return (
    <div style={{ ...style }}>
      {label && <div style={{ fontSize: '9px', fontFamily: fonts.mono, textTransform: 'uppercase', letterSpacing: '1px', color: colors.muted, marginBottom: 6 }}>{label}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(o => {
          const sel = value.includes(o.value)
          return <button key={o.value} type="button" onClick={() => toggle(o.value)} style={{ padding: '4px 10px', borderRadius: radius.full, border: `1px solid ${sel ? colors.accent : colors.border2}`, background: sel ? colors.accentDim : colors.bg3, color: sel ? colors.accent : colors.muted, fontSize: '12px', cursor: 'pointer' }}>{o.label}</button>
        })}
      </div>
    </div>
  )
}

export type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'all'

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }, { value: 'all', label: 'All Data' },
]

export function DateRangeFilter({ from, to, onFromChange, onToChange, activePreset, onPreset }: { from: string; to: string; onFromChange: (v: string) => void; onToChange: (v: string) => void; activePreset?: DatePreset; onPreset?: (p: DatePreset) => void }) {
  const ds: CSSProperties = { ...inputBase, padding: '8px 12px', fontFamily: fonts.mono, fontSize: '12px', cursor: 'pointer', colorScheme: 'dark' }
  return (
    <>
      <span style={{ fontSize: '11px', fontFamily: fonts.mono, textTransform: 'uppercase', letterSpacing: '1px', color: colors.muted, flexShrink: 0 }}>📅 Date</span>
      <input type="date" value={from} onChange={e => onFromChange(e.target.value)} style={ds} />
      <span style={{ color: colors.muted, fontSize: '12px' }}>→</span>
      <input type="date" value={to} onChange={e => onToChange(e.target.value)} style={ds} />
      <div style={{ width: 1, height: 30, background: colors.border, flexShrink: 0 }} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button key={p.value} type="button" onClick={() => onPreset?.(p.value)} style={{ padding: '6px 14px', borderRadius: radius.full, border: `1px solid ${activePreset === p.value ? colors.accent : colors.border2}`, background: activePreset === p.value ? colors.accent : colors.bg3, color: activePreset === p.value ? '#fff' : colors.muted, fontSize: '12px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>{p.label}</button>
        ))}
      </div>
    </>
  )
}

export function RangeFilter({ label, min = 0, max = 100, value, onChange, unit = '', style }: { label?: string; min?: number; max?: number; value: number; onChange: (v: number) => void; unit?: string; style?: CSSProperties }) {
  return (
    <div style={{ ...style }}>
      {label && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: '11px', color: colors.muted }}>{label}</span><span style={{ fontSize: '11px', fontFamily: fonts.mono, color: colors.accent }}>{value}{unit}</span></div>}
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: '100%', accentColor: colors.accent, cursor: 'pointer' }} />
    </div>
  )
}

export function ClearAll({ onClick, label = 'Clear all', style }: { onClick: () => void; label?: string; style?: CSSProperties }) {
  return <button type="button" onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.muted, fontSize: '12px', padding: '4px 0', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: fonts.sans, ...style }} onMouseEnter={e => (e.currentTarget.style.color = colors.red)} onMouseLeave={e => (e.currentTarget.style.color = colors.muted)}>✕ {label}</button>
}

export function FilterSep() {
  return <div style={{ width: 1, height: 30, background: colors.border, flexShrink: 0 }} />
}
