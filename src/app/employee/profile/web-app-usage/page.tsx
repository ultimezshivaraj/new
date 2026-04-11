// src/app/employee/profile/web-app-usage/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import EmployeeWebAppUsagePage from '@/components/employee/EmployeeWebAppUsagePage'

export const metadata = { title: 'My Web & App Usage — Ultimez Team' }

export default async function EmpWebAppUsagePage() {
  const session = await getSession('employee')
  if (!session) redirect('/employee/login')
  return <EmployeeWebAppUsagePage session={session} />
}
