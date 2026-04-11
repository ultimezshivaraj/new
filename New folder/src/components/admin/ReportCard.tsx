'use client'
// Replaces the card HTML template inside render() from admin.html:
//   <div class="card">...</div>
//
// Each card shows: name, category badge, description, SQL preview,
// and action buttons: Edit | Test Run | Copy SQL | Delete

import type { Report } from '@/types/api'

interface ReportCardProps {
  report:    Report
  onEdit:    (report: Report) => void
  onTest:    (id: string)     => void
  onCopy:    (id: string)     => void
  onDelete:  (id: string)     => void
}

export function ReportCard({ report, onEdit, onTest, onCopy, onDelete }: ReportCardProps) {
  return (
    <div
      className="report-card cursor-pointer relative"
      style={{
        background:   'var(--bg2)',
        border:       '1px solid var(--border)',
        borderRadius: '12px',
        padding:      '18px',
      }}
      onClick={() => onEdit(report)}
    >
      {/* ── Header: name + category badge ── */}
      <div className="flex justify-between items-start mb-[10px] gap-2">
        <div
          className="text-[15px] font-semibold leading-snug"
          style={{ color: 'var(--text)' }}
        >
          {report.name}
        </div>
        <div
          className="text-[10px] px-2 py-[3px] rounded uppercase tracking-[0.5px] shrink-0"
          style={{
            background: 'var(--bg3)',
            color:      'var(--text3)',
          }}
        >
          {report.category ?? 'General'}
        </div>
      </div>

      {/* ── Description ── */}
      {report.description && (
        <div
          className="text-[13px] leading-[1.5] mb-3"
          style={{ color: 'var(--text3)' }}
        >
          {report.description}
        </div>
      )}

      {/* ── SQL preview — first 150 chars ── */}
      <div className="card-query-preview">
        {(report.sql_query ?? '').substring(0, 150)}
      </div>

      {/* ── Action buttons ── */}
      <div
        className="flex gap-[6px] mt-3"
        onClick={e => e.stopPropagation()}   // don't trigger card click
      >
        {/* Edit */}
        <CardButton onClick={() => onEdit(report)}>Edit</CardButton>

        {/* Test Run */}
        <CardButton onClick={() => onTest(report.id)}>Test Run</CardButton>

        {/* Copy SQL */}
        <CardButton onClick={() => onCopy(report.id)}>Copy SQL</CardButton>

        {/* Delete — danger variant */}
        <CardButton danger onClick={() => onDelete(report.id)}>Delete</CardButton>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// CardButton — small action button matching .card-btn
// ─────────────────────────────────────────────
interface CardButtonProps {
  onClick:   () => void
  children:  React.ReactNode
  danger?:   boolean
}

function CardButton({ onClick, children, danger = false }: CardButtonProps) {
  return (
    <button
      onClick={onClick}
      className="text-[11px] px-3 py-[5px] rounded-md transition-all duration-150"
      style={{
        border:     '1px solid var(--border2)',
        background: 'var(--bg3)',
        color:      'var(--text2)',
        fontFamily: 'inherit',
        cursor:     'pointer',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.borderColor = danger ? '#ef4444' : 'var(--accent-c)'
        el.style.color       = danger ? '#ef4444' : 'var(--accent-c)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.borderColor = 'var(--border2)'
        el.style.color       = 'var(--text2)'
      }}
    >
      {children}
    </button>
  )
}
