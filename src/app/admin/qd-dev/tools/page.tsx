import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import QDToolsPage from '@/components/admin/qd-dev/QDToolsPage'

export const metadata = { title: 'QD Tools — Admin' }

export default async function QDToolsRoute() {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')
  return <QDToolsPage session={session} />
}
