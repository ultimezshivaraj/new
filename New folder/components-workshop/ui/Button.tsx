'use client'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { colors, fonts, radius } from '../lib/theme'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
export type ButtonSize    = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; size?: ButtonSize; mono?: boolean
  loading?: boolean; leftIcon?: ReactNode; rightIcon?: ReactNode; fullWidth?: boolean
}

const V: Record<ButtonVariant, CSSProperties> = {
  primary:   { background: colors.accent, color: '#fff',       border: `1px solid ${colors.accent}`  },
  secondary: { background: colors.bg3,    color: colors.muted, border: `1px solid ${colors.border2}` },
  ghost:     { background: 'transparent', color: colors.muted, border: '1px solid transparent'       },
  danger:    { background: colors.red,    color: '#fff',       border: `1px solid ${colors.red}`     },
  success:   { background: colors.green,  color: '#fff',       border: `1px solid ${colors.green}`   },
}
const S: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '5px 12px',  fontSize: '11px', borderRadius: radius.sm },
  md: { padding: '8px 18px',  fontSize: '13px', borderRadius: radius.md },
  lg: { padding: '10px 24px', fontSize: '14px', borderRadius: radius.md },
}

export function Button({ children, variant = 'primary', size = 'md', mono = false, loading = false, leftIcon, rightIcon, fullWidth = false, disabled, style, ...rest }: ButtonProps) {
  return (
    <button disabled={disabled || loading} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
      fontFamily: mono ? fonts.mono : fonts.sans, fontWeight: 600,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.4 : 1,
      transition: 'opacity 0.2s', whiteSpace: 'nowrap',
      width: fullWidth ? '100%' : undefined,
      ...V[variant], ...S[size], ...style,
    }} {...rest}>
      {loading
        ? <span style={{ width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
        : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}

export const CopyButton      = ({ onClick }: { onClick?: () => void }) => <Button variant="ghost"     size="sm" mono onClick={onClick} style={{ color: colors.accent }}>Copy</Button>
export const ExportCsvButton = ({ onClick }: { onClick?: () => void }) => <Button variant="secondary" size="sm" mono onClick={onClick}>⬇ CSV</Button>
export const ApplyButton     = ({ onClick }: { onClick?: () => void }) => <Button variant="primary"   size="md" onClick={onClick}>Apply</Button>
