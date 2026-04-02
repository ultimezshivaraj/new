import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import QDProjectsPage from '@/components/admin/qd-dev/QDProjectsPage'

export const metadata = { title: 'QD Dev Projects — Admin' }

export default async function QDProjectsRoute() {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')
  return <QDProjectsPage session={session} />
}
