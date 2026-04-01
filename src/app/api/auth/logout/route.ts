import { NextRequest, NextResponse } from 'next/server'
import { clearSession, PanelType } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { panel } = await req.json().catch(() => ({ panel: 'employee' }))
  await clearSession(panel as PanelType)
  return NextResponse.json({ success: true })
}
