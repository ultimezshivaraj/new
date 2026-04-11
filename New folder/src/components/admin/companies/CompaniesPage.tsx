'use client'
// src/components/admin/companies/CompaniesPage.tsx

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import PageShell     from '@/components/shared/PageShell'
import StatCard      from '@/components/shared/StatCard'
import { SessionPayload } from '@/lib/session'
import type { CompanyRow, CompaniesListResponse, AgentRunResponse } from '@/types/companies'
import CompanyDetailPanel from './CompanyDetailPanel'
import RunAgentModal      from './RunAgentModal'

// ── Helpers ───────────────────────────────────────────────────
function adminHeaders(): HeadersInit {
  const key = typeof window !== 'undefined' ? (localStorage.getItem('adminKey') ?? '') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
}

function fmtK(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n) }

function relTime(dateStr: string | null): { label: string; cls: string } {
  if (!dateStr) return { label: 'Never', cls: 'never' }
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days < 1)  return { label: 'Today',                   cls: 'fresh' }
  if (days < 7)  return { label: `${days}d ago`,             cls: 'fresh' }
  if (days < 30) return { label: `${Math.ceil(days/7)}w ago`, cls: 'ok' }
  return              { label: `${Math.ceil(days/30)}mo ago`, cls: 'stale' }
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  merged:   { label: '⬢ Merged',   color: '#22c55e', bg: '#14532d22' },
  approved: { label: '✓ Approved', color: '#3b82f6', bg: '#1e3a8a22' },
  pending:  { label: '⏳ Pending', color: '#f59e0b', bg: '#78350f22' },
  staged:   { label: 'Staged',     color: '#f59e0b', bg: '#78350f22' },
  not_run:  { label: 'Not run',    color: 'var(--text3)', bg: 'var(--bg3)' },
}

const DQ_FIELDS = ['description','tagline','launch_date','location','company_size','email','valuation']

const SORT_OPTIONS = [
  { value: 'priority',  label: '↑ Priority'  },
  { value: 'views',     label: '↑ Views'      },
  { value: 'score',     label: '↑ Score'      },
  { value: 'name',      label: 'A → Z'        },
]

// ── Props ─────────────────────────────────────────────────────
interface Props { session: SessionPayload }

