'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import TopBar       from '@/components/qd-dev/TopBar'
import ChatTab      from '@/components/qd-dev/report/ChatTab'
import AIContentTab from '@/components/qd-dev/report/AIContentTab'
import KnowledgeTab from '@/components/qd-dev/report/KnowledgeTab'
import TasksTab     from '@/components/qd-dev/report/TasksTab'
import type { Project } from '@/lib/qd-dev/types'
import { healthColor, fmtDate } from '@/lib/qd-dev/utils'

const TABS = [
  { id:'chat',      icon:'🤖', label:'QD Dev AI'        },
  { id:'overview',  icon:'📋', label:'Project Overview' },
  { id:'code-db',   icon:'🗄',  label:'Code & Database' },
  { id:'knowledge', icon:'🎓', label:'QD Knowledge'     },
  { id:'tasks',     icon:'✅', label:'Tasks'            },
]

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }    = use(params)
  const router    = useRouter()
  const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY ?? 'coinpedia-admin-2026'
  const authH     = { Authorization: `Bearer ${ADMIN_KEY}` }

  const [project,     setProject]     = useState<Project | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [activeTab,   setActiveTab]   = useState('chat')
  const [reanalysing, setReanalysing] = useState(false)
  const [zipFile,     setZipFile]     = useState<File | null>(null)
  const [progressLbl, setProgressLbl] = useState('')

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/projects/${id}`, { headers: authH })
      if (!res.ok) { setError(`HTTP ${res.status}`); return }
      setProject(await res.json())
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchProject() }, [fetchProject])

  async function reanalyse() {
    if (!zipFile || !project) return
    setReanalysing(true); setProgressLbl('Uploading...')
    const form = new FormData()
    form.append('zip', zipFile)
    try {
      const res = await fetch(`/api/admin/projects/${id}/analyse`, { method:'POST', headers:authH, body:form })
      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader(), dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream:true })
        const lines = buf.split('\n'); buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.type==='progress') setProgressLbl(evt.label??'')
            if (evt.type==='complete' && evt.data) { setProject(evt.data); setZipFile(null) }
          } catch {}
        }
      }
    } catch(e) { setError(String(e)) }
    finally { setReanalysing(false); setProgressLbl('') }
  }

  if (loading) return (
    <>
      <TopBar crumbs={[{label:'Projects',href:'/projects'},{label:'...'}]} />
      <div className="page">
        <div style={{display:'flex',gap:16,marginBottom:24}}>
          <div className="skeleton" style={{width:56,height:56,borderRadius:14,flexShrink:0}}/>
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
            <div className="skeleton" style={{height:24,width:'40%'}}/>
            <div className="skeleton" style={{height:14,width:'25%'}}/>
          </div>
        </div>
      </div>
    </>
  )

  if (error || !project) return (
    <>
      <TopBar crumbs={[{label:'Projects',href:'/projects'},{label:'Error'}]}/>
      <div className="page">
        <div style={{color:'var(--red)',fontSize:14}}>
          {error||'Project not found'} — <button onClick={()=>router.push('/projects')} style={{background:'none',color:'var(--blue)',textDecoration:'underline',cursor:'pointer'}}>Back</button>
        </div>
      </div>
    </>
  )

  const hc        = healthColor(project.health_score)
  const critCount = project.security_issues.filter(i=>i.severity==='critical').length
  const highCount = project.security_issues.filter(i=>i.severity==='high').length

  return (
    <>
      <TopBar crumbs={[{label:'Projects',href:'/projects'},{label:project.project_name}]}/>
      <div className="page">

        {/* Hero */}
        <div className="report-hero">
          <div className="report-hero-top">
            <div className="report-hero-icon">⌥</div>
            <div style={{flex:1,minWidth:0}}>
              <div className="report-hero-name">{project.project_name}</div>
              {project.description&&<div style={{fontSize:13,color:'var(--text2)',marginTop:2}}>{project.description}</div>}
              <div className="report-hero-meta" style={{marginTop:8}}>
                <span className={`badge badge-${project.status}`}>{project.status}</span>
                {critCount>0&&<span className="badge badge-critical">{critCount} critical</span>}
                {highCount>0&&<span className="badge badge-high">{highCount} high</span>}
                <span style={{fontSize:11,color:'var(--text3)'}}>Created {fmtDate(project.created_at)}</span>
              </div>
            </div>
            {project.status==='complete'&&(
              <div style={{width:72,height:72,borderRadius:'50%',flexShrink:0,background:`conic-gradient(${hc} ${project.health_score}%, var(--bg4) 0)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:52,height:52,borderRadius:'50%',background:'var(--bg2)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontFamily:'var(--mono)',fontSize:16,fontWeight:700,color:hc,lineHeight:1}}>{project.health_score}</span>
                  <span style={{fontSize:9,color:'var(--text3)'}}>health</span>
                </div>
              </div>
            )}
          </div>

          {project.status==='complete'&&(
            <div className="report-stats">
              <div className="report-stat"><div className="report-stat-val">{project.file_count}</div><div className="report-stat-lbl">Files analysed</div></div>
              <div className="report-stat"><div className="report-stat-val" style={{color:project.security_issues.length>0?'var(--red)':'var(--green)'}}>{project.security_issues.length}</div><div className="report-stat-lbl">Security issues</div></div>
              <div className="report-stat"><div className="report-stat-val">{project.tech_stack.length}</div><div className="report-stat-lbl">Technologies</div></div>
              {project.security_issues.length>0&&(
                <div style={{display:'flex',gap:5,alignItems:'center'}}>
                  {(['critical','high','medium','low'] as const).map(sev=>{
                    const n=project.security_issues.filter(i=>i.severity===sev).length
                    return n>0?<span key={sev} className={`badge badge-${sev}`}>{n} {sev}</span>:null
                  })}
                </div>
              )}
              <div className="stack-chips" style={{marginLeft:'auto',alignSelf:'center'}}>
                {project.tech_stack.slice(0,8).map(t=><span key={t} className="stack-chip">{t}</span>)}
              </div>
            </div>
          )}

          {/* Re-analyse bar */}
          <div style={{display:'flex',gap:8,alignItems:'center',marginTop:14,paddingTop:14,borderTop:'1px solid var(--border)',flexWrap:'wrap'}}>
            <input type="file" accept=".zip" id="reanalyse-zip" style={{display:'none'}} onChange={e=>setZipFile(e.target.files?.[0]??null)}/>
            <label htmlFor="reanalyse-zip" className="btn btn-ghost" style={{cursor:'pointer'}}>
              📦 {zipFile?zipFile.name:'Choose ZIP to (re)analyse'}
            </label>
            <button className="btn btn-primary" onClick={reanalyse} disabled={!zipFile||reanalysing}>
              {reanalysing?`⚙️ ${progressLbl||'Analysing...'}` :'⚙️ Run Analysis'}
            </button>
            {project.status==='pending'&&!reanalysing&&(
              <span style={{fontSize:12,color:'var(--text3)'}}>↑ Upload the codebase ZIP to generate the report</span>
            )}
            {project.error_message&&(
              <span style={{fontSize:12,color:'var(--red)',fontFamily:'var(--mono)'}}>Error: {project.error_message}</span>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="tabs-row">
          {TABS.map(t=>(
            <button key={t.id} className={`tab-btn ${activeTab===t.id?'active':''}`} onClick={()=>setActiveTab(t.id)}>
              {t.icon} {t.label}
              {t.id==='tasks'&&critCount>0&&<span className="tab-count">{critCount}</span>}
            </button>
          ))}
        </div>

        {/* Panels */}
        <div className={`tab-panel ${activeTab==='chat'?'active':''}`}><ChatTab project={project}/></div>
        <div className={`tab-panel ${activeTab==='overview'?'active':''}`}><AIContentTab html={project.report_html} sectionId="section-overview"/></div>
        <div className={`tab-panel ${activeTab==='code-db'?'active':''}`}><AIContentTab html={project.report_html} sectionId="section-code-db"/></div>
        <div className={`tab-panel ${activeTab==='knowledge'?'active':''}`}><KnowledgeTab/></div>
        <div className={`tab-panel ${activeTab==='tasks'?'active':''}`}><TasksTab project={project}/></div>

      </div>
    </>
  )
}
