'use client'

interface Tab {
  key:    string
  label:  string
  count?: string | number
}

interface TabBarProps {
  tabs:      Tab[]
  active:    string
  onChange:  (key: string) => void
  variant?:  'underline' | 'pill'   // default: underline
  color?:    string                  // active colour, default var(--accent-c)
}

export default function TabBar({
  tabs, active, onChange,
  variant = 'underline',
  color   = 'var(--accent-c)',
}: TabBarProps) {

  if (variant === 'pill') {
    return (
      <div style={{
        display: 'flex', gap: 0,
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 4, width: 'fit-content',
      }}>
        {tabs.map(t => {
          const on = t.key === active
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              style={{
                padding: '6px 14px', borderRadius: 7, border: 'none',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all .15s', fontFamily: 'var(--font-sans)',
                background: on ? `${color}22` : 'transparent',
                color:      on ? color : 'var(--text2)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {t.label}
              {t.count !== undefined && (
                <span style={{
                  fontSize: 9, fontFamily: 'var(--font-mono)',
                  padding: '1px 6px', borderRadius: 10,
                  background: on ? color : 'var(--border2)',
                  color: on ? '#fff' : 'var(--text2)',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // underline variant
  return (
    <div style={{
      display: 'flex', gap: 0,
      borderBottom: '1px solid var(--border)',
      overflowX: 'auto',
    }}>
      {tabs.map(t => {
        const on = t.key === active
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              padding: '10px 16px', border: 'none', background: 'transparent',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              color: on ? color : 'var(--text2)',
              borderBottom: on ? `2px solid ${color}` : '2px solid transparent',
              transition: 'all .15s', fontFamily: 'var(--font-sans)',
              whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span style={{
                fontSize: 9, fontFamily: 'var(--font-mono)',
                padding: '1px 5px', borderRadius: 8,
                background: on ? `${color}22` : 'var(--bg3)',
                color: on ? color : 'var(--text2)',
              }}>
                {t.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