export default function CompaniesPage({ session }: Props) {
  const router = useRouter()

  const [companies, setCompanies]     = useState<CompanyRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [page, setPage]               = useState(1)
  const [totalPages, setTotalPages]   = useState(1)
  const [total, setTotal]             = useState(0)
  const [duration, setDuration]       = useState('')
  const [search, setSearch]           = useState('')
  const [sort, setSort]               = useState('priority')
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [modalCompany, setModalCompany] = useState<CompanyRow | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [toast, setToast]             = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxViews = companies.reduce((m, c) => Math.max(m, c.view_count), 1)

  // ── Load companies ────────────────────────────────────────────
  const load = useCallback(async (pg: number, q: string, s: string) => {
    setLoading(true); setError(''); setExpandedId(null)
    const params = new URLSearchParams({ page: String(pg), limit: '50', sort: s })
    if (q) params.set('search', q)
    try {
      const res = await fetch(`/api/admin/companies?${params}`, { headers: adminHeaders() })
      const d: CompaniesListResponse = await res.json()
      if (!d.success) throw new Error((d as { error?: string }).error || 'API error')
      setCompanies(d.companies)
      setTotalPages(d.pages)
      setTotal(d.total)
      setDuration(d.duration)
      setPage(pg)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  // Load pending stats
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/companies/queue?status=pending&limit=1', { headers: adminHeaders() })
      const d = await res.json()
      if (d.summary) setPendingCount(d.summary.pending || 0)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { load(1, '', 'priority'); loadStats() }, [load, loadStats])

  function onSearch(v: string) {
    setSearch(v)
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => load(1, v, sort), 350)
  }

  function onSort(v: string) {
    setSort(v)
    load(1, search, v)
  }

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleRunAgent(companyId: string, sections: string[]) {
    try {
      const res = await fetch('/api/admin/companies/agent', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ company_id: companyId, sections }),
      })
      const d: AgentRunResponse = await res.json()
      if (d.success) {
        showToast(`✓ ${d.rows_staged} rows staged for ${d.company_name}`, 'success')
        load(page, search, sort)
        loadStats()
      } else {
        showToast(d.message || d.error || 'No data found', 'error')
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Network error', 'error')
    }
  }

  // ── TH / TD styles ───────────────────────────────────────────
  const TH: React.CSSProperties = {
    padding: '9px 12px', fontSize: 10, fontFamily: 'var(--font-mono)',
    letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text2)',
    background: 'var(--bg3)', textAlign: 'left', borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  }
  const TD: React.CSSProperties = {
    padding: '10px 12px', fontSize: 12, borderBottom: '1px solid var(--border)',
    color: 'var(--text)', verticalAlign: 'middle',
  }

  return (
    <PageShell panel="admin" session={session} activeKey="companies" title="Admin Dashboard" subtitle="Companies">
      {/* ── Inner header ── */}
      <div style={{ margin: '-24px -24px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ padding: '14px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Companies</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
              AI enrichment · profile scoring · review queue
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text3)' }}>🔍</span>
              <input
                value={search}
                onChange={e => onSearch(e.target.value)}
                placeholder="Search name, category, location..."
                style={{
                  padding: '7px 10px 7px 28px', borderRadius: 7, border: '1px solid var(--border2)',
                  background: 'var(--bg3)', color: 'var(--text)', fontSize: 12,
                  fontFamily: 'var(--font-sans)', outline: 'none', width: 230,
                }}
              />
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={e => onSort(e.target.value)}
              style={{
                padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border2)',
                background: 'var(--bg3)', color: 'var(--text2)', fontSize: 12,
                fontFamily: 'var(--font-sans)', outline: 'none', cursor: 'pointer',
              }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Review queue button */}
            {pendingCount > 0 && (
              <button
                onClick={() => router.push('/admin/companies/review')}
                style={{
                  padding: '7px 14px', borderRadius: 7, border: '1px solid #f59e0b44',
                  background: '#f59e0b11', color: '#f59e0b', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                📋 {pendingCount} pending review
              </button>
            )}

            <button
              onClick={() => load(page, search, sort)}
              style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--text2)', fontSize: 12, cursor: 'pointer' }}
            >
              ↻
            </button>
          </div>
        </div>

        {/* Meta row */}
        {!loading && !error && (
          <div style={{ padding: '0 24px 10px', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
            <strong style={{ color: 'var(--text)' }}>{total.toLocaleString()}</strong> companies · page {page} of {totalPages}
            {search && ` · "${search}"`}
            {' '}<span style={{ color: 'var(--text4)' }}>· {duration}</span>
          </div>
        )}
      </div>

      {/* ── Stat cards ── */}
      {!loading && companies.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total"          value={total.toLocaleString()} color="var(--accent-c)" />
          <StatCard label="Need Enrichment" value={companies.filter(c => c.missing_count > 0).length} color="#ef4444" sub="missing fields" />
          <StatCard label="Pending Review"  value={pendingCount} color="#f59e0b" sub="awaiting action" />
          <StatCard label="Avg Score"
            value={`${Math.round(companies.reduce((s, c) => s + c.profile_score, 0) / (companies.length || 1))}%`}
            color="#22c55e" sub="profile completeness"
          />
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
          <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--accent-c)', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
          Loading companies…
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>⚠ {error}</div>
      ) : companies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
          <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.3 }}>🏢</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No companies found</div>
        </div>
      ) : (
        <>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, minWidth: 220 }}>Company</th>
                  <th style={{ ...TH, width: 80, textAlign: 'center' }}>Score</th>
                  <th style={{ ...TH, width: 90, textAlign: 'center' }}>Views</th>
                  <th style={{ ...TH, width: 140 }}>Data Quality</th>
                  <th style={{ ...TH, width: 90, textAlign: 'center' }}>Priority</th>
                  <th style={{ ...TH, width: 120 }}>Status</th>
                  <th style={{ ...TH, width: 110 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c, i) => {
                  const sc      = c.profile_score || 0
                  const scColor = sc >= 80 ? '#22c55e' : sc >= 50 ? '#f59e0b' : '#ef4444'
                  const vPct    = Math.round(((c.view_count || 0) / maxViews) * 100)
                  const st      = STATUS_MAP[c.enrichment_status] || STATUS_MAP.not_run
                  const rt      = relTime(c.last_run_at)
                  const rank    = i + 1 + (page - 1) * 50
                  const isOpen  = expandedId === c.company_id

                  return (
                    <>
                      <tr
                        key={c.company_id}
                        onClick={() => setExpandedId(isOpen ? null : c.company_id)}
                        style={{
                          cursor: 'pointer',
                          background: isOpen ? 'var(--bg3)' : '',
                          transition: 'background .1s',
                        }}
                        onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
                        onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = '' }}
                      >
                        {/* Company */}
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, background: 'var(--bg3)',
                              border: '1px solid var(--border2)', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 14, flexShrink: 0, overflow: 'hidden',
                            }}>
                              {c.profile_image
                                ? <img src={c.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 7 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                : '🏢'}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.company_name}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>
                                {c.category || '—'}{c.location ? ` · ${c.location}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Score */}
                        <td style={{ ...TD, textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: scColor, lineHeight: 1 }}>{sc}</div>
                          <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2, marginTop: 5, width: 44, margin: '5px auto 0' }}>
                            <div style={{ width: `${sc}%`, height: '100%', background: scColor, borderRadius: 2 }} />
                          </div>
                        </td>

                        {/* Views */}
                        <td style={{ ...TD, textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{fmtK(c.view_count)}</div>
                          <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2, marginTop: 3, width: 48, margin: '3px auto 0' }}>
                            <div style={{ width: `${vPct}%`, height: '100%', background: 'var(--accent-c)', borderRadius: 2 }} />
                          </div>
                        </td>

                        {/* Data quality */}
                        <td style={TD}>
                          <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
                            {DQ_FIELDS.map(f => (
                              <div
                                key={f}
                                title={f}
                                style={{
                                  width: 13, height: 8, borderRadius: 2,
                                  background: c.missing_fields.includes(f) ? '#ef4444' : '#22c55e',
                                  opacity: 0.8,
                                }}
                              />
                            ))}
                          </div>
                          {c.missing_count === 0
                            ? <span style={{ fontSize: 10, color: '#22c55e' }}>Complete</span>
                            : <span style={{ fontSize: 10, color: '#ef4444' }}>{c.missing_count}/7 missing</span>}
                        </td>

                        {/* Priority */}
                        <td style={{ ...TD, textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>
                            {(c.enrichment_priority || 0).toLocaleString()}
                          </div>
                          {rank <= 10 && <div style={{ fontSize: 10, marginTop: 2 }}>⭐ Top {rank}</div>}
                        </td>

                        {/* Status */}
                        <td style={TD}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10,
                            padding: '2px 8px', borderRadius: 100, fontWeight: 500,
                            background: st.bg, color: st.color,
                          }}>
                            {st.label}
                          </span>
                          <div style={{ fontSize: 9, marginTop: 3, color: rt.cls === 'fresh' ? '#22c55e' : rt.cls === 'ok' ? 'var(--text3)' : rt.cls === 'stale' ? '#f59e0b' : '#ef4444' }}>
                            {rt.label}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={TD} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setModalCompany(c)}
                              style={{ fontSize: 11, padding: '4px 8px', borderRadius: 5, border: '1px solid #f59e0b44', background: '#f59e0b11', color: '#f59e0b', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                            >
                              ▶ Run
                            </button>
                            {c.pending_count > 0 && (
                              <button
                                onClick={() => router.push(`/admin/companies/review?company_id=${c.company_id}`)}
                                style={{ fontSize: 11, padding: '4px 8px', borderRadius: 5, border: '1px solid #3b82f644', background: '#3b82f611', color: '#3b82f6', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                              >
                                📋 {c.pending_count}
                              </button>
                            )}
                            <a
                              href={c.live_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: 11, padding: '4px 8px', borderRadius: 5, border: '1px solid var(--border2)', color: 'var(--text3)', textDecoration: 'none' }}
                            >
                              ↗
                            </a>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isOpen && (
                        <tr key={`det-${c.company_id}`}>
                          <td colSpan={7} style={{ padding: 0, background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                            <CompanyDetailPanel companyId={c.company_id} headers={adminHeaders()} sessionName={session.name || 'Admin'} />
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, padding: '20px 0', flexWrap: 'wrap' }}>
              {page > 1 && (
                <button onClick={() => load(page - 1, search, sort)} style={pagBtn(false)}>← Prev</button>
              )}
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i
                return p <= totalPages ? (
                  <button key={p} onClick={() => load(p, search, sort)} style={pagBtn(p === page)}>{p}</button>
                ) : null
              })}
              {page < totalPages && (
                <button onClick={() => load(page + 1, search, sort)} style={pagBtn(false)}>Next →</button>
              )}
            </div>
          )}
        </>
      )}

      {/* Run Agent Modal */}
      {modalCompany && (
        <RunAgentModal
          company={modalCompany}
          onClose={() => setModalCompany(null)}
          onRun={handleRunAgent}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 300,
          background: 'var(--bg2)', border: `1px solid ${toast.type === 'success' ? '#22c55e44' : '#ef444444'}`,
          color: toast.type === 'success' ? '#22c55e' : '#ef4444',
          borderRadius: 10, padding: '10px 16px', fontSize: 12, maxWidth: 300,
        }}>
          {toast.msg}
        </div>
      )}
    </PageShell>
  )
}

function pagBtn(active: boolean): React.CSSProperties {
  return {
    padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border2)',
    background: active ? '#3b82f611' : 'transparent',
    color: active ? '#3b82f6' : 'var(--text3)',
    fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)',
  }
}
