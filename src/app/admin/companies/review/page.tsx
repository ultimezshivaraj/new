import { redirect }        from 'next/navigation'
import { getSession }      from '@/lib/session'
import ReviewQueuePage     from '@/components/admin/companies/ReviewQueuePage'

export const metadata = { title: 'Review Queue — Companies' }

interface Props { searchParams: Promise<{ company_id?: string }> }

export default async function AdminCompaniesReviewPage({ searchParams }: Props) {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')
  const { company_id } = await searchParams
  return <ReviewQueuePage session={session} companyId={company_id} />
}