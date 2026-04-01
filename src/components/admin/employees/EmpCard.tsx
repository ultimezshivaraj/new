'use client'
// src/components/admin/employees/EmpCard.tsx
// Role names match tbl_employees_create_types.create_type_name exactly

import { Badge } from '@/components/shared/ui'

// ── Role map: id → official name from tbl_employees_create_types ──
// Confirmed against live BQ export 2026-03-29
const ROLE_MAP: Record<number, string> = {
  1:  'Author',
  2:  'Editor',
  3:  'Event Manager',
  4:  'Leads',
  5:  'Marketing',
  6:  'Pitch Department',
  7:  'Sales Department',
  8:  'Backlinks & Promotion',
  9:  'Developer',
  10: 'Publisher',
  11: 'System Administrator',
  12: 'Tasks',
  13: 'Designer',
  14: 'HR Management',
  15: 'Set Backlinks Team Lead',
  16: 'HR Head',
  17: 'Community Manager',
  18: 'Partnership Manager',
  19: 'Listing Executive',
  20: 'Page Views',
  21: 'Business Development Manager',
  22: 'Data Analytics',
  23: 'Junior Recruiter',
  24: 'Profile Viewer',
  25: 'Project Manager',
  26: 'Academy Junior',
  27: 'Devops',
  28: 'Testing',
  29: 'HR Coordinator',
}

// ── Role colours — keys match official names exactly ──
const ROLE_COLOR: Record<string, string> = {
  // Content & Editorial — indigo
  'Author':                       '#6366f1',
  'Editor':                       '#6366f1',
  'Publisher':                    '#6366f1',
  'Event Manager':                '#6366f1',
  'Tasks':                        '#6366f1',
  'Page Views':                   '#6366f1',
  // Development — blue
  'Developer':                    '#3b82f6',
  'System Administrator':         '#3b82f6',
  'Devops':                       '#3b82f6',
  'Testing':                      '#3b82f6',
  // Design — pink
  'Designer':                     '#ec4899',
  // SEO & Backlinks — green
  'Backlinks & Promotion':        '#22c55e',
  'Set Backlinks Team Lead':      '#22c55e',
  'Listing Executive':            '#22c55e',
  // Marketing & Growth — cyan
  'Marketing':                    '#06b6d4',
  'Community Manager':            '#06b6d4',
  'Business Development Manager': '#06b6d4',
  // HR — violet
  'HR Management':                '#8b5cf6',
  'HR Head':                      '#8b5cf6',
  'Junior Recruiter':             '#8b5cf6',
  'Profile Viewer':               '#8b5cf6',
  'HR Coordinator':               '#8b5cf6',
  // Data & Analytics — teal
  'Data Analytics':               '#14b8a6',
  'Project Manager':              '#14b8a6',
  // Sales & BD — amber
  'Leads':                        '#f59e0b',
  'Pitch Department':             '#f59e0b',
  'Sales Department':             '#f59e0b',
  'Partnership Manager':          '#f59e0b',
  // Academy — slate
  'Academy Junior':               '#64748b',
}

export const IMAGE_BASE = 'https://app.ultimez.com/uploads/employee/profile/'

// ── Interfaces ────────────────────────────────────────────────
export interface Employee {
  id:                     string
  employee_id:            string
  full_name:              string
  username:               string
  email_id:               string
  position:               string
  location:               string
  mobile_number:          string
  login_status:           string
  employee_type:          string
  employee_category_type: string
  ultimez_join_date:      string
  create_type_row_id:     string
  team_leader:            string
  alert_count:            string
  salary:                 string
  allowances:             string
  profile_image:          string
  created_at:             string
  work_report:            WorkReport | null
}

export interface WorkReport {
  login:       number
  logout:      number | null
  active_mins: number
  worked_mins: number
  ot_mins:     number
  idle_mins:   number
  prod_mins:   number
  unprod_mins: number
  prod:        number
  report_type: number
}

