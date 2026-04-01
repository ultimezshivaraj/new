'use client'

import { useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────

type Role    = 'pm' | 'dev' | 'ux' | 'qa'
type TaskType= 'Analyse' | 'Action' | 'Training' | 'Idea' | 'Build'

interface KnowledgeTask {
  id:    string
  title: string
  desc:  string
  hint?: string
  type:  TaskType
  xp:    number
  diff:  string
}

interface RoleConfig {
  icon:  string
  label: string
  color: string
  bg:    string
  tasks: KnowledgeTask[]
}

// ── Level system ──────────────────────────────────────────────────

const LEVELS = [
  { name: 'Scout',    xp: 0   },
  { name: 'Explorer', xp: 50  },
  { name: 'Analyst',  xp: 120 },
  { name: 'Expert',   xp: 220 },
  { name: 'Master',   xp: 350 },
]

function getLevel(xp: number) {
  let lv = LEVELS[0]
  for (const l of LEVELS) { if (xp >= l.xp) lv = l }
  return lv
}

function getNext(xp: number) {
  return LEVELS.find(l => xp < l.xp) ?? null
}

// ── Task type colours ─────────────────────────────────────────────

const TYPE_STYLE: Record<TaskType, { bg: string; color: string }> = {
  Analyse:  { bg: 'rgba(59,130,246,.1)',   color: '#3b82f6' },
  Action:   { bg: 'rgba(217,119,6,.1)',    color: '#d97706' },
  Training: { bg: 'rgba(124,58,237,.1)',   color: '#7c3aed' },
  Idea:     { bg: 'rgba(34,197,94,.1)',    color: '#22c55e' },
  Build:    { bg: 'rgba(239,68,68,.1)',    color: '#ef4444' },
}

// ── Role definitions ──────────────────────────────────────────────

const ROLES: Record<Role, RoleConfig> = {
  pm: {
    icon: '📊', label: 'Project Manager', color: '#3b82f6', bg: 'rgba(59,130,246,.1)',
    tasks: [
      { id:'pm1', title:'Read Overview tab — write a 3-sentence summary in plain English', desc:'What does this project do, who uses it, what tech does it run on? Share in team chat.', type:'Analyse', xp:10, diff:'⭐ Easy' },
      { id:'pm2', title:'Count Critical + High issues — explain business impact of top 2', desc:'From Tasks tab. Why would a CFO care about these? Think revenue, data, reputation.', type:'Analyse', xp:15, diff:'⭐⭐ Medium' },
      { id:'pm3', title:'Build a priority matrix — rank all open tasks by Impact × Effort', desc:'Which 3 go into this sprint? Assign to team members in Tasks tab.', type:'Action', xp:25, diff:'⭐⭐⭐ Hard' },
      { id:'pm4', title:'Write a 1-page project brief from the analysis', desc:'Goal · health status · top 3 risks · team assignments · next milestone. Becomes the team\'s source of truth.', type:'Action', xp:20, diff:'⭐⭐⭐ Hard' },
      { id:'pm5', title:'Ask AI: "What moves this project from 62 to 85+ health score?"', desc:'Learn what a health score measures and what the 3 biggest levers are. Summarise for the team.', hint:'💡 Follow-up: "If we fixed only Critical issues this sprint, what would the new health score be?"', type:'Training', xp:20, diff:'⭐ Easy' },
      { id:'pm6', title:'Learn: Why does MD5 password hashing matter to a business?', desc:'This project uses MD5. Ask AI to explain the business risk — not the technical detail — if passwords are cracked.', type:'Training', xp:20, diff:'⭐⭐ Medium' },
      { id:'pm7', title:'Propose ONE process change that prevents these issues from recurring', desc:'After reading the full analysis — what one change in how the team works would stop the top 3 issues happening again?', hint:'🚀 Best ideas get added to the next sprint. No wrong answers.', type:'Idea', xp:30, diff:'🔥 Open' },
    ],
  },
  dev: {
    icon: '💻', label: 'Developer', color: '#d97706', bg: 'rgba(217,119,6,.1)',
    tasks: [
      { id:'dv1', title:'Trace the full request lifecycle of the busiest API route', desc:'From Code tab — follow one endpoint from request to response. Middleware → DB query → response shape. Write it out.', type:'Analyse', xp:10, diff:'⭐⭐ Medium' },
      { id:'dv2', title:'Find all queries with no LIMIT clause — list them', desc:'Ask AI: "Which routes query BigQuery with no row limit?" These are your biggest performance risks.', type:'Analyse', xp:15, diff:'⭐⭐ Medium' },
      { id:'dv3', title:'Fix the top Critical issue — commit it with the QD Dev fix', desc:'From Tasks tab → Copy Fix → apply → test locally → commit "fix: [title] from QD Dev audit". Log time in Tasks.', type:'Action', xp:30, diff:'⭐⭐⭐ Hard' },
      { id:'dv4', title:'Add input validation to all unprotected POST routes', desc:'List every POST route with no input sanitisation. Apply Zod or manual validation. Document the pattern for the team.', type:'Action', xp:25, diff:'⭐⭐⭐ Hard' },
      { id:'dv5', title:'Learn: How does BigQuery differ from MySQL for web apps?', desc:'Ask AI: "Explain BigQuery\'s limitations vs MySQL for this project\'s use case." Know the trade-offs.', hint:'💡 Ask: "What BigQuery patterns in this codebase would cause production slowdowns at scale?"', type:'Training', xp:20, diff:'⭐⭐ Medium' },
      { id:'dv6', title:'Map every Redis cache key and its TTL', desc:'From Code & DB tab. What gets cached? For how long? What happens if Redis goes down? Document in the README.', type:'Training', xp:15, diff:'⭐ Easy' },
      { id:'dv7', title:'Design a new internal API endpoint that would save the most team time', desc:'Based on what you now know — what\'s the most-repeated manual process? Design the route, inputs, outputs, auth. Could ship in 2 days.', hint:'🚀 Best ideas get built. This is your chance to own something in production.', type:'Build', xp:40, diff:'🔥 Challenge' },
    ],
  },
  ux: {
    icon: '🎨', label: 'UX Designer', color: '#ec4899', bg: 'rgba(236,72,153,.1)',
    tasks: [
      { id:'ux1', title:'Build a screen inventory — list every page with purpose + who can see it', desc:'From Overview tab. For each screen: what is the user doing, which role can access it, what data appears?', type:'Analyse', xp:10, diff:'⭐ Easy' },
      { id:'ux2', title:'Map the most important user journey as a step-by-step flow', desc:'Ask AI: "Describe the step-by-step journey of an admin from login to running a report." Draw or write the flow.', type:'Analyse', xp:15, diff:'⭐⭐ Medium' },
      { id:'ux3', title:'Find all missing error states and empty states', desc:'Ask AI: "Which screens have no empty state or error handling?" These are your UX debt. List them.', type:'Analyse', xp:15, diff:'⭐⭐ Medium' },
      { id:'ux4', title:'Learn: How does auth architecture constrain UX decisions?', desc:'Ask AI: "For each user role, list exactly which screens and actions they can and cannot access." Build the permission matrix.', hint:'💡 What you can design is limited by what the backend allows. Understanding auth = knowing your design space.', type:'Training', xp:20, diff:'⭐ Easy' },
      { id:'ux5', title:'Design the empty state for the most-visited screen', desc:'Pick the screen most likely to load with no data. Design what it should show. Present to the team (Figma, sketch, or written spec).', type:'Action', xp:25, diff:'⭐⭐ Medium' },
      { id:'ux6', title:'Identify the 3 slowest user flows by number of steps', desc:'Count the clicks/steps for the top 3 tasks. Which one has the most friction? Propose how to reduce it by 40%.', type:'Action', xp:20, diff:'⭐⭐ Medium' },
      { id:'ux7', title:'Redesign the worst UX moment in this project', desc:'What would confuse or frustrate a real user most? Show the before (from the code) and your redesigned after.', hint:'🚀 Great redesigns get built. This is your chance to ship something users feel.', type:'Build', xp:35, diff:'🔥 Challenge' },
    ],
  },
  qa: {
    icon: '🧪', label: 'QA Engineer', color: '#22c55e', bg: 'rgba(34,197,94,.1)',
    tasks: [
      { id:'qa1', title:'Turn every security issue into a test case', desc:'For each issue in Tasks tab: What to test · What input to try · What safe output looks like. This is your test plan.', type:'Analyse', xp:10, diff:'⭐ Easy' },
      { id:'qa2', title:'List all API routes with no auth guard', desc:'From Code & DB tab. Mark every route: auth required or no auth. Unguarded routes are your priority attack surface.', type:'Analyse', xp:15, diff:'⭐⭐ Medium' },
      { id:'qa3', title:'Write + run a test that reproduces the top Critical vulnerability', desc:'Show the bug exists → apply the fix → re-run → show it passes. Log your time in Tasks tab.', type:'Action', xp:25, diff:'⭐⭐⭐ Hard' },
      { id:'qa4', title:'Build a regression test checklist for this specific project', desc:'10 things to test every time code ships to this project. Based on what you found. Lives with this project forever.', type:'Action', xp:20, diff:'⭐⭐ Medium' },
      { id:'qa5', title:'Learn: What is SQL injection? Test it on this project\'s vulnerable routes', desc:'Ask AI: "Show me the exact test inputs for each SQL injection risk in this project." Practice locally.', hint:'💡 Ask: "Write me a Postman collection to test all unprotected routes in this project"', type:'Training', xp:20, diff:'⭐⭐ Medium' },
      { id:'qa6', title:'Learn: How do JWT attacks work? Is this project vulnerable?', desc:'Ask AI: "How could a JWT in this project be forged or replayed?" Understand the attack surface your tests need to cover.', type:'Training', xp:20, diff:'⭐⭐ Medium' },
      { id:'qa7', title:'Build a complete test suite for one full feature', desc:'Happy path · edge cases · auth bypass attempts · invalid inputs · empty states. Make it the template for every feature.', hint:'🚀 A complete test suite for one feature becomes the standard for the whole codebase.', type:'Build', xp:40, diff:'🔥 Challenge · 4–8 hrs' },
    ],
  },
}

const ROLE_ORDER: Role[] = ['pm', 'dev', 'ux', 'qa']

// ── Component ─────────────────────────────────────────────────────

export default function KnowledgeTab() {
  const [activeRole, setActiveRole] = useState<Role>('pm')
  const [done, setDone]   = useState<Set<string>>(new Set())
  const [xp,   setXp]     = useState<Record<Role, number>>({ pm: 0, dev: 0, ux: 0, qa: 0 })

  function toggleTask(role: Role, taskId: string, taskXp: number) {
    setDone(prev => {
      const next = new Set(prev)
      const isDone = next.has(taskId)
      isDone ? next.delete(taskId) : next.add(taskId)
      setXp(x => ({ ...x, [role]: Math.max(0, x[role] + (isDone ? -taskXp : taskXp)) }))
      return next
    })
  }

  const role    = ROLES[activeRole]
  const roleXp  = xp[activeRole]
  const lv      = getLevel(roleXp)
  const nx      = getNext(roleXp)
  const doneCount = role.tasks.filter(t => done.has(t.id)).length
  const pct     = Math.round(doneCount / role.tasks.length * 100)

  return (
    <div className="card">
      {/* Role selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {ROLE_ORDER.map(r => {
          const rc = ROLES[r]
          const isActive = activeRole === r
          return (
            <button
              key={r}
              onClick={() => setActiveRole(r)}
              style={{
                padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all .15s',
                background:   isActive ? rc.bg    : 'transparent',
                color:        isActive ? rc.color : 'var(--text3)',
                border:       `1.5px solid ${isActive ? rc.color : 'var(--border2)'}`,
              }}
            >
              {rc.icon} {rc.label}
            </button>
          )
        })}
      </div>

      {/* Level bar */}
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '14px 16px', marginBottom: 20,
        display: 'flex', gap: 14, alignItems: 'center',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
          background: role.bg, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 24,
        }}>
          {role.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{role.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
            {doneCount} / {role.tasks.length} complete · {roleXp} XP
          </div>
          <div style={{ height: 5, background: 'var(--bg4)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: role.color, borderRadius: 3, transition: 'width .3s' }} />
          </div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, padding: '4px 10px',
            borderRadius: 10, background: role.bg, color: role.color, marginBottom: 4,
          }}>
            {roleXp} XP
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 4,
            background: role.bg, color: role.color, display: 'block',
          }}>
            {lv.name}{nx ? ` → ${nx.name}` : ' (Max)'}
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {role.tasks.map((task, i) => {
          const isDone    = done.has(task.id)
          const ts        = TYPE_STYLE[task.type]
          const isNewSection = i === 0 || role.tasks[i-1].type !== task.type

          return (
            <div key={task.id}>
              {/* Section divider */}
              {isNewSection && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 10, fontWeight: 500, textTransform: 'uppercase',
                  letterSpacing: '.1em', color: 'var(--text3)',
                  margin: i === 0 ? '0 0 8px' : '14px 0 8px',
                }}>
                  {task.type}
                  <div style={{ flex: 1, height: .5, background: 'var(--border)' }} />
                </div>
              )}

              {/* Task card */}
              <div
                onClick={() => toggleTask(activeRole, task.id, task.xp)}
                style={{
                  background:    isDone ? 'transparent' : 'var(--bg3)',
                  border:        `1px solid ${isDone ? 'var(--border)' : 'var(--border2)'}`,
                  borderRadius:  10, padding: '10px 12px',
                  display:       'flex', gap: 10, cursor: 'pointer',
                  opacity:       isDone ? .45 : 1,
                  transition:    'all .15s',
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: 17, height: 17, borderRadius: 4, flexShrink: 0, marginTop: 2,
                  border:      `1.5px solid ${isDone ? '#22c55e' : 'var(--border2)'}`,
                  background:  isDone ? 'rgba(34,197,94,.15)' : 'transparent',
                  display:     'flex', alignItems: 'center', justifyContent: 'center',
                  color:       '#22c55e', fontSize: 10, fontWeight: 700,
                }}>
                  {isDone && '✓'}
                </div>

                {/* Body */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 500, color: 'var(--text)',
                    textDecoration: isDone ? 'line-through' : 'none', marginBottom: 2,
                  }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5, marginBottom: 6 }}>
                    {task.desc}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: ts.bg, color: ts.color }}>
                      {task.type}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', background: 'var(--bg4)', padding: '1px 5px', borderRadius: 3 }}>
                      +{task.xp} XP
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{task.diff}</span>
                  </div>
                  {task.hint && !isDone && (
                    <div style={{
                      marginTop: 6, padding: '5px 9px', borderRadius: 6,
                      background: 'var(--bg4)', borderLeft: `2px solid var(--border2)`,
                      fontSize: 11, color: 'var(--text3)', lineHeight: 1.5,
                    }}>
                      {task.hint}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Completion banner */}
      {doneCount === role.tasks.length && (
        <div style={{
          marginTop: 16, padding: '14px 16px', borderRadius: 10,
          background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>🏆</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>
            {role.label} complete — {roleXp} XP · {getLevel(roleXp).name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            Switch to another role to keep learning ↑
          </div>
        </div>
      )}
    </div>
  )
}
