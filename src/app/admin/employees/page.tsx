import { redirect }                from 'next/navigation'
import { getSession }              from '@/lib/session'
import EmployeeMonitoringPage      from '@/components/admin/employees/EmployeeMonitoringPage'

export const metadata = { title: 'Employee Monitoring — Coinpedia Admin' }

export default async function AdminEmployeesPage() {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')
  return <EmployeeMonitoringPage session={session} />
}
