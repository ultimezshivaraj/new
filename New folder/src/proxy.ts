import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

type PanelType = 'employee' | 'client' | 'admin'

const COOKIE: Record<PanelType, string> = {
  employee: 'qd_emp_session',
  client:   'qd_client_session',
  admin:    'qd_admin_session',
}

const PROTECTED: { prefix: string; panel: PanelType; login: string }[] = [
  { prefix: '/employee/dashboard', panel: 'employee', login: '/employee/login' },
  { prefix: '/client/dashboard',   panel: 'client',   login: '/client/login'   },
]

// Admin uses the existing API-key system — no JWT gate on /admin itself
// Only protect employee and client dashboards via JWT

async function verifyJwt(token: string): Promise<boolean> {
  const secret = process.env.JWT_SECRET
  if (!secret) return false
  try {
    await jwtVerify(token, new TextEncoder().encode(secret))
    return true
  } catch {
    return false
  }
}

const PUBLIC = [
  '/employee/login',
  '/client/login',
  '/client/register',
  '/admin/login',
  '/api/auth',
  '/api/reports',
  '/api/run-report',
  '/_next',
  '/favicon',
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Let public paths through
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Check protected routes
  const route = PROTECTED.find(r => pathname.startsWith(r.prefix))
  if (!route) return NextResponse.next()

  const token = req.cookies.get(COOKIE[route.panel])?.value
  if (!token) return NextResponse.redirect(new URL(route.login, req.url))

  const valid = await verifyJwt(token)
  if (!valid) {
    const res = NextResponse.redirect(new URL(route.login, req.url))
    res.cookies.delete(COOKIE[route.panel])
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/employee/:path*', '/client/:path*'],
}
