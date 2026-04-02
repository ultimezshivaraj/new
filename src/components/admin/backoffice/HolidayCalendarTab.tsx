'use client'
// src/components/admin/backoffice/HolidayCalendarTab.tsx

import { useState, useEffect, useMemo } from 'react'

// ── Shared helpers ────────────────────────────────────────────
function adminHeaders(): HeadersInit {
  const key = typeof window !== 'undefined' ? (localStorage.getItem('adminKey') ?? '') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase' as const, color: 'var(--text3)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, fontFamily: 'var(--font-mono)', color }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: 56, color: 'var(--text3)', fontSize: 13 }}>
      <div style={{ fontSize: 24, marginBottom: 10, display: 'inline-block', animation: 'qd-spin 1s linear infinite' }}>⟳</div>
      <div>Loading from BigQuery…</div>
      <style>{`@keyframes qd-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────
interface HolidayRow {
  id: string
  holiday_date: string
  holiday_details: string
  day_name: string
  day_of_week: string
  status: 'today' | 'upcoming' | 'past'
  days_away: string
}

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(d: string) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return d }
}

function daysAwayLabel(days: number): string {
  if (days === 0) return 'Today!'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 0) return `In ${days} days`
  return `${Math.abs(days)} days ago`
}

// ── Main Component ────────────────────────────────────────────
export default function HolidayCalendarTab() {
  const [holidays, setHolidays] = useState<HolidayRow[]>([])
  const [loading,  setLoading]  = useState(false)
  const [loaded,   setLoaded]   = useState(false)
  const [error,    setError]    = useState('')
  const [yearFilter, setYearFilter] = useState<string>('')

  useEffect(() => {
    if (loaded) return
    setLoading(true)
    fetch('/api/admin/back-office/holidays', { headers: adminHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.success) setHolidays(d.holidays as HolidayRow[])
        else setError(d.detail || d.error || 'API error')
        setLoaded(true)
      })
      .catch(e => { setError(String(e)); setLoaded(true) })
      .finally(() => setLoading(false))
  }, [loaded])

  // Available years
  const years = useMemo(() => {
    const ys = [...new Set(holidays.map(h => h.holiday_date.slice(0, 4)))].sort()
    return ys
  }, [holidays])

  // Set default year filter to current year once loaded
  useEffect(() => {
    if (years.length && !yearFilter) {
      const currentYear = new Date().getFullYear().toString()
      setYearFilter(years.includes(currentYear) ? currentYear : years[years.length - 1])
    }
  }, [years, yearFilter])

  const filtered = useMemo(() => {
    if (!yearFilter) return holidays
    return holidays.filter(h => h.holiday_date.startsWith(yearFilter))
  }, [holidays, yearFilter])

  // Summary stats from filtered list
  const total    = filtered.length
  const upcoming = filtered.filter(h => h.status === 'upcoming').length
  const past     = filtered.filter(h => h.status === 'past').length
  const today    = filtered.find(h => h.status === 'today')
  const nextHoliday = filtered.find(h => h.status === 'upcoming' || h.status === 'today')
  const weekendHolidays = filtered.filter(h => h.day_of_week === '1').length

  const TH: React.CSSProperties = {
    padding: '9px 12px', fontSize: 10, fontFamily: 'var(--font-mono)',
    letterSpacing: 1, textTransform: 'uppercase' as const, color: 'var(--text2)',
    background: 'var(--bg3)', textAlign: 'left' as const,
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' as const,
  }
  const TD: React.CSSProperties = {
    padding: '9px 12px', fontSize: 12,
    borderBottom: '1px solid var(--border)', color: 'var(--text)',
    verticalAlign: 'middle' as const,
  }

  if (loading) return <Spinner />
  if (error) return (
    <div style={{ padding: 24, color: '#ef4444', fontSize: 13, background: '#ef444410', borderRadius: 8 }}>
      ⚠ {error}
    </div>
  )

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Holidays"    value={total}    color="var(--accent-c)" />
        <StatCard label="Upcoming"          value={upcoming} color="#22c55e" sub={yearFilter} />
        <StatCard label="Past"              value={past}     color="var(--text3)" sub={yearFilter} />
        <StatCard label="On Weekend"        value={weekendHolidays} color="#8b5cf6" sub="Falls on Sunday" />
        <StatCard
          label="Next Holiday"
          value={nextHoliday ? nextHoliday.holiday_details : '—'}
          color="#f59e0b"
          sub={nextHoliday ? daysAwayLabel(parseInt(nextHoliday.days_away)) : ''}
        />
      </div>

      {/* Year filter + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 8, padding: 4, border: '1px solid var(--border)' }}>
          {years.map(y => (
            <button
              key={y}
              onClick={() => setYearFilter(y)}
              style={{
                padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600,
                background: yearFilter === y ? 'var(--accent-c)' : 'transparent',
                color: yearFilter === y ? '#fff' : 'var(--text3)',
                transition: 'all .15s',
              }}
            >
              {y}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>
          {filtered.length} holidays
        </span>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['#', 'Date', 'Day', 'Holiday Name', 'Status', 'Days Away'].map(h => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                No holidays found for {yearFilter}
              </td></tr>
            ) : filtered.map((h, i) => {
              const daysAway = parseInt(h.days_away)
              const isToday    = h.status === 'today'
              const isUpcoming = h.status === 'upcoming'
              const isPast     = h.status === 'past'
              const isWeekend  = h.day_of_week === '1'
              const isNext     = nextHoliday?.id === h.id

              // Row color
              const rowBg = isToday
                ? '#f59e0b08'
                : isNext
                ? '#22c55e06'
                : undefined

              return (
                <tr
                  key={h.id}
                  style={{ opacity: isPast ? 0.5 : 1, background: rowBg }}
                  onMouseEnter={e => { if (!rowBg) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
                  onMouseLeave={e => { if (!rowBg) (e.currentTarget as HTMLElement).style.background = '' }}
                >
                  <td style={{ ...TD, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>

                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontWeight: 600, whiteSpace: 'nowrap' as const }}>
                    {fmtDate(h.holiday_date)}
                  </td>

                  <td style={{ ...TD }}>
                    <span style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20,
                      background: isWeekend ? '#ef444418' : 'var(--bg3)',
                      color: isWeekend ? '#ef4444' : 'var(--text3)',
                    }}>
                      {h.day_name}
                      {isWeekend && ' ⚠'}
                    </span>
                  </td>

                  <td style={{ ...TD, fontWeight: isToday || isNext ? 600 : 400 }}>
                    {h.holiday_details || '—'}
                    {isToday && (
                      <span style={{ marginLeft: 8, fontSize: 10, fontFamily: 'var(--font-mono)', padding: '1px 7px', borderRadius: 10, background: '#f59e0b20', color: '#f59e0b' }}>
                        Today
                      </span>
                    )}
                    {isNext && !isToday && (
                      <span style={{ marginLeft: 8, fontSize: 10, fontFamily: 'var(--font-mono)', padding: '1px 7px', borderRadius: 10, background: '#22c55e20', color: '#22c55e' }}>
                        Next
                      </span>
                    )}
                  </td>

                  <td style={TD}>
                    {isToday ? (
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: '#f59e0b20', color: '#f59e0b' }}>Today</span>
                    ) : isUpcoming ? (
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: '#22c55e20', color: '#22c55e' }}>Upcoming</span>
                    ) : (
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: 'var(--bg3)', color: 'var(--text4)' }}>Past</span>
                    )}
                  </td>

                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {isToday ? (
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>Today!</span>
                    ) : isUpcoming ? (
                      <span style={{ color: daysAway <= 7 ? '#22c55e' : 'var(--text2)', fontWeight: daysAway <= 7 ? 600 : 400 }}>
                        {daysAwayLabel(daysAway)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text4)' }}>{daysAwayLabel(daysAway)}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Weekend warning note */}
      {weekendHolidays > 0 && (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#ef4444' }}>⚠</span>
          {weekendHolidays} holiday{weekendHolidays > 1 ? 's' : ''} in {yearFilter} fall on a Sunday (non-working day)
        </div>
      )}
    </div>
  )
}
