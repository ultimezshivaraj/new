import type { CSSProperties, ReactNode } from 'react'
import { colors, fonts, radius, spacing } from '../lib/theme'

export function PreviewShell({ title, file, children }: { title: string; file: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: colors.bg, fontFamily: fonts.sans, color: colors.text }}>
      <div style={{ padding: '32px 40px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px', margin: 0 }}>{title}</h2>
          <div style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.muted, marginTop: 6 }}>components-workshop/ui/{file}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>{children}</div>
      </div>
    </div>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontFamily: fonts.mono, textTransform: 'uppercase', letterSpacing: '1.2px', color: colors.subtle, marginBottom: 12 }}>{title}</div>
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: spacing[5] }}>{children}</div>
    </div>
  )
}

export function Row({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, ...style }}>{children}</div>
}
