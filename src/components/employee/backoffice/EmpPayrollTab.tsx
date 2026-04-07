'use client'
// src/components/employee/backoffice/EmpPayrollTab.tsx

import { useState, useMemo } from 'react'
import StatCard from '@/components/shared/StatCard'

const TH: React.CSSProperties = {
  padding: '9px 12px', fontSize: 10, fontFamily: 'var(--font-mono)',
  letterSpacing: 1, textTransform: 'uppercase' as const, color: 'var(--text2)',
  background: 'var(--bg3)', textAlign: 'left' as const,
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' as const,
}
const TD: React.CSSProperties = {
  padding: '9px 12px', fontSize: 12,
  borderBottom: '1px solid var(--border)', color: 'var(--text)',
  verticalAlign: 'top' as const,
}

// ── Types ──────────────────────────────────────────────────────
export interface PayslipRow {
  id: string; account_holder_name: string; account_number: string
  ifsc_code: string; bank_name: string; branch_name: string
  salary: string; allowances: string; deductions: string
  ot_payment: string; per_day_salary: string; deducted_days: string
  net_salary_paid: string; payment_status: string; ticket_status: string
  date_n_time: string; payment_date_n_time: string
}
export interface BankAccountRow {
  id: string; account_holder_name: string; account_number: string
  ifsc_code: string; bank_name: string; branch_name: string; date_n_time: string
}
export interface BankLogRow {
  id: string; account_holder_name: string; account_number: string
  ifsc_code: string; bank_name: string; branch_name: string
  approval_status: string; reason_for_reject: string; date_n_time: string
}

// ── Helpers ────────────────────────────────────────────────────
function fmtDate(d: string) {
  if (!d || d < '2010') return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}
