import type { CSSProperties, ReactNode } from 'react'
import { colors, fonts, radius, statusColors, type StatusVariant } from '../lib/theme'

export interface BadgeProps {
  children: ReactNode
  variant?: StatusVariant
  mono?: boolean
  pill?: boolean
  dot?: boolean
  size?: 'sm' | 'md'
  style?: CSSProperties
}

export function Badge({ children, variant = 'muted', mono = false, pill = false, dot = false, size = 'sm', style }: BadgeProps) {
  const { bg, color, border } = statusColors[variant]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: size === 'sm' ? '2px 8px' : '4px 12px',
      borderRadius: pill ? radius.full : radius.sm,
      border: `1px solid ${border}`, background: bg, color,
      fontFamily: mono ? fonts.mono : fonts.sans,
      fontSize: size === 'sm' ? '10px' : '12px',
      fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap' as const, ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />}
      {children}
    </span>
  )
}

export function OfficeBadge() { return <Badge variant="info"    mono pill>🏢 OFFICE</Badge> }
export function SharedBadge() { return <Badge variant="warning" mono pill>⚠ SHARED</Badge> }
export function OkBadge()     { return <Badge variant="success" mono pill>✓ OK</Badge> }
export function IPv4Badge()   { return <Badge variant="success" mono>IPv4</Badge> }
export function IPv6Badge()   { return <Badge variant="accent"  mono>IPv6</Badge> }
