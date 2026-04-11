// src\app\admin\companies\page.tsx

import { redirect }     from 'next/navigation'
import { getSession }   from '@/lib/session'
import CompaniesPage    from '@/components/admin/companies/CompaniesPage'

export const metadata = { title: 'Companies — Coinpedia Admin' }
 
export default async function AdminCompaniesPage() {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')
  return <CompaniesPage session={session} />
}