// ── Helpers ───────────────────────────────────────────────────
export function empRoles(e: Employee): string[] {
  return String(e.create_type_row_id || '').split(',')
    .map(x => parseInt(x.trim()))
    .filter(n => !isNaN(n) && ROLE_MAP[n])
    .map(n => ROLE_MAP[n])
}
export function roleColor(r: string): string  { return ROLE_COLOR[r] || '#64748b' }
export function prodColor(p: number): string  { return p >= 70 ? '#22c55e' : p >= 40 ? '#f59e0b' : '#ef4444' }
export function fmtMins(m: number | null): string {
  if (m == null) return 'Active'
  return `${String(Math.floor(m / 60)).padStart(2,'0')}:${String(Math.round(m % 60)).padStart(2,'0')}`
}
export function fmtHM(m: number): string {
  if (!m || m <= 0) return '—'
  const h = Math.floor(m / 60), mn = Math.round(m % 60)
  return h > 0 ? `${h}h ${mn}m` : `${mn}m`
}
export function fmtDate(d: string): string {
  if (!d || d < '2010-01-01') return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) }
  catch { return '—' }
}
export function tenure(d: string): string {
  if (!d || d < '2010-01-01') return ''
  try {
    const yrs = (Date.now() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000)
    return yrs >= 1 ? `${Math.floor(yrs)}y ${Math.floor((yrs % 1)*12)}m` : `${Math.floor(yrs*12)}m`
  } catch { return '' }
}
export function initials(n: string): string {
  return n.split(' ').filter(Boolean).map(x => x[0]).slice(0,2).join('').toUpperCase()
}
export function avatarBg(n: string): string {
  const c = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#8b5cf6','#14b8a6']
  let h = 0; for (const ch of n) h = (h << 5) - h + ch.charCodeAt(0)
  return c[Math.abs(h) % c.length]
}

