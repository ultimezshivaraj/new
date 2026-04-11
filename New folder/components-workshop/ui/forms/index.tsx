'use client'
import type { CSSProperties, ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'
import { useId } from 'react'
import { colors, fonts, radius, spacing } from '../../lib/theme'

const fieldBase: CSSProperties = { background: colors.bg3, border: `1px solid ${colors.border2}`, color: colors.text, fontFamily: fonts.sans, fontSize: '13px', borderRadius: radius.md, outline: 'none', width: '100%', transition: 'border-color 0.2s' }

function Field({ label, required, helper, error, htmlFor, children, style }: { label?: string; required?: boolean; helper?: string; error?: string; htmlFor?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }}>
      {label && <label htmlFor={htmlFor} style={{ fontSize: '12px', fontWeight: 500, color: error ? colors.red : colors.text }}>{label}{required && <span style={{ color: colors.red, marginLeft: 3 }}>*</span>}</label>}
      {children}
      {(helper || error) && <span style={{ fontSize: '11px', color: error ? colors.red : colors.muted }}>{error ?? helper}</span>}
    </div>
  )
}

export function FormWrapper({ children, title, subtitle, onSubmit, style }: { children: ReactNode; title?: string; subtitle?: string; onSubmit?: (e: React.FormEvent) => void; style?: CSSProperties }) {
  return (
    <form onSubmit={onSubmit} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.xl, overflow: 'hidden', ...style }}>
      {(title || subtitle) && (
        <div style={{ padding: `${spacing[4]} ${spacing[5]}`, borderBottom: `1px solid ${colors.border}` }}>
          {title && <div style={{ fontWeight: 600, fontSize: '15px', color: colors.text }}>{title}</div>}
          {subtitle && <div style={{ fontSize: '12px', color: colors.muted, marginTop: 3 }}>{subtitle}</div>}
        </div>
      )}
      <div style={{ padding: spacing[5] }}>{children}</div>
    </form>
  )
}

export function TextInput({ label, helper, error, leftIcon, rightIcon, mono = false, onChange, containerStyle, style, ...rest }: { label?: string; helper?: string; error?: string; leftIcon?: ReactNode; rightIcon?: ReactNode; mono?: boolean; onChange?: (v: string) => void; containerStyle?: CSSProperties } & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const id = useId()
  return (
    <Field label={label} required={rest.required} helper={helper} error={error} htmlFor={id} style={containerStyle}>
      <div style={{ position: 'relative' }}>
        {leftIcon && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.muted, pointerEvents: 'none' }}>{leftIcon}</span>}
        <input id={id} type="text" onChange={e => onChange?.(e.target.value)} style={{ ...fieldBase, fontFamily: mono ? fonts.mono : fonts.sans, padding: `9px ${rightIcon ? '36px' : '12px'} 9px ${leftIcon ? '36px' : '12px'}`, borderColor: error ? colors.red : colors.border2, ...style }} onFocus={e => { if (!error) e.currentTarget.style.borderColor = colors.accent }} onBlur={e => { e.currentTarget.style.borderColor = error ? colors.red : colors.border2 }} {...rest} />
        {rightIcon && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: colors.muted, pointerEvents: 'none' }}>{rightIcon}</span>}
      </div>
    </Field>
  )
}

export function NumberInput({ label, helper, error, onChange, containerStyle, style, ...rest }: { label?: string; helper?: string; error?: string; onChange?: (v: number) => void; containerStyle?: CSSProperties } & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'>) {
  const id = useId()
  return (
    <Field label={label} required={rest.required} helper={helper} error={error} htmlFor={id} style={containerStyle}>
      <input id={id} type="number" onChange={e => onChange?.(Number(e.target.value))} style={{ ...fieldBase, padding: '9px 12px', fontFamily: fonts.mono, borderColor: error ? colors.red : colors.border2, ...style }} onFocus={e => { if (!error) e.currentTarget.style.borderColor = colors.accent }} onBlur={e => { e.currentTarget.style.borderColor = error ? colors.red : colors.border2 }} {...rest} />
    </Field>
  )
}

