import type { CSSProperties, ReactNode } from 'react'
import { colors, fonts, radius, spacing, cardAccents, statusColors, type CardVariant, type StatusVariant } from '../../lib/theme'

export function CountCard({ label, value, subLabel, variant = 'default', style }: {
  label: string; value: string | number; subLabel?: string; variant?: CardVariant; style?: CSSProperties
}) {
  const accent = cardAccents[variant]
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: spacing[4], position: 'relative', overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent }} />
      <div style={{ fontSize: '10px', fontFamily: fonts.mono, letterSpacing: '1px', textTransform: 'uppercase', color: colors.muted, marginBottom: spacing[2] }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: fonts.mono, lineHeight: 1, color: accent }}>{value}</div>
      {subLabel && <div style={{ fontSize: '11px', color: colors.muted, marginTop: '6px' }}>{subLabel}</div>}
    </div>
  )
}

export function CountCardMulti({ value, label, color = colors.accent, style }: {
  value: string | number; label: string; color?: string; style?: CSSProperties
}) {
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: spacing[2], ...style }}>
      <span style={{ fontFamily: fonts.mono, fontSize: '20px', fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: '12px', color: colors.muted }}>{label}</span>
    </div>
  )
}

export function SummaryBlock({ title, children, style }: { title?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: spacing[5], ...style }}>
      {title && <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: spacing[3], color: colors.text }}>{title}</div>}
      {children}
    </div>
  )
}

export function ReportCard({ title, subtitle, meta, status, statusLabel, children, actions, style }: {
  title: string; subtitle?: string; meta?: string; status?: StatusVariant
  statusLabel?: string; children?: ReactNode; actions?: ReactNode; style?: CSSProperties
}) {
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: 'hidden', ...style }}>
      <div style={{ padding: `${spacing[3]} ${spacing[4]}`, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '13px', color: colors.text }}>{title}</div>
          {subtitle && <div style={{ fontSize: '11px', color: colors.muted, marginTop: 2 }}>{subtitle}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          {meta && <span style={{ fontSize: '11px', fontFamily: fonts.mono, color: colors.muted }}>{meta}</span>}
          {status && statusLabel && (
            <span style={{ ...statusColors[status], padding: '2px 8px', borderRadius: radius.sm, fontSize: '10px', fontFamily: fonts.mono, fontWeight: 700, border: `1px solid ${statusColors[status].border}` }}>
              {statusLabel}
            </span>
          )}
          {actions}
        </div>
      </div>
      {children && <div style={{ padding: spacing[4] }}>{children}</div>}
    </div>
  )
}

export function ProfileCard({ name, role, department, avatar, initials, status, statusLabel, meta, actions, style }: {
  name: string; role?: string; department?: string; avatar?: string; initials?: string
  status?: StatusVariant; statusLabel?: string; meta?: Record<string, string>; actions?: ReactNode; style?: CSSProperties
}) {
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: spacing[4], display: 'flex', flexDirection: 'column', gap: spacing[3], ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
        <div style={{ width: 44, height: 44, borderRadius: radius.md, flexShrink: 0, background: `linear-gradient(135deg, ${colors.accent}, ${colors.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontWeight: 700, fontSize: '14px', color: '#fff', overflow: 'hidden' }}>
          {avatar ? <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (initials ?? name.slice(0, 2).toUpperCase())}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: colors.text }}>{name}</div>
          {role && <div style={{ fontSize: '12px', color: colors.muted }}>{role}</div>}
          {department && <div style={{ fontSize: '11px', color: colors.subtle, marginTop: 1 }}>{department}</div>}
        </div>
        {status && statusLabel && (
          <span style={{ ...statusColors[status], padding: '2px 8px', borderRadius: radius.full, fontSize: '10px', fontFamily: fonts.mono, fontWeight: 700, border: `1px solid ${statusColors[status].border}`, flexShrink: 0 }}>
            {statusLabel}
          </span>
        )}
      </div>
      {meta && Object.keys(meta).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', borderTop: `1px solid ${colors.border}`, paddingTop: spacing[3] }}>
          {Object.entries(meta).map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: '9px', fontFamily: fonts.mono, textTransform: 'uppercase', letterSpacing: '0.8px', color: colors.subtle }}>{k}</div>
              <div style={{ fontSize: '12px', color: colors.text, marginTop: 1 }}>{v}</div>
            </div>
          ))}
        </div>
      )}
      {actions && <div style={{ display: 'flex', gap: spacing[2], borderTop: `1px solid ${colors.border}`, paddingTop: spacing[3] }}>{actions}</div>}
    </div>
  )
}

export function TrainingPathCard({ title, description, progress = 0, totalLessons, completedLessons, tag, actions, style }: {
  title: string; description?: string; progress?: number; totalLessons?: number
  completedLessons?: number; tag?: string; actions?: ReactNode; style?: CSSProperties
}) {
  const pc = progress >= 70 ? colors.green : progress >= 40 ? colors.amber : colors.red
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: spacing[5], display: 'flex', flexDirection: 'column', gap: spacing[3], ...style }}>
      <div>
        {tag && <div style={{ fontSize: '9px', fontFamily: fonts.mono, textTransform: 'uppercase', letterSpacing: '1px', color: colors.accent, marginBottom: '4px' }}>{tag}</div>}
        <div style={{ fontWeight: 600, fontSize: '14px', color: colors.text }}>{title}</div>
        {description && <div style={{ fontSize: '12px', color: colors.muted, marginTop: 3 }}>{description}</div>}
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: '11px', color: colors.muted }}>Progress</span>
          <span style={{ fontSize: '11px', fontFamily: fonts.mono, color: pc }}>{progress}%</span>
        </div>
        <div style={{ height: 6, background: colors.bg3, borderRadius: radius.full, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: pc, borderRadius: radius.full, transition: 'width 0.4s ease' }} />
        </div>
        {totalLessons !== undefined && <div style={{ fontSize: '10px', color: colors.subtle, marginTop: 5 }}>{completedLessons ?? 0} / {totalLessons} lessons</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: spacing[2] }}>{actions}</div>}
    </div>
  )
}

export function WorkBlockWrapper({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: spacing[5], marginBottom: spacing[5], ...style }}>{children}</div>
}

export function SummaryCountTable({ rows, title, style }: {
  rows: { label: string; value: string | number; color?: string }[]; title?: string; style?: CSSProperties
}) {
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.xl, overflow: 'hidden', ...style }}>
      {title && <div style={{ padding: `${spacing[3]} ${spacing[4]}`, borderBottom: `1px solid ${colors.border}`, fontSize: '12px', fontWeight: 600, color: colors.text }}>{title}</div>}
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${spacing[2]} ${spacing[4]}`, borderBottom: i < rows.length - 1 ? `1px solid ${colors.border}` : undefined }}>
          <span style={{ fontSize: '12px', color: colors.muted }}>{row.label}</span>
          <span style={{ fontSize: '13px', fontFamily: fonts.mono, fontWeight: 700, color: row.color ?? colors.text }}>{row.value}</span>
        </div>
      ))}
    </div>
  )
}
