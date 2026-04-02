import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import APIEndpointsPage from '@/components/admin/qd-dev/APIEndpointsPage'

export const metadata = { title: 'API Endpoints — QD Dev' }

export default async function APIEndpointsRoute() {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')
  return <APIEndpointsPage session={session} />
}