export function Textarea({ label, helper, error, onChange, containerStyle, style, rows = 4, ...rest }: { label?: string; helper?: string; error?: string; onChange?: (v: string) => void; containerStyle?: CSSProperties } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'>) {
  const id = useId()
  return (
    <Field label={label} required={rest.required} helper={helper} error={error} htmlFor={id} style={containerStyle}>
      <textarea id={id} rows={rows} onChange={e => onChange?.(e.target.value)} style={{ ...fieldBase, padding: '9px 12px', resize: 'vertical', borderColor: error ? colors.red : colors.border2, ...style }} onFocus={e => { if (!error) e.currentTarget.style.borderColor = colors.accent }} onBlur={e => { e.currentTarget.style.borderColor = error ? colors.red : colors.border2 }} {...rest} />
    </Field>
  )
}

export function SelectInput({ label, helper, error, options, placeholder, onChange, containerStyle, style, ...rest }: { label?: string; helper?: string; error?: string; options: { value: string; label: string; disabled?: boolean }[]; placeholder?: string; onChange?: (v: string) => void; containerStyle?: CSSProperties } & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'>) {
  const id = useId()
  return (
    <Field label={label} required={rest.required} helper={helper} error={error} htmlFor={id} style={containerStyle}>
      <select id={id} onChange={e => onChange?.(e.target.value)} style={{ ...fieldBase, padding: '9px 12px', cursor: 'pointer', colorScheme: 'dark', borderColor: error ? colors.red : colors.border2, ...style }} onFocus={e => { if (!error) e.currentTarget.style.borderColor = colors.accent }} onBlur={e => { e.currentTarget.style.borderColor = error ? colors.red : colors.border2 }} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
      </select>
    </Field>
  )
}

export function Checkbox({ label, helper, checked, onChange, containerStyle, ...rest }: { label: string; helper?: string; checked?: boolean; onChange?: (v: boolean) => void; containerStyle?: CSSProperties } & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'>) {
  const id = useId()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...containerStyle }}>
      <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: colors.text }}>
        <input id={id} type="checkbox" checked={checked} onChange={e => onChange?.(e.target.checked)} style={{ accentColor: colors.accent, width: 15, height: 15, cursor: 'pointer' }} {...rest} />
        {label}
      </label>
      {helper && <span style={{ fontSize: '11px', color: colors.muted, paddingLeft: 23 }}>{helper}</span>}
    </div>
  )
}

export function FileInput({ label, helper, error, accept, onChange, containerStyle, ...rest }: { label?: string; helper?: string; error?: string; accept?: string; onChange?: (files: FileList | null) => void; containerStyle?: CSSProperties } & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'>) {
  const id = useId()
  return (
    <Field label={label} required={rest.required} helper={helper} error={error} htmlFor={id} style={containerStyle}>
      <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: spacing[3], padding: '9px 12px', background: colors.bg3, border: `1px dashed ${error ? colors.red : colors.border2}`, borderRadius: radius.md, cursor: 'pointer', color: colors.muted, fontSize: '13px' }}>
        <span>📎</span><span>Click to browse or drag & drop</span>
        <input id={id} type="file" accept={accept} onChange={e => onChange?.(e.target.files)} style={{ display: 'none' }} {...rest} />
      </label>
    </Field>
  )
}

export function DatetimeInput({ label, helper, error, type = 'date', onChange, containerStyle, style, ...rest }: { label?: string; helper?: string; error?: string; type?: 'date' | 'datetime-local' | 'time'; onChange?: (v: string) => void; containerStyle?: CSSProperties } & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'>) {
  const id = useId()
  return (
    <Field label={label} required={rest.required} helper={helper} error={error} htmlFor={id} style={containerStyle}>
      <input id={id} type={type} onChange={e => onChange?.(e.target.value)} style={{ ...fieldBase, fontFamily: fonts.mono, padding: '8px 12px', cursor: 'pointer', colorScheme: 'dark', borderColor: error ? colors.red : colors.border2, ...style }} onFocus={e => { if (!error) e.currentTarget.style.borderColor = colors.accent }} onBlur={e => { e.currentTarget.style.borderColor = error ? colors.red : colors.border2 }} {...rest} />
    </Field>
  )
}

export function FormRow({ children, columns = 2, style }: { children: ReactNode; columns?: number; style?: CSSProperties }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: spacing[4], ...style }}>{children}</div>
}

export function FormDivider({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], margin: `${spacing[5]} 0` }}>
      <div style={{ flex: 1, height: 1, background: colors.border }} />
      {label && <span style={{ fontSize: '9px', fontFamily: fonts.mono, textTransform: 'uppercase', letterSpacing: '1.5px', color: colors.subtle, whiteSpace: 'nowrap' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: colors.border }} />
    </div>
  )
}
