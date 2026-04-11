'use client'
// src/components/employee/backoffice/EmployeeBackOfficePage.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell, { NavItem } from '@/components/shared/PageShell'
import { SessionPayload } from '@/lib/session'
import EmpLeaveRequestsTab, { type LeaveRow, type LeaveType } from './EmpLeaveRequestsTab'
import EmpHolidayCalendarTab, { type HolidayRow } from './EmpHolidayCalendarTab'
import EmpPendingTab from './EmpPendingTab'
import EmpPayrollTab, { type PayslipRow, type BankAccountRow, type BankLogRow } from './EmpPayrollTab'
import EmpITServicesTab, { type ITQueryRow, type ITQueryLogRow, type DeviceRow } from './EmpITServicesTab'

// ── Tab types ─────────────────────────────────────────────────
type EmpBoTab =
  | 'emp-leave-requests' | 'emp-leave-holidays' | 'emp-leave-pending'
  | 'emp-payroll-payslips' | 'emp-payroll-bank-account'
  | 'emp-it-requests' | 'emp-it-device'

const EMP_LEAVE_TABS: { key: EmpBoTab; label: string }[] = [
  { key: 'emp-leave-requests', label: '📄 My Leave Requests' },
  { key: 'emp-leave-holidays', label: '📅 Holiday Calendar' },
  { key: 'emp-leave-pending', label: '⏳ My Pending' },
]
const EMP_PAYROLL_TABS: { key: EmpBoTab; label: string }[] = [
  { key: 'emp-payroll-payslips', label: '💳 My Payslips' },
  { key: 'emp-payroll-bank-account', label: '🏦 My Bank Account' },
]
const EMP_IT_TABS: { key: EmpBoTab; label: string }[] = [
  { key: 'emp-it-requests', label: '🔧 My IT Requests' },
  { key: 'emp-it-device', label: '💻 My Device' },
]

// ── Valid tab guard ───────────────────────────────────────────
const ALL_BO_TAB_KEYS = new Set<string>([
  'emp-leave-requests', 'emp-leave-holidays', 'emp-leave-pending',
  'emp-payroll-payslips', 'emp-payroll-bank-account',
  'emp-it-requests', 'emp-it-device',
])
function isEmpBoTab(key: string): key is EmpBoTab { return ALL_BO_TAB_KEYS.has(key) }

// ── Props ─────────────────────────────────────────────────────
interface Props {
  session: SessionPayload
  initialTab?: string
  leaves: LeaveRow[]
  leaveTypes: LeaveType[]
  holidays: HolidayRow[]
  payslips: PayslipRow[]
  bankAccount: BankAccountRow | null
  bankLogs: BankLogRow[]
  itQueries: ITQueryRow[]
  itQueryLogs: ITQueryLogRow[]
  device: DeviceRow | null
}

