'use client'
// Replaces the entire .modal-overlay block from admin.html
// Handles both Create (no report) and Edit (report provided) modes.
// Fields: name, description, category (select), sort_order, sql_query (textarea)

import { useEffect, useRef, useState } from 'react'
import type { Report } from '@/types/api'

// Categories from the original <select> options in admin.html
const CATEGORIES = [
  'Content',
  'SEO',
  'Companies',
  'Courses',
  'Users',
  'Analytics',
  'Agent',
  'Fact Check',
  'General',
]

interface ReportModalProps {
  report:   Report | null   // null = create mode, Report = edit mode
  onSave:   (data: ReportFormData) => Promise<void>
  onClose:  () => void
}

export interface ReportFormData {
  id?:         string
  name:        string
  description: string
  category:    string
  sort_order:  number
  sql_query:   string
}

export function ReportModal({ report, onSave, onClose }: ReportModalProps) {
  // Initialise form from report (edit) or blank (create)
  const [name,        setName]       = useState(report?.name        ?? '')
  const [description, setDesc]       = useState(report?.description ?? '')
  const [category,    setCategory]   = useState(report?.category    ?? 'General')
  const [sortOrder,   setSortOrder]  = useState(report?.sort_order  ?? 0)
  const [sqlQuery,    setSqlQuery]   = useState(report?.sql_query   ?? '')
  const [saving,      setSaving]     = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const isEdit = Boolean(report)

  // Escape key closes modal — matches addEventListener('keydown') in admin.html
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSave() {
    if (!name.trim() || !sqlQuery.trim()) return
    setSaving(true)
    try {
      await onSave({
        id:          report?.id,
        name:        name.trim(),
        description: description.trim(),
        category,
        sort_order:  Number(sortOrder) || 0,
        sql_query:   sqlQuery.trim(),
      })
    } finally {
      setSaving(false)
    }
  }

  // Click on backdrop closes modal
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      className="modal-backdrop"
      onClick={handleOverlayClick}
    >
      <div
        style={{
          background:   'var(--bg2)',
          border:       '1px solid var(--border)',
          borderRadius: '16px',
          width:        '100%',
          maxWidth:     '700px',
          maxHeight:    '90vh',
          overflowY:    'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex justify-between items-center px-6 py-[18px]"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--text)' }}
          >
            {isEdit ? 'Edit Report' : 'Create New Report'}
          </h2>
          <button
            onClick={onClose}
            className="text-xl px-2 py-1 transition-colors"
            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)' }}
          >
            &times;
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-6 flex flex-col gap-[18px]">

          {/* Report Name */}
          <Field label="Report Name">
            <Input
              value={name}
              onChange={setName}
              placeholder="e.g., Content Audit"
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <Input
              value={description}
              onChange={setDesc}
              placeholder="What does this report show?"
            />
          </Field>

          {/* Category + Sort Order — two columns */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{
                  width:        '100%',
                  background:   'var(--input-bg)',
                  border:       '1px solid var(--border2)',
                  color:        'var(--text)',
                  padding:      '10px 14px',
                  borderRadius: '8px',
                  fontSize:     '14px',
                  fontFamily:   'inherit',
                  outline:      'none',
                  cursor:       'pointer',
                  transition:   'border 0.2s',
                }}
                onFocus={e  => { (e.target as HTMLSelectElement).style.borderColor = 'var(--accent-c)' }}
                onBlur={e   => { (e.target as HTMLSelectElement).style.borderColor = 'var(--border2)' }}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <Field label="Sort Order">
              <Input
                type="number"
                value={String(sortOrder)}
                onChange={v => setSortOrder(Number(v))}
                placeholder="0"
              />
            </Field>
          </div>

          {/* SQL Query */}
          <Field label="SQL Query">
            <textarea
              className="code-area form-input w-full"
              value={sqlQuery}
              onChange={e => setSqlQuery(e.target.value)}
              placeholder="SELECT ..."
              style={{
                background:   'var(--input-bg)',
                border:       '1px solid var(--border2)',
                borderRadius: '8px',
                padding:      '10px 14px',
                outline:      'none',
                transition:   'border 0.2s',
                width:        '100%',
              }}
              onFocus={e  => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--accent-c)' }}
              onBlur={e   => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border2)' }}
            />
          </Field>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex justify-end gap-2 px-6 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {/* Cancel */}
          <button
            onClick={onClose}
            className="text-[13px] font-semibold px-5 py-[10px] rounded-lg transition-all"
            style={{
              background:   'var(--bg3)',
              border:       '1px solid var(--border2)',
              color:        'var(--text2)',
              cursor:       'pointer',
              fontFamily:   'inherit',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.borderColor = 'var(--accent-c)'
              el.style.color       = 'var(--accent-c)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.borderColor = 'var(--border2)'
              el.style.color       = 'var(--text2)'
            }}
          >
            Cancel
          </button>

          {/* Save — gradient, disabled while saving */}
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !sqlQuery.trim()}
            className="btn-gradient text-[13px] font-semibold px-5 py-[10px] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save Report'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Field — label wrapper matching .form-group
// ─────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block text-[12px] font-semibold uppercase tracking-[0.5px] mb-[6px]"
        style={{ color: 'var(--text2)' }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────
// Input — styled text/number input matching .form-input
// ─────────────────────────────────────────────
interface InputProps {
  value:       string
  onChange:    (v: string) => void
  placeholder?: string
  type?:        string
}

function Input({ value, onChange, placeholder, type = 'text' }: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width:        '100%',
        background:   'var(--input-bg)',
        border:       '1px solid var(--border2)',
        color:        'var(--text)',
        padding:      '10px 14px',
        borderRadius: '8px',
        fontSize:     '14px',
        fontFamily:   'inherit',
        outline:      'none',
        transition:   'border 0.2s',
      }}
      onFocus={e  => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent-c)' }}
      onBlur={e   => { (e.target as HTMLInputElement).style.borderColor = 'var(--border2)' }}
    />
  )
}
