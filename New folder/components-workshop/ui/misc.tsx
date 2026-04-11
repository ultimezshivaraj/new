'use client'
import type { CSSProperties, ReactNode } from 'react'
import { useState } from 'react'
import { colors, fonts, radius, spacing, statusColors, type StatusVariant } from '../lib/theme'

export function Breadcrumb({ items, style }: { items: { label: string; href?: string }[]; style?: CSSProperties }) {
  return <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: fonts.mono, fontSize: '13px', color: colors.muted, ...style }}>{items.map((item, i) => (<span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{item.href ? <a href={item.href} style={{ color: colors.muted, textDecoration: 'none' }}>{item.label}</a> : <span style={{ color: i === items.length - 1 ? colors.text : colors.muted, fontWeight: i === items.length - 1 ? 500 : undefined }}>{item.label}</span>}{i < items.length - 1 && <span style={{ color: colors.border2 }}>›</span>}</span>))}</nav>
}

export function ContentHeader({ title, subtitle, right, style }: { title: string; subtitle?: string; right?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing[7], ...style }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px', color: colors.text, margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ color: colors.muted, fontSize: '13px', marginTop: spacing[1] }}>{subtitle}</p>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontSize: '11px', fontFamily: fonts.mono, letterSpacing: '1px', textTransform: 'uppercase', color: colors.muted, margin: `${spacing[5]} 0 ${spacing[3]}`, ...style }}>{children}</div>
}

export function Status({ variant, label, pulse = false, style }: { variant: StatusVariant; label: string; pulse?: boolean; style?: CSSProperties }) {
  const { color } = statusColors[variant]
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px', fontFamily: fonts.mono, color, ...style }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, animation: pulse ? 'pulse-dot 1.5s ease-in-out infinite' : undefined }} />{label}</span>
}

export function Tags({ tags, variant = 'accent', removable = false, onRemove, style }: { tags: string[]; variant?: StatusVariant; removable?: boolean; onRemove?: (tag: string) => void; style?: CSSProperties }) {
  const { bg, color, border } = statusColors[variant]
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, ...style }}>{tags.map(tag => (<span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: radius.full, background: bg, color, border: `1px solid ${border}`, fontSize: '11px', fontWeight: 600, fontFamily: fonts.mono }}>{tag}{removable && <button type="button" onClick={() => onRemove?.(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color, fontSize: '10px', padding: '0 0 0 2px', lineHeight: 1 }}>✕</button>}</span>))}</div>
}