// ── Component ─────────────────────────────────────────────────
export default function EmpCard({ e, onOpen }: { e: Employee; onOpen: (e: Employee) => void }) {
  const roles    = empRoles(e)
  const bg       = avatarBg(e.full_name)
  const wr       = e.work_report
  const hasAlert = parseInt(e.alert_count || '0') > 0
  const isEnabled = e.login_status === '1'
  const hasPhoto = !!e.profile_image

  return (
    <div
      onClick={() => onOpen(e)}
      style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12,
        cursor:'pointer', transition:'border-color .2s, transform .2s',
        overflow:'hidden', position:'relative', display:'flex', flexDirection:'column' }}
      onMouseEnter={ev => { const el=ev.currentTarget as HTMLElement; el.style.borderColor='var(--accent-c)'; el.style.transform='translateY(-2px)' }}
      onMouseLeave={ev => { const el=ev.currentTarget as HTMLElement; el.style.borderColor='var(--border)'; el.style.transform='none' }}
    >
      {/* Enabled dot */}
      <div style={{ position:'absolute', top:11, right:11, width:8, height:8, borderRadius:'50%',
        background: isEnabled ? '#3b82f6' : 'var(--border2)',
        boxShadow: isEnabled ? '0 0 0 2px #3b82f622' : 'none' }} />

      {/* Alert badge */}
      {hasAlert && (
        <div style={{ position:'absolute', top:9, right:24, fontSize:9, fontFamily:'var(--font-mono)',
          padding:'1px 6px', borderRadius:8, background:'#7f1d1d66', color:'#fca5a5', fontWeight:600 }}>
          ⚠ {e.alert_count}
        </div>
      )}

      {/* Header */}
      <div style={{ padding:'14px 14px 11px', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'flex-start', gap:11, flex:1 }}>
        {/* Photo or initials */}
        {hasPhoto && (
          <img src={`${IMAGE_BASE}${e.profile_image}`} alt={e.full_name}
            style={{ width:42, height:42, borderRadius:10, objectFit:'cover',
              flexShrink:0, border:'1px solid var(--border2)' }}
            onError={ev => {
              const img = ev.currentTarget; img.style.display='none'
              const fb = img.nextElementSibling as HTMLElement|null
              if (fb) fb.style.display='flex'
            }} />
        )}
        <div style={{ width:42, height:42, borderRadius:10, background:bg, color:'#fff',
          flexShrink:0, display:hasPhoto?'none':'flex',
          alignItems:'center', justifyContent:'center',
          fontSize:15, fontWeight:700, fontFamily:'var(--font-mono)' }}>
          {initials(e.full_name)}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:1 }}>
            {e.full_name}
          </div>
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minHeight:16 }}>
            {e.position || <span style={{ fontStyle:'italic', color:'var(--text4)' }}>No position</span>}
          </div>
          {e.team_leader && (
            <div style={{ fontSize:9, fontFamily:'var(--font-mono)', fontWeight:600, color:'#a5b4fc',
              background:'#312e8120', border:'1px solid #312e8140',
              padding:'1px 7px', borderRadius:4, marginBottom:4, display:'inline-block' }}>
              ▲ {e.team_leader}
            </div>
          )}
          {roles.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginTop:2 }}>
              {roles.slice(0,3).map(r => (
                <Badge key={r} label={r} color={roleColor(r)} bg={`${roleColor(r)}20`} />
              ))}
              {roles.length > 3 && (
                <span style={{ fontSize:8, color:'var(--text4)', fontFamily:'var(--font-mono)', alignSelf:'center' }}>
                  +{roles.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Today's Activity */}
      <div style={{ padding:'10px 14px', background:'var(--bg3)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:9, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const,
            letterSpacing:.8, color:'var(--text4)' }}>Today's Activity</span>
          {!wr
            ? <span style={{ fontSize:8, fontFamily:'var(--font-mono)', color:'var(--text4)',
                padding:'1px 5px', borderRadius:4, border:'1px solid var(--border2)' }}>NO REPORT</span>
            : <span style={{ fontSize:8, fontFamily:'var(--font-mono)', padding:'1px 5px', borderRadius:4,
                background:wr.report_type===1?'#22c55e22':wr.report_type===2?'#3b82f622':'#f59e0b22',
                color:wr.report_type===1?'#22c55e':wr.report_type===2?'#3b82f6':'#f59e0b',
                border:`1px solid ${wr.report_type===1?'#22c55e44':wr.report_type===2?'#3b82f644':'#f59e0b44'}` }}>
                {wr.report_type===1?'Full':wr.report_type===2?'Extended':'Session'}
              </span>
          }
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {(['Login','Logout'] as const).map((lbl, i) => {
            const val = i===0 ? (wr?fmtMins(wr.login):'—') : (wr?fmtMins(wr.logout):'—')
            const col = i===0 ? '#22c55e' : 'var(--text2)'
            return (
              <div key={lbl} style={{ textAlign:'center' }}>
                <div style={{ fontSize:9, color:'var(--text4)', fontFamily:'var(--font-mono)' }}>{lbl}</div>
                <div style={{ fontSize:12, fontWeight:700, fontFamily:'var(--font-mono)',
                  color:wr?col:'var(--text4)', marginTop:1 }}>{val}</div>
              </div>
            )
          })}
          <div style={{ flex:1 }}>
            <div style={{ height:5, background:'var(--border)', borderRadius:3, overflow:'hidden', marginBottom:3 }}>
              {wr && <div style={{ width:`${wr.prod}%`, height:'100%', background:prodColor(wr.prod), borderRadius:3 }} />}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:9, color:'var(--text4)', fontFamily:'var(--font-mono)' }}>
                {wr ? `${fmtHM(wr.active_mins)} active` : ''}
              </span>
              <span style={{ fontSize:10, fontWeight:700, fontFamily:'var(--font-mono)',
                color:wr?prodColor(wr.prod):'var(--text4)' }}>
                {wr ? `${wr.prod}%` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding:'8px 14px', display:'flex', justifyContent:'space-between',
        alignItems:'center', fontSize:10, color:'var(--text3)' }}>
        <span>
          {e.location ? `📍 ${e.location}` : <span style={{ color:'var(--text4)' }}>No location</span>}
        </span>
        {tenure(e.ultimez_join_date) && (
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text4)',
            background:'var(--bg3)', padding:'1px 6px', borderRadius:4, border:'1px solid var(--border)' }}>
            {tenure(e.ultimez_join_date)}
          </span>
        )}
      </div>
    </div>
  )
}
