// src/app/api/admin/qd-dev/ai-proxy/route.ts
// POST /api/admin/qd-dev/ai-proxy
// Proxies requests to Anthropic Claude API
// max_tokens: 20,000 cap
// Timeout: 115s AbortController — 5s under Vercel's 120s maxDuration

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest }        from '@/lib/adminAuth'

const ANTHROPIC_URL     = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MAX_TOKENS_CAP    = 20000
const REQUEST_TIMEOUT   = 115000   // 115 seconds

export async function POST(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey)
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  const body = await req.json().catch(() => ({}))

  const anthropicBody = {
    model:      body.model      || 'claude-sonnet-4-20250514',
    max_tokens: Math.min(Number(body.max_tokens) || 1000, MAX_TOKENS_CAP),
    system:     body.system,
    messages:   body.messages,
    ...(body.stream ? { stream: true } : {}),
  }

  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':          apiKey,
        'anthropic-version':  ANTHROPIC_VERSION,
      },
      body:   JSON.stringify(anthropicBody),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const data = await upstream.json()
    return NextResponse.json(data, { status: upstream.status })

  } catch (err: unknown) {
    clearTimeout(timeoutId)

    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Analysis timed out after 115 seconds. Try a smaller ZIP or split the codebase into separate uploads.' },
        { status: 504 }
      )
    }

    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
