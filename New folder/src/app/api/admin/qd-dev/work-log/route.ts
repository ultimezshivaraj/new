// src/app/api/admin/qd-dev/work-log/route.ts
// POST /api/admin/qd-dev/work-log
// Writes employee task timing entries to BigQuery QDDev_Project.work_log

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest }        from '@/lib/adminAuth'
import { getBigQuery }               from '@/lib/bigquery'
import { randomUUID }                from 'crypto'

const BQ_PROJECT = 'for-ga4-bitquery-new'
const BQ_DATASET = 'QDDev_Project'
const BQ_TABLE   = 'work_log'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureTable(bq: any) {
  const ds    = bq.dataset(BQ_DATASET)
  const table = ds.table(BQ_TABLE)
  const [exists] = await table.exists()
  if (!exists) {
    await ds.createTable(BQ_TABLE, {
      schema: [
        { name: 'log_id',        type: 'STRING',    mode: 'REQUIRED' },
        { name: 'task_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'task_title',    type: 'STRING',    mode: 'REQUIRED' },
        { name: 'task_category', type: 'STRING',    mode: 'REQUIRED' },
        { name: 'employee_name', type: 'STRING',    mode: 'REQUIRED' },
        { name: 'time_spent',    type: 'STRING',    mode: 'REQUIRED' },
        { name: 'duration_ms',   type: 'INT64',     mode: 'REQUIRED' },
        { name: 'module',        type: 'STRING',    mode: 'REQUIRED' },
        { name: 'logged_at',     type: 'TIMESTAMP', mode: 'REQUIRED' },
        { name: 'created_at',    type: 'TIMESTAMP', mode: 'REQUIRED' },
      ],
      timePartitioning: { type: 'DAY', field: 'created_at' },
    })
  }
}



export async function POST(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { task_id, task_title, task_category, employee_name,
          time_spent, duration_ms, module: taskModule, logged_at } = body

  if (!task_id || !task_title || !time_spent)
    return NextResponse.json({ error: 'Missing: task_id, task_title, time_spent' }, { status: 400 })

  const row = {
    log_id:        randomUUID(),
    task_id: String(task_id),
    task_title:    String(task_title).substring(0, 500),
    task_category: String(task_category || 'unknown').substring(0, 50),
    employee_name: String(employee_name || 'unknown').substring(0, 100),
    time_spent:    String(time_spent).substring(0, 20),
    duration_ms:   Number(duration_ms) || 0,
    module:        String(taskModule || 'qd-dev').substring(0, 100),
    logged_at:     logged_at ? new Date(logged_at) : new Date(),
    created_at:    new Date(),
  }

  try {
    const bq = getBigQuery()
    await ensureTable(bq)
    await bq.dataset(BQ_DATASET).table(BQ_TABLE).insert([row])
    return NextResponse.json({ ok: true, log_id: row.log_id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg })
  }
}
