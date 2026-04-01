import { NextRequest } from 'next/server'
import { getProject } from '@/lib/qd-dev/bq'
import { verifyAdmin, json, err } from '@/lib/qd-dev/utils'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(req)) return err('Unauthorized', 401)
  const { id } = await params
  try {
    const project = await getProject(id)
    if (!project) return err('Not found', 404)
    return json(project)
  } catch (e) {
    return err(String(e), 500)
  }
}
