'use client'

import { useRouter } from 'next/navigation'
import type { Project } from '@/lib/qd-dev/types'
import { fmtDate, healthColor } from '@/lib/qd-dev/utils'

const ICONS: Record<string, string> = {
  pending:   '⏳', analysing: '⚙️', complete: '✅', error: '❌',
}

export default function ProjectCard({ project }: { project: Project }) {
  const router = useRouter()
  const hc     = healthColor(project.health_score)
  const critCount = project.security_issues.filter(i => i.severity === 'critical').length

  return (
    <div className="project-card" onClick={() => router.push(`/projects/${project.project_id}`)}>
      {/* Head */}
      <div className="project-card-head">
        <div className="project-card-icon">{ICONS[project.status] ?? '📁'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="project-card-name">{project.project_name}</div>
          {project.description && (
            <div className="project-card-desc" style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {project.description}
            </div>
          )}
        </div>
        {/* Health ring */}
        {project.status === 'complete' && (
          <div className="health-ring" style={{
            background: `conic-gradient(${hc} ${project.health_score}%, var(--bg4) 0)`,
            color: hc,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--bg2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {project.health_score}
            </div>
          </div>
        )}
      </div>

      {/* Status + badge row */}
      <div className="project-card-meta">
        <span className={`badge badge-${project.status}`}>
          {project.status}
        </span>
        {critCount > 0 && (
          <span className="badge badge-critical">
            {critCount} critical
          </span>
        )}
        {project.file_count > 0 && (
          <span className="project-card-stat">📄 {project.file_count} files</span>
        )}
        <span className="project-card-stat" style={{ marginLeft: 'auto' }}>
          {fmtDate(project.created_at)}
        </span>
      </div>

      {/* Tech stack chips */}
      {project.tech_stack.length > 0 && (
        <div className="stack-chips">
          {project.tech_stack.slice(0, 6).map(t => (
            <span key={t} className="stack-chip">{t}</span>
          ))}
          {project.tech_stack.length > 6 && (
            <span className="stack-chip">+{project.tech_stack.length - 6}</span>
          )}
        </div>
      )}
    </div>
  )
}
