'use client'
// src/components/admin/qd-dev/ProjectReportPage.tsx
// 6 tabs: QD Dev AI | Project Overview | Code & Database | AI Agents & Crons | QD Knowledge | Tasks

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/shared/PageShell'
import { SessionPayload } from '@/lib/session'

// ── Types ─────────────────────────────────────────────────────
interface Project {
  project_id: string; project_name: string; project_type: string
  environment?: string; repo_url?: string; live_url?: string
  description?: string; tech_stack?: string; team_members?: string
  analysis_focus?: string; priority?: string; depth?: string
  total_files?: number; total_tables?: number; total_columns?: number
  total_loc?: number; health_score?: number; folder_structure?: string
  report_html?: string; created_at?: unknown; created_by?: string; last_analysed?: unknown
}
interface TeamMember { name: string; role: string }
interface SchemaCol {
  table_name: string; column_name: string; data_type: string
  is_nullable: boolean; is_pk: boolean; is_fk: boolean
  is_security_risk: boolean; table_type: string; ordinal_position: number
  doc_count?: number
}
interface Controller {
  file_path: string; class_name?: string; method_name: string
  http_method: string; auth_level: string; purpose?: string
  db_tables_read?: string; db_tables_write?: string
  uses_redis: boolean; is_ajax: boolean
}
interface FlowStep {
  flow_name: string; step_number: number; step_actor: string
  step_action: string; step_function?: string
  step_db_table?: string; step_db_operation?: string
}
interface DevopsRow {
  component: string; failure_impact?: string; risk_level: string
  mitigation?: string; env_var_name?: string; env_var_required_by?: string
  env_var_sensitive: boolean
}
interface AiAgent {
  agent_id: string; file_path: string; agent_type: string
  provider: string; model?: string; purpose?: string
  call_pattern: string; max_tokens?: number
  has_system_prompt: boolean; has_tools: boolean
}
interface CronJob {
  cron_id: string; source: string; schedule: string
  schedule_human: string; path?: string
  description?: string; max_duration?: number
}
interface Task {
  task_id: string; category: string; title: string
  description?: string; business_impact?: string; file_path?: string
  fix_steps?: string; fix_code?: string; effort_minutes?: number
  severity?: string; owasp_category?: string; assigned_to?: string
  status: string; generated_by: string; generated_by_name?: string
  chat_context?: string; created_at?: unknown
}
interface ChatMsg { role: 'user' | 'assistant'; content: string }
interface TimerState { totalMs: number; startedAt: number | null; done: boolean }
interface WorkLogEntry { taskTitle: string; duration: string; by: string; at: string }

// ── QD Knowledge roles & levels ───────────────────────────────
const QD_ROLES = {
  pm: {
    label: 'Project Manager', icon: '📋', color: '#3b82f6',
    tasks: [
      { id: 'pm1', phase: 'Analyse', xp: 10, title: 'Read the Project Overview tab', desc: 'Understand the project\'s health score, tech stack, team, and top risks.' },
      { id: 'pm2', phase: 'Analyse', xp: 15, title: 'Count & categorise all tasks', desc: 'Open the Tasks tab. How many Security vs Bug vs Scalable tasks exist? Which are Critical?' },
      { id: 'pm3', phase: 'Analyse', xp: 20, title: 'Explain the top 3 business impacts to your team', desc: 'Pick 3 tasks with the highest business_impact and write a non-technical summary.' },
      { id: 'pm4', phase: 'Action', xp: 25, title: 'Build a priority matrix', desc: 'Map all Critical/High tasks on a 2×2 grid: Impact vs Effort. Prioritise the top 5.' },
      { id: 'pm5', phase: 'Action', xp: 20, title: 'Write a project brief', desc: 'Use the Architecture tab to write a 1-page brief: what this system does, who uses it, what risks exist.' },
      { id: 'pm6', phase: 'Training', xp: 15, title: 'Ask QD Dev AI: "Explain the health score"', desc: 'Ask the AI chat to explain what the health score means and how to improve it.' },
      { id: 'pm7', phase: 'Training', xp: 15, title: 'Learn why MD5 passwords are a business risk', desc: 'Ask: "If our passwords are MD5 hashed, what\'s the business risk and timeline to fix?"' },
      { id: 'pm8', phase: 'Build', xp: 30, title: 'Propose a process change', desc: 'Write a Slack message or doc proposing one change that reduces the most risk with least effort.' },
    ]
  },
  dev: {
    label: 'Developer', icon: '💻', color: '#22c55e',
    tasks: [
      { id: 'dv1', phase: 'Analyse', xp: 10, title: 'Trace a full request lifecycle', desc: 'Pick any API route from the Controllers list. Trace it: auth check → DB query → response.' },
      { id: 'dv2', phase: 'Analyse', xp: 20, title: 'Find every unindexed query pattern', desc: 'Review Controllers and Data Flows. Which routes query large tables with no LIMIT or index?' },
      { id: 'dv3', phase: 'Analyse', xp: 15, title: 'Audit all AI agent integrations', desc: 'Open the AI Agents tab. List every LLM call: provider, model, has tools, has system prompt.' },
      { id: 'dv4', phase: 'Action', xp: 30, title: 'Fix the top Critical security issue', desc: 'Implement the fix from the Tasks tab for the highest-severity security issue.' },
      { id: 'dv5', phase: 'Action', xp: 25, title: 'Write a unit test for the top vulnerability', desc: 'Write a test that fails without the fix and passes after.' },
      { id: 'dv6', phase: 'Training', xp: 15, title: 'Learn the MD5 migration path', desc: 'Ask QD Dev AI: "What\'s the safest way to migrate MD5 passwords to bcrypt without logging users out?"' },
      { id: 'dv7', phase: 'Training', xp: 15, title: 'Understand the full auth flow', desc: 'Ask: "Walk me through the complete authentication lifecycle for an admin user in this codebase."' },
      { id: 'dv8', phase: 'Build', xp: 35, title: 'Propose one architecture improvement', desc: 'Write a technical RFC: current problem, proposed solution, tradeoffs, migration steps.' },
    ]
  },
  ux: {
    label: 'UX Designer', icon: '🎨', color: '#a855f7',
    tasks: [
      { id: 'ux1', phase: 'Analyse', xp: 10, title: 'Build a screen inventory', desc: 'From the Views tab, list every frontend route and what user role can access it.' },
      { id: 'ux2', phase: 'Analyse', xp: 15, title: 'Map the 3 most important user journeys', desc: 'Login, complete main action, error recovery — trace each through the Data Flows tab.' },
      { id: 'ux3', phase: 'Analyse', xp: 20, title: 'Find all empty states & error states', desc: 'Which routes have no error handling? Which pages have no empty state shown to users?' },
      { id: 'ux4', phase: 'Action', xp: 25, title: 'Design an empty state for the most-visited screen', desc: 'Create a wireframe or mockup for the screen users hit most often when there\'s no data.' },
      { id: 'ux5', phase: 'Action', xp: 20, title: 'Redesign the worst UX moment', desc: 'Pick the most error-prone user journey. Propose a redesign that eliminates the friction.' },
      { id: 'ux6', phase: 'Training', xp: 15, title: 'Learn how auth constraints affect UX', desc: 'Ask QD Dev AI: "What auth constraints should I consider when designing the onboarding flow?"' },
      { id: 'ux7', phase: 'Training', xp: 15, title: 'Understand role-based access from a UX lens', desc: 'Ask: "Which screens are role-restricted? How should the UI indicate access denied to users?"' },
      { id: 'ux8', phase: 'Build', xp: 30, title: 'Create a design system note for the dev team', desc: 'Document 3 UX decisions that should be consistent across all screens (loading, errors, empty states).' },
    ]
  },
  qa: {
    label: 'QA Engineer', icon: '🧪', color: '#f59e0b',
    tasks: [
      { id: 'qa1', phase: 'Analyse', xp: 10, title: 'Turn all security issues into test cases', desc: 'For each security task, write a one-line test description: "Should reject X when Y".' },
      { id: 'qa2', phase: 'Analyse', xp: 20, title: 'Find every unguarded route', desc: 'From the Controllers list, identify routes where auth_level is "public" that might need protection.' },
      { id: 'qa3', phase: 'Analyse', xp: 15, title: 'List all external service dependencies', desc: 'From DevOps tab, list every external service. For each: what breaks if it goes down?' },
      { id: 'qa4', phase: 'Action', xp: 30, title: 'Write a test reproducing the top vulnerability', desc: 'Write an automated test (Jest/Playwright/curl) that demonstrates the critical security issue.' },
      { id: 'qa5', phase: 'Action', xp: 25, title: 'Build a regression checklist', desc: 'Write 10 checks to run after every deployment based on the highest-risk areas identified.' },
      { id: 'qa6', phase: 'Training', xp: 15, title: 'Learn SQL injection via QD Dev AI', desc: 'Ask: "Show me how the SQL injection vulnerability in this codebase could be exploited, then the fix."' },
      { id: 'qa7', phase: 'Training', xp: 15, title: 'Understand the cron job risk surface', desc: 'Ask: "Which cron jobs could fail silently? What monitoring should we add?"' },
      { id: 'qa8', phase: 'Build', xp: 35, title: 'Complete test suite for one feature', desc: 'Pick the most critical feature. Write a full test suite: happy path, edge cases, error cases, security.' },
    ]
  },
}

