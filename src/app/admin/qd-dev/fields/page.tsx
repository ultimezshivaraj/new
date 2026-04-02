import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import FieldsReferencePage from '@/components/admin/qd-dev/FieldsReferencePage'

export const metadata = { title: 'Fields Reference — QD Dev' }

export default async function FieldsReferenceRoute() {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')
  return <FieldsReferencePage session={session} />
}
