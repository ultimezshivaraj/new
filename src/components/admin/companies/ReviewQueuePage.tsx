'use client'
// src/components/admin/companies/ReviewQueuePage.tsx

import { useState, useCallback, useEffect } from 'react'
import PageShell from '@/components/shared/PageShell'
import StatCard  from '@/components/shared/StatCard'
import { SessionPayload } from '@/lib/session'
import type { QueueResponse, QueueCompanySummary, EnrichmentRow, ReviewAction } from '@/types/companies'

function adminHeaders(): HeadersInit {
  const key = typeof window !== 'undefined' ? (localStorage.getItem('adminKey') ?? '') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
}

// ── Constants outside component to avoid re-creation on every render ──────────
const SEC_COLORS: Record<string, { color: string; bg: string }> = {
  about:    { color: '#f59e0b', bg: '#f59e0b11' },
  details:  { color: '#3b82f6', bg: '#3b82f611' },
  funding:  { color: '#8b5cf6', bg: '#8b5cf611' },
  team:     { color: '#22c55e', bg: '#22c55e11' },
  products: { color: '#f59e0b', bg: '#f59e0b11' },
}

const STATUS_COLORS: Record<string, string> = {
  pending:  '#f59e0b',
  approved: '#3b82f6',
  edited:   '#3b82f6',
  merged:   '#22c55e',
  rejected: '#ef4444',
}

const TH: React.CSSProperties = {
  padding: '8px 12px', fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1,
  textTransform: 'uppercase', color: 'var(--text2)', background: 'var(--bg3)',
  textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
}

// Proper past tense for toast messages
const ACTION_PAST: Record<string, string> = {
  approve:      'approved',
  reject:       'rejected',
  edit:         'edited',
  bulk_approve: 'approved',
  bulk_reject:  'rejected',
  reset:        'reset',
}

// EnrichmentRow from the queue API includes company_id even though the base
// type doesn't — extend it locally rather than polluting the shared type
type QueueRow = EnrichmentRow & { company_id: string }

interface Props {
  session:    SessionPayload
  companyId?: string
}

interface EditModal {
  row:        QueueRow
  finalValue: string
  notes:      string
}