export default function EmployeeBackOfficePage({
  session, initialTab,
  leaves, leaveTypes, holidays,
  payslips, bankAccount, bankLogs,
  itQueries, itQueryLogs, device,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<EmpBoTab>(
    initialTab && isEmpBoTab(initialTab) ? initialTab : 'emp-leave-requests'
  )

  // Counts for badges
  const pendingCount = leaves.filter(r => r.team_lead_approval_status === '0' || r.approval_status === '0').length
  const pendingITCount = itQueries.filter(q => q.status === '0').length

  // Switches tab AND syncs the URL — no jarring full-page navigations
  function switchTab(key: EmpBoTab) {
    setTab(key)
    router.replace(`/employee/backoffice?tab=${key}`)
  }

  // Nav mirrors EmployeeDashboardClient's NAV exactly:
  // Dashboard · Profile · divider "Back Office" · Leave & Related · Payroll · IT Services
  // Live badge counts are applied here since we have the data.
  // const EMP_BO_NAV: NavItem[] = [
  //   { type: 'link', key: 'dashboard', icon: '◈', label: 'Dashboard' },
  //   {
  //     type: 'dropdown', key: 'profile', icon: '◉', label: 'Profile',
  //     children: [
  //       { key: 'overview', label: 'Overview' },
  //       { key: 'achievements', label: 'Achievements' },
  //       { key: 'history', label: 'Work History' },
  //       { key: 'alerts', label: 'Alerts' },
  //       { key: 'logins', label: 'Login History' },
  //     ],
  //   },

  //   { type: 'divider', label: 'Back Office' },
  //   {
  //     type: 'dropdown', key: 'emp-leave', icon: '📋', label: 'Leave & Related',
  //     badge: pendingCount > 0 ? pendingCount : undefined,
  //     children: [
  //       { key: 'emp-leave-requests', label: 'My Leave Requests' },
  //       { key: 'emp-leave-holidays', label: 'Holiday Calendar' },
  //       { key: 'emp-leave-pending', label: 'My Pending', badge: pendingCount > 0 ? pendingCount : undefined },
  //     ],
  //   },
  //   {
  //     type: 'dropdown', key: 'emp-payroll', icon: '💰', label: 'Payroll',
  //     children: [
  //       { key: 'emp-payroll-payslips', label: 'My Payslips' },
  //       { key: 'emp-payroll-bank-account', label: 'My Bank Account' },
  //     ],
  //   },
  //   {
  //     type: 'dropdown', key: 'emp-it', icon: '🖥', label: 'IT Services',
  //     badge: pendingITCount > 0 ? pendingITCount : undefined,
  //     children: [
  //       { key: 'emp-it-requests', label: 'My IT Requests', badge: pendingITCount > 0 ? pendingITCount : undefined },
  //       { key: 'emp-it-device', label: 'My Device' },
  //     ],
  //   },
  // ]

  // function handleNav(key: string) {
  //   if (key === 'dashboard') { router.push('/employee/dashboard'); return }
  //   // Profile and all its children → go to dashboard (which handles these sub-pages)
  //   if (['profile', 'overview', 'achievements', 'history', 'alerts', 'logins'].includes(key)) {
  //     router.push(`/employee/dashboard?page=${key}`)
  //     return
  //   }
  //   if (isEmpBoTab(key)) { switchTab(key); return }
  // }

  function handleNav(key: string) {
    if (isEmpBoTab(key)) { switchTab(key); return }
    // fall through to PageShell default for dashboard, profile, etc.
    // but PageShell won't call this for those — so handle them too:
    if (key === 'dashboard') { router.push('/employee/dashboard'); return }
    if (['profile', 'overview', 'achievements', 'history', 'alerts', 'logins'].includes(key)) {
      router.push(`/employee/dashboard?page=${key}`)
      return
    }
  }

  const isLeaveTab = tab.startsWith('emp-leave-')
  const isPayrollTab = tab.startsWith('emp-payroll-')
  const isITTab = tab.startsWith('emp-it-')

  const sectionLabel = isLeaveTab ? 'Leave & Related' : isPayrollTab ? 'Payroll' : isITTab ? 'IT Services' : ''
  const currentTabs = isLeaveTab ? EMP_LEAVE_TABS : isPayrollTab ? EMP_PAYROLL_TABS : isITTab ? EMP_IT_TABS : []
  const tabLabel = [...EMP_LEAVE_TABS, ...EMP_PAYROLL_TABS, ...EMP_IT_TABS].find(t => t.key === tab)?.label ?? ''

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 18px', border: 'none', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', background: 'transparent',
    color: active ? '#8b5cf6' : 'var(--text3)',
    borderBottom: active ? '2px solid #8b5cf6' : '2px solid transparent',
    transition: 'all .15s', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' as const,
  })

  return (
    <PageShell
      panel="employee"
      session={session}
      activeKey={tab}
      onNav={handleNav}                  // ← add this back
      employeeNavBadges={{ pendingLeaveCount: pendingCount, pendingITCount }}
      title="Team Panel"
      subtitle={tabLabel}
    >
      {/* Inner header */}
      <div style={{ margin: '-24px -24px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ padding: '14px 24px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>My Back Office</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>Your leave, payroll and IT requests</div>
          </div>
          {pendingCount > 0 && (
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#f59e0b', paddingBottom: 14 }}>
              {pendingCount} pending leave approval{pendingCount > 1 ? 's' : ''}
            </span>
          )}
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
                {t.key === 'emp-leave-pending' && pendingCount > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 10, background: '#f59e0b22', color: '#f59e0b' }}>
                    {pendingCount}
                  </span>
                )}
                {t.key === 'emp-it-requests' && pendingITCount > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 10, background: '#f59e0b22', color: '#f59e0b' }}>
                    {pendingITCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leave */}
      {tab === 'emp-leave-requests' && <EmpLeaveRequestsTab leaves={leaves} leaveTypes={leaveTypes} />}
      {tab === 'emp-leave-holidays' && <EmpHolidayCalendarTab holidays={holidays} />}
      {tab === 'emp-leave-pending' && <EmpPendingTab leaves={leaves} />}

      {/* Payroll */}
      {isPayrollTab && <EmpPayrollTab
        payslips={payslips} bankAccount={bankAccount} bankLogs={bankLogs}
        initialTab={tab === 'emp-payroll-bank-account' ? 'bank' : 'payslips'}
      />}

      {/* IT Services */}
      {isITTab && <EmpITServicesTab
        queries={itQueries} queryLogs={itQueryLogs} device={device}
        initialTab={tab === 'emp-it-device' ? 'device' : 'requests'}
      />}
    </PageShell>
  )
}