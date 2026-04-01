'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Project, WorkLog, SecurityIssue } from '@/lib/qd-dev/types'
import { fmtDuration, severityColor } from '@/lib/qd-dev/utils'

interface Props { project: Project }
type IssueState = 'idle' | 'running' | 'done'
const SEV_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const

export default function TasksTab({ project }: Props) {
  const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY ?? 'coinpedia-admin-2026'
  const h = { Authorization: `Bearer ${ADMIN_KEY}`, 'Content-Type': 'application/json' }

  const [logs,       setLogs]       = useState<WorkLog[]>([])
  const [logsLoading,setLogsLoading]= useState(true)
  const [newTask,    setNewTask]    = useState('')
  const [starting,   setStarting]  = useState(false)
  const [stopping,   setStopping]  = useState<string|null>(null)
  const [stopNotes,  setStopNotes] = useState<Record<string,string>>({})
  const [issState,   setIssState]  = useState<Record<string,IssueState>>({})
  const [issLogId,   setIssLogId]  = useState<Record<string,string>>({})
  const [now,        setNow]       = useState(Date.now())

  useEffect(() => { const t = setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(t) },[])

  const fetchLogs = useCallback(async()=>{
    try{
      const res = await fetch(`/api/admin/projects/${project.project_id}/tasks`,{headers:{Authorization:`Bearer ${ADMIN_KEY}`}})
      setLogs(await res.json())
    }catch{}finally{setLogsLoading(false)}
  },[project.project_id,ADMIN_KEY])

  useEffect(()=>{fetchLogs()},[fetchLogs])

  async function startLog(title:string):Promise<string|null>{
    setStarting(true)
    try{
      const res = await fetch(`/api/admin/projects/${project.project_id}/tasks`,{method:'POST',headers:h,body:JSON.stringify({action:'start',task_title:title,created_by:'admin'})})
      const d = await res.json(); await fetchLogs(); return d.log_id
    }finally{setStarting(false)}
  }
  async function stopLog(logId:string,notes=''){
    setStopping(logId)
    try{
      await fetch(`/api/admin/projects/${project.project_id}/tasks`,{method:'POST',headers:h,body:JSON.stringify({action:'stop',log_id:logId,notes})})
      await fetchLogs()
    }finally{setStopping(null)}
  }

  async function issueStart(iss:SecurityIssue){
    if(issState[iss.id]==='running')return
    setIssState(s=>({...s,[iss.id]:'running'}))
    const lid = await startLog(`[${iss.severity.toUpperCase()}] ${iss.title}`)
    if(lid)setIssLogId(m=>({...m,[iss.id]:lid}))
  }
  async function issueStop(iss:SecurityIssue){const lid=issLogId[iss.id];if(lid)await stopLog(lid)}
  async function issueDone(iss:SecurityIssue){const lid=issLogId[iss.id];if(lid)await stopLog(lid,'Resolved');setIssState(s=>({...s,[iss.id]:'done'}))}

  function liveSec(startedAt:string){return Math.max(0,Math.floor((now-new Date(startedAt).getTime())/1000))}

  const running  = logs.filter(l=>l.status==='running')
  const complete = logs.filter(l=>l.status==='complete')
  const totalSec = complete.reduce((s,l)=>s+l.duration_seconds,0)
  const inProg   = project.security_issues.filter(i=>issState[i.id]==='running').length
  const resolved = project.security_issues.filter(i=>issState[i.id]==='done').length

  const sorted = [...project.security_issues].sort((a,b)=>
    SEV_ORDER.indexOf(a.severity as typeof SEV_ORDER[number]) -
    SEV_ORDER.indexOf(b.severity as typeof SEV_ORDER[number])
  )

  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>

      {/* Stats */}
      <div className="tasks-summary">
        {[
          {l:'Total issues', v:project.security_issues.length, c:'var(--text)'},
          {l:'In progress',  v:running.length+inProg,          c:'var(--blue)'},
          {l:'Resolved',     v:resolved+complete.length,       c:'var(--green)'},
          {l:'Time logged',  v:fmtDuration(totalSec),          c:'var(--gold)'},
          {l:'Critical open',v:project.security_issues.filter(i=>i.severity==='critical'&&issState[i.id]!=='done').length, c:'var(--red)'},
        ].map(s=>(
          <div key={s.l} className="tasks-stat">
            <div className="tasks-stat-val" style={{color:s.c}}>{s.v}</div>
            <div className="tasks-stat-lbl">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Security issues */}
      {sorted.length>0&&(
        <div className="card" style={{padding:'16px'}}>
          <SH label="Security issues — from analysis"/>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {sorted.map(iss=>{
              const state  = issState[iss.id]??'idle'
              const isDone = state==='done'
              const isRun  = state==='running'
              const runLog = logs.find(l=>l.log_id===issLogId[iss.id]&&l.status==='running')
              const sc     = severityColor(iss.severity)
              const isHigh = ['critical','high'].includes(iss.severity)
              return(
                <div key={iss.id} style={{
                  display:'flex',gap:10,alignItems:'center',
                  padding:'10px 13px',
                  background: isDone?'transparent':isRun?`${sc}08`:'var(--bg3)',
                  border:`1px solid ${isRun?`${sc}30`:'var(--border)'}`,
                  borderLeft:isHigh?`3px solid ${sc}`:undefined,
                  borderRadius:isHigh?'0 8px 8px 0':8,
                  opacity:isDone?.45:1,transition:'all .15s',
                }}>
                  <span style={{fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:4,flexShrink:0,background:`${sc}15`,color:sc,textTransform:'uppercase',letterSpacing:'.04em'}}>{iss.severity}</span>
                  <span style={{flex:1,fontSize:12,fontWeight:500,color:'var(--text)',textDecoration:isDone?'line-through':'none'}}>
                    {iss.title}
                    {iss.file&&<span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)',marginLeft:8}}>{iss.file}{iss.line?`:${iss.line}`:''}</span>}
                  </span>
                  {isRun&&runLog&&<span style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--blue)',minWidth:44,textAlign:'right'}}>{fmtDuration(liveSec(runLog.started_at))}</span>}
                  {iss.fix&&(
                    <button onClick={async e=>{
                      await navigator.clipboard.writeText(iss.fix)
                      const b=e.currentTarget as HTMLButtonElement;b.textContent='Copied ✓';setTimeout(()=>{b.textContent='Copy Fix'},2000)
                    }} style={{fontSize:10,padding:'3px 8px',borderRadius:5,background:'var(--bg4)',border:'1px solid var(--border2)',color:'var(--text3)',cursor:'pointer'}}>Copy Fix</button>
                  )}
                  {!isDone&&!isRun&&<button onClick={()=>issueStart(iss)} style={{fontSize:11,padding:'4px 12px',borderRadius:6,cursor:'pointer',background:'linear-gradient(135deg,#f59e0b,#ef4444)',color:'#fff',border:'none',fontWeight:600}}>▶ Start</button>}
                  {isRun&&<>
                    <button onClick={()=>issueStop(iss)} disabled={stopping===issLogId[iss.id]} style={{fontSize:11,padding:'4px 10px',borderRadius:6,cursor:'pointer',background:'var(--bg4)',border:'1px solid var(--border2)',color:'var(--text2)'}}>⏸ Stop</button>
                    <button onClick={()=>issueDone(iss)} style={{fontSize:11,padding:'4px 10px',borderRadius:6,cursor:'pointer',background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.2)',color:'#22c55e',fontWeight:600}}>✓ Done</button>
                  </>}
                  {isDone&&<span style={{fontSize:11,color:'var(--green)',fontWeight:600}}>✓ Resolved</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Generic tasks */}
      <div className="card" style={{padding:'16px'}}>
        <SH label="Generic dev tasks"/>
        <div className="new-task-row" style={{marginBottom:10}}>
          <input className="input" style={{flex:1}} placeholder="e.g. Dependency audit, code review pass…" value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(startLog(newTask.trim()),setNewTask(''))}/>
          <button className="btn btn-primary" onClick={()=>{if(newTask.trim()){startLog(newTask.trim());setNewTask('')}}} disabled={!newTask.trim()||starting}>{starting?'…':'▶ Start'}</button>
        </div>
        {running.filter(l=>!Object.values(issLogId).includes(l.log_id)).map(log=>(
          <div key={log.log_id} className="task-row task-running" style={{marginBottom:6}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'var(--blue)',flexShrink:0}}/>
            <div className="task-title">{log.task_title}</div>
            <div className="task-timer">{fmtDuration(liveSec(log.started_at))}</div>
            <div style={{display:'flex',gap:6}}>
              <input className="input" style={{width:130,fontSize:11,padding:'3px 8px'}} placeholder="Notes…" value={stopNotes[log.log_id]??''} onChange={e=>setStopNotes(n=>({...n,[log.log_id]:e.target.value}))}/>
              <button className="task-stop" onClick={()=>stopLog(log.log_id,stopNotes[log.log_id]??'')} disabled={stopping===log.log_id}>{stopping===log.log_id?'…':'⏹ Stop'}</button>
            </div>
          </div>
        ))}
        {running.filter(l=>!Object.values(issLogId).includes(l.log_id)).length===0&&!logsLoading&&(
          <div style={{fontSize:12,color:'var(--text3)',padding:'8px 0'}}>No generic tasks running. Start one above.</div>
        )}
      </div>

      {/* Work log table */}
      {!logsLoading&&complete.length>0&&(
        <div className="card" style={{padding:'16px'}}>
          <SH label="Work log"/>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr>{['Task','Who','Status','Duration','Date'].map(c=>(
              <th key={c} style={{textAlign:'left',padding:'6px 10px',fontSize:9,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--text3)',background:'var(--bg3)',borderBottom:'1px solid var(--border)'}}>{c}</th>
            ))}</tr></thead>
            <tbody>{complete.slice(0,20).map(log=>(
              <tr key={log.log_id}>
                <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',color:'var(--text2)',maxWidth:260}}>{log.task_title}</td>
                <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',color:'var(--text2)'}}>{log.created_by}</td>
                <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)'}}><span style={{fontSize:9,fontWeight:600,padding:'2px 7px',borderRadius:10,background:'rgba(34,197,94,.1)',color:'#22c55e'}}>complete</span></td>
                <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',fontFamily:'var(--mono)',color:'var(--text2)'}}>{fmtDuration(log.duration_seconds)}</td>
                <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',color:'var(--text3)'}}>{new Date(log.started_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SH({label}:{label:string}){
  return(
    <div style={{fontSize:10,fontWeight:500,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text3)',display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
      {label}<div style={{flex:1,height:.5,background:'var(--border)'}}/>
    </div>
  )
}
