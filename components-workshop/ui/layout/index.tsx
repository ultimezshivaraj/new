'use client'
import type { CSSProperties, ReactNode } from 'react'
import { useState, useEffect } from 'react'
import { colors, fonts, radius, spacing } from '../../lib/theme'

export interface NavItem { icon?: string; label: string; href?: string; active?: boolean; onClick?: () => void; sub?: { label: string; active?: boolean; onClick?: () => void }[] }
export interface NavGroup { label?: string; items: NavItem[] }

export function Sidebar({ groups, bottom, collapsed = false, title = 'Coinpedia AI' }: { groups: NavGroup[]; bottom?: ReactNode; collapsed?: boolean; title?: string }) {
  const w = collapsed ? 56 : 220
  return (
    <aside style={{ width: w, minWidth: w, background: colors.bg2, borderRight: `1px solid ${colors.border}`, height: '100vh', position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', zIndex: 200, overflowY: 'auto', overflowX: 'hidden', transition: 'width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: `${spacing[4]} 14px ${spacing[3]}`, borderBottom: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        <div style={{ width: 32, height: 32, flexShrink: 0, background: `linear-gradient(135deg, ${colors.accent}, ${colors.cyan})`, borderRadius: radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontWeight: 700, fontSize: '13px', color: '#fff' }}>QD</div>
        {!collapsed && <span style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '-0.3px', whiteSpace: 'nowrap', color: colors.text }}>{title.replace('AI', '')}<span style={{ color: colors.accent }}>AI</span></span>}
      </div>
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {groups.map((group, gi) => (
          <div key={gi} style={{ marginTop: gi > 0 ? 4 : 0 }}>
            {group.label && !collapsed && <div style={{ fontSize: '9px', fontFamily: fonts.mono, letterSpacing: '1.5px', textTransform: 'uppercase', color: colors.subtle, padding: '8px 10px 4px' }}>{group.label}</div>}
            {gi > 0 && !group.label && <div style={{ height: 1, background: colors.border, margin: '8px 8px' }} />}
            {group.items.map((item, ii) => (
              <div key={ii}>
                <SidebarItem item={item} collapsed={collapsed} />
                {!collapsed && item.active && item.sub?.map((s, si) => (
                  <button key={si} type="button" onClick={s.onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px 7px 18px', borderRadius: radius.md, border: 'none', fontSize: '12px', fontWeight: 500, fontFamily: fonts.sans, color: s.active ? colors.accent : colors.muted, background: s.active ? colors.accentDim : 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.15s' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.active ? colors.accent : colors.border2, flexShrink: 0 }} />{s.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ))}
      </nav>
      {bottom && <div style={{ padding: '10px 8px', borderTop: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>{bottom}</div>}
    </aside>
  )
}

function SidebarItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const base: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: radius.md, fontSize: '13px', fontWeight: 500, fontFamily: fonts.sans, color: item.active ? colors.accent : colors.muted, background: item.active ? colors.accentDim : 'transparent', textDecoration: 'none', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', overflow: 'hidden', border: 'none', width: '100%', textAlign: 'left' }
  const enter = (e: React.MouseEvent<HTMLElement>) => { if (!item.active) { (e.currentTarget as HTMLElement).style.background = colors.bg3; (e.currentTarget as HTMLElement).style.color = colors.text } }
  const leave = (e: React.MouseEvent<HTMLElement>) => { if (!item.active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = colors.muted } }
  const content = <><span style={{ fontSize: '16px', flexShrink: 0, width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>{!collapsed && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}</>
  if (item.href) return <a href={item.href} style={base} onMouseEnter={enter} onMouseLeave={leave}>{content}</a>
  return <button type="button" onClick={item.onClick} style={base} onMouseEnter={enter} onMouseLeave={leave}>{content}</button>
}

export function TopBar({ breadcrumb, activePage, right, style }: { breadcrumb?: { label: string; href?: string }[]; activePage?: string; right?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: colors.bg2, borderBottom: `1px solid ${colors.border}`, padding: `0 ${spacing[6]}`, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, flexShrink: 0, ...style }}>
      <div style={{ fontFamily: fonts.mono, fontSize: '13px', color: colors.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
        {breadcrumb?.map((b, i) => (<span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{b.href ? <a href={b.href} style={{ color: colors.muted, textDecoration: 'none' }}>{b.label}</a> : <span>{b.label}</span>}{i < (breadcrumb.length - 1) && <span style={{ color: colors.border2 }}>›</span>}</span>))}
        {activePage && <>{breadcrumb && <span style={{ color: colors.border2 }}>›</span>}<span style={{ color: colors.text, fontWeight: 500 }}>{activePage}</span></>}
      </div>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>{right}</div>}
    </div>
  )
}

export function MainLayout({ sidebar, topBar, children, containerStyle }: { sidebar: ReactNode; topBar?: ReactNode; children: ReactNode; containerStyle?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', background: colors.bg, color: colors.text, fontFamily: fonts.sans }}>
      {sidebar}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {topBar}
        <div style={{ padding: spacing[6], ...containerStyle }}>{children}</div>
      </div>
    </div>
  )
}

export function LiveClock({ collapsed = false }: { collapsed?: boolean }) {
  const [time, setTime] = useState('--:--:--')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  return <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', overflow: 'hidden', fontFamily: fonts.mono, fontSize: '11px', color: colors.green }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.green, flexShrink: 0, animation: 'pulse-dot 1.5s ease-in-out infinite' }} />{!collapsed && <span>{time}</span>}</div>
}

export function CollapseToggle({ collapsed, onToggle, style }: { collapsed: boolean; onToggle: () => void; style?: CSSProperties }) {
  return <button type="button" onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: radius.md, border: 'none', background: 'transparent', color: colors.muted, cursor: 'pointer', fontFamily: fonts.sans, fontSize: '12px', fontWeight: 500, width: '100%', transition: 'all 0.15s', ...style }}><span style={{ fontSize: '14px', width: 20, transition: 'transform 0.22s', transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}>◂</span>{!collapsed && <span>Collapse</span>}</button>
}
