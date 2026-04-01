import { NextRequest } from 'next/server'

// ─────────────────────────────────────────────
// AUTH HELPERS
// Mirrors the logic from api/reports.js and
// api/run-report.js — no hardcoded fallbacks.
// All keys must be set in Vercel env vars.
// ─────────────────────────────────────────────

function getAdminKey(): string {
  const key = process.env.ADMIN_API_KEY
  if (!key) throw new Error('ADMIN_API_KEY env var is not set')
  return key
}

function getEmployeeKey(): string {
  return process.env.EMPLOYEE_API_KEY ?? ''
}

function getBearer(req: NextRequest): string {
  return req.headers.get('authorization') ?? ''
}

/**
 * Admin can: create, update, delete reports.
 * Matches `isAdmin` check in original api/reports.js
 */
export function isAdmin(req: NextRequest): boolean {
  try {
    return getBearer(req) === `Bearer ${getAdminKey()}`
  } catch {
    return false
  }
}

/**
 * Employee (or admin) can: list + run reports.
 * Matches `isEmployee` check in original api/reports.js
 */
export function isEmployee(req: NextRequest): boolean {
  try {
    const bearer = getBearer(req)
    return (
      bearer === `Bearer ${getAdminKey()}` ||
      bearer === `Bearer ${getEmployeeKey()}`
    )
  } catch {
    return false
  }
}
