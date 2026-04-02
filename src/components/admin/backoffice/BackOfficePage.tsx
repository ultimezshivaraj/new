'use client'
// src/components/admin/backoffice/BackOfficePage.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell, { NavItem } from '@/components/shared/PageShell'
import { SessionPayload } from '@/lib/session'
import { ADMIN_NAV } from '@/components/admin/employees/EmployeeMonitoringPage'
import LeaveRequestsTab    from './LeaveRequestsTab'
import HolidayCalendarTab  from './HolidayCalendarTab'
import PendingApprovalsTab from './PendingApprovalsTab'
import PayrollPage         from './PayrollPage'
import ITServicesPage      from './ITServicesPage'

// ── Tab types ─────────────────────────────────────────────────
type BoTab =
  | 'bo-leave-requests' | 'bo-leave-holidays-calendar' | 'bo-leave-pending'
  | 'bo-payroll-records' | 'bo-payroll-bank-accounts' | 'bo-payroll-logs'
  | 'bo-it-queries' | 'bo-it-devices' | 'bo-it-history'

const BO_LEAVE_TABS:   { key: BoTab; label: string }[] = [
  { key: 'bo-leave-requests', label: '📄 Leave Requests'    },
  { key: 'bo-leave-holidays-calendar', label: '📅 Holiday Calendar'  },
  { key: 'bo-leave-pending',  label: '⏳ Pending Approvals' },
]
const BO_PAYROLL_TABS: { key: BoTab; label: string }[] = [
  { key: 'bo-payroll-records',  label: '💳 Payroll Records' },
  { key: 'bo-payroll-bank-accounts', label: '🏦 Bank Accounts'   },
  { key: 'bo-payroll-logs',     label: '📝 Change History'  },
]
const BO_IT_TABS:      { key: BoTab; label: string }[] = [
  { key: 'bo-it-queries',  label: '🔧 System Queries'       },
  { key: 'bo-it-devices',  label: '💻 Device Inventory'     },
  { key: 'bo-it-history',  label: '🔄 Query Status History' },
]

const ALL_TABS = [...BO_LEAVE_TABS, ...BO_PAYROLL_TABS, ...BO_IT_TABS]

const VALID_TABS = new Set<string>(ALL_TABS.map(t => t.key))
function isBoTab(key: string): key is BoTab { return VALID_TABS.has(key) }

// ── Main Component ────────────────────────────────────────────
export default function BackOfficePage({ session, initialTab }: { session: SessionPayload; initialTab?: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<BoTab>(
    initialTab && isBoTab(initialTab) ? initialTab : 'bo-leave-requests'
  )

  // Switches tab AND syncs the URL so the address bar always reflects the active tab.
  function switchTab(key: BoTab) {
    setTab(key)
    router.replace(`/admin/backoffice?tab=${key}`)
  }

  // Uses the same ADMIN_NAV as EmployeeMonitoringPage — sidebar is identical.
  // bo-* keys switch tabs in place; everything else navigates away.
  function handleNav(key: string) {
    if (key.startsWith('bo-') && isBoTab(key)) { switchTab(key); return }
    if (key === 'employees') { router.push('/admin/employees'); return }
    router.push(`/admin/${key}`)
  }

  const isLeaveTab   = tab.startsWith('bo-leave-')
  const isPayrollTab = tab.startsWith('bo-payroll-')
  const isITTab      = tab.startsWith('bo-it-')

  const sectionLabel = isLeaveTab ? 'Leave & Related' : isPayrollTab ? 'Payroll' : isITTab ? 'IT Services' : ''
  const currentTabs  = isLeaveTab ? BO_LEAVE_TABS : isPayrollTab ? BO_PAYROLL_TABS : isITTab ? BO_IT_TABS : []
  const tabLabel     = ALL_TABS.find(t => t.key === tab)?.label ?? ''

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 18px', border: 'none', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', background: 'transparent',
    color: active ? 'var(--accent-c)' : 'var(--text3)',
    borderBottom: active ? '2px solid var(--accent-c)' : '2px solid transparent',
    transition: 'all .15s', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' as const,
  })

  return (
    <PageShell
      panel="admin"
      session={session}
      navItems={ADMIN_NAV}
      activeKey={tab}
      onNav={handleNav}
      title="Admin Dashboard"
      subtitle={tabLabel}
    >
      {/* Inner header */}
      <div style={{ margin: '-24px -24px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ padding: '14px 24px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Back Office</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
              Leave management, payroll, IT services and HR operations
            </div>
          </div>
        </div>

        {sectionLabel && (
          <div style={{ padding: '10px 24px 0' }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase' as const }}>
              {sectionLabel}
            </span>
          </div>
        )}

        {currentTabs.length > 0 && (
          <div style={{ display: 'flex', padding: '0 24px', overflowX: 'auto' as const }}>
            {currentTabs.map(t => (
              <button key={t.key} style={tabStyle(tab === t.key)} onClick={() => switchTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leave */}
      {tab === 'bo-leave-requests' && <LeaveRequestsTab />}
      {tab === 'bo-leave-holidays-calendar' && <HolidayCalendarTab />}
      {tab === 'bo-leave-pending'  && <PendingApprovalsTab />}

      {/* Payroll */}
      {isPayrollTab && <PayrollPage initialTab={
        tab === 'bo-payroll-records'  ? 'records'  :
        tab === 'bo-payroll-bank-accounts' ? 'accounts' : 'logs'
      } />}

      {/* IT Services */}
      {isITTab && <ITServicesPage initialTab={
        tab === 'bo-it-queries'  ? 'queries'  :
        tab === 'bo-it-devices'  ? 'devices'  : 'history'
      } />}
    </PageShell>
  )
}