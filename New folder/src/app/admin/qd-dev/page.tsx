// src/app/admin/qd-dev/page.tsx
import { redirect }  from 'next/navigation'
import { getSession } from '@/lib/session'
import QdDevPage      from '@/components/admin/qd-dev/QdDevPage'

export const metadata = { title: 'QD Dev Analyser — Coinpedia Admin' }

export default async function AdminQdDevPage() {
  const session = await getSession('admin')
  if (!session) redirect('/admin/login')
  return <QdDevPage session={session} />
}