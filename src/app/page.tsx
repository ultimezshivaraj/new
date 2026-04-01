// src/app/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

/**
 * Main entry point redirect.
 * If logged in, sends users to the Admin Employees page.
 * If not logged in, sends users to the Admin Login page.
 */
export default async function RootPage() {
  const session = await getSession('admin')

  if (session) {
    // If a valid admin session exists, skip login and go to the dashboard
    redirect('/admin/employees')
  }

  // Fallback for unauthenticated users
  redirect('/admin/login')
}