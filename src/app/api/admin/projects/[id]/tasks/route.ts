import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { listWorkLogs, insertWorkLog, stopWorkLog } from '@/lib/qd-dev/bq'
import { verifyAdmin, json, err } from '@/lib/qd-dev/utils'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(req)) return err('Unauthorized', 401)
  const { id } = await params
  try {
    const logs = await listWorkLogs(id)
    return json(logs)
  } catch (e) {
    return err(String(e), 500)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(req)) return err('Unauthorized', 401)
  const { id } = await params
  const { action, task_title, log_id, notes, created_by } = await req.json()

  try {
    if (action === 'start') {
      if (!task_title?.trim()) return err('task_title required')
      const newId = uuidv4()
      await insertWorkLog({ log_id: newId, project_id: id, task_title: task_title.trim(), created_by: created_by ?? 'admin' })
      return json({ log_id: newId }, 201)
    }

    if (action === 'stop') {
      if (!log_id) return err('log_id required')
      await stopWorkLog(log_id, notes ?? '')
      return json({ ok: true })
    }

    return err('action must be start or stop')
  } catch (e) {
    return err(String(e), 500)
  }
}
