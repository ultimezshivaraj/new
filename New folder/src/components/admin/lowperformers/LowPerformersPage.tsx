'use client'
// src/components/admin/lowperformers/LowPerformersPage.tsx

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import PageShell, { NavItem } from '@/components/shared/PageShell'
import { SessionPayload } from '@/lib/session'


// ── Types ─────────────────────────────────────────────────────
interface Performer {
  employee_row_id: string; full_name: string; position: string
  email_id: string; mobile_number: string; profile_image: string
  days_worked: string; avg_prod: string; active_hrs: string; worked_hrs: string
  idle_hrs: string; prod_hrs: string; low_days: string; high_days: string
  period_start: string; period_end: string
}
interface Meta { low_count: string; critical_count: string; total_with_reports: string }
interface ChatMsg { role: 'user' | 'assistant'; content: string }

// ── Helpers ───────────────────────────────────────────────────
function adminHeaders(): HeadersInit {
  const key = typeof window !== 'undefined' ? (localStorage.getItem('adminKey') ?? '') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
}
function fmtHrs(hrs: string): string {
  const h = parseFloat(hrs || '0')
  if (h <= 0) return '—'
  const wh = Math.floor(h), wm = Math.round((h - wh) * 60)
  return wm > 0 ? `${wh}h ${wm}m` : `${wh}h`
}
function fmtDate(d: string) {
  if (!d || d < '2010') return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

// ── Message generator ─────────────────────────────────────────
function generateMessage(p: Performer): string {
  const firstName   = p.full_name.split(' ')[0]
  const days        = parseInt(p.days_worked || '0')
  const expectedHrs = days * 8
  const activeHrs   = parseFloat(p.active_hrs || '0')
  const idleHrs     = parseFloat(p.idle_hrs   || '0')
  const prodHrs     = parseFloat(p.prod_hrs   || '0')
  const lowDays     = parseInt(p.low_days     || '0')
  const avgProd     = parseFloat(p.avg_prod   || '0')
  const fmtH = (h: number) => { const wh = Math.floor(h), wm = Math.round((h-wh)*60); return wm>0?`${wh}h ${wm}m`:`${wh}h` }
  return `Hey ${firstName},\n\nI was just checking the new Team Panel and went through your work report for the last month. 📊\n\nI noticed that you worked ${days} day${days!==1?'s':''}. Ideally, at 8 hours a day, that should be ${expectedHrs} hours (${days}×8). However, the system shows your computer was active for only ${fmtH(activeHrs)}. 💻\n\nEven more concerning is that out of those ${fmtH(activeHrs)}, ${fmtH(idleHrs)} is showing as idle time, and your actual productive work is showing as only ${fmtH(prodHrs)}. Because of this, ${lowDays} out of your ${days} days are flagged with very low productivity (your average is ${avgProd}%). 📉\n\nI know you're a talented professional, but right now the dashboard isn't reflecting your true potential at all. Is everything okay? 🤔 Please look into this and try to improve these scores moving forward.\n\nI really want to see you hitting those "High" levels again! 🚀`
}

// ── Build system prompt from performers data ──────────────────
function buildSystemPrompt(performers: Performer[]): string {
  const summary = performers.map(p => {
    const avgProd  = parseFloat(p.avg_prod   || '0')
    const activeHrs = parseFloat(p.active_hrs || '0')
    const idleHrs  = parseFloat(p.idle_hrs   || '0')
    const prodHrs  = parseFloat(p.prod_hrs   || '0')
    const days     = parseInt(p.days_worked  || '0')
    const lowDays  = parseInt(p.low_days     || '0')
    const idlePct  = activeHrs > 0 ? Math.round(idleHrs / activeHrs * 100) : 0
    return `- ${p.full_name} (${p.position || 'No position'}): avg ${avgProd}%, ${days} days worked, active ${fmtHrs(p.active_hrs)}, idle ${fmtHrs(p.idle_hrs)} (${idlePct}% idle), productive ${fmtHrs(p.prod_hrs)}, ${lowDays}/${days} low days`
  }).join('\n')

  return `You are a performance analytics assistant for Coinpedia / Ultimez, an admin dashboard tool. You have access to the following data about employees whose 30-day average productivity is below 40%.

DATA (last 30 days, sorted by avg productivity ascending):
${summary}

Total employees below 40%: ${performers.length}
Critical (below 20%): ${performers.filter(p => parseFloat(p.avg_prod) < 20).length}

FIELD DEFINITIONS:
- avg: 30-day average productivity percentage (Teramind score)
- active: total time computer was active/monitored
- idle: time within active hours where no productive activity was detected  
- productive: time spent on productive apps and websites
- low days: days where daily productivity score was below 40%

Your role: Help the admin understand this performance data, identify patterns, suggest actions, and answer specific questions about individual employees or groups. Be concise, data-driven, and constructive. When referencing hours, use the format Xh Ym. Never fabricate data not in the provided dataset.`
}

// ── Copy button ───────────────────────────────────────────────
function CopyButton({ text, label = '📋 Copy Message' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }} style={{
      padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
      fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)',
      background: copied ? '#22c55e' : 'linear-gradient(135deg,#8b5cf6,#6366f1)',
      color: '#fff', transition: 'all .2s', whiteSpace: 'nowrap' as const,
    }}>
      {copied ? '✓ Copied!' : label}
    </button>
  )
}

