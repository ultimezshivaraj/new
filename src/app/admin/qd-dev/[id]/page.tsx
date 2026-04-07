// src/app/admin/qd-dev/[id]/page.tsx
import { redirect }       from 'next/navigation'
import { getSession }     from '@/lib/session'
import ProjectReportPage  from '@/components/admin/qd-dev/ProjectReportPage'

export const metadata = { title: 'Project Report — QD Dev' }

interface Props { params: Promise<{ id: string }> }

export default async function AdminProjectReportPage({ params }: Props) {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')
  const { id } = await params
  return <ProjectReportPage session={session} projectId={id} />
}