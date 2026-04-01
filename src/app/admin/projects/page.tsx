'use client'

import { useState, useEffect } from 'react'
import TopBar from '@/components/qd-dev/TopBar'
import ProjectCard from '@/components/qd-dev/ProjectCard'
import NewProjectModal from '@/components/qd-dev/NewProjectModal'
import type { Project } from '@/lib/qd-dev/types'

export default function ProjectsPage() {
  const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY ?? 'coinpedia-admin-2026'

  const [projects, setProjects] = useState<Project[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [showNew,  setShowNew]  = useState(false)
  const [search,   setSearch]   = useState('')

  async function fetchProjects() {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/admin/projects', {
        headers: { Authorization: `Bearer ${ADMIN_KEY}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setProjects(data)
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchProjects() }, [])

  function handleCreated(p: Project) {
    setProjects(prev => [p, ...prev.filter(x => x.project_id !== p.project_id)])
    setShowNew(false)
  }

  const filtered = projects.filter(p =>
    !search || p.project_name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  )

  const counts = {
    total:     projects.length,
    complete:  projects.filter(p => p.status === 'complete').length,
    pending:   projects.filter(p => p.status === 'pending').length,
    critical:  projects.reduce((n, p) => n + p.security_issues.filter(i => i.severity === 'critical').length, 0),
  }

  return (
    <>
      <TopBar />

      <div className="page">
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--head)', fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
              Projects
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
              Internal codebase analysis · Ultimez Developer Intelligence
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + New Project
          </button>
        </div>

        {/* Stats row */}
        {!loading && projects.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Total',    val: counts.total,    color: 'var(--text)' },
              { label: 'Analysed', val: counts.complete, color: 'var(--green)' },
              { label: 'Pending',  val: counts.pending,  color: 'var(--text3)' },
              { label: 'Critical Issues', val: counts.critical, color: 'var(--red)' },
            ].map(s => (
              <div key={s.label} className="card-sm" style={{ minWidth: 110 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        {projects.length > 3 && (
          <input
            className="input"
            style={{ maxWidth: 360, marginBottom: 16 }}
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        )}

        {/* States */}
        {loading && (
          <div className="projects-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="project-card" style={{ gap: 12, cursor: 'default' }}>
                <div className="skeleton" style={{ height: 40, borderRadius: 10, width: '60%' }} />
                <div className="skeleton" style={{ height: 14, width: '80%' }} />
                <div className="skeleton" style={{ height: 14, width: '40%' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 10, fontSize: 13, color: 'var(--red)' }}>
            {error} — <button onClick={fetchProjects} style={{ background: 'none', color: 'var(--red)', textDecoration: 'underline', cursor: 'pointer' }}>retry</button>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="empty">
            <div className="empty-icon">⌥</div>
            <h3>No projects yet</h3>
            <p>Create your first project and upload a codebase ZIP to get started.</p>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              + New Project
            </button>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="projects-grid">
            {filtered.map(p => <ProjectCard key={p.project_id} project={p} />)}
          </div>
        )}

        {!loading && !error && projects.length > 0 && filtered.length === 0 && (
          <div style={{ color: 'var(--text3)', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>
            No projects match &ldquo;{search}&rdquo;
          </div>
        )}
      </div>

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}
