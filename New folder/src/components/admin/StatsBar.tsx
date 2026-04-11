'use client'
// Replaces the render() stats section from admin.html:
//   document.getElementById('stats').innerHTML = ...
//
// Displays: Total Reports | Categories

import type { Report } from '@/types/api'

interface StatsBarProps {
  reports: Report[]
}

export function StatsBar({ reports }: StatsBarProps) {
  const totalReports = reports.length
  const categories   = new Set(reports.map(r => r.category ?? 'General')).size

  const stats = [
    { value: totalReports, label: 'Total Reports' },
    { value: categories,   label: 'Categories'    },
  ]

  return (
    <div className="flex gap-4 mb-6 flex-wrap">
      {stats.map(({ value, label }) => (
        <div
          key={label}
          style={{
            background:   'var(--bg2)',
            border:       '1px solid var(--border)',
            borderRadius: '10px',
            padding:      '16px 20px',
            minWidth:     '140px',
            transition:   'background 0.3s',
          }}
        >
          <div
            className="text-[28px] font-bold tabular-nums"
            style={{ color: 'var(--text)' }}
          >
            {value}
          </div>
          <div
            className="text-[11px] uppercase tracking-[0.5px] mt-1"
            style={{ color: 'var(--text3)' }}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}