const QD_LEVELS = [
  { name: 'Scout', minXp: 0, color: '#9ca3af', icon: '🔍' },
  { name: 'Explorer', minXp: 50, color: '#3b82f6', icon: '🗺️' },
  { name: 'Analyst', minXp: 120, color: '#22c55e', icon: '📊' },
  { name: 'Expert', minXp: 220, color: '#a855f7', icon: '⚡' },
  { name: 'Master', minXp: 350, color: '#f59e0b', icon: '🏆' },
]

// ── Helpers ───────────────────────────────────────────────────
function esc(s: unknown) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function tryJson<T>(s: unknown, fallback: T): T {
  try { return s ? JSON.parse(String(s)) as T : fallback } catch { return fallback }
}
function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000); if (s < 60) return s + 's'
  const m = Math.floor(s / 60); if (m < 60) return m + 'm ' + (s % 60) + 's'
  return Math.floor(m / 60) + 'h ' + m % 60 + 'm'
}
function relDate(raw: unknown): string {
  if (!raw) return ''
  try {
    const r = raw as { value?: string } | string
    const d = new Date((typeof r === 'object' && r?.value) ? r.value : String(r))
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return '' }
}
function sevColor(s?: string): string {
  return s === 'critical' ? '#ef4444' : s === 'high' ? '#f97316' : s === 'medium' ? '#f59e0b' : '#6b7280'
}
function catColor(c: string): string {
  return c === 'security' ? '#ef4444' : c === 'bug' ? '#f97316' : c === 'scalable' ? '#3b82f6' : '#a855f7'
}
function catIcon(c: string): string {
  return c === 'security' ? '🔒' : c === 'bug' ? '🐛' : c === 'scalable' ? '📈' : '🔬'
}

