'use client'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/shared/PageShell'
import { ADMIN_NAV } from '@/components/admin/employees/EmployeeMonitoringPage'
import { SessionPayload } from '@/lib/session'

export default function FieldsReferencePage({ session }: { session: SessionPayload }) {
  const router = useRouter()
  function handleNav(key: string) {
    if (key.startsWith('bo-')) { router.push(`/admin/backoffice?tab=${key}`); return }
    if (key.startsWith('qd-dev-')) { router.push(`/admin/qd-dev/${key.slice(7)}`); return }
    router.push(`/admin/${key}`)
  }
  return (
    <PageShell panel="admin" session={session} navItems={ADMIN_NAV}
      activeKey="qd-dev" onNav={handleNav} title="Admin Dashboard">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
        Loading…
      </div>
    </PageShell>
  )
}
