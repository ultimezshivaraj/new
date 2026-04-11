// src/app/admin/work-monitoring/productive-requests/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import ProductiveRequestsPage from '@/components/admin/work-monitoring/ProductiveRequestsPage'

export const metadata = { title: 'Productive Requests — QD Admin' }

export default async function AdminProductiveRequestsPage() {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')
  return <ProductiveRequestsPage session={session} />
}
