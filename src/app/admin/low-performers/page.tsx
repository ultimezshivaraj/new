// src/app/admin/low-performers/page.tsx
import { redirect }        from 'next/navigation'
import { getSession }      from '@/lib/session'
import LowPerformersPage   from '@/components/admin/lowperformers/LowPerformersPage'

export const metadata = { title: 'Performance Messages — Coinpedia Admin' }

export default async function AdminLowPerformersPage() {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')
  return <LowPerformersPage session={session} />
}
