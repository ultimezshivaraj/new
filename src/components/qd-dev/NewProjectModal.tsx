'use client'

import { useState, useRef, useCallback } from 'react'
import type { AnalysisEvent, Project } from '@/lib/qd-dev/types'

interface Props {
  onClose:   () => void
  onCreated: (p: Project) => void
}

type Step = 'form' | 'upload' | 'analysing' | 'done'

const STEPS = [
  { n: 1, label: 'Extract' },
  { n: 2, label: 'Index'   },
  { n: 3, label: 'Analyse' },
  { n: 4, label: 'Parse'   },
  { n: 5, label: 'Save'    },
]

export default function NewProjectModal({ onClose, onCreated }: Props) {
  const [step,        setStep]        = useState<Step>('form')
  const [name,        setName]        = useState('')
  const [desc,        setDesc]        = useState('')
  const [createdBy,   setCreatedBy]   = useState('admin')
  const [zipFile,     setZipFile]     = useState<File | null>(null)
  const [schema,      setSchema]      = useState('')
  const [dragOver,    setDragOver]    = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [progressLbl, setProgressLbl] = useState('Starting…')
  const [error,       setError]       = useState('')
  const [projectId,   setProjectId]   = useState('')
  const dropRef = useRef<HTMLDivElement>(null)

  const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY ?? 'coinpedia-admin-2026'
  const headers   = { Authorization: `Bearer ${ADMIN_KEY}` }

  // ── Step 1: Create project record ────────────────────────────────
  async function handleCreate() {
    if (!name.trim()) { setError('Project name is required'); return }
    setError('')
    try {
      const res  = await fetch('/api/admin/projects', {
        method:  'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ project_name: name.trim(), description: desc, created_by: createdBy }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Create failed')
      setProjectId(data.project_id)
      setStep('upload')
    } catch (e) { setError(String(e)) }
  }

  // ── Drag-and-drop ────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.zip')) setZipFile(f)
    else setError('Please drop a .zip file')
  }, [])

  // ── Step 2: Upload + stream analysis ─────────────────────────────
  async function handleAnalyse() {
    if (!zipFile) { setError('Please select a ZIP file'); return }
    setError(''); setStep('analysing'); setProgress(1); setProgressLbl('Uploading…')

    const form = new FormData()
    form.append('zip', zipFile)
    form.append('schema', schema)

    try {
      const res = await fetch(`/api/admin/projects/${projectId}/analyse`, {
        method: 'POST', headers, body: form,
      })
      if (!res.body) throw new Error('No stream')

      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let   buf    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt: AnalysisEvent = JSON.parse(line.slice(6))
            if (evt.type === 'progress') {
              setProgress(evt.step ?? 1)
              setProgressLbl(evt.label ?? '')
            }
            if (evt.type === 'complete' && evt.data) {
              setStep('done')
              onCreated(evt.data as Project)
            }
            if (evt.type === 'error') {
              setError(evt.message ?? 'Analysis failed')
              setStep('upload')
            }
          } catch { /* ignore partial */ }
        }
      }
    } catch (e) { setError(String(e)); setStep('upload') }
  }

  // ── Skip analysis (just save project) ────────────────────────────
  async function handleSkip() {
    const res = await fetch(`/api/admin/projects/${projectId}`, { headers })
    const p   = await res.json()
    onCreated(p)
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">

        {/* Header */}
        <div className="modal-head">
          <span style={{ fontSize: 20 }}>
            {step === 'form'      ? '📁'
           : step === 'upload'    ? '📦'
           : step === 'analysing' ? '⚙️'
           :                        '✅'}
          </span>
          <h3>
            {step === 'form'      ? 'New Project'
           : step === 'upload'    ? 'Upload Codebase'
           : step === 'analysing' ? 'Analysing…'
           :                        'Analysis Complete'}
          </h3>
          {step !== 'analysing' && (
            <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', color: 'var(--text3)', fontSize: 18, lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* ── FORM ─────────────────────────────────────────── */}
        {step === 'form' && (
          <>
            <div className="modal-body">
              <div>
                <label className="form-label">Project Name *</label>
                <input className="input" placeholder="e.g. new-qd-dashboard" value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
              </div>
              <div>
                <label className="form-label">Description</label>
                <input className="input" placeholder="Short description…" value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Created By</label>
                <input className="input" placeholder="admin" value={createdBy} onChange={e => setCreatedBy(e.target.value)} />
              </div>
              {error && <div style={{ fontSize: 12, color: 'var(--red)', padding: '6px 10px', background: 'rgba(239,68,68,.08)', borderRadius: 6 }}>{error}</div>}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create →</button>
            </div>
          </>
        )}

        {/* ── UPLOAD ───────────────────────────────────────── */}
        {step === 'upload' && (
          <>
            <div className="modal-body">
              <div
                ref={dropRef}
                className={`dropzone ${dragOver ? 'active' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <input type="file" accept=".zip" onChange={e => setZipFile(e.target.files?.[0] ?? null)} />
                <div className="dropzone-icon">📦</div>
                <div className="dropzone-text">Drop your codebase ZIP here</div>
                <div className="dropzone-hint">or click to browse · max ~50 MB</div>
                {zipFile && <div className="dropzone-file">✓ {zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(1)} MB)</div>}
              </div>

              <div>
                <label className="form-label">BigQuery Schema (optional)</label>
                <textarea className="input" placeholder="Paste your CREATE TABLE DDL or table descriptions here to improve analysis accuracy…"
                  value={schema} onChange={e => setSchema(e.target.value)} style={{ minHeight: 80 }} />
              </div>

              {error && <div style={{ fontSize: 12, color: 'var(--red)', padding: '6px 10px', background: 'rgba(239,68,68,.08)', borderRadius: 6 }}>{error}</div>}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={handleSkip}>Skip analysis</button>
              <button className="btn btn-primary" onClick={handleAnalyse} disabled={!zipFile}>
                Analyse →
              </button>
            </div>
          </>
        )}

        {/* ── ANALYSING ────────────────────────────────────── */}
        {step === 'analysing' && (
          <div className="modal-body" style={{ alignItems: 'center', padding: '32px 24px', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
              <div style={{ fontFamily: 'var(--head)', fontSize: 16, fontWeight: 700 }}>QD Dev AI is analysing</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>{progressLbl}</div>
            </div>
            <div className="progress-steps">
              {STEPS.map(s => (
                <div key={s.n} className={`progress-step ${progress === s.n ? 'active' : progress > s.n ? 'done' : ''}`}>
                  <div className={`progress-dot ${progress === s.n ? 'pulse' : ''}`} />
                  {progress > s.n ? '✓' : s.n}. {s.label}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>This takes 1–4 minutes depending on codebase size</div>
          </div>
        )}

        {/* ── DONE ─────────────────────────────────────────── */}
        {step === 'done' && (
          <>
            <div className="modal-body" style={{ alignItems: 'center', padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 48 }}>✅</div>
              <div style={{ fontFamily: 'var(--head)', fontSize: 16, fontWeight: 700, marginTop: 10 }}>Analysis complete!</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>Your project report is ready to view.</div>
            </div>
            <div className="modal-foot" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={onClose}>View Report →</button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
