// src/app/api/admin/qd-dev/tasks/route.ts
// POST /api/admin/qd-dev/tasks
// Saves a team-member-generated research task from QD Dev AI chat
// These tasks have generated_by='team_member' and are NOT deleted on re-analysis

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest }        from '@/lib/adminAuth'
import { getBigQuery }               from '@/lib/bigquery'
import { randomUUID }                from 'crypto'

const BQ_PROJECT = 'for-ga4-bitquery-new'
const BQ_DATASET = 'QDDev_Project'

export async function POST(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as Record<string, string>
  const { project_id, project_name, title, description, chat_context, generated_by_name } = body

  if (!project_id || !title)
    return NextResponse.json({ error: 'project_id and title required' }, { status: 400 })

  const row = {
    task_id:           randomUUID(),
    project_id:        String(project_id),
    project_name:      String(project_name || '').substring(0, 200),
    category:          'research',
    title:             String(title).substring(0, 500),
    description:       (description || null)?.substring(0, 2000),
    business_impact:   null,
    file_path:         null,
    fix_steps:         null,
    fix_code:          null,
    effort_minutes:    null,
    severity:          null,
    owasp_category:    null,
    assigned_to:       'Team',
    status:            'open',
    generated_by:      'team_member',
    generated_by_name: String(generated_by_name || 'Team Member').substring(0, 100),
    chat_context:      (chat_context || null)?.substring(0, 5000),
    created_at:        new Date(),
    updated_at:        new Date(),
  }

  try {
    const bq = getBigQuery()
    await bq.dataset(BQ_DATASET).table('tasks').insert([row])
    return NextResponse.json({ ok: true, task_id: row.task_id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg })
  }
}
