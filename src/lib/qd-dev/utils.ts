import { NextRequest } from 'next/server'

// ─── Auth ─────────────────────────────────────────────────────────────────────

const ADMIN_KEY = process.env.ADMIN_KEY ?? 'coinpedia-admin-2026'

export function verifyAdmin(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? ''
  if (auth === `Bearer ${ADMIN_KEY}`) return true

  // Also accept cookie-based JWT from existing QD Dashboard sessions
  const cookie = req.cookies.get('qd_admin_session')?.value ?? ''
  if (cookie) {
    try {
      const payload = JSON.parse(Buffer.from(cookie.split('.')[1], 'base64').toString())
      return !!payload?.isAdmin
    } catch { /* ignore */ }
  }
  return false
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function fmtDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function fmtDuration(seconds: number): string {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function healthColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

export function severityColor(sev: string): string {
  switch (sev) {
    case 'critical': return '#ef4444'
    case 'high':     return '#f97316'
    case 'medium':   return '#f59e0b'
    case 'low':      return '#3b82f6'
    default:         return '#6b7280'
  }
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function err(msg: string, status = 400): Response {
  return json({ error: msg }, status)
}
