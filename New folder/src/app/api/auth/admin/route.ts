import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdmin } from '@/lib/bigquery'
import { createSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { emailId, password } = await req.json()

    if (!emailId || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const admin = await authenticateAdmin(emailId.trim(), password)

    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 })
    }

    await createSession({
      id:    admin.id,
      name:  admin.name,
      email: admin.email_id,
      panel: 'admin',
    })

    return NextResponse.json({ success: true, admin: { id: admin.id, name: admin.name, email_id: admin.email_id } })
  } catch (err) {
    console.error('[admin login]', err)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
