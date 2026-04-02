import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import QDAnalyserPage from '@/components/admin/qd-dev/QDAnalyserPage'

export const metadata = { title: 'QD Code Analyser — Admin' }

export default async function QDAnalyserRoute() {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')
  return <QDAnalyserPage session={session} />
}
