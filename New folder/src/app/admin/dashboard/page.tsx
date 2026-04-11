// src/app/admin/dashboard/page.tsx

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import PageShell from '@/components/shared/PageShell'

export const metadata = { title: 'Admin Dashboard — Coinpedia Admin' }

export default async function AdminDashboardPage() {
  const session = await getSession('admin')
  
  if (!session) {
    redirect('/admin/login')
  }

  return (
    <PageShell
      panel="admin"
      session={session}
      activeKey="dashboard"
      title="Admin Dashboard"
      subtitle="Overview"
    >
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '65vh', 
          fontFamily: 'var(--font-sans)'
        }}
      >
        <div 
          style={{
            padding: '40px 60px',
            borderRadius: '12px',
            background: 'var(--bg2)',
            border: '1px dashed var(--border)',
            textAlign: 'center'
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
            Dashboard Overview
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text2)' }}>
            Coming Soon...
          </p>
        </div>
      </div>
    </PageShell>
  )
}