export default function ReviewQueuePage({ session, companyId: initCompanyId }: Props) {
  const [data, setData]             = useState<QueueResponse | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [statusFilter, setStatus]   = useState('pending')
  const [sectionFilter, setSection] = useState('')
  const [companyFilter]             = useState(initCompanyId || '')
  const [expanded, setExpanded]     = useState<Set<string>>(new Set())
  const [editModal, setEditModal]   = useState<EditModal | null>(null)
  const [toast, setToast]           = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [busy, setBusy]             = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const params = new URLSearchParams({ status: statusFilter, limit: '200' })
    if (sectionFilter)  params.set('section',    sectionFilter)
    if (companyFilter)  params.set('company_id', companyFilter)
    try {
      const res = await fetch(`/api/admin/companies/queue?${params}`, { headers: adminHeaders() })
      const d: QueueResponse = await res.json()
      if (!d.success) throw new Error((d as { error?: string }).error || 'API error')
      setData(d)
      // Auto-expand when only one company is returned
      if (d.companies.length === 1) setExpanded(new Set([d.companies[0].company_id]))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, sectionFilter, companyFilter])

  useEffect(() => { load() }, [load])

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function doReview(
    action:     ReviewAction,
    rowId?:     string,
    companyId?: string,
    section?:   string,
    finalValue?: string,
    notes?:     string,
  ) {
    const key = rowId || companyId || 'bulk'
    setBusy(prev => new Set(prev).add(key))
    try {
      const res = await fetch('/api/admin/companies/review', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          action,
          id:           rowId,
          company_id:   companyId,
          section,
          reviewed_by:  session.name || 'Admin',
          final_value:  finalValue,
          review_notes: notes,
        }),
      })
      const d = await res.json()
      if (d.success) {
        // Use proper past tense — avoids "approvedd", "rejectedd" etc.
        const pastTense = ACTION_PAST[action] || action
        showToast(`✓ ${d.rows_updated} row(s) ${pastTense}`, 'success')
        setEditModal(null)
        load()
      } else {
        showToast(d.error || 'Action failed', 'error')
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setBusy(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  function toggleExpanded(companyId: string) {
    setExpanded(prev => {
      const n = new Set(prev)
      n.has(companyId) ? n.delete(companyId) : n.add(companyId)
      return n
    })
  }

  return (
    <PageShell panel="admin" session={session} activeKey="companies" title="Admin Dashboard" subtitle="Review Queue">

      {/* ── Inner header ── */}
      <div style={{ margin: '-24px -24px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ padding: '14px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Review Queue</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>Approve, edit or reject AI-staged enrichment data</div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Status filter pills */}
            {(['all', 'pending', 'approved', 'merged', 'rejected'] as const).map(s => (
              <button key={s} onClick={() => setStatus(s)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                  border: `1px solid ${statusFilter === s ? '#f59e0b44' : 'var(--border2)'}`,
                  background: statusFilter === s ? '#f59e0b11' : 'var(--bg3)',
                  color: statusFilter === s ? '#f59e0b' : 'var(--text3)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}

            {/* Section filter */}
            <select
              value={sectionFilter}
              onChange={e => setSection(e.target.value)}
              style={{
                padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border2)',
                background: 'var(--bg3)', color: 'var(--text2)', fontSize: 11,
                fontFamily: 'var(--font-sans)', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="">All sections</option>
              {['about', 'details', 'funding', 'team', 'products'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <button onClick={load}
              style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--text2)', fontSize: 11, cursor: 'pointer' }}>
              ↻
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      {data?.summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total Rows"  value={data.summary.total_rows}      color="var(--accent-c)" />
          <StatCard label="Pending"     value={data.summary.pending}         color="#f59e0b" />
          <StatCard label="Approved"    value={data.summary.approved}        color="#3b82f6" />
          <StatCard label="Merged"      value={data.summary.merged}          color="#22c55e" />
          <StatCard label="Companies"   value={data.summary.companies_count} color="#8b5cf6" />
        </div>
      )}

      {/* ── Loading / error / empty states ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
          <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--accent-c)', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
          Loading queue…
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>⚠ {error}</div>
      ) : !data || data.companies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
          <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.3 }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Queue is empty</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>No rows match the current filters</div>
        </div>
      ) : (
        // ── Company groups ──
        data.companies.map((co: QueueCompanySummary) => {
          const isOpen  = expanded.has(co.company_id)
          // Cast to QueueRow since company_id is present on queue API rows
          const coRows  = (data.rows as QueueRow[]).filter(r => r.company_id === co.company_id)
          const isBusy  = busy.has(co.company_id)

          return (
            <div key={co.company_id} style={{ marginBottom: 16 }}>

              {/* ── Company header ── */}
              <div
                onClick={() => toggleExpanded(co.company_id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: isOpen ? '10px 10px 0 0' : 10, cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 10, color: 'var(--text3)', transition: 'transform .2s', transform: isOpen ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{co.company_name}</span>
                  {co.company_url && (
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginLeft: 8 }}>{co.company_url}</span>
                  )}
                </div>

                {/* Status badge counts */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {co.pending  > 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: '#f59e0b11', color: '#f59e0b', border: '1px solid #f59e0b44' }}>{co.pending} pending</span>}
                  {co.approved > 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: '#3b82f611', color: '#3b82f6', border: '1px solid #3b82f644' }}>{co.approved} approved</span>}
                  {co.merged   > 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: '#22c55e11', color: '#22c55e', border: '1px solid #22c55e44' }}>{co.merged} merged</span>}
                </div>

                {/* Bulk approve button — stop propagation so it doesn't toggle expand */}
                {co.pending > 0 && (
                  <button
                    disabled={isBusy}
                    onClick={e => { e.stopPropagation(); doReview('bulk_approve', undefined, co.company_id) }}
                    style={{
                      padding: '4px 12px', borderRadius: 6, fontSize: 11,
                      cursor: isBusy ? 'not-allowed' : 'pointer',
                      border: '1px solid #22c55e44', background: '#22c55e11', color: '#22c55e',
                      fontFamily: 'var(--font-sans)', fontWeight: 500,
                    }}
                  >
                    ✓ Approve all
                  </button>
                )}
              </div>

              {/* ── Rows table ── */}
              {isOpen && (
                <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>

                  {/* Table header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 130px 1fr 1fr 80px 140px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                    {['Section', 'Field', 'Current', 'Agent Value', 'Conf.', 'Actions'].map(h => (
                      <div key={h} style={TH}>{h}</div>
                    ))}
                  </div>

                  {coRows.map((row: QueueRow) => {
                    const sc         = SEC_COLORS[row.section] || { color: 'var(--text3)', bg: 'var(--bg3)' }
                    const stColor    = STATUS_COLORS[row.status] || 'var(--text3)'
                    // confidence arrives as string from BQ — coerce to number
                    const conf       = parseFloat(String(row.confidence)) || 0
                    const confColor  = conf >= 0.8 ? '#22c55e' : conf >= 0.6 ? '#f59e0b' : '#ef4444'
                    const isRowBusy  = busy.has(row.id)
                    const done       = row.status !== 'pending'

                    // agent_data is already parsed by the queue API — guard null before stringify
                    const agentVal = row.agent_data
                      ? JSON.stringify(row.agent_data).substring(0, 120)
                      : row.agent_value || '—'

                    return (
                      <div key={row.id} style={{
                        display: 'grid', gridTemplateColumns: '90px 130px 1fr 1fr 80px 140px',
                        borderBottom: '1px solid var(--border)',
                        background: !done ? '' :
                          row.status === 'approved' || row.status === 'edited' ? '#3b82f608' :
                          row.status === 'merged'   ? '#22c55e08' :
                          row.status === 'rejected' ? '#ef444408' : '',
                        opacity: row.status === 'rejected' ? 0.6 : 1,
                      }}>

                        {/* Section pill */}
                        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, background: sc.bg, color: sc.color }}>
                            {row.section}
                          </span>
                        </div>

                        {/* Field name */}
                        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{row.field_name}</span>
                        </div>

                        {/* Current value */}
                        <div style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text4)', marginBottom: 3 }}>Current</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', maxHeight: 60, overflow: 'hidden', lineHeight: 1.5 }}>
                            {row.current_value
                              ? row.current_value
                              : <span style={{ fontStyle: 'italic', color: 'var(--text4)' }}>— empty</span>}
                          </div>
                        </div>

                        {/* Agent value */}
                        <div style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text4)', marginBottom: 3 }}>Agent value</div>
                          <div style={{ fontSize: 11, color: 'var(--text)', maxHeight: 60, overflow: 'hidden', lineHeight: 1.5, fontFamily: row.agent_data ? 'var(--font-mono)' : 'inherit' }}>
                            {agentVal}
                          </div>
                          {row.source_url && (
                            <a href={row.source_url} target="_blank" rel="noreferrer"
                              style={{ fontSize: 10, color: '#3b82f6', textDecoration: 'none', opacity: 0.7, fontFamily: 'var(--font-mono)' }}>
                              ↗ {row.source_name || 'source'}
                            </a>
                          )}
                        </div>

                        {/* Confidence bar */}
                        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: confColor, marginBottom: 3 }}>
                            {(conf * 100).toFixed(0)}%
                          </div>
                          <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2 }}>
                            <div style={{ width: `${conf * 100}%`, height: '100%', background: confColor, borderRadius: 2 }} />
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
                          {done ? (
                            <div style={{ fontSize: 10, color: stColor, textAlign: 'center', padding: '4px 0', fontWeight: 500 }}>
                              ✓ {row.status}
                            </div>
                          ) : (
                            <>
                              <button
                                disabled={isRowBusy}
                                onClick={() => doReview('approve', row.id)}
                                style={{ padding: '4px 0', borderRadius: 5, fontSize: 11, cursor: isRowBusy ? 'not-allowed' : 'pointer', border: '1px solid #22c55e44', background: '#22c55e11', color: '#22c55e', fontFamily: 'var(--font-sans)', width: '100%', textAlign: 'center' }}
                              >
                                ✓ Approve
                              </button>
                              <button
                                disabled={isRowBusy}
                                onClick={() => setEditModal({ row, finalValue: String(row.agent_value || ''), notes: '' })}
                                style={{ padding: '4px 0', borderRadius: 5, fontSize: 11, cursor: isRowBusy ? 'not-allowed' : 'pointer', border: '1px solid #3b82f644', background: '#3b82f611', color: '#3b82f6', fontFamily: 'var(--font-sans)', width: '100%', textAlign: 'center' }}
                              >
                                ✏ Edit
                              </button>
                              <button
                                disabled={isRowBusy}
                                onClick={() => doReview('reject', row.id)}
                                style={{ padding: '4px 0', borderRadius: 5, fontSize: 11, cursor: isRowBusy ? 'not-allowed' : 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', fontFamily: 'var(--font-sans)', width: '100%', textAlign: 'center' }}
                              >
                                ✕ Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* ── Edit Modal ── */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, width: 520, maxWidth: '90vw' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Edit Value</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
              {editModal.row.section} · {editModal.row.field_name}
            </div>

            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text3)', marginBottom: 6, fontWeight: 500 }}>Current value</div>
            <div style={{ background: 'var(--bg3)', borderRadius: 7, padding: '8px 12px', fontSize: 12, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.6, fontStyle: 'italic' }}>
              {editModal.row.current_value || '— empty'}
            </div>

            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text3)', marginBottom: 6, fontWeight: 500 }}>Final value</div>
            <textarea
              value={editModal.finalValue}
              onChange={e => setEditModal(m => m ? { ...m, finalValue: e.target.value } : m)}
              rows={4}
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)',
                borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 12,
                fontFamily: 'var(--font-sans)', resize: 'vertical', marginBottom: 10, outline: 'none',
              }}
            />

            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text3)', marginBottom: 6, fontWeight: 500 }}>Notes (optional)</div>
            <input
              value={editModal.notes}
              onChange={e => setEditModal(m => m ? { ...m, notes: e.target.value } : m)}
              placeholder="Add review notes..."
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12,
                fontFamily: 'var(--font-sans)', outline: 'none', marginBottom: 18,
              }}
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditModal(null)}
                style={{ padding: '8px 18px', borderRadius: 7, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12 }}>
                Cancel
              </button>
              <button
                disabled={!editModal.finalValue.trim()}
                onClick={() => doReview('edit', editModal.row.id, undefined, undefined, editModal.finalValue, editModal.notes)}
                style={{
                  padding: '8px 20px', borderRadius: 7,
                  background: editModal.finalValue.trim() ? '#3b82f6' : 'var(--bg3)',
                  border: 'none', color: editModal.finalValue.trim() ? '#fff' : 'var(--text3)',
                  cursor: editModal.finalValue.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                }}
              >
                Save Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 300,
          background: 'var(--bg2)',
          border: `1px solid ${toast.type === 'success' ? '#22c55e44' : '#ef444444'}`,
          color: toast.type === 'success' ? '#22c55e' : '#ef4444',
          borderRadius: 10, padding: '10px 16px', fontSize: 12, maxWidth: 300,
        }}>
          {toast.msg}
        </div>
      )}
    </PageShell>
  )
}