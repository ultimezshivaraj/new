'use client'

interface StatCardProps {
  label:   string
  value:   string | number
  icon?:   string
  color?:  string   // accent + value colour, defaults to var(--accent-c)
  sub?:    string   // small subtext below value
}

export default function StatCard({ label, value, icon, color = 'var(--accent-c)', sub }: StatCardProps) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '14px 16px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* colour accent bar at top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      {icon && <div style={{ fontSize: 18, marginBottom: 8 }}>{icon}</div>}
      <div style={{
        fontSize: 26, fontWeight: 700, lineHeight: 1,
        fontFamily: 'var(--font-mono)', color,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}
