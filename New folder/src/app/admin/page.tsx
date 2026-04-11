// src/app/admin/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

export default async function AdminRootPage() {
  const session = await getSession('admin')

  if (!session) {
    redirect('/admin/login')
  }

  // Redirect to the new primary reports management path
  redirect('/admin/dashboard')
}