import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export type PanelType = 'employee' | 'client' | 'admin'

export interface SessionPayload {
  id:     string
  name:   string
  email:  string
  panel:  PanelType
  roles?: string
}

const COOKIE: Record<PanelType, string> = {
  employee: 'qd_emp_session',
  client:   'qd_client_session',
  admin:    'qd_admin_session',
}

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET not set')
  return new TextEncoder().encode(s)
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret())

  const jar = await cookies()
  jar.set(COOKIE[payload.panel], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
}

export async function getSession(panel: PanelType): Promise<SessionPayload | null> {
  try {
    const jar   = await cookies()
    const token = jar.get(COOKIE[panel])?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, secret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function clearSession(panel: PanelType): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE[panel])
}

export function getCookieName(panel: PanelType): string {
  return COOKIE[panel]
}
