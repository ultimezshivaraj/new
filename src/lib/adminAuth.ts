import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'

/**
 * Verifies admin access for API routes.
 * Accepts either:
 * 1. qd_admin_session JWT cookie  (new /admin/login flow)
 * 2. Bearer ${ADMIN_API_KEY} header (existing admin panel flow)
 */
export async function verifyAdminRequest(req: NextRequest): Promise<boolean> {
  // Method 1: JWT session cookie (new login)
  try {
    const session = await getSession('admin')
    if (session?.panel === 'admin') return true
  } catch { /* fall through */ }

  // Method 2: Bearer API key (existing admin panel stored in localStorage)
  try {
    const adminKey = process.env.ADMIN_API_KEY
    if (adminKey) {
      const bearer = req.headers.get('authorization') ?? ''
      if (bearer === `Bearer ${adminKey}`) return true
    }
  } catch { /* fall through */ }

  return false
}
