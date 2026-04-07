'use client'
// src/components/admin/companies/CompanyDetailPanel.tsx

import { useState, useEffect, useCallback } from 'react'
import type {
  CompanyDetailResponse,
  TeamMember, FundingRound, Product, RevenueRecord, Investment,
  EnrichmentRow, ReviewAction, QueueResponse,
} from '@/types/companies'

interface Props {
  companyId: string
  headers: HeadersInit
  sessionName?: string   // passed from CompaniesPage for reviewed_by
}

type Tab = 'overview' | 'team' | 'funding' | 'products' | 'social' | 'enrichment'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'team', label: 'Team' },
  { key: 'funding', label: 'Funding' },
  { key: 'products', label: 'Products' },
  { key: 'social', label: 'Social' },
  { key: 'enrichment', label: 'Enrichment' },
]

// ── Section / status colour maps (mirror ReviewQueuePage) ─────
const SEC_COLORS: Record<string, { color: string; bg: string }> = {
  about: { color: '#f59e0b', bg: '#f59e0b11' },
  details: { color: '#3b82f6', bg: '#3b82f611' },
  funding: { color: '#8b5cf6', bg: '#8b5cf611' },
  team: { color: '#22c55e', bg: '#22c55e11' },
  products: { color: '#f59e0b', bg: '#f59e0b11' },
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#3b82f6',
  edited: '#3b82f6',
  merged: '#22c55e',
  rejected: '#ef4444',
}

// Queue API extends EnrichmentRow with company_id
type QueueRow = EnrichmentRow & { company_id: string }

interface EditModal { row: QueueRow; finalValue: string; notes: string }

// ── Shared sub-styles ─────────────────────────────────────────
const DC: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '12px 14px',
}
const DCT: React.CSSProperties = {
  fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1,
  textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 600, marginBottom: 10,
}
const DF: React.CSSProperties = {
  display: 'flex', gap: 8, padding: '5px 0',
  borderBottom: '1px solid var(--border)', fontSize: 11, alignItems: 'flex-start',
}
const DK: React.CSSProperties = {
  color: 'var(--text3)', width: 110, flexShrink: 0,
  fontFamily: 'var(--font-mono)', fontSize: 10, paddingTop: 1,
}
const DV: React.CSSProperties = { color: 'var(--text)', flex: 1, wordBreak: 'break-word', lineHeight: 1.55 }

// Table header cell style for the review grid
const TH: React.CSSProperties = {
  padding: '8px 12px', fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1,
  textTransform: 'uppercase', color: 'var(--text2)', background: 'var(--bg3)',
  textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
}

function Field({ label, value }: { label: string; value: string | null | undefined | number | boolean }) {
  return (
    <div style={DF}>
      <span style={DK}>{label}</span>
      {value !== null && value !== undefined && value !== ''
        ? <span style={DV}>{String(value)}</span>
        : <span style={{ ...DV, color: 'var(--text4)', fontStyle: 'italic' }}>— empty</span>}
    </div>
  )
}

