import type { CSSProperties } from 'react'

export const colors = {
  bg: '#0a0d14', bg2: '#0f1320', bg3: '#151b2e', card: '#111827',
  border: '#1e2a45', border2: '#263354',
  text: '#e2e8f0', muted: '#64748b', subtle: '#334155',
  green: '#22c55e', greenDim: '#14532d',
  amber: '#f59e0b', amberDim: '#78350f',
  red: '#ef4444', redDim: '#7f1d1d',
  blue: '#3b82f6', blueDim: '#1e3a8a',
  cyan: '#06b6d4',
  accent: '#6366f1', accentDim: '#312e81',
  shadow: 'rgba(0,0,0,0.3)',
} as const

export const fonts = {
  mono: "'IBM Plex Mono', monospace",
  sans: "'DM Sans', sans-serif",
} as const

export const radius = {
  xs: '4px', sm: '6px', md: '8px', lg: '10px', xl: '12px', full: '9999px',
} as const

export const spacing = {
  1: '4px', 2: '8px', 3: '12px', 4: '16px',
  5: '20px', 6: '24px', 7: '28px', 8: '32px',
} as const

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'muted'

export const statusColors: Record<StatusVariant, { bg: string; color: string; border: string }> = {
  success: { bg: colors.greenDim,  color: colors.green,  border: colors.green  },
  warning: { bg: colors.amberDim,  color: colors.amber,  border: colors.amber  },
  danger:  { bg: colors.redDim,    color: colors.red,    border: colors.red    },
  info:    { bg: colors.blueDim,   color: colors.blue,   border: colors.blue   },
  accent:  { bg: colors.accentDim, color: colors.accent, border: colors.accent },
  muted:   { bg: colors.bg3,       color: colors.muted,  border: colors.border },
}

export type CardVariant = 'total' | 'enabled' | 'active' | 'online' | 'alerts' | 'productive' | 'default'

export const cardAccents: Record<CardVariant, string> = {
  total: colors.accent, enabled: colors.blue,  active: colors.green,
  online: colors.cyan,  alerts: colors.red,    productive: colors.amber,
  default: colors.border2,
}
