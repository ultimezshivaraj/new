// src/app/admin/backoffice/page.tsx
import { redirect }   from 'next/navigation'
import { getSession } from '@/lib/session'
import BackOfficePage from '@/components/admin/backoffice/BackOfficePage'

export const metadata = { title: 'Back Office — Coinpedia Admin' }

interface Props {
  searchParams: Promise<{ tab?: string }>
}

export default async function AdminBackOfficePage({ searchParams }: Props) {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')

  const { tab } = await searchParams
  return <BackOfficePage session={session} initialTab={tab} />
}