export function AccordionBlock({ title, defaultOpen = false, children, style }: { title: string; defaultOpen?: boolean; children: ReactNode; style?: CSSProperties }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: 'hidden', ...style }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${spacing[3]} ${spacing[4]}`, background: 'none', border: 'none', cursor: 'pointer', color: colors.text, fontFamily: fonts.sans, fontSize: '13px', fontWeight: 600, borderBottom: open ? `1px solid ${colors.border}` : 'none' }}>
        {title}<span style={{ fontSize: '12px', color: colors.muted, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>
      {open && <div style={{ padding: spacing[4] }}>{children}</div>}
    </div>
  )
}

export function MediaObject({ icon, title, subtitle, meta, right, style }: { icon?: ReactNode; title: string; subtitle?: string; meta?: string; right?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], ...style }}>
      {icon && <div style={{ width: 36, height: 36, borderRadius: radius.md, background: colors.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{icon}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: colors.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: '11px', color: colors.muted, marginTop: 2 }}>{subtitle}</div>}
        {meta && <div style={{ fontSize: '10px', fontFamily: fonts.mono, color: colors.subtle, marginTop: 2 }}>{meta}</div>}
      </div>
      {right}
    </div>
  )
}

export function MembersGroup({ members, max = 5, size = 30, style }: { members: { name: string; avatar?: string; initials?: string; color?: string }[]; max?: number; size?: number; style?: CSSProperties }) {
  const visible = members.slice(0, max); const overflow = members.length - max
  return (
    <div style={{ display: 'flex', alignItems: 'center', ...style }}>
      {visible.map((m, i) => (<div key={i} title={m.name} style={{ width: size, height: size, borderRadius: '50%', border: `2px solid ${colors.card}`, background: m.color ?? `linear-gradient(135deg, ${colors.accent}, ${colors.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: `${size * 0.37}px`, fontWeight: 700, color: '#fff', marginLeft: i > 0 ? -size * 0.33 : 0, flexShrink: 0, overflow: 'hidden' }}>{m.avatar ? <img src={m.avatar} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.initials ?? m.name.slice(0, 2).toUpperCase())}</div>))}
      {overflow > 0 && <div style={{ width: size, height: size, borderRadius: '50%', border: `2px solid ${colors.card}`, background: colors.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${size * 0.33}px`, fontFamily: fonts.mono, color: colors.muted, marginLeft: -size * 0.33, flexShrink: 0 }}>+{overflow}</div>}
    </div>
  )
}

export function AlertInfoMessage({ variant, message, description, dismissible, onDismiss, style }: { variant: StatusVariant; message: string; description?: string; dismissible?: boolean; onDismiss?: () => void; style?: CSSProperties }) {
  const { bg, color, border } = statusColors[variant]
  const icon = { success: '✓', danger: '✕', warning: '⚠', info: 'ℹ', accent: '✦', muted: '·' }[variant]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[3], background: bg, border: `1px solid ${border}`, borderLeft: `3px solid ${color}`, borderRadius: radius.lg, padding: `${spacing[3]} ${spacing[4]}`, ...style }}>
      <span style={{ fontSize: '16px', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color }}>{message}</div>
        {description && <div style={{ fontSize: '12px', color: colors.muted, marginTop: 3 }}>{description}</div>}
      </div>
      {dismissible && <button type="button" onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.muted, fontSize: '14px', flexShrink: 0 }}>✕</button>}
    </div>
  )
}

export function DateChip({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontFamily: fonts.mono, fontSize: '11px', color: colors.muted, background: colors.bg3, border: `1px solid ${colors.border}`, padding: '4px 10px', borderRadius: radius.sm, ...style }}>{children}</div>
}

export function NoDataMessage({ title = 'No data available', description, code, style }: { title?: string; description?: string; code?: string; style?: CSSProperties }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.lg, color: colors.muted, fontSize: '13px', ...style }}>
      <div style={{ fontSize: '15px', color: colors.text, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {description && <div>{description}</div>}
      {code && <pre style={{ display: 'block', marginTop: spacing[3], padding: '10px 16px', background: colors.bg3, borderRadius: radius.md, fontFamily: fonts.mono, fontSize: '11px', color: colors.accent, textAlign: 'left', lineHeight: 1.8, overflow: 'auto' }}>{code}</pre>}
    </div>
  )
}

export function QueryBox({ language = 'SQL · BigQuery', label, code, onCopy, style }: { language?: string; label?: string; code: string; onCopy?: () => void; style?: CSSProperties }) {
  return (
    <div style={{ background: colors.bg3, border: `1px solid ${colors.border2}`, borderRadius: radius.lg, overflow: 'hidden', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${spacing[2]} ${spacing[4]}`, borderBottom: `1px solid ${colors.border}` }}>
        <span style={{ fontSize: '10px', fontFamily: fonts.mono, letterSpacing: '1px', textTransform: 'uppercase', color: colors.muted }}>{label ?? language}</span>
        <button type="button" onClick={() => { navigator.clipboard?.writeText(code); onCopy?.() }} style={{ fontSize: '11px', fontFamily: fonts.mono, color: colors.accent, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px', borderRadius: radius.xs }}>Copy</button>
      </div>
      <pre style={{ padding: `${spacing[3]} ${spacing[4]}`, fontFamily: fonts.mono, fontSize: '11px', color: colors.text, lineHeight: 1.7, overflow: 'auto', margin: 0 }}>{code}</pre>
    </div>
  )
}

export function ProfileActionButton({ actions, style }: { actions: { label: string; icon?: string; variant?: StatusVariant; onClick: () => void }[]; style?: CSSProperties }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', ...style }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ width: 32, height: 32, borderRadius: radius.md, border: `1px solid ${colors.border}`, background: colors.bg3, color: colors.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⋯</button>
      {open && (<>
        <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
        <div style={{ position: 'absolute', right: 0, top: 36, background: colors.bg2, border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: 'hidden', zIndex: 20, minWidth: 160, boxShadow: `0 8px 24px ${colors.shadow}` }}>
          {actions.map((a, i) => {
            const color = a.variant ? statusColors[a.variant].color : colors.text
            return <button key={i} type="button" onClick={() => { a.onClick(); setOpen(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: spacing[2], padding: `${spacing[2]} ${spacing[3]}`, background: 'none', border: 'none', cursor: 'pointer', color, fontSize: '13px', fontFamily: fonts.sans, textAlign: 'left' }} onMouseEnter={e => (e.currentTarget.style.background = colors.bg3)} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>{a.icon && <span>{a.icon}</span>}{a.label}</button>
          })}
        </div>
      </>)}
    </div>
  )
}
