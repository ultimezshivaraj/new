'use client'
import type { CSSProperties, ReactNode } from 'react'
import { colors, fonts, radius, spacing } from '../../lib/theme'

export type TabColor = 'green' | 'blue' | 'red' | 'accent' | 'amber' | 'cyan'

const TA: Record<TabColor, { background: string; color: string; countBg: string }> = {
  green:  { background: colors.greenDim,  color: colors.green,  countBg: colors.green  },
  blue:   { background: colors.blueDim,   color: colors.blue,   countBg: colors.blue   },
  red:    { background: colors.redDim,    color: colors.red,    countBg: colors.red    },
  accent: { background: colors.accentDim, color: colors.accent, countBg: colors.accent },
  amber:  { background: colors.amberDim,  color: colors.amber,  countBg: colors.amber  },
  cyan:   { background: '#0e3a42',        color: colors.cyan,   countBg: colors.cyan   },
}

export function TabBar({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ display: 'flex', background: colors.bg3, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 4, flexShrink: 0, alignSelf: 'flex-start', flexWrap: 'wrap', ...style }}>{children}</div>
}

export function MainTab({ label, icon, count, active = false, color = 'accent', onClick, style }: { label: string; icon?: string; count?: number | string; active?: boolean; color?: TabColor; onClick?: () => void; style?: CSSProperties }) {
  const s = TA[color]
  return (
    <button type="button" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 18px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 600, fontFamily: fonts.sans, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', background: active ? s.background : 'transparent', color: active ? s.color : colors.muted, ...style }}>
      {icon && <span>{icon}</span>}
      {label}
      {count !== undefined && <span style={{ fontFamily: fonts.mono, fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: radius.lg, background: active ? s.countBg : colors.border2, color: active ? '#fff' : colors.muted }}>{count}</span>}
    </button>
  )
}

export function SubTabBar({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, marginBottom: spacing[5], overflowX: 'auto', ...style }}>{children}</div>
}

export function SubTab({ label, icon, active = false, onClick, style }: { label: string; icon?: string; active?: boolean; onClick?: () => void; style?: CSSProperties }) {
  return <button type="button" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', border: 'none', borderBottom: `2px solid ${active ? colors.accent : 'transparent'}`, background: 'transparent', color: active ? colors.accent : colors.muted, fontSize: '13px', fontWeight: active ? 600 : 500, fontFamily: fonts.sans, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', ...style }}>{icon && <span>{icon}</span>}{label}</button>
}

export function CustomSubTab({ label, active = false, onClick, style }: { label: string; active?: boolean; onClick?: () => void; style?: CSSProperties }) {
  return <button type="button" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px 7px 18px', borderRadius: radius.md, border: 'none', background: active ? colors.accentDim : 'transparent', color: active ? colors.accent : colors.muted, fontSize: '12px', fontWeight: 500, fontFamily: fonts.sans, cursor: 'pointer', transition: 'all 0.15s', width: '100%', textAlign: 'left', ...style }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? colors.accent : colors.border2, flexShrink: 0 }} />{label}</button>
}

export function TabPanel({ active, children, style }: { active: boolean; children: ReactNode; style?: CSSProperties }) {
  if (!active) return null
  return <div style={style}>{children}</div>
}

export function PageSwitcher({ options, value, onChange, style }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: colors.bg3, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 4, alignSelf: 'flex-start', ...style }}>
      {options.map(o => {
        const active = o.value === value
        return <button key={o.value} type="button" onClick={() => onChange(o.value)} style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', background: active ? colors.accentDim : 'transparent', color: active ? colors.accent : colors.muted, fontSize: '13px', fontWeight: 600, fontFamily: fonts.sans, cursor: 'pointer', transition: 'all 0.2s' }}>{o.label}</button>
      })}
    </div>
  )
}
