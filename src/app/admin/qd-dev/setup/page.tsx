import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import SetupGuidePage from '@/components/admin/qd-dev/SetupGuidePage'

export const metadata = { title: 'Setup Guide — QD Dev' }

export default async function SetupGuideRoute() {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')
  return <SetupGuidePage session={session} />
}
