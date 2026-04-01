import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { listProjects, insertProject } from '@/lib/qd-dev/bq'
import { verifyAdmin, json, err } from '@/lib/qd-dev/utils'

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) return err('Unauthorized', 401)
  try {
    const projects = await listProjects()
    return json(projects)
  } catch (e) {
    return err(String(e), 500)
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) return err('Unauthorized', 401)
  try {
    const { project_name, description, created_by } = await req.json()
    if (!project_name?.trim()) return err('project_name required')

    const project_id = uuidv4()
    await insertProject({ project_id, project_name: project_name.trim(), description: description ?? '', created_by: created_by ?? 'admin' })
    return json({ project_id }, 201)
  } catch (e) {
    return err(String(e), 500)
  }
}
