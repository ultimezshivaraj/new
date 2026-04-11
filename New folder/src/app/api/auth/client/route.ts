import { NextRequest, NextResponse } from 'next/server'
import { authenticateClient } from '@/lib/bigquery'
import { createSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { emailId, password } = await req.json()

    if (!emailId || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const client = await authenticateClient(emailId.trim(), password)

    if (!client) {
      return NextResponse.json(
        { error: 'Invalid credentials or account is disabled' },
        { status: 401 }
      )
    }

    await createSession({
      id:    client.id,
      name:  client.full_name,
      email: client.email_id,
      panel: 'client',
    })

    return NextResponse.json({
      success: true,
      client: {
        id:            client.id,
        full_name:     client.full_name,
        email_id:      client.email_id,
        username:      client.username,
        mobile_number: client.mobile_number,
      },
    })
  } catch (err) {
    console.error('[client login]', err)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