// ── Component ─────────────────────────────────────────────────
export default function ProjectReportPage({ session, projectId }: { session: SessionPayload; projectId: string }) {
  const router = useRouter()

  // Core
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [activeTab, setActiveTab] = useState('chat')

  // Tab data
  const [controllers, setControllers] = useState<Controller[]>([])
  const [schemaColumns, setSchema] = useState<SchemaCol[]>([])
  const [flowSteps, setFlows] = useState<FlowStep[]>([])
  const [devopsRows, setDevops] = useState<DevopsRow[]>([])
  const [aiAgents, setAgents] = useState<AiAgent[]>([])
  const [cronJobs, setCrons] = useState<CronJob[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [tabLoaded, setTabLoaded] = useState<Record<string, boolean>>({})

  // Chat
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Research task (chat → task)
  const [addingForIdx, setAddingForIdx] = useState<number | null>(null)
  const [researchTitle, setResearchTitle] = useState('')
  const [researchSaving, setResearchSaving] = useState(false)

  // Tasks tab
  const [taskFilter, setTaskFilter] = useState('all')
  const [timers, setTimers] = useState<Record<string, TimerState>>({})
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [empName, setEmpName] = useState('')
  const [workLog, setWorkLog] = useState<WorkLogEntry[]>([])
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  // QD Knowledge
  const [activeRole, setActiveRole] = useState<'pm' | 'dev' | 'ux' | 'qa'>('pm')
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [roleXp, setRoleXp] = useState<Record<string, number>>({ pm: 0, dev: 0, ux: 0, qa: 0 })

  // ── Load project ────────────────────────────────────────────
  useEffect(() => {
    setLoading(true); setLoadErr('')
    fetch('/api/admin/qd-dev?id=' + projectId)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setLoadErr(d.error); return }
        setProject(d)
      })
      .catch(e => setLoadErr(String(e)))
      .finally(() => setLoading(false))
  }, [projectId])

  // ── Tab loaders ──────────────────────────────────────────────
  const loadTab = useCallback(async (tab: string) => {
    if (tabLoaded[tab]) return
    try {
      const r = await fetch(`/api/admin/qd-dev?tab=${tab}&id=${projectId}`)
      const d = await r.json()
      if (tab === 'controllers') setControllers(d.controllers || [])
      if (tab === 'schema') setSchema(d.columns || [])
      if (tab === 'flows') setFlows(d.flows || [])
      if (tab === 'devops') setDevops(d.devops || [])
      if (tab === 'agents') { setAgents(d.agents || []); setCrons(d.crons || []) }
      if (tab === 'tasks') setTasks(d.tasks || [])
      setTabLoaded(p => ({ ...p, [tab]: true }))
    } catch { /* silent */ }
  }, [projectId, tabLoaded])

  useEffect(() => {
    if (activeTab === 'code') { loadTab('controllers'); loadTab('schema'); loadTab('flows'); loadTab('devops') }
    if (activeTab === 'agents') loadTab('agents')
    if (activeTab === 'tasks') loadTab('tasks')
  }, [activeTab, loadTab])

  // ── Chat scroll ──────────────────────────────────────────────
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── Build chat system prompt ─────────────────────────────────
  function buildChatSys(): string {
    if (!project) return 'You are a helpful AI assistant.'
    const stack = tryJson<string[]>(project.tech_stack, []).join(', ') || 'unknown'
    const team = tryJson<TeamMember[]>(project.team_members, []).map(m => `${m.name} (${m.role})`).join(', ') || 'unknown'
    return `You are QD Dev AI, an expert software architect with full knowledge of this specific project.

PROJECT: ${project.project_name}
TYPE: ${project.project_type} | ENV: ${project.environment || 'production'}
TECH STACK: ${stack}
TEAM: ${team}
FILES: ${project.total_files || 0} | TABLES: ${project.total_tables || 0} | LOC: ${(project.total_loc || 0).toLocaleString()}
HEALTH SCORE: ${project.health_score || 0}/100
${project.description ? 'DESCRIPTION: ' + project.description : ''}

FULL REPORT HTML:
${(project.report_html || '').substring(0, 60000)}

Answer concisely. Reference specific files, functions, and table names when relevant.
Format code with backticks. Use bullet points for lists. Be direct and technical.`
  }

  // ── Send chat message ────────────────────────────────────────
  async function sendChat() {
    if (!chatInput.trim() || chatBusy) return
    const userMsg: ChatMsg = { role: 'user', content: chatInput.trim() }
    setMessages(p => [...p, userMsg])
    setChatInput(''); setChatBusy(true)
    try {
      const history = [...messages, userMsg]
      const r = await fetch('/api/admin/qd-dev/ai-proxy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 4000,
          system: buildChatSys(),
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const d = await r.json()
      const text = d.content?.[0]?.text || d.error?.message || 'No response.'
      setMessages(p => [...p, { role: 'assistant', content: text }])
    } catch (e) {
      setMessages(p => [...p, { role: 'assistant', content: 'Error: ' + String(e) }])
    } finally { setChatBusy(false) }
  }

  // ── Save research task from chat ──────────────────────────────
  async function saveResearchTask(msgContent: string) {
    if (!researchTitle.trim() || !project) return
    setResearchSaving(true)
    try {
      await fetch('/api/admin/qd-dev/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.project_id,
          project_name: project.project_name,
          title: researchTitle.trim(),
          chat_context: msgContent.substring(0, 3000),
          generated_by_name: session.name || 'Team Member',
        }),
      })
      setAddingForIdx(null); setResearchTitle('')
      // Reload tasks tab
      setTabLoaded(p => ({ ...p, tasks: false }))
    } catch { /* silent */ }
    finally { setResearchSaving(false) }
  }

  // ── Timer logic ──────────────────────────────────────────────
  function startTimer(id: string) {
    if (activeTimerId && activeTimerId !== id) stopTimer(activeTimerId)
    setActiveTimerId(id)
    setTimers(p => ({ ...p, [id]: { totalMs: p[id]?.totalMs || 0, startedAt: Date.now(), done: false } }))
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimers(p => {
        const t = p[id]; if (!t || t.startedAt === null) return p
        return { ...p, [id]: { ...t, totalMs: t.totalMs + (Date.now() - t.startedAt), startedAt: Date.now() } }
      })
    }, 1000)
  }
  function stopTimer(id: string) {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setActiveTimerId(null)
    setTimers(p => {
      const t = p[id]; if (!t || t.startedAt === null) return p
      return { ...p, [id]: { ...t, totalMs: t.totalMs + (Date.now() - t.startedAt), startedAt: null } }
    })
  }
  function doneTimer(id: string, taskTitle: string) {
    stopTimer(id)
    setTimers(p => ({ ...p, [id]: { ...p[id], done: true } }))
    const ms = timers[id]?.totalMs || 0
    setWorkLog(p => [{ taskTitle, duration: fmtMs(ms), by: empName || 'Team Member', at: new Date().toLocaleTimeString() }, ...p])
  }
  function resetTimer(id: string) {
    stopTimer(id)
    setTimers(p => ({ ...p, [id]: { totalMs: 0, startedAt: null, done: false } }))
  }

  // ── QD Knowledge helpers ─────────────────────────────────────
  function toggleTask(taskId: string, xp: number) {
    const role = activeRole
    const isDone = done[taskId]
    setDone(p => ({ ...p, [taskId]: !isDone }))
    setRoleXp(p => ({ ...p, [role]: Math.max(0, (p[role] || 0) + (isDone ? -xp : xp)) }))
  }
  function getLevelForXp(xp: number) {
    let level = QD_LEVELS[0]
    for (const l of QD_LEVELS) { if (xp >= l.minXp) level = l }
    return level
  }
  function getNextLevel(xp: number) {
    for (const l of QD_LEVELS) { if (xp < l.minXp) return l }
    return null
  }

  function handleNav(key: string) {
    if (key.startsWith('bo-')) { router.push('/admin/backoffice?tab=' + key); return }
    router.push('/admin/' + key)
  }

  // ── Schema grouping ──────────────────────────────────────────
  const sqlTables = schemaColumns.filter(c => c.table_type !== 'mongodb')
  const mongoCols = schemaColumns.filter(c => c.table_type === 'mongodb')
  const sqlTableNames = [...new Set(sqlTables.map(c => c.table_name))]
  const mongoColNames = [...new Set(mongoCols.map(c => c.table_name))]
  const flowNames = [...new Set(flowSteps.map(s => s.flow_name))]

  // ── Task stats ────────────────────────────────────────────────
  const taskStats = {
    security: tasks.filter(t => t.category === 'security'),
    bug: tasks.filter(t => t.category === 'bug'),
    scalable: tasks.filter(t => t.category === 'scalable'),
    research: tasks.filter(t => t.category === 'research'),
    critical: tasks.filter(t => t.severity === 'critical').length,
    total: tasks.length,
  }
  const filteredTasks = taskFilter === 'all' ? tasks : tasks.filter(t => t.category === taskFilter)

  // ── Render guard ─────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text3)', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span>Loading project…</span>
    </div>
  )
  if (loadErr || !project) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text3)', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 32, opacity: .3 }}>⚠</div>
      <div>{loadErr || 'Project not found'}</div>
      <button onClick={() => router.push('/admin/qd-dev')} style={{ padding: '8px 18px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, cursor: 'pointer', color: 'var(--text2)' }}>← Back</button>
    </div>
  )

  const team = tryJson<TeamMember[]>(project.team_members, [])
  const stack = tryJson<string[]>(project.tech_stack, [])
  const hs = project.health_score || 0
  const hsColor = hs >= 80 ? '#22c55e' : hs >= 60 ? '#f59e0b' : hs >= 40 ? '#f97316' : '#ef4444'
  const folderTree = tryJson<string[]>(project.folder_structure, [])

  const TABS = [
    { id: 'chat', label: '🤖 QD Dev AI' },
    { id: 'overview', label: '📋 Overview' },
    { id: 'code', label: '🗄 Code & Database' },
    { id: 'agents', label: '🤖 AI Agents & Crons' },
    { id: 'knowledge', label: '🎓 QD Knowledge' },
    { id: 'tasks', label: '✅ Tasks' },
  ]

  return (
    <>
      <style>{`
        .rp-tab{padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid transparent;cursor:pointer;background:transparent;color:var(--text3);transition:all .15s;white-space:nowrap}
        .rp-tab.on{background:var(--bg2);border-color:var(--border2);color:var(--text)}
        .rp-tab:hover:not(.on){color:var(--text2)}
        .rp-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:14px}
        .rp-card-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:12px;display:flex;align-items:center;gap:8px}
        .rp-tbl{width:100%;border-collapse:collapse;font-size:11px}
        .rp-tbl th{padding:6px 10px;background:var(--bg3);text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text4);border-bottom:1px solid var(--border)}
        .rp-tbl td{padding:7px 10px;border-bottom:1px solid var(--border);color:var(--text2);vertical-align:top;font-family:var(--font-mono);font-size:11px}
        .rp-tbl tr:last-child td{border-bottom:none}
        .rp-badge{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:600;font-family:var(--font-mono)}
        .rp-stat-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:18px}
        .rp-stat{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;position:relative;overflow:hidden}
        .rp-stat-top{position:absolute;top:0;left:0;right:0;height:2px}
        .rp-stat-n{font-size:20px;font-weight:700;font-family:var(--font-mono);line-height:1}
        .rp-stat-l{font-size:10px;color:var(--text3);margin-top:5px;font-weight:500}
        .rp-chip{display:inline-block;padding:3px 9px;border-radius:12px;font-size:10px;background:var(--bg3);border:1px solid var(--border);color:var(--text3);margin:2px}
        .rp-chat-wrap{display:flex;flex-direction:column;height:calc(100vh - 280px);min-height:400px}
        .rp-chat-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;background:var(--bg3);border-radius:10px;border:1px solid var(--border)}
        .rp-msg-user{align-self:flex-end;max-width:80%;background:linear-gradient(135deg,rgba(245,158,11,.2),rgba(239,68,68,.2));border:1px solid rgba(245,158,11,.3);border-radius:12px 12px 2px 12px;padding:10px 14px;font-size:12px;line-height:1.7}
        .rp-msg-ai{align-self:flex-start;max-width:90%;background:var(--bg2);border:1px solid var(--border);border-radius:2px 12px 12px 12px;padding:10px 14px;font-size:12px;line-height:1.7;white-space:pre-wrap}
        .rp-chat-bar{display:flex;gap:8px;margin-top:10px}
        .rp-chat-bar input{flex:1;padding:10px 14px;background:var(--bg2);border:1px solid var(--border2);border-radius:10px;font-size:12px;color:var(--text);outline:none;font-family:var(--font-sans)}
        .rp-chat-bar input:focus{border-color:#f59e0b}
        .rp-send-btn{padding:10px 18px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer}
        .rp-send-btn:disabled{opacity:.5;cursor:not-allowed}
        .rp-task-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:10px;transition:all .15s}
        .rp-task-head{display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer}
        .rp-task-head:hover{background:var(--bg3)}
        .rp-task-body{padding:0 14px 14px;border-top:1px solid var(--border);font-size:12px;line-height:1.7}
        .rp-timer-bar{display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--bg3);border-top:1px solid var(--border);font-size:11px}
        .rp-timer-display{font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--text);min-width:60px}
        .rp-tb{padding:5px 12px;border-radius:7px;border:none;font-size:11px;font-weight:600;cursor:pointer}
        .rp-tree{font-family:var(--font-mono);font-size:11px;line-height:1.8;color:var(--text2);max-height:300px;overflow-y:auto;background:var(--bg3);border-radius:8px;padding:12px;border:1px solid var(--border)}
        .rp-kn-task{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);margin-bottom:8px;cursor:pointer;transition:all .15s}
        .rp-kn-task:hover{background:var(--bg3)}
        .rp-kn-task.done{opacity:.55;background:var(--bg3)}
        .rp-kn-check{width:20px;height:20px;border-radius:6px;border:2px solid var(--border2);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;margin-top:1px;transition:all .15s}
        .rp-kn-task.done .rp-kn-check{background:#22c55e;border-color:#22c55e}
        .rp-cron-chip{font-family:var(--font-mono);font-size:10px;padding:2px 8px;border-radius:6px;background:var(--bg3);border:1px solid var(--border);color:var(--text3)}
        .rp-agent-card{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:8px}
        .rp-sec-head{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin:20px 0 10px;display:flex;align-items:center;gap:8px}
        @media(max-width:700px){.rp-stat-grid{grid-template-columns:repeat(2,1fr)}.rp-tab{font-size:11px;padding:6px 10px}}
      `}</style>

      <PageShell panel="admin" session={session} activeKey="qd-dev" onNav={handleNav}
        title="Admin Dashboard" subtitle={project.project_name}
        topRight={
          <button onClick={() => router.push('/admin/qd-dev')} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, cursor: 'pointer', color: 'var(--text2)' }}>
            ← All Projects
          </button>
        }
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: 6 }}>
            {project.project_type?.replace(/_/g, ' ')?.toUpperCase()} · {project.environment?.toUpperCase() || 'PRODUCTION'}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.3px', margin: '0 0 4px' }}>{project.project_name}</h1>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>{project.description || 'No description provided.'}</div>
            </div>
            {hs > 0 && (
              <div style={{ textAlign: 'center', flexShrink: 0, padding: '8px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-mono)', color: hsColor, lineHeight: 1 }}>{hs}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginTop: 3 }}>Health Score</div>
                <div style={{ fontSize: 9, color: hsColor, marginTop: 1 }}>{hs >= 80 ? 'Healthy' : hs >= 60 ? 'Fair' : hs >= 40 ? 'At Risk' : 'Critical'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 10, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} className={`rp-tab${activeTab === t.id ? ' on' : ''}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ TAB 1: QD Dev AI Chat ════════════════════════════ */}
        {activeTab === 'chat' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14, alignItems: 'start' }}>
              {/* Chat */}
              <div className="rp-chat-wrap">
                <div className="rp-chat-msgs">
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text4)' }}>
                      <div style={{ fontSize: 28, marginBottom: 10 }}>🤖</div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Ask anything about {project.project_name}</div>
                      <div style={{ fontSize: 11 }}>I have full context of the codebase, schema, and architecture.</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 16 }}>
                        {['What are the top security risks?', 'Explain the database schema', 'How does authentication work?', 'Which routes are unprotected?'].map(q => (
                          <button key={q} onClick={() => { setChatInput(q) }} style={{ padding: '6px 12px', border: '1px solid var(--border2)', borderRadius: 8, background: 'var(--bg2)', fontSize: 11, cursor: 'pointer', color: 'var(--text2)' }}>
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i}>
                      <div className={m.role === 'user' ? 'rp-msg-user' : 'rp-msg-ai'}>{m.content}</div>
                      {m.role === 'assistant' && (
                        <div style={{ marginTop: 4, paddingLeft: 4 }}>
                          {addingForIdx === i ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', marginTop: 4 }}>
                              <input value={researchTitle} onChange={e => setResearchTitle(e.target.value)} placeholder="Research task title…"
                                style={{ flex: 1, padding: '5px 9px', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 11, background: 'var(--bg3)', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-sans)' }}
                                autoFocus onKeyDown={e => { if (e.key === 'Enter') saveResearchTask(m.content); if (e.key === 'Escape') { setAddingForIdx(null); setResearchTitle('') } }}
                              />
                              <button disabled={researchSaving || !researchTitle.trim()} onClick={() => saveResearchTask(m.content)}
                                style={{ padding: '5px 10px', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                                {researchSaving ? 'Saving…' : 'Save'}
                              </button>
                              <button onClick={() => { setAddingForIdx(null); setResearchTitle('') }}
                                style={{ padding: '5px 8px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: 'var(--text3)' }}>✕</button>
                            </div>
                          ) : (
                            <button onClick={() => { setAddingForIdx(i); setResearchTitle('') }}
                              style={{ padding: '3px 9px', border: '1px solid rgba(168,85,247,.3)', background: 'rgba(168,85,247,.1)', borderRadius: 6, fontSize: 10, cursor: 'pointer', color: '#a855f7', fontWeight: 600 }}>
                              + Add as Research Task
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {chatBusy && <div className="rp-msg-ai" style={{ color: 'var(--text3)' }}>Thinking…</div>}
                  <div ref={chatEndRef} />
                </div>
                <div className="rp-chat-bar">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                    placeholder={`Ask about ${project.project_name}…`} />
                  <button className="rp-send-btn" disabled={chatBusy || !chatInput.trim()} onClick={sendChat}>Send →</button>
                </div>
              </div>

              {/* Sidebar: what AI knows */}
              <div>
                <div className="rp-card">
                  <div className="rp-card-title">📚 What AI Knows</div>
                  {[
                    { label: 'Report HTML', val: project.report_html ? 'Full report loaded' : 'No report yet', ok: !!project.report_html },
                    { label: 'Tech Stack', val: stack.length ? stack.slice(0, 4).join(', ') : 'Not set', ok: stack.length > 0 },
                    { label: 'Team', val: team.length ? team.length + ' members' : 'Not set', ok: team.length > 0 },
                    { label: 'Files scanned', val: (project.total_files || 0) + ' files', ok: (project.total_files || 0) > 0 },
                    { label: 'Lines of code', val: (project.total_loc || 0).toLocaleString() + ' LOC', ok: (project.total_loc || 0) > 0 },
                    { label: 'Schema tables', val: (project.total_tables || 0) + ' tables', ok: (project.total_tables || 0) > 0 },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                      <span style={{ color: 'var(--text3)' }}>{r.label}</span>
                      <span style={{ color: r.ok ? 'var(--text)' : 'var(--text4)', fontWeight: r.ok ? 500 : 400 }}>{r.val}</span>
                    </div>
                  ))}
                </div>
                <div className="rp-card">
                  <div className="rp-card-title">💡 Suggested Questions</div>
                  {['What\'s the fastest fix to improve the health score?', 'Which APIs are public and should be protected?', 'Explain the architecture in plain English.', 'What would a new developer need to know first?', 'Where is caching missing?', 'Which cron jobs could fail silently?'].map(q => (
                    <button key={q} onClick={() => { setChatInput(q) }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 9px', margin: '0 0 5px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg3)', fontSize: 11, cursor: 'pointer', color: 'var(--text2)', lineHeight: 1.5 }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB 2: Project Overview ══════════════════════════ */}
        {activeTab === 'overview' && (
          <div>
            {/* Stat cards */}
            <div className="rp-stat-grid">
              {[
                { label: 'Health Score', val: hs || 'N/A', color: hsColor, sub: hs >= 80 ? 'Healthy' : hs >= 60 ? 'Fair' : hs >= 40 ? 'At Risk' : 'Critical' },
                { label: 'Critical Tasks', val: tasks.length ? taskStats.critical : (project.health_score !== undefined ? taskStats.critical : '—'), color: '#ef4444', sub: 'open issues' },
                { label: 'Files Scanned', val: project.total_files || 0, color: '#3b82f6', sub: 'code files' },
                { label: 'Lines of Code', val: project.total_loc ? (project.total_loc > 1000 ? Math.round(project.total_loc / 1000) + 'k' : project.total_loc) : '—', color: '#22c55e', sub: 'total LOC' },
                { label: 'Team Members', val: team.length || '—', color: '#a855f7', sub: 'contributors' },
              ].map(s => (
                <div key={s.label} className="rp-stat">
                  <div className="rp-stat-top" style={{ background: s.color }} />
                  <div className="rp-stat-n" style={{ color: s.color }}>{String(s.val)}</div>
                  <div className="rp-stat-l">{s.label}</div>
                  {s.sub && <div style={{ fontSize: 9, color: 'var(--text4)', marginTop: 3 }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Left */}
              <div>
                {project.description && (
                  <div className="rp-card">
                    <div className="rp-card-title">📝 Project Summary</div>
                    <p style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text2)', margin: 0 }}>{project.description}</p>
                    {project.analysis_focus && <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8, fontSize: 11, color: 'var(--text3)', borderLeft: '3px solid #f59e0b' }}><strong>Analysis Focus:</strong> {project.analysis_focus}</div>}
                  </div>
                )}
                <div className="rp-card">
                  <div className="rp-card-title">⚙️ Tech Stack</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: stack.length ? 10 : 0 }}>
                    {stack.map(t => <span key={t} className="rp-chip">{t}</span>)}
                    {stack.length === 0 && <span style={{ fontSize: 11, color: 'var(--text4)' }}>No tech stack recorded.</span>}
                  </div>
                  {project.repo_url && <div style={{ fontSize: 11, marginTop: 8 }}><span style={{ color: 'var(--text4)' }}>Repo: </span><a href={project.repo_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>{project.repo_url}</a></div>}
                  {project.live_url && <div style={{ fontSize: 11, marginTop: 4 }}><span style={{ color: 'var(--text4)' }}>Live: </span><a href={project.live_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>{project.live_url}</a></div>}
                </div>
              </div>

              {/* Right */}
              <div>
                <div className="rp-card">
                  <div className="rp-card-title">👥 Team</div>
                  {team.length === 0
                    ? <span style={{ fontSize: 11, color: 'var(--text4)' }}>No team recorded.</span>
                    : team.map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                          {(m.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{m.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{m.role}</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
                <div className="rp-card">
                  <div className="rp-card-title">📋 Project Details</div>
                  {[
                    { label: 'Environment', val: project.environment || 'production' },
                    { label: 'Priority', val: project.priority || 'full' },
                    { label: 'Depth', val: project.depth || 'standard' },
                    { label: 'Analysed by', val: project.created_by || 'admin' },
                    { label: 'Last updated', val: relDate(project.last_analysed) || '—' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                      <span style={{ color: 'var(--text3)' }}>{r.label}</span>
                      <span style={{ fontWeight: 500 }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Full report HTML */}
            {project.report_html && (
              <div className="rp-card" style={{ marginTop: 14 }}>
                <div className="rp-card-title">📄 Full AI Report (Architecture Tabs)</div>
                <style>{`
                  .qd-rpt .wrap,.qd-rpt .card{background:var(--bg3);border-radius:10px;border:1px solid var(--border);padding:14px}
                  .qd-rpt .tbl{width:100%;border-collapse:collapse;font-size:11px}
                  .qd-rpt .tbl th{background:var(--bg2);padding:6px 10px;text-align:left;font-weight:700;font-size:10px;border-bottom:1px solid var(--border)}
                  .qd-rpt .tbl td{padding:6px 10px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px}
                  .qd-rpt .stat-grid{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px}
                  .qd-rpt .stat{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;min-width:90px;text-align:center}
                  .qd-rpt .stat-n{font-size:18px;font-weight:700}
                  .qd-rpt .stat-l{font-size:10px;color:var(--text3)}
                  .qd-rpt .tabs{display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;flex-wrap:wrap}
                  .qd-rpt .tab{padding:6px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);cursor:pointer;font-size:12px;font-weight:500;color:var(--text3)}
                  .qd-rpt .tab.on{background:var(--text);color:var(--bg);border-color:var(--text)}
                  .qd-rpt .sec{display:none;font-size:12px;line-height:1.8;color:var(--text2)}
                  .qd-rpt .sec.on{display:block}
                  .qd-rpt .badge{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:600}
                  .qd-rpt .b-red{background:rgba(239,68,68,.15);color:#ef4444}
                  .qd-rpt .b-green{background:rgba(34,197,94,.15);color:#22c55e}
                  .qd-rpt .b-amber{background:rgba(245,158,11,.15);color:#f59e0b}
                  .qd-rpt .b-blue{background:rgba(59,130,246,.15);color:#3b82f6}
                  .qd-rpt .b-purple{background:rgba(168,85,247,.15);color:#a855f7}
                  .qd-rpt .b-teal{background:rgba(20,184,166,.15);color:#14b8a6}
                  .qd-rpt .b-gray{background:rgba(107,114,128,.15);color:#6b7280}
                  .qd-rpt .note{padding:10px 14px;border-radius:8px;margin:8px 0;font-size:12px}
                  .qd-rpt .note.warn{background:rgba(245,158,11,.1);border-left:3px solid #f59e0b}
                  .qd-rpt .note.ok{background:rgba(34,197,94,.1);border-left:3px solid #22c55e}
                  .qd-rpt .note.err{background:rgba(239,68,68,.1);border-left:3px solid #ef4444}
                  .qd-rpt .note.info{background:rgba(59,130,246,.1);border-left:3px solid #3b82f6}
                  .qd-rpt .card-title{font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text)}
                  .qd-rpt .health-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
                  .qd-rpt .health-card{padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--bg2)}
                `}</style>
                <div className="qd-rpt" dangerouslySetInnerHTML={{
                  __html: project.report_html + (
                    `<script>function showTab(n,el){document.querySelectorAll('.qd-rpt .sec').forEach(s=>s.classList.remove('on'));document.querySelectorAll('.qd-rpt .tab').forEach(b=>b.classList.remove('on'));var s=document.getElementById('s-'+n);if(s)s.classList.add('on');el.classList.add('on');}<\/script>`
                  )
                }} />
              </div>
            )}
          </div>
        )}

        {/* ══ TAB 3: Code & Database ═══════════════════════════ */}
        {activeTab === 'code' && (
          <div>
            {/* Folder tree */}
            {folderTree.length > 0 && (
              <div className="rp-card">
                <div className="rp-card-title">📁 File Tree ({folderTree.length} files)</div>
                <div className="rp-tree">
                  {folderTree.map(f => {
                    const depth = (f.match(/\//g) || []).length
                    const parts = f.split('/')
                    const name = parts[parts.length - 1]
                    const ext = name.split('.').pop() || ''
                    const extColor: Record<string, string> = { ts: '#3b82f6', tsx: '#3b82f6', js: '#f59e0b', jsx: '#f59e0b', json: '#22c55e', css: '#a855f7', php: '#6366f1', md: '#6b7280', sql: '#14b8a6', yml: '#f97316', yaml: '#f97316' }
                    return (
                      <div key={f} style={{ paddingLeft: depth * 14, color: extColor[ext] || 'var(--text2)' }}>
                        {'  '.repeat(depth)}{depth > 0 ? '└ ' : ''}{name}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* API Controllers */}
            {controllers.length > 0 && (
              <div className="rp-card">
                <div className="rp-card-title">⚡ API Routes / Controllers ({controllers.length})</div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="rp-tbl">
                    <thead><tr><th>Method</th><th>File / Function</th><th>Auth</th><th>Purpose</th><th>DB Read</th><th>Redis</th></tr></thead>
                    <tbody>
                      {controllers.map((c, i) => (
                        <tr key={i}>
                          <td><span className="rp-badge" style={{ background: c.http_method === 'GET' ? 'rgba(34,197,94,.15)' : 'rgba(245,158,11,.15)', color: c.http_method === 'GET' ? '#22c55e' : '#f59e0b' }}>{c.http_method}</span></td>
                          <td>{c.file_path.split('/').slice(-2).join('/')}<br /><span style={{ color: 'var(--text3)', fontSize: 10 }}>{c.method_name}</span></td>
                          <td><span className="rp-badge" style={{ background: c.auth_level === 'admin' ? 'rgba(239,68,68,.1)' : c.auth_level === 'public' ? 'rgba(107,114,128,.1)' : 'rgba(245,158,11,.1)', color: c.auth_level === 'admin' ? '#ef4444' : c.auth_level === 'public' ? '#6b7280' : '#f59e0b' }}>{c.auth_level}</span></td>
                          <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>{c.purpose || '—'}</td>
                          <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.db_tables_read || '—'}</td>
                          <td>{c.uses_redis ? '✓' : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SQL Tables */}
            {sqlTableNames.length > 0 && (
              <div className="rp-card">
                <div className="rp-card-title">🗄 SQL / BigQuery Tables ({sqlTableNames.length} tables · {sqlTables.length} columns)</div>
                {sqlTableNames.map(tn => {
                  const cols = sqlTables.filter(c => c.table_name === tn)
                  const hasRisk = cols.some(c => c.is_security_risk)
                  return (
                    <div key={tn} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{tn}</span>
                        <span className="rp-badge" style={{ background: 'rgba(59,130,246,.1)', color: '#3b82f6' }}>{cols[0]?.table_type || 'mysql'}</span>
                        {hasRisk && <span className="rp-badge" style={{ background: 'rgba(239,68,68,.1)', color: '#ef4444' }}>⚠ sensitive</span>}
                        <span style={{ fontSize: 10, color: 'var(--text4)' }}>{cols.length} cols</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="rp-tbl" style={{ marginBottom: 0 }}>
                          <thead><tr><th>Column</th><th>Type</th><th>Nullable</th><th>PK</th><th>Risk</th></tr></thead>
                          <tbody>
                            {cols.map((c, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: c.is_pk ? 700 : 400, color: c.is_security_risk ? '#f97316' : undefined }}>{c.column_name}{c.is_pk ? ' 🔑' : ''}</td>
                                <td>{c.data_type}</td>
                                <td>{c.is_nullable ? 'YES' : ''}</td>
                                <td>{c.is_pk ? '✓' : ''}</td>
                                <td>{c.is_security_risk ? <span style={{ color: '#f97316', fontSize: 10 }}>⚠</span> : ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* MongoDB Collections */}
            {mongoColNames.length > 0 && (
              <div className="rp-card">
                <div className="rp-card-title">🍃 MongoDB Collections ({mongoColNames.length} collections · {mongoCols.length} fields)</div>
                {mongoColNames.map(cn => {
                  const cols = mongoCols.filter(c => c.table_name === cn)
                  const docCount = cols[0]?.doc_count
                  return (
                    <div key={cn} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{cn}</span>
                        <span className="rp-badge" style={{ background: 'rgba(34,197,94,.1)', color: '#22c55e' }}>mongodb</span>
                        {docCount ? <span style={{ fontSize: 10, color: 'var(--text4)' }}>~{docCount.toLocaleString()} docs</span> : null}
                        <span style={{ fontSize: 10, color: 'var(--text4)' }}>{cols.length} fields</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {cols.map((c, i) => (
                          <span key={i} className="rp-badge" style={{ background: c.is_pk ? 'rgba(245,158,11,.15)' : c.is_security_risk ? 'rgba(239,68,68,.1)' : 'rgba(107,114,128,.1)', color: c.is_pk ? '#f59e0b' : c.is_security_risk ? '#ef4444' : '#6b7280', fontSize: 10 }}>
                            {c.column_name}<span style={{ opacity: .6, marginLeft: 3 }}>{c.data_type}</span>{c.is_pk ? ' 🔑' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Data Flows */}
            {flowNames.length > 0 && (
              <div className="rp-card">
                <div className="rp-card-title">🔄 Key Execution Flows</div>
                {flowNames.map(fn => {
                  const steps = flowSteps.filter(s => s.flow_name === fn).sort((a, b) => a.step_number - b.step_number)
                  return (
                    <div key={fn} style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>{fn}</div>
                      {steps.map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{s.step_number}</div>
                          <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                            <span style={{ fontWeight: 600, color: '#f59e0b' }}>{s.step_actor}</span>
                            <span style={{ color: 'var(--text3)' }}> → </span>
                            {s.step_action}
                            {s.step_function && <span style={{ fontFamily: 'var(--font-mono)', color: '#3b82f6', marginLeft: 6, fontSize: 10 }}>{s.step_function}()</span>}
                            {s.step_db_table && <span style={{ color: 'var(--text4)', marginLeft: 6, fontSize: 10 }}>[{s.step_db_operation || 'query'} {s.step_db_table}]</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            {/* DevOps */}
            {devopsRows.length > 0 && (
              <div className="rp-card">
                <div className="rp-card-title">🔧 DevOps & Environment Variables</div>
                <table className="rp-tbl">
                  <thead><tr><th>Component</th><th>Risk</th><th>Impact if Down</th><th>Env Var</th><th>Sensitive</th></tr></thead>
                  <tbody>
                    {devopsRows.map((d, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500, fontFamily: 'var(--font-sans)' }}>{d.component}</td>
                        <td><span className="rp-badge" style={{ background: `rgba(${d.risk_level === 'critical' ? '239,68,68' : d.risk_level === 'high' ? '249,115,22' : d.risk_level === 'medium' ? '245,158,11' : '107,114,128'},.15)`, color: d.risk_level === 'critical' ? '#ef4444' : d.risk_level === 'high' ? '#f97316' : d.risk_level === 'medium' ? '#f59e0b' : '#6b7280' }}>{d.risk_level}</span></td>
                        <td style={{ fontSize: 10, fontFamily: 'var(--font-sans)' }}>{d.failure_impact || '—'}</td>
                        <td>{d.env_var_name || '—'}</td>
                        <td>{d.env_var_sensitive ? '🔒' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!tabLoaded['controllers'] && !tabLoaded['schema'] && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 10px' }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                Loading data from BigQuery…
              </div>
            )}
          </div>
        )}

        {/* ══ TAB 4: AI Agents & Crons ═════════════════════════ */}
        {activeTab === 'agents' && (
          <div>
            {/* AI Agents */}
            <div className="rp-card">
              <div className="rp-card-title">🤖 AI / LLM Integrations ({aiAgents.length})</div>
              {aiAgents.length === 0 ? (
                tabLoaded['agents']
                  ? <div style={{ fontSize: 12, color: 'var(--text4)', padding: '10px 0' }}>No AI agent integrations detected in this codebase. If there are any, they may not have been captured — try re-running the analysis with the AI focus set to "AI Agents".</div>
                  : <div style={{ fontSize: 12, color: 'var(--text4)' }}>Loading…</div>
              ) : (
                aiAgents.map(a => (
                  <div key={a.agent_id} className="rp-agent-card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{a.file_path.split('/').slice(-2).join('/')}</div>
                        <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{a.file_path}</div>
                      </div>
                      <span className="rp-badge" style={{ background: 'rgba(59,130,246,.15)', color: '#3b82f6' }}>{a.provider}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      <span className="rp-badge" style={{ background: 'rgba(168,85,247,.1)', color: '#a855f7' }}>{a.agent_type}</span>
                      {a.model && <span className="rp-badge" style={{ background: 'rgba(107,114,128,.1)', color: '#6b7280' }}>{a.model}</span>}
                      <span className="rp-badge" style={{ background: 'rgba(245,158,11,.1)', color: '#f59e0b' }}>{a.call_pattern}</span>
                      {a.max_tokens && <span className="rp-badge" style={{ background: 'rgba(34,197,94,.1)', color: '#22c55e' }}>{a.max_tokens.toLocaleString()} tokens</span>}
                      {a.has_system_prompt && <span className="rp-badge" style={{ background: 'rgba(20,184,166,.1)', color: '#14b8a6' }}>sys prompt ✓</span>}
                      {a.has_tools && <span className="rp-badge" style={{ background: 'rgba(239,68,68,.1)', color: '#ef4444' }}>tools ✓</span>}
                    </div>
                    {a.purpose && <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>{a.purpose}</div>}
                  </div>
                ))
              )}
            </div>

            {/* Cron Jobs */}
            <div className="rp-card">
              <div className="rp-card-title">⏰ Cron Jobs & Scheduled Tasks ({cronJobs.length})</div>
              {cronJobs.length === 0 ? (
                tabLoaded['agents']
                  ? <div style={{ fontSize: 12, color: 'var(--text4)', padding: '10px 0' }}>No cron jobs detected. Vercel.json crons, node-cron, Bull/BullMQ, and GitHub Actions schedules are all checked.</div>
                  : <div style={{ fontSize: 12, color: 'var(--text4)' }}>Loading…</div>
              ) : (
                <table className="rp-tbl">
                  <thead><tr><th>Source</th><th>Schedule</th><th>Human</th><th>Path / Description</th><th>Max Duration</th></tr></thead>
                  <tbody>
                    {cronJobs.map(c => (
                      <tr key={c.cron_id}>
                        <td><span className="rp-cron-chip">{c.source}</span></td>
                        <td><code style={{ fontSize: 11 }}>{c.schedule}</code></td>
                        <td style={{ fontFamily: 'var(--font-sans)', color: 'var(--text2)' }}>{c.schedule_human}</td>
                        <td style={{ fontFamily: 'var(--font-sans)', fontSize: 11 }}>
                          {c.path && <div style={{ color: '#3b82f6', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{c.path}</div>}
                          {c.description && <div style={{ color: 'var(--text3)' }}>{c.description}</div>}
                        </td>
                        <td>{c.max_duration ? c.max_duration + 's' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB 5: QD Knowledge ═════════════════════════════ */}
        {activeTab === 'knowledge' && (() => {
          const role = QD_ROLES[activeRole]
          const xp = roleXp[activeRole] || 0
          const level = getLevelForXp(xp)
          const next = getNextLevel(xp)
          const pct = next ? Math.round((xp - level.minXp) / (next.minXp - level.minXp) * 100) : 100
          const phases = [...new Set(role.tasks.map(t => t.phase))]

          return (
            <div>
              {/* Role selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {(Object.keys(QD_ROLES) as Array<keyof typeof QD_ROLES>).map(r => {
                  const rd = QD_ROLES[r]
                  const rxp = roleXp[r] || 0
                  const rlvl = getLevelForXp(rxp)
                  return (
                    <button key={r} onClick={() => setActiveRole(r as 'pm' | 'dev' | 'ux' | 'qa')}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: `2px solid ${activeRole === r ? rd.color : 'var(--border)'}`, background: activeRole === r ? `rgba(${rd.color === '#3b82f6' ? '59,130,246' : rd.color === '#22c55e' ? '34,197,94' : rd.color === '#a855f7' ? '168,85,247' : '245,158,11'},.12)` : 'var(--bg2)', cursor: 'pointer', transition: 'all .15s' }}>
                      <span style={{ fontSize: 18 }}>{rd.icon}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: activeRole === r ? rd.color : 'var(--text)' }}>{rd.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text4)' }}>{rlvl.icon} {rlvl.name} · {rxp} XP</div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Level bar */}
              <div className="rp-card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 28 }}>{level.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: level.color }}>{level.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>{role.label}</span>
                      </div>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>{xp} XP{next ? ` / ${next.minXp}` : ' — MAX'}</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: level.color, borderRadius: 4, transition: 'width .5s' }} />
                    </div>
                    {next && <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 4 }}>{next.minXp - xp} XP to {next.icon} {next.name}</div>}
                  </div>
                </div>
              </div>

              {/* Tasks by phase */}
              {phases.map(phase => (
                <div key={phase} style={{ marginBottom: 16 }}>
                  <div className="rp-sec-head">
                    <span>{{ Analyse: '🔍', Action: '⚡', Training: '📚', Build: '🏗️' }[phase] || '📌'}</span>
                    <span>{phase}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 400 }}>{role.tasks.filter(t => t.phase === phase && done[t.id]).length}/{role.tasks.filter(t => t.phase === phase).length} done</span>
                  </div>
                  {role.tasks.filter(t => t.phase === phase).map(t => (
                    <div key={t.id} className={`rp-kn-task${done[t.id] ? ' done' : ''}`} onClick={() => toggleTask(t.id, t.xp)}>
                      <div className="rp-kn-check">{done[t.id] ? '✓' : ''}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, textDecoration: done[t.id] ? 'line-through' : undefined }}>{t.title}</span>
                          <span className="rp-badge" style={{ background: `rgba(${level.color === '#3b82f6' ? '59,130,246' : level.color === '#22c55e' ? '34,197,94' : level.color === '#a855f7' ? '168,85,247' : '245,158,11'},.15)`, color: role.color, fontSize: 9 }}>+{t.xp} XP</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>{t.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        })()}

        {/* ══ TAB 6: Tasks ════════════════════════════════════ */}
        {activeTab === 'tasks' && (
          <div>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'All Tasks', val: taskStats.total, color: 'var(--text)', filter: 'all' },
                { label: '🔒 Security', val: taskStats.security.length, color: '#ef4444', filter: 'security' },
                { label: '🐛 Bugs', val: taskStats.bug.length, color: '#f97316', filter: 'bug' },
                { label: '📈 Scalable', val: taskStats.scalable.length, color: '#3b82f6', filter: 'scalable' },
                { label: '🔬 Research', val: taskStats.research.length, color: '#a855f7', filter: 'research' },
              ].map(s => (
                <div key={s.filter} onClick={() => setTaskFilter(s.filter)} className="rp-stat" style={{ cursor: 'pointer', border: `1px solid ${taskFilter === s.filter ? s.color : 'var(--border)'}`, opacity: taskFilter !== 'all' && taskFilter !== s.filter ? .7 : 1, transition: 'all .15s' }}>
                  <div className="rp-stat-top" style={{ background: s.color }} />
                  <div className="rp-stat-n" style={{ color: s.color }}>{s.val}</div>
                  <div className="rp-stat-l">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Who am I */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>Working as:</label>
              <input value={empName} onChange={e => setEmpName(e.target.value)} placeholder="Your name"
                style={{ flex: 1, maxWidth: 220, padding: '6px 10px', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 12, background: 'var(--bg2)', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-sans)' }} />
              <span style={{ fontSize: 11, color: 'var(--text4)' }}>(shown in work log)</span>
            </div>

            {/* Task list */}
            {!tabLoaded['tasks'] ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 10px' }} />
                Loading tasks from BigQuery…
              </div>
            ) : filteredTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>No {taskFilter === 'all' ? '' : taskFilter} tasks found. {taskFilter !== 'all' && <button onClick={() => setTaskFilter('all')} style={{ color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Show all</button>}</div>
            ) : (
              filteredTasks.map(t => {
                const timer = timers[t.task_id] || { totalMs: 0, startedAt: null, done: false }
                const isActive = activeTimerId === t.task_id
                const elapsed = isActive ? timer.totalMs + (Date.now() - timer.startedAt!) : timer.totalMs
                const isExpanded = expandedTask === t.task_id
                const fixSteps = tryJson<string[]>(t.fix_steps || 'null', [])

                return (
                  <div key={t.task_id} className="rp-task-card" style={{ borderLeft: `3px solid ${timer.done ? '#22c55e' : catColor(t.category)}`, opacity: timer.done ? .6 : 1 }}>
                    <div className="rp-task-head" onClick={() => setExpandedTask(isExpanded ? null : t.task_id)}>
                      <span style={{ fontSize: 16 }}>{catIcon(t.category)}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>{t.title}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                          <span className="rp-badge" style={{ background: `rgba(${t.category === 'security' ? '239,68,68' : t.category === 'bug' ? '249,115,22' : t.category === 'scalable' ? '59,130,246' : '168,85,247'},.15)`, color: catColor(t.category) }}>{t.category}</span>
                          {t.severity && <span className="rp-badge" style={{ background: `rgba(${t.severity === 'critical' ? '239,68,68' : t.severity === 'high' ? '249,115,22' : t.severity === 'medium' ? '245,158,11' : '107,114,128'},.15)`, color: sevColor(t.severity) }}>{t.severity}</span>}
                          {t.owasp_category && <span className="rp-badge" style={{ background: 'rgba(239,68,68,.1)', color: '#ef4444', fontSize: 9 }}>{t.owasp_category}</span>}
                          {t.effort_minutes && <span style={{ fontSize: 10, color: 'var(--text4)' }}>~{t.effort_minutes}min</span>}
                          {t.assigned_to && <span style={{ fontSize: 10, color: 'var(--text4)' }}>→ {t.assigned_to}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {t.generated_by === 'team_member' && <span className="rp-badge" style={{ background: 'rgba(168,85,247,.15)', color: '#a855f7', fontSize: 9 }}>team task</span>}
                        <span style={{ fontSize: 12, color: 'var(--text4)' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="rp-task-body" style={{ paddingTop: 12 }}>
                        {t.file_path && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#3b82f6', marginBottom: 8, padding: '4px 8px', background: 'var(--bg3)', borderRadius: 6, display: 'inline-block' }}>{t.file_path}</div>}
                        {t.description && <p style={{ margin: '0 0 10px', color: 'var(--text2)', lineHeight: 1.7 }}>{t.description}</p>}
                        {t.business_impact && <div style={{ padding: '8px 10px', background: 'rgba(245,158,11,.08)', borderLeft: '3px solid #f59e0b', borderRadius: '0 6px 6px 0', marginBottom: 10, fontSize: 11, lineHeight: 1.6 }}><strong>Business Impact:</strong> {t.business_impact}</div>}
                        {fixSteps.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 6 }}>Fix Steps</div>
                            {fixSteps.map((s, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 11, lineHeight: 1.6 }}>
                                <span style={{ color: '#22c55e', fontWeight: 700, minWidth: 16 }}>{i + 1}.</span>
                                <span style={{ color: 'var(--text2)' }}>{s}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {t.fix_code && (
                          <details style={{ marginBottom: 10 }}>
                            <summary style={{ fontSize: 11, color: '#3b82f6', cursor: 'pointer', marginBottom: 6 }}>View fix code</summary>
                            <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--bg3)', padding: 10, borderRadius: 8, overflow: 'auto', lineHeight: 1.8, margin: 0, color: 'var(--text)' }}>{t.fix_code}</pre>
                          </details>
                        )}
                        {t.chat_context && <div style={{ padding: '6px 10px', background: 'var(--bg3)', borderRadius: 6, fontSize: 10, color: 'var(--text3)', borderLeft: '3px solid #a855f7', marginBottom: 8 }}><strong>From chat:</strong> {t.chat_context.substring(0, 200)}{t.chat_context.length > 200 ? '…' : ''}</div>}
                      </div>
                    )}

                    {/* Timer */}
                    <div className="rp-timer-bar">
                      <span className="rp-timer-display" style={{ color: isActive ? '#f59e0b' : timer.done ? '#22c55e' : 'var(--text3)' }}>⏱ {fmtMs(elapsed)}</span>
                      {!timer.done && (
                        isActive
                          ? <button className="rp-tb" onClick={() => stopTimer(t.task_id)} style={{ background: 'rgba(245,158,11,.15)', color: '#f59e0b' }}>⏸ Pause</button>
                          : <button className="rp-tb" onClick={() => startTimer(t.task_id)} style={{ background: 'rgba(34,197,94,.15)', color: '#22c55e' }}>▶ Start</button>
                      )}
                      {(timer.totalMs > 0 || isActive) && !timer.done && (
                        <button className="rp-tb" onClick={() => doneTimer(t.task_id, t.title)} style={{ background: 'rgba(34,197,94,.15)', color: '#22c55e' }}>✓ Done</button>
                      )}
                      {timer.done && <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 600 }}>✓ Completed</span>}
                      {timer.totalMs > 0 && <button className="rp-tb" onClick={() => resetTimer(t.task_id)} style={{ marginLeft: 'auto', background: 'var(--bg3)', color: 'var(--text4)', border: '1px solid var(--border)' }}>Reset</button>}
                    </div>
                  </div>
                )
              })
            )}

            {/* Work Log */}
            {workLog.length > 0 && (
              <div className="rp-card" style={{ marginTop: 20 }}>
                <div className="rp-card-title">📝 Work Log</div>
                <table className="rp-tbl">
                  <thead><tr><th>Task</th><th>Duration</th><th>By</th><th>At</th></tr></thead>
                  <tbody>
                    {workLog.map((e, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'var(--font-sans)' }}>{e.taskTitle}</td>
                        <td style={{ color: '#22c55e', fontWeight: 600 }}>{e.duration}</td>
                        <td>{e.by}</td>
                        <td style={{ color: 'var(--text4)' }}>{e.at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </PageShell>
    </>
  )
}