// ── Performer card ────────────────────────────────────────────
function PerformerCard({ p }: { p: Performer }) {
  const [expanded, setExpanded] = useState(false)
  const msg        = useMemo(() => generateMessage(p), [p])
  const avgProd    = parseFloat(p.avg_prod || '0')
  const isCritical = avgProd < 20
  const IMAGE_BASE = 'https://ultimez.com/team/uploads/profile/'
  const initials   = p.full_name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div style={{ background: 'var(--card)', border: `1px solid ${isCritical ? '#ef444430' : 'var(--border)'}`, borderRadius: 12, overflow: 'hidden', borderLeft: `4px solid ${isCritical ? '#ef4444' : '#f59e0b'}` }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
        <div style={{ width: 40, height: 40, borderRadius: 9, flexShrink: 0, background: isCritical ? '#ef444422' : '#f59e0b22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: isCritical ? '#ef4444' : '#f59e0b', overflow: 'hidden' }}>
          {p.profile_image
            ? <img src={`${IMAGE_BASE}${p.profile_image}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{p.full_name}</span>
            {isCritical && <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 10, background: '#ef444422', color: '#ef4444' }}>CRITICAL</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.position || 'No position'}</div>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' as const }}>
          {[
            { label: 'Avg',        value: `${avgProd}%`,                    color: isCritical ? '#ef4444' : '#f59e0b' },
            { label: 'Days',       value: p.days_worked },
            { label: 'Active',     value: fmtHrs(p.active_hrs) },
            { label: 'Idle',       value: fmtHrs(p.idle_hrs),               color: '#ef4444' },
            { label: 'Productive', value: fmtHrs(p.prod_hrs),               color: '#22c55e' },
            { label: 'Low days',   value: `${p.low_days}/${p.days_worked}`, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' as const }}>
              <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text4)', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.color || 'var(--text)' }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
          <CopyButton text={msg} />
          <button onClick={() => setExpanded(e => !e)} style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', background: 'var(--bg3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>PREVIEW · {fmtDate(p.period_start)} – {fmtDate(p.period_end)}</span>
            <CopyButton text={msg} />
          </div>
          <pre style={{ fontFamily: 'var(--font-sans)', fontSize: 12, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap' as const, margin: 0, padding: '12px 14px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
            {msg}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── AI Chat panel ─────────────────────────────────────────────
function ChatPanel({ performers, loaded }: { performers: Performer[]; loaded: boolean }) {
  const [msgs,    setMsgs]    = useState<ChatMsg[]>([])
  const [input,   setInput]   = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, thinking])

  const SUGGESTED = [
    'Who has the worst productive hours?',
    'Which employees are critical (<20%)?',
    'What is the average idle % across all low performers?',
    'Who worked the most days but still scored low?',
    'Summarize the overall situation',
  ]

  async function send(text: string) {
    if (!text.trim() || thinking || !loaded || performers.length === 0) return
    const userMsg: ChatMsg = { role: 'user', content: text.trim() }
    const newHistory = [...msgs, userMsg]
    setMsgs(newHistory)
    setInput('')
    setThinking(true)

    try {
      const systemPrompt = buildSystemPrompt(performers)
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      const reply = data.content?.find((b: { type: string }) => b.type === 'text')?.text || 'Sorry, no response.'
      setMsgs(h => [...h, { role: 'assistant', content: reply }])
    } catch {
      setMsgs(h => [...h, { role: 'assistant', content: '⚠ Failed to reach AI. Please try again.' }])
    } finally {
      setThinking(false)
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>

      {/* Chat header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🤖</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Performance AI</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
              {loaded ? `${performers.length} employees in context` : 'Loading data…'}
            </div>
          </div>
          {msgs.length > 0 && (
            <button onClick={() => setMsgs([])} style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text4)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Welcome */}
        {msgs.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '12px 14px', background: 'var(--bg3)', borderRadius: 10, fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
              👋 Hi! I have access to all {performers.length} low-performer records. Ask me anything about the data — individual employees, patterns, comparisons, or suggestions.
            </div>
            {loaded && performers.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text4)', marginBottom: 8, letterSpacing: 0.8 }}>SUGGESTED QUESTIONS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SUGGESTED.map(q => (
                    <button key={q} onClick={() => send(q)} style={{
                      textAlign: 'left' as const, padding: '8px 12px', borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--bg3)',
                      cursor: 'pointer', fontSize: 12, color: 'var(--text2)', lineHeight: 1.4,
                      transition: 'all .15s',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#f59e0b'; (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.color = '' }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message history */}
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '88%', padding: '10px 13px', borderRadius: 10, fontSize: 12, lineHeight: 1.7,
              background: m.role === 'user' ? 'linear-gradient(135deg,#f59e0b22,#ef444422)' : 'var(--bg3)',
              color: 'var(--text)',
              border: `1px solid ${m.role === 'user' ? '#f59e0b30' : 'var(--border)'}`,
              borderBottomRightRadius: m.role === 'user' ? 3 : 10,
              borderBottomLeftRadius:  m.role === 'assistant' ? 3 : 10,
              whiteSpace: 'pre-wrap' as const,
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {thinking && (
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderRadius: 10, borderBottomLeftRadius: 3, border: '1px solid var(--border)', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out` }} />
              ))}
              <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:.5} 40%{transform:scale(1.2);opacity:1} }`}</style>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        {!loaded ? (
          <div style={{ fontSize: 11, color: 'var(--text4)', textAlign: 'center' as const, fontFamily: 'var(--font-mono)', padding: '8px 0' }}>Waiting for data to load…</div>
        ) : performers.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text4)', textAlign: 'center' as const, fontFamily: 'var(--font-mono)', padding: '8px 0' }}>No low performers — nothing to analyse.</div>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask about the data… (Enter to send)"
              rows={2}
              disabled={thinking}
              style={{
                flex: 1, resize: 'none', background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-sans)', fontSize: 12,
                padding: '8px 10px', outline: 'none', lineHeight: 1.5,
                opacity: thinking ? 0.6 : 1,
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || thinking}
              style={{
                padding: '8px 14px', borderRadius: 8, border: 'none', cursor: !input.trim() || thinking ? 'default' : 'pointer',
                background: !input.trim() || thinking ? 'var(--bg3)' : 'linear-gradient(135deg,#f59e0b,#ef4444)',
                color: !input.trim() || thinking ? 'var(--text4)' : '#fff',
                fontSize: 16, transition: 'all .15s', flexShrink: 0, height: 52,
              }}>
              ↑
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: 64, color: 'var(--text3)', fontSize: 13 }}>
      <div style={{ fontSize: 24, marginBottom: 10, display: 'inline-block', animation: 'qd-spin 1s linear infinite' }}>⟳</div>
      <div>Loading from BigQuery…</div>
      <style>{`@keyframes qd-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function LowPerformersPage({ session }: { session: SessionPayload }) {
  const router = useRouter()
  const [performers, setPerformers] = useState<Performer[]>([])
  const [meta,       setMeta]       = useState<Meta | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [loaded,     setLoaded]     = useState(false)
  const [error,      setError]      = useState('')
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState<'all' | 'critical'>('all')
  const [copyAll,    setCopyAll]    = useState(false)

  function handleNav(key: string) {
    if (key === 'low-performers') return
    if (key.startsWith('bo-')) { router.push('/admin/backoffice'); return }
    router.push(`/admin/${key}`)
  }

  useEffect(() => {
    if (loaded) return
    setLoading(true)
    fetch('/api/admin/low-performers', { headers: adminHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.success) { setPerformers(d.performers as Performer[]); setMeta(d.meta as Meta) }
        else setError(d.detail || d.error || 'API error')
        setLoaded(true)
      })
      .catch(e => { setError(String(e)); setLoaded(true) })
      .finally(() => setLoading(false))
  }, [loaded])

  const filtered = useMemo(() => {
    let list = performers
    if (filter === 'critical') list = list.filter(p => parseFloat(p.avg_prod) < 20)
    if (search) { const q = search.toLowerCase(); list = list.filter(p => p.full_name.toLowerCase().includes(q) || p.position.toLowerCase().includes(q)) }
    return list
  }, [performers, filter, search])

  function copyAllMessages() {
    const text = filtered.map(p => generateMessage(p)).join('\n\n' + '─'.repeat(60) + '\n\n')
    navigator.clipboard.writeText(text).then(() => { setCopyAll(true); setTimeout(() => setCopyAll(false), 2500) })
  }

  return (
    <PageShell
      panel="admin"
      session={session}
      activeKey="low-performers"
      onNav={handleNav}
      title="Admin Dashboard"
      subtitle="Performance Messages"
    >
      {/* Inner header */}
      <div style={{ margin: '-24px -24px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '14px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Performance Messages</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              Auto-generated messages for employees below 40% avg · last 30 days
            </div>
          </div>
          {loaded && !error && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setLoaded(false)} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>
                ↻ Refresh
              </button>
              {filtered.length > 0 && (
                <button onClick={copyAllMessages} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', background: copyAll ? '#22c55e' : 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', transition: 'all .2s' }}>
                  {copyAll ? `✓ Copied ${filtered.length}!` : `📋 Copy All (${filtered.length})`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout: list (left) + chat (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>

        {/* ── Left: Employee list ── */}
        <div>
          {loading && <Spinner />}
          {error && <div style={{ padding: 20, color: '#ef4444', fontSize: 13, background: '#ef444410', borderRadius: 8 }}>⚠ {error}</div>}

          {loaded && !error && (<>

            {/* Summary cards */}
            {meta && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Below 40%',       value: meta.low_count,                                               color: '#f59e0b', sub: 'last 30 days' },
                  { label: 'Critical <20%',   value: meta.critical_count,                                          color: '#ef4444', sub: 'urgent' },
                  { label: 'Total tracked',   value: meta.total_with_reports,                                      color: 'var(--text2)' },
                  { label: 'Showing',         value: filtered.length.toString(),                                   color: '#8b5cf6', sub: filter === 'critical' ? 'critical only' : 'all' },
                ].map(c => (
                  <div key={c.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: c.color }} />
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase' as const, color: 'var(--text3)', marginBottom: 6 }}>{c.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-mono)', color: c.color, lineHeight: 1 }}>{c.value}</div>
                    {c.sub && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{c.sub}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 12, padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 9 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…"
                style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '5px 9px' }} />
              {[{ k: 'all', l: `All (${performers.length})` }, { k: 'critical', l: `Critical (${performers.filter(p => parseFloat(p.avg_prod) < 20).length})` }].map(f => (
                <button key={f.k} onClick={() => setFilter(f.k as 'all' | 'critical')} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, background: filter === f.k ? 'var(--accent-c)' : 'var(--bg3)', color: filter === f.k ? '#fff' : 'var(--text2)', transition: 'all .15s' }}>{f.l}</button>
              ))}
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginLeft: 'auto' }}>{filtered.length} emp.</span>
            </div>

            {/* Cards */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🎉</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{search ? 'No results' : 'No employees below 40%!'}</div>
                <div style={{ fontSize: 12 }}>{search ? 'Try clearing the search.' : 'Great performance this month.'}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map(p => <PerformerCard key={p.employee_row_id} p={p} />)}
              </div>
            )}

            {/* Legend */}
            {filtered.length > 0 && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
                {[['Avg','30-day avg %'],['Days','days with report'],['Active','computer active'],['Idle','idle within active'],['Productive','on productive apps'],['Low days','days below 40%']].map(([l,d]) => (
                  <div key={l} style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', gap: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text2)', fontWeight: 600 }}>{l}:</span><span>{d}</span>
                  </div>
                ))}
              </div>
            )}

          </>)}
        </div>

        {/* ── Right: AI Chat (sticky) ── */}
        <div style={{ position: 'sticky', top: 0, height: 'calc(100vh - 120px)' }}>
          <ChatPanel performers={performers} loaded={loaded && !error} />
        </div>

      </div>
    </PageShell>
  )
}