function fmtAmt(amount: string | null) {
  const n = parseFloat(amount || '')
  if (isNaN(n) || n <= 0) return 'Not Disclosed'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${Math.round(n).toLocaleString()}`
}

// ── Main component ────────────────────────────────────────────
export default function CompanyDetailPanel({ companyId, headers, sessionName = 'Admin' }: Props) {
  // ── Detail data ───────────────────────────────────────────
  const [data, setData] = useState<CompanyDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('overview')

  // ── Queue / enrichment state ──────────────────────────────
  const [queueData, setQueueData] = useState<QueueResponse | null>(null)
  const [globalSummary, setGlobalSummary] = useState<QueueResponse['summary'] | null>(null)
  const [queueLoading, setQueueLoading] = useState(false)
  const [queueError, setQueueError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'merged' | 'rejected'>('all')
  const [sectionFilter, setSectionFilter] = useState('')
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [editModal, setEditModal] = useState<EditModal | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // ── Fetch company detail (all tabs except enrichment) ─────
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    fetch(`/api/admin/companies/detail?company_id=${companyId}`, { headers })
      .then(r => r.json())
      .then((d: CompanyDetailResponse) => {
        if (cancelled) return
        if (!d.success) throw new Error((d as { error?: string }).error || 'Failed')
        setData(d)
      })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [companyId, headers])

  // ── Fetch global summary (status=all) — stable pill counts ──
  const loadSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams({ company_id: companyId, status: 'all', limit: '1' })
      const res = await fetch(`/api/admin/companies/queue?${params}`, { headers })
      const d: QueueResponse = await res.json()
      if (d.success) setGlobalSummary(d.summary)
    } catch { /* silent */ }
  }, [companyId, headers])

  // ── Fetch filtered rows only (re-runs on filter change) ──────
  const loadRows = useCallback(async () => {
    setQueueLoading(true); setQueueError('')
    const params = new URLSearchParams({ company_id: companyId, status: statusFilter, limit: '200' })
    if (sectionFilter) params.set('section', sectionFilter)
    try {
      const res = await fetch(`/api/admin/companies/queue?${params}`, { headers })
      const d: QueueResponse = await res.json()
      if (!d.success) throw new Error((d as { error?: string }).error || 'Queue API error')
      setQueueData(d)
    } catch (e) {
      setQueueError(e instanceof Error ? e.message : String(e))
    } finally {
      setQueueLoading(false)
    }
  }, [companyId, headers, statusFilter, sectionFilter])

  // Combined refresh — called after every review action so both counts + rows update
  const loadQueue = useCallback(async () => {
    await Promise.all([loadSummary(), loadRows()])
  }, [loadSummary, loadRows])

  // Opening enrichment tab → fetch summary + rows together
  useEffect(() => {
    if (tab === 'enrichment') { loadSummary(); loadRows() }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter change → rows only (summary stays stable)
  useEffect(() => {
    if (tab === 'enrichment') loadRows()
  }, [statusFilter, sectionFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Review action ─────────────────────────────────────────
  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function doReview(
    action: ReviewAction,
    rowId?: string,
    cid?: string,
    section?: string,
    finalValue?: string,
    notes?: string,
  ) {
    const key = rowId || cid || 'bulk'
    setBusy(prev => new Set(prev).add(key))
    try {
      const res = await fetch('/api/admin/companies/review', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action,
          id: rowId,
          company_id: cid,
          section,
          reviewed_by: sessionName,
          final_value: finalValue,
          review_notes: notes,
        }),
      })
      const d = await res.json()
      if (d.success) {
        const pastTense: Record<string, string> = {
          approve: 'approved', reject: 'rejected', edit: 'edited',
          bulk_approve: 'approved', bulk_reject: 'rejected', reset: 'reset',
        }
        showToast(`✓ ${d.rows_updated} row(s) ${pastTense[action] ?? action}`, 'success')
        setEditModal(null)
        loadQueue()
      } else {
        showToast(d.error || 'Action failed', 'error')
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setBusy(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  // ── Loading / error states ────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10, color: 'var(--text3)', fontSize: 12 }}>
      <div style={{ width: 16, height: 16, border: '2px solid var(--border2)', borderTopColor: 'var(--accent-c)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      Loading full data…
    </div>
  )
  if (error) return <div style={{ padding: 20, color: '#ef4444', fontSize: 12 }}>⚠ {error}</div>
  if (!data) return null

  const { company: c, team, funding, investments, products, social, revenue, enrichment } = data

  // Count pending from queue (live) if available, else fall back to detail summary
  const enrichmentTotalCount = globalSummary?.total_rows ?? enrichment.total_rows

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', fontSize: 11, fontWeight: 500, border: 'none',
    background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-sans)',
    borderBottom: `2px solid ${active ? 'var(--accent-c)' : 'transparent'}`,
    color: active ? 'var(--text)' : 'var(--text3)', transition: 'all .15s',
    whiteSpace: 'nowrap',
  })

  function badge(count: number) {
    if (!count) return null
    return <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 3 }}>{count}</span>
  }

  // ── Enrichment tab rows (derived from queue API) ──────────
  const allRows: QueueRow[] = (queueData?.rows ?? []) as QueueRow[]
  // Derive sections from globalSummary.sections (keys) so the dropdown
  // doesn't collapse when a filter returns fewer rows
  const sections = globalSummary?.sections
    ? Object.keys(globalSummary.sections).sort()
    : [...new Set(allRows.map(r => r.section))].sort()
  const isBusy = busy.size > 0

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} style={tabStyle(tab === t.key)} onClick={() => setTab(t.key)}>
            {t.label}
            {t.key === 'team' && badge(team.length)}
            {t.key === 'funding' && badge(funding.round_count)}
            {t.key === 'products' && badge(products.length)}
            {t.key === 'enrichment' && badge(enrichmentTotalCount)}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={DC}>
            <div style={DCT}>Identity & Details</div>
            <Field label="company_name" value={c.company_name} />
            <Field label="company_url" value={c.company_url} />
            <Field label="primary_cat" value={c.primary_category} />
            <Field label="tagline" value={c.tagline} />
            <Field label="description" value={c.company_description} />
            <Field label="launch_date" value={c.launch_date} />
            <Field label="location" value={c.location} />
            <Field label="company_size" value={c.company_size} />
            <Field label="email" value={c.email} />
            <Field label="valuation" value={c.valuation_fmt} />
          </div>
          <div style={DC}>
            <div style={DCT}>Metrics & Status</div>
            <Field label="profile_score" value={`${c.profile_score} / 100`} />
            <Field label="view_count" value={c.view_count.toLocaleString()} />
            <Field label="followers" value={c.followers_count.toLocaleString()} />
            <Field label="active_status" value={c.active_status} />
            <Field label="claim_status" value={c.claim_status ? '✓ Claimed' : 'Not claimed'} />
            <Field label="approval" value={c.approval_status ? '✓ Approved' : 'Pending'} />
            <Field label="stock_symbol" value={c.stock_symbol} />
            <Field label="cmc_id" value={c.cmc_id} />
            <Field label="coingecko_id" value={c.coingecko_id} />
            <Field label="created_at" value={c.created_at} />
            <Field label="updated_at" value={c.updated_at} />
          </div>
          <div style={DC}>
            <div style={DCT}>Score Breakdown</div>
            {Object.entries(c.score_breakdown).map(([k, v]) => (
              <div key={k} style={DF}>
                <span style={DK}>{k}</span>
                <span style={{ ...DV, fontFamily: 'var(--font-mono)', color: Number(v) > 0 ? 'var(--accent-c)' : 'var(--text4)' }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 10 }}>
              <a href={c.live_url} target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
                ↗ View live profile
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TEAM TAB
      ══════════════════════════════════════════════════════ */}
      {tab === 'team' && (
        <div style={{ padding: 16 }}>
          {team.length === 0 ? (
            <div style={{ color: 'var(--text4)', fontStyle: 'italic', fontSize: 12, padding: 20 }}>No team members linked</div>
          ) : (
            (['board', 'team'] as const).map(type => {
              const members = team.filter((m: TeamMember) => m.member_type === type)
              if (!members.length) return null
              return (
                <div key={type} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'capitalize', letterSpacing: 1, color: 'var(--text3)', marginBottom: 8 }}>
                    {type === 'board' ? `Board (${members.length})` : `Team (${members.length})`}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                    {members.map((m: TeamMember) => (
                      <div key={m.member_id} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '9px 10px', border: '1px solid var(--border)' }}>
                        {m.profile_image ?
                          <img src={m.profile_image} alt={m.full_name} style={{ marginBottom: '5px', width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', marginRight: 8, verticalAlign: 'middle' }} />
                          :
                          <img src="https://image.coinpedia.org/app_uploads/profile/default.png" alt={m.full_name} style={{ marginBottom: '5px', width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', marginRight: 8, verticalAlign: 'middle' }} />
                        }
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
                          {m.profile_url
                            ? <a href={m.profile_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text)', textDecoration: 'none' }}>
                              {m.full_name}
                              <span style={{ fontSize: 9, color: '#3b82f6', marginLeft: 3 }}>↗</span>
                            </a>
                            : m.full_name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>{m.role}</div>
                        <span style={{
                          fontSize: 9, padding: '1px 5px', borderRadius: 3, display: 'inline-block',
                          background: m.member_type === 'board' ? '#f59e0b22' : '#3b82f622',
                          color: m.member_type === 'board' ? '#f59e0b' : '#3b82f6',
                          textTransform: 'capitalize',
                        }}>
                          {m.member_type}
                        </span>
                        <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                          {m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, border: '1px solid var(--border2)', color: 'var(--text3)', textDecoration: 'none' }}>in</a>}
                          {m.twitter_url && <a href={m.twitter_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, border: '1px solid var(--border2)', color: 'var(--text3)', textDecoration: 'none' }}>𝕏</a>}
                          {m.instagram_url && <a href={m.instagram_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, border: '1px solid var(--border2)', color: 'var(--text3)', textDecoration: 'none' }}>ig</a>}
                          {m.facebook_url && <a href={m.facebook_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, border: '1px solid var(--border2)', color: 'var(--text3)', textDecoration: 'none' }}>fb</a>}
                          {m.youtube_url && <a href={m.youtube_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, border: '1px solid var(--border2)', color: 'var(--text3)', textDecoration: 'none' }}>yt</a>}
                          {m.telegram_url && <a href={m.telegram_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, border: '1px solid var(--border2)', color: 'var(--text3)', textDecoration: 'none' }}>tg</a>}
                          {m.medium_url && <a href={m.medium_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, border: '1px solid var(--border2)', color: 'var(--text3)', textDecoration: 'none' }}>med</a>}
                          {m.video_link && <a href={m.video_link} target="_blank" rel="noreferrer" style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, border: '1px solid var(--border2)', color: 'var(--text3)', textDecoration: 'none' }}>▶</a>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          FUNDING TAB
      ══════════════════════════════════════════════════════ */}
      {tab === 'funding' && (
        <div style={{ padding: 16 }}>
          <div style={DCT}>Funding Received</div>
          {funding.rounds.length === 0 ? (
            <div style={{ color: 'var(--text4)', fontStyle: 'italic', fontSize: 12, marginBottom: 20 }}>No funding rounds recorded</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                {[
                  { label: 'Total raised', value: fmtAmt(String(funding.total_raised)), color: '#22c55e' },
                  { label: 'Rounds', value: String(funding.round_count), color: '#8b5cf6' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '9px 14px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 20 }}>
                {funding.rounds.map((r: FundingRound, i: number) => (
                  <div key={r.round_id || i} style={{ display: 'grid', gridTemplateColumns: '110px 90px 1fr auto', gap: 8, padding: '8px 12px', borderBottom: i < funding.rounds.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 11, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: '#8b5cf622', color: '#8b5cf6', textAlign: 'center' }}>{r.funding_type}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#22c55e' }}>{fmtAmt(r.amount)}</span>
                    <span style={{ color: 'var(--text3)' }}>{r.investor_name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text4)' }}>{r.funding_date}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Investments Made ── */}
          {(() => {
            const totalInvested = (investments ?? []).reduce((s: number, r: Investment) => s + (parseFloat(r.amount || '0') || 0), 0)
            return (
              <>
                <div style={{ height: '1px', background: 'var(--border)', margin: '16px 0' }} />
                <div style={DCT}>Investments Made</div>
                {(investments ?? []).length === 0 ? (
                  <div style={{ color: 'var(--text4)', fontStyle: 'italic', fontSize: 12 }}>No investments recorded</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      {[
                        { label: 'Total invested', value: fmtAmt(String(totalInvested)), color: '#f59e0b' },
                        { label: 'Companies', value: String((investments ?? []).length), color: '#3b82f6' },
                      ].map(s => (
                        <div key={s.label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '9px 14px', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                      {/* Header */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 130px 110px', gap: 8, padding: '6px 12px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase' as const, color: 'var(--text3)' }}>
                        <div>Company</div><div style={{ textAlign: 'center' }}>Round</div><div>Category</div><div style={{ textAlign: 'right' }}>Amount</div>
                      </div>
                      {(investments ?? []).map((r: Investment, i: number) => (
                        <div key={r.round_id || i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 130px 110px', gap: 8, padding: '9px 12px', borderBottom: i < (investments ?? []).length - 1 ? '1px solid var(--border)' : 'none', fontSize: 11, alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 500, color: 'var(--text)', textTransform: 'capitalize' }}>
                            {r.funded_company_logo
                              ? <img src={r.funded_company_logo} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                              : <span style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--bg3)', display: 'inline-block', flexShrink: 0 }} />}
                            {r.funded_company_url
                              ? <a href={`https://coinpedia.org/company/${r.funded_company_url}/`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>{r.funded_company_name}</a>
                              : r.funded_company_name}
                          </span>
                          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, background: '#8b5cf622', color: '#8b5cf6', textAlign: 'center' }}>{r.investment_round || '—'}</span>
                          <span style={{ color: 'var(--text3)', fontSize: 10 }}>{r.investor_category || '—'}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f59e0b', textAlign: 'right' }}>{fmtAmt(r.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )
          })()}

          {revenue.length > 0 && (
            <>
              <div style={{ height: '1px', background: 'var(--border)', margin: '16px 0' }} />
              <div style={DCT}>Revenue</div>
              <div style={{ background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '70px 80px 1fr 110px', gap: 8, padding: '6px 12px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase' as const, color: 'var(--text3)' }}>
                  <div>Year</div><div>Period</div><div>Revenue Stream</div><div style={{ textAlign: 'right' }}>Revenue</div>
                </div>
                {revenue.map((r: RevenueRecord, i: number) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 80px 1fr 110px', gap: 8, padding: '8px 12px', borderBottom: i < revenue.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 11, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.year}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: '#3b82f622', color: '#3b82f6', textAlign: 'center' }}>{r.quarter}</span>
                    <span style={{ color: 'var(--text4)', fontSize: 10 }}>—</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#22c55e', textAlign: 'right' }}>{r.revenue_fmt}</span>
                  </div>
                ))}
              </div>
            </>
          )}


        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          PRODUCTS TAB
      ══════════════════════════════════════════════════════ */}
      {tab === 'products' && (
        <div style={{ padding: 16 }}>
          {products.length === 0 ? (
            <div style={{ color: 'var(--text4)', fontStyle: 'italic', fontSize: 12 }}>No products recorded</div>
          ) : (
            <div style={{ background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)', padding: '0 12px' }}>
              {products.map((p: Product, i: number) => (
                <div key={p.product_id || i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < products.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 11, alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text)', flexShrink: 0, width: 130 }}>
                    {p.product_url
                      ? <a href={p.product_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>{p.product_name}</a>
                      : p.product_name}
                  </span>
                  <span style={{ color: 'var(--text3)', flex: 1, lineHeight: 1.5 }}>{p.product_description || '—'}</span>
                  {p.product_category && (
                    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: '#f59e0b22', color: '#f59e0b', flexShrink: 0 }}>{p.product_category}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SOCIAL TAB
      ══════════════════════════════════════════════════════ */}
      {tab === 'social' && (
        <div style={{ padding: 16 }}>
          {[
            { key: 'twitter_url', label: '𝕏 Twitter', color: '#1d9bf0' },
            { key: 'linkedin_url', label: 'in LinkedIn', color: '#3b82f6' },
            { key: 'github_url', label: 'gh GitHub', color: 'var(--text)' },
            { key: 'telegram_url', label: '✈ Telegram', color: '#2aabee' },
            { key: 'discord_url', label: 'Discord', color: '#5865F2' },
            { key: 'reddit_url', label: 'Reddit', color: '#ff4500' },
            { key: 'youtube_url', label: 'YouTube', color: '#ff0000' },
            { key: 'medium_url', label: 'Medium', color: 'var(--text)' },
            { key: 'instagram_url', label: 'Instagram', color: '#e1306c' },
            { key: 'website', label: '↗ Website', color: 'var(--text2)' },
          ].filter(l => (social as unknown as Record<string, string | null>)[l.key] || (l.key === 'website' && c.website))
            .map(l => {
              const url = (social as unknown as Record<string, string | null>)[l.key] || (l.key === 'website' ? c.website : null)
              if (!url) return null
              return (
                <a key={l.key} href={url} target="_blank" rel="noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border2)',
                    fontSize: 12, color: l.color, textDecoration: 'none',
                    marginRight: 6, marginBottom: 6, background: 'var(--bg3)',
                  }}
                >
                  {l.label}
                </a>
              )
            })}
          {!Object.values(social as unknown as Record<string, string | null>).some(Boolean) && !c.website && (
            <div style={{ color: 'var(--text4)', fontStyle: 'italic', fontSize: 12 }}>No social links found</div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ENRICHMENT TAB — full inline review queue
      ══════════════════════════════════════════════════════ */}
      {tab === 'enrichment' && (
        <div style={{ padding: 16 }}>

          {/* ── Toolbar: summary badges + filters + bulk approve ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>

            {/* Status filter pills — counts from globalSummary (stable, always status=all) */}
            {(['all', 'pending', 'approved', 'merged', 'rejected'] as const).map(s => {
              const cnt = s === 'all'
                ? globalSummary?.total_rows
                : s === 'pending' ? globalSummary?.pending
                  : s === 'approved' ? (globalSummary?.approved ?? 0) + (globalSummary?.edited ?? 0)
                    : s === 'merged' ? globalSummary?.merged
                      : globalSummary?.rejected
              return (
                <button key={s} onClick={() => setStatusFilter(s)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                  border: `1px solid ${statusFilter === s ? '#f59e0b44' : 'var(--border2)'}`,
                  background: statusFilter === s ? '#f59e0b11' : 'var(--bg3)',
                  color: statusFilter === s ? '#f59e0b' : 'var(--text3)',
                  fontFamily: 'var(--font-sans)',
                }}>
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  {cnt !== undefined && cnt > 0 && (
                    <span style={{ marginLeft: 4, fontSize: 9, fontFamily: 'var(--font-mono)', opacity: 0.7 }}>{cnt}</span>
                  )}
                </button>
              )
            })}

            {/* Section filter */}
            {sections.length > 1 && (
              <select
                value={sectionFilter}
                onChange={e => setSectionFilter(e.target.value)}
                style={{
                  padding: '4px 8px', borderRadius: 6, fontSize: 11, border: '1px solid var(--border2)',
                  background: 'var(--bg3)', color: 'var(--text3)', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <option value="">All sections</option>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            {/* Refresh */}
            <button
              onClick={loadQueue}
              disabled={queueLoading}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              ↻
            </button>

            {/* Bulk approve — only show when there are pending rows */}
            {(globalSummary?.pending ?? 0) > 0 && (
              <button
                disabled={isBusy}
                onClick={() => doReview('bulk_approve', undefined, companyId)}
                style={{
                  marginLeft: 'auto', padding: '4px 14px', borderRadius: 6, fontSize: 11,
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                  border: '1px solid #22c55e44', background: '#22c55e11', color: '#22c55e',
                  fontFamily: 'var(--font-sans)', fontWeight: 500,
                }}
              >
                ✓ Approve all pending
              </button>
            )}
          </div>

          {/* ── Loading / error / empty states ── */}
          {queueLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 24, color: 'var(--text3)', fontSize: 12 }}>
              <div style={{ width: 14, height: 14, border: '2px solid var(--border2)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
              Loading enrichment queue…
            </div>
          )}
          {!queueLoading && queueError && (
            <div style={{ padding: 16, color: '#ef4444', fontSize: 12 }}>⚠ {queueError}</div>
          )}
          {!queueLoading && !queueError && allRows.length === 0 && (
            <div style={{ color: 'var(--text4)', fontStyle: 'italic', fontSize: 12, padding: '20px 0' }}>
              {statusFilter === 'all' ? 'No enrichment runs yet for this company.' : `No ${statusFilter} rows.`}
            </div>
          )}

          {/* ── Row table (mirrors ReviewQueuePage exactly) ── */}
          {!queueLoading && !queueError && allRows.length > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>

              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '90px 140px 1fr 1fr 70px 150px' }}>
                {['Section', 'Field', 'Current value', 'Agent value', 'Conf.', 'Actions'].map(h => (
                  <div key={h} style={TH}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              {allRows.map((row: QueueRow) => {
                const sc = SEC_COLORS[row.section] || { color: 'var(--text3)', bg: 'var(--bg3)' }
                const stColor = STATUS_COLORS[row.status] || 'var(--text3)'
                const conf = parseFloat(String(row.confidence)) || 0
                const confColor = conf >= 0.8 ? '#22c55e' : conf >= 0.6 ? '#f59e0b' : '#ef4444'
                const isRowBusy = busy.has(row.id)
                const done = row.status !== 'pending'

                // agent_data is a parsed object for structured fields (product, funding_round, team_member)
                // render as key: value lines; fall back to plain agent_value for scalar fields
                // For team_member rows, inject the two required fixed fields if not already present
                const rawAgentData = row.agent_data as Record<string, unknown> | null
                const enrichedData: Record<string, unknown> | null = rawAgentData
                  ? (row.field_name === 'team_member'
                    ? { ...rawAgentData, login_status: 1, approval_status: 1 }
                    : rawAgentData)
                  : null
                const agentDataEntries = enrichedData
                  ? Object.entries(enrichedData).filter(([, v]) => v !== null && v !== '')
                  : null
                const agentScalar = row.agent_value || '—'

                return (
                  <div key={row.id} style={{
                    display: 'grid', gridTemplateColumns: '90px 140px 1fr 1fr 70px 150px',
                    borderTop: '1px solid var(--border)',
                    background: done
                      ? row.status === 'approved' || row.status === 'edited' ? '#3b82f608'
                        : row.status === 'merged' ? '#22c55e08'
                          : row.status === 'rejected' ? '#ef444408'
                            : ''
                      : '',
                    opacity: row.status === 'rejected' ? 0.6 : 1,
                  }}>

                    {/* Section pill */}
                    <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>
                        {row.section}
                      </span>
                    </div>

                    {/* Field name */}
                    <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text)', wordBreak: 'break-all' }}>{row.field_name}</span>
                    </div>

                    {/* Current value */}
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text4)', marginBottom: 3 }}>Current</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', maxHeight: 64, overflow: 'hidden', lineHeight: 1.5 }}>
                        {row.current_value
                          ? row.current_value
                          : <span style={{ fontStyle: 'italic', color: 'var(--text4)' }}>— empty</span>}
                      </div>
                    </div>

                    {/* Agent value */}
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text4)', marginBottom: 3 }}>Agent value</div>
                      {agentDataEntries ? (
                        <div style={{ fontSize: 11, lineHeight: 1.7, maxHeight: 100, overflow: 'hidden' }}>
                          {agentDataEntries.map(([k, v]) => {
                            // Render boolean-like flags as green ✓ badges
                            const isFlag = (k === 'login_status' || k === 'approval_status') && (v === 1 || v === '1')
                            return (
                              <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text3)', fontSize: 10, flexShrink: 0 }}>{k}: </span>
                                {isFlag ? (
                                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: '#22c55e22', color: '#22c55e', fontWeight: 600 }}>✓ active</span>
                                ) : (
                                  <span style={{ color: 'var(--accent-c)' }}>{String(v)}</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--text)', maxHeight: 64, overflow: 'hidden', lineHeight: 1.5 }}>
                          {agentScalar}
                        </div>
                      )}
                      {row.source_url && (
                        <a href={row.source_url} target="_blank" rel="noreferrer"
                          style={{ fontSize: 10, color: '#3b82f6', textDecoration: 'none', opacity: 0.7, fontFamily: 'var(--font-mono)' }}>
                          ↗ {row.source_name || 'source'}
                        </a>
                      )}
                    </div>

                    {/* Confidence bar */}
                    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: confColor, marginBottom: 4 }}>
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
                          {row.reviewed_by && (
                            <div style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 400, marginTop: 2 }}>{row.reviewed_by}</div>
                          )}
                        </div>
                      ) : (
                        <>
                          <button
                            disabled={isRowBusy}
                            onClick={() => doReview('approve', row.id)}
                            style={{ padding: '4px 0', borderRadius: 5, fontSize: 11, cursor: isRowBusy ? 'not-allowed' : 'pointer', border: '1px solid #22c55e44', background: '#22c55e11', color: '#22c55e', fontFamily: 'var(--font-sans)', width: '100%' }}
                          >
                            ✓ Approve
                          </button>
                          <button
                            disabled={isRowBusy}
                            onClick={() => setEditModal({ row, finalValue: row.agent_value || '', notes: '' })}
                            style={{ padding: '4px 0', borderRadius: 5, fontSize: 11, cursor: isRowBusy ? 'not-allowed' : 'pointer', border: '1px solid #3b82f644', background: '#3b82f611', color: '#3b82f6', fontFamily: 'var(--font-sans)', width: '100%' }}
                          >
                            ✏ Edit
                          </button>
                          <button
                            disabled={isRowBusy}
                            onClick={() => doReview('reject', row.id)}
                            style={{ padding: '4px 0', borderRadius: 5, fontSize: 11, cursor: isRowBusy ? 'not-allowed' : 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', fontFamily: 'var(--font-sans)', width: '100%' }}
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
      )}

      {/* ══════════════════════════════════════════════════════
          EDIT MODAL
      ══════════════════════════════════════════════════════ */}
      {editModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}
          onClick={e => { if (e.target === e.currentTarget) setEditModal(null) }}
        >
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
              onChange={e => setEditModal(m => m ? { ...m, finalValue: e.target.value } : null)}
              rows={5}
              style={{
                width: '100%', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--bg3)',
                color: 'var(--text)', fontSize: 12, padding: '8px 12px', lineHeight: 1.6,
                fontFamily: 'var(--font-sans)', resize: 'vertical', boxSizing: 'border-box',
              }}
            />

            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text3)', margin: '10px 0 6px', fontWeight: 500 }}>Notes (optional)</div>
            <input
              type="text"
              value={editModal.notes}
              onChange={e => setEditModal(m => m ? { ...m, notes: e.target.value } : null)}
              placeholder="Reason for edit…"
              style={{
                width: '100%', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--bg3)',
                color: 'var(--text)', fontSize: 12, padding: '8px 12px',
                fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button
                onClick={() => setEditModal(null)}
                style={{ padding: '8px 16px', borderRadius: 7, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12 }}
              >
                Cancel
              </button>
              <button
                disabled={!editModal.finalValue.trim() || isBusy}
                onClick={() => doReview('edit', editModal.row.id, undefined, undefined, editModal.finalValue, editModal.notes)}
                style={{
                  padding: '8px 20px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                  background: !editModal.finalValue.trim() || isBusy ? '#3b82f688' : '#3b82f6',
                  border: 'none', color: '#fff',
                  cursor: !editModal.finalValue.trim() || isBusy ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Save & Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TOAST
      ══════════════════════════════════════════════════════ */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 400,
          background: 'var(--bg2)', border: `1px solid ${toast.type === 'success' ? '#22c55e44' : '#ef444444'}`,
          color: toast.type === 'success' ? '#22c55e' : '#ef4444',
          borderRadius: 10, padding: '10px 16px', fontSize: 12, maxWidth: 300,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {toast.msg}
        </div>
      )}
    </>
  )
}