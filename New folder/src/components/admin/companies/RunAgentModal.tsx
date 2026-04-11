'use client'
// src/components/admin/companies/RunAgentModal.tsx

import { useState } from 'react'
import type { CompanyRow } from '@/types/companies'

const ALL_SECTIONS = ['about', 'details', 'funding', 'team', 'products']

interface Props {
  company: CompanyRow
  onClose: () => void
  onRun:   (companyId: string, sections: string[]) => Promise<void>
}

export default function RunAgentModal({ company, onClose, onRun }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_SECTIONS))
  const [running,  setRunning]  = useState(false)
  const [btnLabel, setBtnLabel] = useState('Run Agent')

  function toggle(s: string) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(s) ? n.delete(s) : n.add(s)
      return n
    })
  }

  async function run() {
    if (!selected.size) return
    setRunning(true)
    const msgs = ['Fetching Wikipedia…', 'Calling Gemini…', 'Extracting…', 'Writing staging…']
    let mi = 0
    const iv = setInterval(() => setBtnLabel(msgs[mi++ % msgs.length]), 3500)
    try {
      await onRun(company.company_id, [...selected])
      onClose()
    } finally {
      clearInterval(iv)
      setBtnLabel('Run Agent')
      setRunning(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 22, width: 460, maxWidth: '92vw' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>Run Agent</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>Fetch data from Wikipedia and the web</div>

        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text3)', marginBottom: 6, fontWeight: 600 }}>Company</div>
        <div style={{ background: 'var(--bg3)', borderRadius: 7, padding: '9px 12px', fontSize: 12, color: 'var(--text)', marginBottom: 14, border: '1px solid var(--border)' }}>
          {company.company_name}
          <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 8, fontFamily: 'var(--font-mono)' }}>#{company.company_id}</span>
        </div>

        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text3)', marginBottom: 8, fontWeight: 600 }}>Sections</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {ALL_SECTIONS.map(s => (
            <button
              key={s}
              onClick={() => toggle(s)}
              style={{
                padding: '4px 12px', borderRadius: 100, fontSize: 11, cursor: 'pointer',
                border: `1px solid ${selected.has(s) ? '#f59e0b44' : 'var(--border)'}`,
                background: selected.has(s) ? '#f59e0b11' : 'var(--bg3)',
                color: selected.has(s) ? '#f59e0b' : 'var(--text3)',
                fontFamily: 'var(--font-sans)', transition: 'all .15s',
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 7, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12 }}
          >
            Cancel
          </button>
          <button
            onClick={run}
            disabled={running || !selected.size}
            style={{
              padding: '8px 20px', borderRadius: 7, background: running ? '#f59e0b88' : '#f59e0b',
              border: 'none', color: '#080a0d', cursor: running ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700,
            }}
          >
            {btnLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
