'use client'
// Full port of admin.html's inline <script> block.
// Manages: report state, load, save, delete, test run, copy SQL,
// modal open/close, API key prompt, and orchestrates all sub-components.

import { useCallback, useEffect, useState } from 'react'
import { Nav }         from '@/components/admin/Nav'
import { StatsBar }    from '@/components/admin/StatsBar'
import { ReportCard }  from '@/components/admin/ReportCard'
import { ReportModal, type ReportFormData } from '@/components/admin/ReportModal'
import { useToast }    from '@/components/Toast'
import { useApiKey, buildHeaders } from '@/lib/useApiKey'
import type { Report, ReportsListResponse } from '@/types/api'

export function AdminPage() {
  const [reports,       setReports]       = useState<Report[]>([])
  const [loading,       setLoading]       = useState(false)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  // Key prompt state — shown when no key is stored
  const [keyInput,      setKeyInput]      = useState('')
  const [keyError,      setKeyError]      = useState('')

  const { showToast }               = useToast()
  const { apiKey, setKey, isReady } = useApiKey()

  // ─────────────────────────────────────────
  // loadReports — GET /api/reports
  // Fires once localStorage read is complete AND a key exists
  // ─────────────────────────────────────────
  const loadReports = useCallback(async (key: string) => {
    setLoading(true)
    try {
      const res  = await fetch('/api/reports', { headers: buildHeaders(key) })
      const data = await res.json() as ReportsListResponse
      if (data.success) {
        setReports(data.reports)
      } else {
        showToast(data.error ?? 'Failed to load reports', 'error')
      }
    } catch {
      showToast('Failed to load — check your API key', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  // Trigger load as soon as localStorage has been read and key exists
  useEffect(() => {
    if (isReady && apiKey) void loadReports(apiKey)
  }, [isReady, apiKey, loadReports])

  // ─────────────────────────────────────────
  // handleKeySubmit — saves the API key and
  // immediately fires the first data load
  // ─────────────────────────────────────────
  async function handleKeySubmit() {
    const trimmed = keyInput.trim()
    if (!trimmed) { setKeyError('Please enter your API key'); return }
    setKeyError('')
    setKey(trimmed)          // persists to localStorage + updates state
    await loadReports(trimmed) // fire immediately — don't wait for useEffect
  }

  // ─────────────────────────────────────────
  // openModal — called by FAB (create) or card Edit button
  // ─────────────────────────────────────────
  function openCreate() {
    setEditingReport(null)
    setModalOpen(true)
  }

  function openEdit(report: Report) {
    setEditingReport(report)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingReport(null)
  }

  // ─────────────────────────────────────────
  // saveReport — POST /api/reports
  // ─────────────────────────────────────────
  async function saveReport(formData: ReportFormData) {
    if (!formData.name || !formData.sql_query) {
      showToast('Name and query required', 'error')
      return
    }
    try {
      const res  = await fetch('/api/reports', {
        method:  'POST',
        headers: buildHeaders(apiKey),
        body:    JSON.stringify(formData),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (data.success) {
        showToast('Report saved!', 'success')
        closeModal()
        await loadReports(apiKey)
      } else {
        showToast(data.error ?? 'Save failed', 'error')
      }
    } catch {
      showToast('Save failed', 'error')
    }
  }

  // ─────────────────────────────────────────
  // deleteReport — DELETE /api/reports
  // ─────────────────────────────────────────
  async function deleteReport(id: string) {
    if (!confirm('Delete this report?')) return
    try {
      const res  = await fetch('/api/reports', {
        method:  'DELETE',
        headers: buildHeaders(apiKey),
        body:    JSON.stringify({ id }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (data.success) {
        showToast('Deleted', 'success')
        await loadReports(apiKey)
      } else {
        showToast(data.error ?? 'Delete failed', 'error')
      }
    } catch {
      showToast('Delete failed', 'error')
    }
  }

  // ─────────────────────────────────────────
  // testReport — POST /api/run-report (limit 5)
  // ─────────────────────────────────────────
  async function testReport(id: string) {
    showToast('Running…', 'success')
    try {
      const res  = await fetch('/api/run-report', {
        method:  'POST',
        headers: buildHeaders(apiKey),
        body:    JSON.stringify({ reportId: id, limit: 5 }),
      })
      const data = await res.json() as { success: boolean; rowCount?: number; duration?: string; error?: string }
      if (data.success) {
        showToast(`OK! ${data.rowCount} rows in ${data.duration}`, 'success')
      } else {
        showToast(data.error ?? 'Test failed', 'error')
      }
    } catch {
      showToast('Test failed', 'error')
    }
  }

  // ─────────────────────────────────────────
  // copyQuery — clipboard write
  // ─────────────────────────────────────────
  function copyQuery(id: string) {
    const report = reports.find(r => r.id === id)
    if (!report) return
    navigator.clipboard.writeText(report.sql_query)
      .then(() => showToast('SQL copied!', 'success'))
      .catch(() => showToast('Copy failed', 'error'))
  }

  // ─────────────────────────────────────────
  // GUARD: wait for localStorage read to finish
  // ─────────────────────────────────────────
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span style={{ color: 'var(--text4)', fontSize: '14px' }}>Loading…</span>
      </div>
    )
  }

  // ─────────────────────────────────────────
  // KEY PROMPT: shown when no API key is stored
  // Replaces the hardcoded fallback from admin.html
  // ─────────────────────────────────────────
  if (!apiKey) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          style={{
            background:   'var(--bg2)',
            border:       '1px solid var(--border)',
            borderRadius: '16px',
            padding:      '36px',
            width:        '100%',
            maxWidth:     '420px',
          }}
        >
          {/* Logo / title */}
          <div className="mb-2 text-xl font-bold" style={{ color: 'var(--accent-c)' }}>
            Admin Dashboard
          </div>
          <p className="text-sm mb-6" style={{ color: 'var(--text3)' }}>
            Enter your admin API key to continue. It will be stored locally in your browser.
          </p>

          {/* Key input */}
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text2)' }}>
            API Key
          </label>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleKeySubmit()}
            placeholder="coinpedia-admin-••••••"
            autoFocus
            style={{
              width:        '100%',
              background:   'var(--input-bg)',
              border:       `1px solid ${keyError ? '#ef4444' : 'var(--border2)'}`,
              color:        'var(--text)',
              padding:      '10px 14px',
              borderRadius: '8px',
              fontSize:     '14px',
              fontFamily:   'inherit',
              outline:      'none',
              marginBottom: keyError ? '6px' : '16px',
            }}
          />

          {keyError && (
            <p className="text-xs mb-4" style={{ color: '#fca5a5' }}>{keyError}</p>
          )}

          <button
            onClick={handleKeySubmit}
            disabled={loading}
            className="btn-gradient w-full text-sm font-semibold py-[10px] rounded-lg disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Connect'}
          </button>

          {/* Change key link — shown when key exists but user wants to reset */}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────
  return (
    <div
      className="max-w-[1200px] mx-auto px-6 py-6 relative"
      style={{ minHeight: '100vh' }}
    >
      {/* Nav */}
      <Nav />

      {/* Stats */}
      <StatsBar reports={reports} />

      {/* Change key — subtle link for when the stored key needs updating */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs" style={{ color: 'var(--text4)' }}>
          Logged in with stored API key
        </p>
        <button
          onClick={() => { setKey(''); setReports([]) }}
          className="text-xs transition-colors"
          style={{ background: 'none', border: 'none', color: 'var(--text4)', cursor: 'pointer' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-c)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text4)' }}
        >
          Change key
        </button>
      </div>

      {/* Reports grid — matches .grid auto-fill minmax(340px,1fr) */}
      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--text4)' }}>
          Loading reports…
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--text4)' }}>
          No reports yet. Click + to create one.
        </div>
      ) : (
        <div
          className="grid gap-4 mb-6"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}
        >
          {reports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onEdit={openEdit}
              onTest={testReport}
              onCopy={copyQuery}
              onDelete={deleteReport}
            />
          ))}
        </div>
      )}

      {/* FAB — floating action button, fixed bottom-right */}
      <button
        className="fab"
        onClick={openCreate}
        title="Create New Report"
        aria-label="Create New Report"
      >
        +
      </button>

      {/* Modal — only rendered when open */}
      {modalOpen && (
        <ReportModal
          report={editingReport}
          onSave={saveReport}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
