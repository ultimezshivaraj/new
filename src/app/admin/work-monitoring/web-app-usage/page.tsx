// src/app/admin/work-monitoring/web-app-usage/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import WebAppUsagePage from '@/components/admin/work-monitoring/WebAppUsagePage'

export const metadata = { title: 'Web & App Usage — QD Admin' }

export default async function AdminWebAppUsagePage() {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')
  return <WebAppUsagePage session={session} />
}