function fmtDateTime(d: string) {
  if (!d || d < '2010') return '—'
  try { return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return d }
}
function fmtCurrency(v: string) {
  const n = parseFloat(v || '0')
  if (n === 0) return '₹0'
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function monthLabel(d: string) {
  if (!d || d < '2010') return '—'
  try { return new Date(d).toLocaleString('en-IN', { month: 'long', year: 'numeric' }) }
  catch { return d.slice(0, 7) }
}
function maskAccount(acc: string) {
  if (!acc || acc.length < 4) return acc || '—'
  return '****' + acc.slice(-4)
}

// ── TAB 1: My Payslips ─────────────────────────────────────────
function MyPayslipsTab({ payslips }: { payslips: PayslipRow[] }) {
  const [filterMonth, setFilterMonth] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<PayslipRow | null>(null)

  const months = useMemo(() =>
    [...new Set(payslips.map(r => r.date_n_time.slice(0, 7)))].sort().reverse()
    , [payslips])

  const filtered = useMemo(() => payslips.filter(r => {
    if (filterMonth && !r.date_n_time.startsWith(filterMonth)) return false
    if (filterStatus && r.payment_status !== filterStatus) return false
    return true
  }), [payslips, filterMonth, filterStatus])

  const totalNetPaid = payslips.filter(r => r.payment_status === '1').reduce((s, r) => s + parseFloat(r.net_salary_paid || '0'), 0)
  const totalDeductions = payslips.reduce((s, r) => s + parseFloat(r.deductions || '0'), 0)
  const totalOT = payslips.reduce((s, r) => s + parseFloat(r.ot_payment || '0'), 0)
  const pendingCount = payslips.filter(r => r.payment_status !== '1').length
  const lastPaid = payslips.find(r => r.payment_status === '1')

  const selStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '6px 10px', cursor: 'pointer',
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Records" value={payslips.length} color="#8b5cf6" sub={`${payslips.length - pendingCount} paid`} />
        <StatCard label="Total Net Earned" value={fmtCurrency(totalNetPaid.toString())} color="#22c55e" sub="all paid months" />
        <StatCard label="Total Deductions" value={fmtCurrency(totalDeductions.toString())} color="#ef4444" />
        <StatCard label="Last Payment" value={lastPaid ? monthLabel(lastPaid.date_n_time) : '—'} color="#3b82f6" sub={lastPaid ? fmtDate(lastPaid.payment_date_n_time) : ''} />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={selStyle}>
          <option value="">All Months</option>
          {months.map(m => <option key={m} value={m}>{monthLabel(m + '-01')}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="">All Status</option>
          <option value="0">Pending</option>
          <option value="1">Paid</option>
        </select>
        {(filterMonth || filterStatus) && (
          <button onClick={() => { setFilterMonth(''); setFilterStatus('') }}
            style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
            ✕ Clear
          </button>
        )}
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginLeft: 'auto' }}>
          {filtered.length} of {payslips.length}
        </span>
      </div>

      {payslips.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 56, color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>💳</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No payslips yet</div>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                {['#', 'Month', 'Salary', 'Deductions', 'OT', 'Deducted Days', 'Net Paid', 'Status', 'Action'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const isPaid = r.payment_status === '1'
                return (
                  <tr key={r.id}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <td style={{ ...TD, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontWeight: 600, whiteSpace: 'nowrap' as const }}>{monthLabel(r.date_n_time)}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>{fmtCurrency(r.salary)}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: '#ef4444' }}>{fmtCurrency(r.deductions)}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>{fmtCurrency(r.ot_payment)}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', textAlign: 'center' as const }}>
                      {parseFloat(r.deducted_days) > 0
                        ? <span style={{ color: '#f59e0b' }}>{r.deducted_days}d</span>
                        : <span style={{ color: 'var(--text4)' }}>0</span>}
                    </td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: '#22c55e', fontWeight: 700 }}>{fmtCurrency(r.net_salary_paid)}</td>
                    <td style={TD}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: isPaid ? '#22c55e18' : '#f59e0b18', color: isPaid ? '#22c55e' : '#f59e0b' }}>
                        {isPaid ? 'Paid' : 'Pending'}
                      </span>
                      {isPaid && r.payment_date_n_time && (
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{fmtDate(r.payment_date_n_time)}</div>
                      )}
                    </td>
                    <td style={TD}>
                      <button onClick={() => setSelected(r)} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text)' }}>
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payslip detail modal */}
      {selected && (
        <div onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{monthLabel(selected.date_n_time)}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Payslip Details</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                ['Account Holder', selected.account_holder_name],
                ['Account Number', maskAccount(selected.account_number)],
                ['Bank', selected.bank_name],
                ['IFSC', selected.ifsc_code],
                ['Gross Salary', fmtCurrency(selected.salary)],
                ['Allowances', fmtCurrency(selected.allowances)],
                ['Deductions', fmtCurrency(selected.deductions)],
                ['OT Payment', fmtCurrency(selected.ot_payment)],
                ['Per Day Salary', fmtCurrency(selected.per_day_salary)],
                ['Deducted Days', `${selected.deducted_days} days`],
                ['Net Salary Paid', fmtCurrency(selected.net_salary_paid)],
                ['Payment Status', selected.payment_status === '1' ? 'Paid' : 'Pending'],
                ['Payment Date', fmtDate(selected.payment_date_n_time)],
              ] as [string, string][]).map(([l, v]) => (
                <div key={l} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text4)', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{v || '—'}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ background: '#8b5cf610', border: '1px solid #8b5cf630', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#8b5cf6', fontFamily: 'var(--font-mono)' }}>
                🔒 Account number is masked for security. Contact HR for full details.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TAB 2: My Bank Account ─────────────────────────────────────
function MyBankAccountTab({ bankAccount, bankLogs }: { bankAccount: BankAccountRow | null; bankLogs: BankLogRow[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Current bank details */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🏦</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Registered Bank Account</span>
        </div>
        {bankAccount ? (
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {([
              ['Account Holder', bankAccount.account_holder_name],
              ['Account Number', maskAccount(bankAccount.account_number)],
              ['IFSC Code', bankAccount.ifsc_code],
              ['Bank Name', bankAccount.bank_name],
              ['Branch', bankAccount.branch_name],
              ['Registered On', fmtDate(bankAccount.date_n_time)],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: 'var(--text4)', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{v || '—'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            No bank account registered yet. Contact HR.
          </div>
        )}
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ background: '#8b5cf610', border: '1px solid #8b5cf630', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#8b5cf6', fontFamily: 'var(--font-mono)' }}>
            🔒 Account number is masked for security. To update your bank details, contact HR.
          </div>
        </div>
      </div>

      {/* Change history */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>📝</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Change History</span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginLeft: 'auto' }}>{bankLogs.length} records</span>
        </div>
        {bankLogs.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No change history</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'Changed On', 'Account (masked)', 'Bank', 'Status', 'Reason'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bankLogs.map((l, i) => {
                const s = parseInt(l.approval_status)
                const cfg = s === 1 ? { label: 'Approved', color: '#22c55e', bg: '#22c55e18' }
                  : s === 2 ? { label: 'Rejected', color: '#ef4444', bg: '#ef444418' }
                    : { label: 'Pending', color: '#f59e0b', bg: '#f59e0b18' }
                return (
                  <tr key={l.id}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <td style={{ ...TD, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' as const }}>{fmtDateTime(l.date_n_time)}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{maskAccount(l.account_number)}</td>
                    <td style={TD}>{l.bank_name || '—'}</td>
                    <td style={TD}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    </td>
                    <td style={{ ...TD, fontSize: 11, color: 'var(--text3)' }}>{l.reason_for_reject || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────
export type PayrollSubTab = 'payslips' | 'bank'

export default function EmpPayrollTab({
  payslips, bankAccount, bankLogs, initialTab,
}: {
  payslips:    PayslipRow[]
  bankAccount: BankAccountRow | null
  bankLogs:    BankLogRow[]
  initialTab?: PayrollSubTab
}) {
  const subTab = initialTab ?? 'payslips'

  return (
    <div>
      {subTab === 'payslips' && <MyPayslipsTab payslips={payslips} />}
      {subTab === 'bank'     && <MyBankAccountTab bankAccount={bankAccount} bankLogs={bankLogs} />}
    </div>
  )
}
