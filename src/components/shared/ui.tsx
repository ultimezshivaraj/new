'use client'

import { ReactNode } from 'react'

// ── Badge ────────────────────────────────────────────────────
interface BadgeProps {
  label:   string
  color:   string   // text colour e.g. '#22c55e'
  bg:      string   // bg colour  e.g. '#22c55e22'
  mono?:   boolean  // use monospace font (default true)
}
export function Badge({ label, color, bg, mono = true }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 10,
      fontSize: 10, fontWeight: 500, lineHeight: 1.5,
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      color, background: bg,
    }}>
      {label}
    </span>
  )
}

// ── Spinner ──────────────────────────────────────────────────
export function Spinner({ text = 'Loading from BigQuery…' }: { text?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 48, color: 'var(--text2)', fontSize: 13 }}>
      <div style={{ fontSize: 24, marginBottom: 8, display: 'inline-block',
        animation: 'qd-spin 1s linear infinite' }}>⟳</div>
      <div>{text}</div>
      <style>{`@keyframes qd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── LoadButton ───────────────────────────────────────────────
interface LoadButtonProps {
  onClick:   () => void
  loading?:  boolean
  children:  ReactNode
}
export function LoadButton({ onClick, loading, children }: LoadButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={!!loading}
      style={{
        background: loading ? 'var(--bg3)' : 'linear-gradient(135deg,#f59e0b,#ef4444)',
        color: loading ? 'var(--text2)' : '#fff',
        border: 'none', borderRadius: 8,
        padding: '9px 18px', fontSize: 12, fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-sans)',
        transition: 'all .15s',
      }}
    >
      {loading ? 'Loading…' : children}
    </button>
  )
}

// ── EmptyState ───────────────────────────────────────────────
interface EmptyStateProps {
  icon:   string
  title:  string
  desc?:  string
}
export function EmptyState({ icon, title, desc }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: 56, color: 'var(--text2)' }}>
      <div style={{ fontSize: 30, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
      {desc && <div style={{ fontSize: 13 }}>{desc}</div>}
    </div>
  )
}
