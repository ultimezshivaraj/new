'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SessionPayload } from '@/lib/session'

const PROJECT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  '0': { label: 'Pending',     color: '#f59e0b', bg: '#78350f33' },
  '1': { label: 'In Progress', color: '#3b82f6', bg: '#1e3a8a33' },
  '2': { label: 'On Hold',     color: '#a855f7', bg: '#581c8733' },
  '3': { label: 'Completed',   color: '#22c55e', bg: '#14532d33' },
  '4': { label: 'Cancelled',   color: '#ef4444', bg: '#7f1d1d33' },
}

const TASK_STATUS: Record<string, { label: string; color: string }> = {
  '0': { label: 'To Do',       color: '#71717a' },
  '1': { label: 'In Progress', color: '#3b82f6' },
  '2': { label: 'Review',      color: '#a855f7' },
  '3': { label: 'Done',        color: '#22c55e' },
}

const PRIORITY: Record<string, { label: string; color: string }> = {
  '0': { label: 'Normal', color: '#71717a' },
  '1': { label: 'Low',    color: '#22c55e' },
  '2': { label: 'Medium', color: '#f59e0b' },
  '3': { label: 'High',   color: '#ef4444' },
}

function formatDate(d: string) {
  if (!d || d === 'None') return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

function timeAgo(d: string) {
  if (!d || d === 'None') return ''
  try {
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return `${mins}m ago`
  } catch { return '' }
}

interface Props {
  session:       SessionPayload
  projects:      Record<string, unknown>[]
  notifications: Record<string, unknown>[]
  tasks:         Record<string, unknown>[]
}

type Tab = 'overview' | 'projects' | 'tasks' | 'notifications'

export default function ClientDashboardClient({ session, projects, notifications, tasks }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [loggingOut, setLoggingOut] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Record<string, unknown> | null>(null)

  const totalProjects     = projects.length
  const activeProjects    = projects.filter(p => p.status === '1').length
  const completedProjects = projects.filter(p => p.status === '3').length
  const pendingTasks      = tasks.filter(t => t.status !== '3').length
  const unreadNotifs      = notifications.filter(n => n.is_read === '0').length

  async function logout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ panel: 'client' }),
    })
    router.push('/client/login')
  }

  const ACCENT = '#06b6d4'
  const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }
  const navBtn = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, border: 'none',
    fontSize: 13, fontWeight: 500, width: '100%', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
    fontFamily: 'var(--font-sans)', background: active ? `${ACCENT}20` : 'transparent', color: active ? ACCENT : 'var(--muted)',
  })

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>

      <aside style={{ width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${ACCENT}, #6366f1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>QD</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Client Portal</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Ultimez Team</div>
          </div>
        </div>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {session.name.split(' ').map((x: string) => x[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.name}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.email}</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {([['overview','◈','Overview',''],['projects','⬡','Projects',String(totalProjects)],['tasks','✦','Tasks',pendingTasks>0?String(pendingTasks):''],['notifications','🔔','Notifications',unreadNotifs>0?String(unreadNotifs):'']] as const).map(([key,icon,label,badge]) => (
            <button key={key} style={navBtn(tab===key)} onClick={() => setTab(key)}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {badge && <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 10, background: ACCENT, color: '#fff' }}>{badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)' }}>
          <button onClick={logout} disabled={loggingOut} style={navBtn(false)}>
            <span style={{ fontSize: 14, width: 20 }}>↩</span>
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 52, background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)' }}>
            Client Portal · <span style={{ color: 'var(--text)', fontWeight: 500 }}>{tab==='overview'?'Overview':tab==='projects'?'My Projects':tab==='tasks'?'Tasks':'Notifications'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {unreadNotifs>0 && <span style={{ fontSize: 11, background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444', padding: '3px 8px', borderRadius: 20, fontFamily: 'var(--font-mono)' }}>{unreadNotifs} unread</span>}
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', background: 'var(--bg3)', border: '1px solid var(--border)', padding: '3px 10px', borderRadius: 6 }}>
              {new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', timeZone:'Asia/Kolkata' })}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {tab==='overview' && <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Welcome back, {session.name.split(' ')[0]} 👋</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Here&apos;s a summary of your projects and tasks.</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              {[{label:'Total Projects',val:totalProjects,color:ACCENT,icon:'⬡'},{label:'Active Projects',val:activeProjects,color:'#3b82f6',icon:'▶'},{label:'Completed',val:completedProjects,color:'#22c55e',icon:'✓'},{label:'Pending Tasks',val:pendingTasks,color:'#f59e0b',icon:'⊙'}].map(s=>(
                <div key={s.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:16, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:s.color }} />
                  <div style={{ fontSize:20, marginBottom:8 }}>{s.icon}</div>
                  <div style={{ fontSize:28, fontWeight:700, fontFamily:'var(--font-mono)', color:s.color, lineHeight:1 }}>{s.val}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                Recent Projects
                <button onClick={()=>setTab('projects')} style={{ fontSize:12, color:ACCENT, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
              </div>
              {projects.length===0 ? <div style={{ ...card, padding:32, textAlign:'center', color:'var(--muted)' }}>No projects yet</div> : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
                  {projects.slice(0,4).map(p => {
                    const st = PROJECT_STATUS[p.status as string] ?? PROJECT_STATUS['0']
                    return (
                      <div key={p.id as string} onClick={()=>setSelectedProject(p)} style={{ ...card, padding:16, cursor:'pointer', transition:'border-color 0.2s' }} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor=ACCENT} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                          <div style={{ fontSize:13, fontWeight:600, flex:1, marginRight:8 }}>{(p.project_name as string)||'Unnamed Project'}</div>
                          <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:st.bg, color:st.color, fontFamily:'var(--font-mono)', whiteSpace:'nowrap', flexShrink:0 }}>{st.label}</span>
                        </div>
                        {!!(p.project_description as string) && <div style={{ fontSize:11, color:'var(--muted)', marginBottom:10 }}>{p.project_description as string}</div>}
                        <div style={{ fontSize:10, color:'var(--muted)', fontFamily:'var(--font-mono)' }}>{p.start_date ? `Started ${formatDate(p.start_date as string)}` : formatDate(p.date_n_time as string)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            {notifications.length>0 && (
              <div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  Recent Notifications <button onClick={()=>setTab('notifications')} style={{ fontSize:12, color:ACCENT, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {notifications.slice(0,3).map(n=>(
                    <div key={n.id as string} style={{ ...card, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, borderLeft:n.is_read==='0'?`3px solid ${ACCENT}`:undefined }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:n.is_read==='0'?ACCENT:'var(--border2)', flexShrink:0 }} />
                      <div style={{ flex:1, fontSize:13 }}>{n.message as string}</div>
                      <div style={{ fontSize:10, color:'var(--muted)', fontFamily:'var(--font-mono)', flexShrink:0 }}>{timeAgo(n.date_n_time as string)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>}

          {tab==='projects' && <>
            <div style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>My Projects</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:20 }}>{totalProjects} project{totalProjects!==1?'s':''} total</div>
            {projects.length===0 ? (
              <div style={{ ...card, padding:60, textAlign:'center', color:'var(--muted)' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>⬡</div>
                <div style={{ fontSize:15, fontWeight:600, marginBottom:6, color:'var(--text)' }}>No projects yet</div>
                <div style={{ fontSize:13 }}>Your assigned projects will appear here.</div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
                {projects.map(p => {
                  const st = PROJECT_STATUS[p.status as string] ?? PROJECT_STATUS['0']
                  const pri = PRIORITY[p.priority as string] ?? PRIORITY['0']
                  const pt = tasks.filter(t=>t.project_id===p.id)
                  const done = pt.filter(t=>t.status==='3').length
                  return (
                    <div key={p.id as string} style={{ ...card, cursor:'pointer', transition:'all 0.2s' }} onClick={()=>setSelectedProject(p)} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=ACCENT;(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)';(e.currentTarget as HTMLElement).style.transform='none'}}>
                      <div style={{ height:3, background:st.color }} />
                      <div style={{ padding:18 }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                          <div style={{ fontSize:14, fontWeight:600, flex:1, marginRight:10 }}>{(p.project_name as string)||'Unnamed Project'}</div>
                          <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, background:st.bg, color:st.color, fontFamily:'var(--font-mono)', whiteSpace:'nowrap', flexShrink:0 }}>{st.label}</span>
                        </div>
                        {!!(p.project_description as string) && <div style={{ fontSize:12, color:'var(--muted)', marginBottom:14, lineHeight:1.6 }}>{(p.project_description as string).slice(0,120)}{(p.project_description as string).length>120?'…':''}</div>}
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:`${pri.color}22`, color:pri.color, fontFamily:'var(--font-mono)' }}>{pri.label} priority</span>
                          {pt.length>0 && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:'var(--bg3)', color:'var(--muted)', fontFamily:'var(--font-mono)' }}>{done}/{pt.length} tasks</span>}
                        </div>
                        {pt.length>0 && <div style={{ marginBottom:12 }}><div style={{ height:4, background:'var(--bg3)', borderRadius:4, overflow:'hidden' }}><div style={{ height:'100%', width:`${Math.round((done/pt.length)*100)}%`, background:st.color, borderRadius:4 }} /></div></div>}
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--muted)', fontFamily:'var(--font-mono)' }}>
                          <span>{p.start_date?`Started ${formatDate(p.start_date as string)}`:formatDate(p.date_n_time as string)}</span>
                          {!!(p.end_date as string) && <span>Due {formatDate(p.end_date as string)}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>}

          {tab==='tasks' && <>
            <div style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>Tasks</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:20 }}>{pendingTasks} pending · {tasks.filter(t=>t.status==='3').length} completed</div>
            {tasks.length===0 ? (
              <div style={{ ...card, padding:60, textAlign:'center', color:'var(--muted)' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>✦</div>
                <div style={{ fontSize:15, fontWeight:600, marginBottom:6, color:'var(--text)' }}>No tasks yet</div>
                <div>Assigned tasks will appear here.</div>
              </div>
            ) : (
              <div style={{ ...card }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'var(--bg3)', borderBottom:'1px solid var(--border)' }}>
                      {['Task','Project','Status','Priority','Due Date'].map(h=>(
                        <th key={h} style={{ padding:'10px 14px', fontSize:10, fontFamily:'var(--font-mono)', letterSpacing:1, textTransform:'uppercase' as const, color:'var(--muted)', textAlign:'left' as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t,i) => {
                      const st = TASK_STATUS[t.status as string] ?? TASK_STATUS['0']
                      const pri = PRIORITY[t.priority as string] ?? PRIORITY['0']
                      return (
                        <tr key={i} style={{ borderBottom:'1px solid var(--border)' }} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--bg3)'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=''}>
                          <td style={{ padding:'11px 14px', fontSize:13, fontWeight:500 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:8, height:8, borderRadius:'50%', background:st.color, flexShrink:0 }} />
                              {(t.task_title as string)||'Untitled task'}
                            </div>
                          </td>
                          <td style={{ padding:'11px 14px', fontSize:12, color:'var(--muted)' }}>{t.project_name as string}</td>
                          <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:`${st.color}22`, color:st.color, fontFamily:'var(--font-mono)' }}>{st.label}</span></td>
                          <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, color:pri.color, fontFamily:'var(--font-mono)' }}>{pri.label}</span></td>
                          <td style={{ padding:'11px 14px', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--muted)' }}>{formatDate(t.due_date as string)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>}

          {tab==='notifications' && <>
            <div style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>Notifications</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:20 }}>{unreadNotifs} unread · {notifications.length} total</div>
            {notifications.length===0 ? (
              <div style={{ ...card, padding:60, textAlign:'center', color:'var(--muted)' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🔔</div>
                <div style={{ fontSize:15, fontWeight:600, marginBottom:6, color:'var(--text)' }}>All caught up</div>
                <div>No notifications yet.</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {notifications.map(n=>(
                  <div key={n.id as string} style={{ ...card, padding:'14px 18px', display:'flex', alignItems:'flex-start', gap:14, borderLeft:n.is_read==='0'?`3px solid ${ACCENT}`:undefined, opacity:n.is_read==='1'?0.7:1 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:n.is_read==='0'?ACCENT:'var(--border2)', flexShrink:0, marginTop:4 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, lineHeight:1.5 }}>{n.message as string}</div>
                      <div style={{ fontSize:10, color:'var(--muted)', marginTop:6, fontFamily:'var(--font-mono)' }}>
                        {formatDate(n.date_n_time as string)} · {timeAgo(n.date_n_time as string)}
                        {n.is_read==='0' && <span style={{ marginLeft:8, color:ACCENT }}>● unread</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>}
        </div>
      </div>

      {selectedProject && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={e=>{if(e.target===e.currentTarget)setSelectedProject(null)}}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border2)', borderRadius:16, width:'100%', maxWidth:520, maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ height:4, background:PROJECT_STATUS[selectedProject.status as string]?.color??ACCENT }} />
            <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:16, fontWeight:700 }}>{(selectedProject.project_name as string)||'Project Details'}</div>
              <button onClick={()=>setSelectedProject(null)} style={{ width:30, height:30, borderRadius:6, background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--muted)', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                {(()=>{const st=PROJECT_STATUS[selectedProject.status as string]??PROJECT_STATUS['0'];return <span style={{ fontSize:11, padding:'4px 12px', borderRadius:20, background:st.bg, color:st.color, fontFamily:'var(--font-mono)' }}>{st.label}</span>})()}
                {(()=>{const pri=PRIORITY[selectedProject.priority as string]??PRIORITY['0'];return <span style={{ fontSize:11, padding:'4px 12px', borderRadius:20, background:`${pri.color}22`, color:pri.color, fontFamily:'var(--font-mono)' }}>{pri.label} priority</span>})()}
              </div>
              {!!(selectedProject.project_description as string) && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:10, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const, letterSpacing:1, color:'var(--muted)', marginBottom:8 }}>Description</div>
                  <div style={{ fontSize:13, lineHeight:1.7, color:'var(--text)' }}>{selectedProject.project_description as string}</div>
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                {(['Start Date','End Date','Created'] as const).map((label,i) => {
                  const val = [selectedProject.start_date, selectedProject.end_date, selectedProject.date_n_time][i]
                  if (!val) return null
                  return (
                    <div key={label} style={{ background:'var(--bg3)', borderRadius:8, padding:'10px 14px' }}>
                      <div style={{ fontSize:9, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const, letterSpacing:0.5, color:'var(--muted)' }}>{label}</div>
                      <div style={{ fontSize:13, fontWeight:600, marginTop:4 }}>{formatDate(val as string)}</div>
                    </div>
                  )
                })}
              </div>
              {(()=>{
                const pt=tasks.filter(t=>t.project_id===selectedProject.id)
                if(!pt.length) return null
                return (
                  <div>
                    <div style={{ fontSize:10, fontFamily:'var(--font-mono)', textTransform:'uppercase' as const, letterSpacing:1, color:'var(--muted)', marginBottom:10 }}>Tasks ({pt.length})</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {pt.map((t,i)=>{
                        const st=TASK_STATUS[t.status as string]??TASK_STATUS['0']
                        return (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'var(--bg3)', borderRadius:8 }}>
                            <div style={{ width:8, height:8, borderRadius:'50%', background:st.color, flexShrink:0 }} />
                            <span style={{ flex:1, fontSize:12 }}>{t.task_title as string}</span>
                            <span style={{ fontSize:10, color:st.color, fontFamily:'var(--font-mono)' }}>{st.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
