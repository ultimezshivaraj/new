import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import PagePlannerPage from '@/components/admin/qd-dev/PagePlannerPage'

export const metadata = { title: 'Page Planner — QD Dev' }

export default async function PagePlannerRoute() {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')
  return <PagePlannerPage session={session} />
}
