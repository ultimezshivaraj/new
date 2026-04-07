'use client'
// src/components/admin/qd-dev/QdDevPage.tsx
// Features: MongoDB upload, LOC count, folder tree, auto-tasks (4 categories),
//           AI agents + cron job detection, 20,000 max tokens
// Problem 6: early shell save — project card appears immediately
// Problem 3: retry on 504/overloaded_error, early exit on failure
// Problem 4: saveReportToBigQuery surfaces STRUCTURED_DATA parse warnings
// Problem 1: contextChars + loadingNote shown in loading panel

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import JSZip from 'jszip'
import type JSZipType from 'jszip'
import PageShell from '@/components/shared/PageShell'
import { SessionPayload } from '@/lib/session'
import StatCard from '@/components/shared/StatCard'

// ── Types ──────────────────────────────────────────────────────
interface Project {
  project_id: string; project_name: string; project_type: string
  environment?: string; description?: string; tech_stack?: string
  team_members?: string; total_files?: number; total_tables?: number
  total_columns?: number; total_loc?: number; health_score?: number
  last_analysed?: { value: string } | string
}

interface TeamMember { name: string; role: string }
interface SchemaTable { name: string; fields: { name: string; type?: string; data_type?: string; nullable?: boolean; key?: string; extra?: string }[] }
interface MongoCollection { collection: string; fields: { name: string; type: string }[]; doc_count?: number }

// ── ZIP extraction constants ───────────────────────────────────
const MAX_TOTAL = 70000
const CODE = /\.(js|ts|jsx|tsx|html|css|json|md|txt|py|php|sql|yaml|yml)$/i
const SKIP = /node_modules|\.git|__MACOSX|\.DS_Store|package-lock|yarn\.lock/i

// Problem 5: tiered file size caps by priority — auth/middleware get more room,
// tests/generated files get minimal space so they don't crowd out critical code
function priorityScore(path: string): number {
  const p = path.toLowerCase()
  if (/auth|middleware|session|permission|role|guard|security/.test(p)) return 0  // critical — auth
  if (/\/api\/|\/lib\/|\/services\/|\/hooks\//.test(p))          return 1  // high — API + lib
  if (/\/components\/|\/pages\/|\/app\/|\/routes\//.test(p))     return 2  // medium — UI
  if (/\.test\.|\spec\.|stories\.|generated|migrations/.test(p))    return 4  // low — tests/generated
  if (/vercel\.json|package\.json|next\.config/.test(p))              return 1  // high — config
  return 3                                                                          // default
}

const FILE_CAPS: Record<number, number> = {
  0: 12000,   // auth files — full context
  1: 8000,    // API routes + lib
  2: 5000,    // components + pages
  3: 3000,    // everything else
  4: 800,     // tests + generated — minimal
}

const TECH_CATEGORIES = [
  { label:'Languages',       items:['JavaScript','TypeScript','Python','PHP','Go','Java','Ruby','Rust','Swift','Kotlin','C#'] },
  { label:'Frameworks',      items:['Next.js','React','Vue','Angular','Svelte','Node.js','Express','FastAPI','Django','Laravel','CodeIgniter 3','Spring Boot','NestJS'] },
  { label:'Databases',       items:['MySQL','PostgreSQL','MongoDB','SQLite','BigQuery','Supabase','Firebase','DynamoDB','Elasticsearch'] },
  { label:'Caching & Queues',items:['Redis','Memcached','RabbitMQ','Kafka','Bull / BullMQ'] },
  { label:'Hosting & DevOps',items:['Vercel','AWS','GCP','Azure','Docker','Kubernetes','Cloudflare','Netlify','Railway'] },
  { label:'AI & Data',       items:['Anthropic API','OpenAI API','Gemini','LangChain','dbt','Airflow'] },
  { label:'CMS & Other',     items:['WordPress','Strapi','Shopify','GraphQL','REST API','WebSockets'] },
]

const TEAM_ROLES = ['Developer','Lead Developer','Tech Lead','Backend Dev','Frontend Dev','Full-Stack Dev','DevOps','QA Engineer','Project Manager','Designer']

const TYPE_STYLE: Record<string,{color:string;ibg:string;ib:string;icon:string}> = {
  dashboard:     { color:'#1459cc', ibg:'#edf2ff', ib:'#b8ccf8', icon:'📊' },
  api:           { color:'#1a6e35', ibg:'#ecf7ef', ib:'#a8d8b8', icon:'⚡' },
  web_app:       { color:'#9a5200', ibg:'#fef6e8', ib:'#f0ca80', icon:'🌐' },
  data_pipeline: { color:'#5530b8', ibg:'#f0ecfd', ib:'#c8b8f0', icon:'🔄' },
  cms:           { color:'#0c726a', ibg:'#eaf7f6', ib:'#a0d8d4', icon:'📄' },
  mobile:        { color:'#b52020', ibg:'#fdf0f0', ib:'#f0b0b0', icon:'📱' },
}
const DS = { color:'#46453c', ibg:'#f0efe9', ib:'#d0cfc7', icon:'🗂️' }

// ── Helpers ────────────────────────────────────────────────────
function esc(s: unknown) {
  return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function relDate(raw: unknown): string {
  if (!raw) return 'unknown'
  try {
    const r = raw as {value?:string}|string
    const d = new Date((typeof r==='object'&&r?.value)?r.value:String(r))
    const diff = (Date.now()-d.getTime())/1000
    if (diff<60) return 'just now'
    if (diff<3600) return Math.floor(diff/60)+'m ago'
    if (diff<86400) return Math.floor(diff/3600)+'h ago'
    if (diff<604800) return Math.floor(diff/86400)+'d ago'
    return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
  } catch { return String(raw).slice(0,10) }
}

// ── Main Component ─────────────────────────────────────────────
export default function QdDevPage({ session }: { session: SessionPayload }) {
  const router = useRouter()

  // Projects list
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [sort, setSort]         = useState('recent')

  // Modal state
  const [modalOpen, setModalOpen]     = useState(false)
  const [modalPanel, setModalPanel]   = useState<'upload'|'setup'|'loading'|'done'>('upload')
  const [modalStep, setModalStep]     = useState(1)

  // File states
  const [zipFile, setZipFile]       = useState<{files:Record<string,string>;totalFiles:number;readFiles:number;locCount:number;folderTree:string[]}|null>(null)
  const [schemaFile, setSchemaFile] = useState<{tables:SchemaTable[];summary:string;raw:string}|null>(null)
  const [mongoFile, setMongoFile]   = useState<{collections:MongoCollection[];summary:string}|null>(null)
  const [zipName, setZipName]       = useState('')
  const [schemaName, setSchemaName] = useState('')
  const [mongoName, setMongoName]   = useState('')

  // Loading steps + display state
  const [loadingSteps, setLoadingSteps] = useState<('idle'|'active'|'done')[]>(Array(5).fill('idle'))
  const [loadingTitle, setLoadingTitle] = useState('')
  const [loadingNote, setLoadingNote]   = useState('')   // retry messages
  const [contextChars, setContextChars] = useState(0)    // chars sent to Claude
  const [lastProjectId, setLastProjectId] = useState<string|null>(null)

  // Setup form
  const [projName, setProjName]         = useState('')
  const [projType, setProjType]         = useState('')
  const [projRepo, setProjRepo]         = useState('')
  const [projUrl, setProjUrl]           = useState('')
  const [projEnv, setProjEnv]           = useState('production')
  const [projDesc, setProjDesc]         = useState('')
  const [projFocus, setProjFocus]       = useState('')
  const [projPriority, setProjPriority] = useState('full')
  const [projDepth, setProjDepth]       = useState('standard')
  const [teamRows, setTeamRows]         = useState<TeamMember[]>([{name:'',role:'Developer'}])
  const [selectedTech, setSelectedTech] = useState<Set<string>>(new Set())
  const [techPickerOpen, setTechPickerOpen] = useState(false)
  const [customTechInput, setCustomTechInput] = useState('')
  const [customTechs, setCustomTechs]   = useState<string[]>([])
  const [doneTitle, setDoneTitle]       = useState('')
  const [doneSub, setDoneSub]           = useState('')
  const [analyzeRunning, setAnalyzeRunning] = useState(false)

  // ── Load projects ────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/admin/qd-dev')
      if (!r.ok) throw new Error('HTTP '+r.status)
      const data = await r.json()
      if (!Array.isArray(data)) throw new Error('Unexpected response')
      setProjects(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  // ── Filtered / sorted list ───────────────────────────────────
  const displayed = projects
    .filter(p => {
      if (filter!=='all'&&(p.project_type||'').toLowerCase()!==filter) return false
      if (!search) return true
      const q = search.toLowerCase()
      return [p.project_name,p.description,p.project_type,p.tech_stack]
        .filter(Boolean).some(v=>String(v).toLowerCase().includes(q))
    })
    .sort((a,b) => {
      if (sort==='name') return (a.project_name||'').localeCompare(b.project_name||'')
      if (sort==='tables') return (b.total_tables||0)-(a.total_tables||0)
      const da = new Date((a.last_analysed as {value?:string})?.value||String(a.last_analysed||0))
      const db = new Date((b.last_analysed as {value?:string})?.value||String(b.last_analysed||0))
      return db.getTime()-da.getTime()
    })

  const totals = {
    projects: projects.length,
    tables:   projects.reduce((n,p)=>n+(p.total_tables||0),0),
    files:    projects.reduce((n,p)=>n+(p.total_files||0),0),
    cols:     projects.reduce((n,p)=>n+(p.total_columns||0),0),
  }

  function handleNav(key: string) {
    if (key==='qd-dev') return
    if (key.startsWith('bo-')) { router.push(`/admin/backoffice?tab=${key}`); return }
    router.push(`/admin/${key}`)
  }

  function openProject(id: string) { router.push('/admin/qd-dev/'+encodeURIComponent(id)) }

  // ── ZIP extraction ───────────────────────────────────────────
  async function handleZipFile(file: File) {
    setZipName('Reading…')
    try {
      const buf = await file.arrayBuffer()
      const zip = await JSZip.loadAsync(buf)
      const data = await extractZip(zip)
      setZipFile(data)
      setZipName(file.name+' · '+data.readFiles+' files · '+formatLoc(data.locCount))
      autoDetectTechStack(data.files)
    } catch (e: unknown) { setZipName('Error: '+(e instanceof Error?e.message:String(e))) }
  }

  function formatLoc(n: number): string {
    return n>=1000 ? (n/1000).toFixed(1)+'k LOC' : n+' LOC'
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function extractZip(zip: JSZipType): Promise<{files:Record<string,string>;totalFiles:number;readFiles:number;locCount:number;folderTree:string[]}> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const els: {path:string;entry:any;sz:number}[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    zip.forEach((path:string,entry:any)=>{
      if (!entry.dir&&!SKIP.test(path)&&CODE.test(path))
        els.push({path,entry,sz:entry._data?.uncompressedSize||9999})
    })
    // Problem 5: sort by priority score first, then by file size ascending
    // so smaller high-priority files (auth, middleware) are read before large low-priority ones
    els.sort((a,b)=>{
      const pa = priorityScore(a.path)
      const pb = priorityScore(b.path)
      return pa - pb || a.sz - b.sz
    })
    const files: Record<string,string>={};let tot=0;let locCount=0
    for (const {path,entry} of els) {
      if (tot>=MAX_TOTAL) break
      try {
        let c:string = await entry.async('text')
        // Tiered cap — auth files get 12k chars, tests get 800, everything else in between
        const cap = FILE_CAPS[priorityScore(path)] ?? 3000
        if (c.length>cap) c=c.substring(0,cap)+'\n// …[truncated]'
        files[path]=c; tot+=c.length
        locCount+=c.split('\n').length
      } catch { /* skip */ }
    }
    const folderTree = Object.keys(files).sort()
    return {files,totalFiles:els.length,readFiles:Object.keys(files).length,locCount,folderTree}
  }

  // ── Schema parsing ───────────────────────────────────────────
  async function handleSchemaFile(file: File) {
    setSchemaName('Reading…')
    try {
      const txt = await file.text()
      const data = parseSchema(txt)
      setSchemaFile(data)
      setSchemaName(file.name+' · '+data.summary)
    } catch (e: unknown) { setSchemaName('Error: '+(e instanceof Error?e.message:String(e))) }
  }

  function parseSchema(txt: string) {
    let data: unknown
    try { data=JSON.parse(txt) } catch {
      return {tables:[],summary:'raw text',raw:txt.substring(0,40000)}
    }
    if (Array.isArray(data)&&data.length>0&&(data[0] as Record<string,unknown>).table_name&&(data[0] as Record<string,unknown>).column_name) {
      const tableMap: Record<string,SchemaTable['fields']>={}
      for (const row of data as Record<string,string>[]) {
        const t=row.table_name; if (!tableMap[t]) tableMap[t]=[]
        tableMap[t].push({name:row.column_name,type:row.data_type||'',nullable:row.is_nullable==='YES',key:row.column_key||''})
      }
      const tables: SchemaTable[]=Object.entries(tableMap).map(([name,fields])=>({name,fields}))
      let raw='=== SQL / BIGQUERY SCHEMA ===\n'
      for (const t of tables) {
        raw+=`-- ${t.name} (${t.fields.length} cols)\n`
        for (const f of t.fields) raw+=`  ${f.name.padEnd(40)}${(f.type||'').padEnd(16)}${!f.nullable?' NOT NULL':''}\n`
        raw+='\n'
      }
      return {tables,summary:`${tables.length} tables · ${(data as unknown[]).length} columns`,raw}
    }
    return {tables:[],summary:'JSON data',raw:JSON.stringify(data,null,2).substring(0,40000)}
  }

  // ── MongoDB schema parsing ───────────────────────────────────
  async function handleMongoFile(file: File) {
    setMongoName('Reading…')
    try {
      const txt  = await file.text()
      const data = parseMongo(txt)
      setMongoFile(data)
      setMongoName(file.name+' · '+data.summary)
      if (data.collections.length>0) setSelectedTech(prev=>new Set([...prev,'MongoDB']))
    } catch (e: unknown) { setMongoName('Error: '+(e instanceof Error?e.message:String(e))) }
  }

  function parseMongo(txt: string): {collections:MongoCollection[];summary:string} {
    try {
      const data = JSON.parse(txt)
      if (Array.isArray(data)) {
        const collections: MongoCollection[] = data.map((item: Record<string,unknown>) => ({
          collection: String(item.collection||item.name||'unknown'),
          fields:     Array.isArray(item.fields) ? item.fields as {name:string;type:string}[] : [],
          doc_count:  Number(item.doc_count||item.count||0)||undefined,
        }))
        const totalFields = collections.reduce((n,c)=>n+c.fields.length,0)
        return {collections,summary:`${collections.length} collections · ${totalFields} fields`}
      }
    } catch { /* fall through */ }
    return {collections:[],summary:'Parse error — check JSON format'}
  }

  // ── Tech stack auto-detection ────────────────────────────────
  function autoDetectTechStack(files: Record<string,string>) {
    const detected=new Set<string>()
    const names=Object.keys(files).map(f=>f.toLowerCase())
    const content=Object.values(files).slice(0,50).join(' ').toLowerCase()
    if (names.some(f=>f.endsWith('.php')))                     detected.add('PHP')
    if (names.some(f=>f.includes('codeigniter')))              detected.add('CodeIgniter 3')
    if (names.some(f=>f.endsWith('.ts')||f.endsWith('.tsx')))  detected.add('TypeScript')
    if (names.some(f=>f.endsWith('.jsx')||f.endsWith('.tsx'))) detected.add('React')
    if (names.some(f=>f.includes('next.config')))              detected.add('Next.js')
    if (names.some(f=>f==='package.json'))                     detected.add('Node.js')
    if (names.some(f=>f.endsWith('.py')))                      detected.add('Python')
    if (names.some(f=>f==='vercel.json'))                      detected.add('Vercel')
    if (names.some(f=>f==='docker-compose.yml'||f==='dockerfile')) detected.add('Docker')
    if (content.includes('@google-cloud/bigquery')||content.includes('bigquery')) detected.add('BigQuery')
    if (content.includes('upstash')||content.includes('redis'))    detected.add('Redis')
    if (content.includes('@anthropic'))                         detected.add('Anthropic API')
    if (content.includes('openai'))                             detected.add('OpenAI API')
    if (content.includes('mongoose')||content.includes('mongodb')) detected.add('MongoDB')
    if (detected.size>0) setSelectedTech(prev=>new Set([...prev,...detected]))
  }

  // ── Analysis helpers ─────────────────────────────────────────
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  // ── callAI — with retry on 504 and overloaded_error ──────────
  async function callAI(context: string, title: string, attempt = 1): Promise<string> {
    const res = await fetch('/api/admin/qd-dev/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 20000,
        system:     buildSysPrompt(),
        messages:   [{ role: 'user', content: `Analyse this codebase and generate the full structured HTML guide:\n\nProject: ${title}\n\n${context}` }],
      }),
    })

    // ── Non-OK HTTP ───────────────────────────────────────────
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const msg = String(err.error || 'HTTP ' + res.status)
      // 504 timeout — retry once with 60% of context
      if (res.status === 504 && attempt === 1) {
        setLoadingNote('Timed out — retrying with reduced context…')
        const reduced = context.substring(0, Math.floor(context.length * 0.6))
        return callAI(reduced, title, 2)
      }
      throw new Error(attempt === 2 ? `Retry also timed out. ${msg}` : msg)
    }

    const data = await res.json()

    // ── Anthropic-level error inside a 200 ───────────────────
    if (data.error) {
      const msg = String(data.error.message || JSON.stringify(data.error))
      // overloaded_error — wait 8s and retry once
      if (data.error.type === 'overloaded_error' && attempt === 1) {
        setLoadingNote('Claude is busy — retrying in 8s…')
        await new Promise(r => setTimeout(r, 8000))
        setLoadingNote('')
        return callAI(context, title, 2)
      }
      throw new Error(msg)
    }

    setLoadingNote('')  // clear any retry message on success
    return data.content?.[0]?.text || ''
  }

  // ── System prompt ─────────────────────────────────────────────
  function buildSysPrompt(): string {
    const tblCount   = schemaFile?.tables?.length||0
    const mongoCount = mongoFile?.collections?.length||0

    return `You are a senior software architect and security expert generating a structured HTML reference guide AND structured JSON data.
Output ONLY HTML starting with <div class="wrap">. No markdown. No code fences.

REQUIRED HTML STRUCTURE:
<div class="wrap">
<div class="stat-grid">
  <div class="stat"><div class="stat-n" style="color:#185fa5">${tblCount||'N'}</div><div class="stat-l">SQL Tables</div></div>
  <div class="stat"><div class="stat-n" style="color:#b45309">${mongoCount||'N'}</div><div class="stat-l">MongoDB Collections</div></div>
  <div class="stat"><div class="stat-n" style="color:#3c3489">N</div><div class="stat-l">Controllers</div></div>
  <div class="stat"><div class="stat-n" style="color:#3b6d11">N</div><div class="stat-l">AI Agents</div></div>
  <div class="stat"><div class="stat-n" style="color:#9a9890">N</div><div class="stat-l">Files</div></div>
</div>
<div class="tabs">
  <button class="tab on" onclick="showTab('overview',this)">Architecture</button>
  <button class="tab" onclick="showTab('api',this)">Controllers</button>
  <button class="tab" onclick="showTab('pages',this)">Views</button>
  <button class="tab" onclick="showTab('db',this)">Database</button>
  <button class="tab" onclick="showTab('flows',this)">Data Flows</button>
  <button class="tab" onclick="showTab('security',this)">Security</button>
  <button class="tab" onclick="showTab('devops',this)">DevOps</button>
</div>
<div id="s-overview" class="sec on">ARCHITECTURE CONTENT</div>
<div id="s-api" class="sec">CONTROLLERS CONTENT</div>
<div id="s-pages" class="sec">VIEWS CONTENT</div>
<div id="s-db" class="sec">DATABASE CONTENT — cover ALL ${tblCount} SQL tables AND ALL ${mongoCount} MongoDB collections with full field lists</div>
<div id="s-flows" class="sec">DATA FLOWS CONTENT</div>
<div id="s-security" class="sec">SECURITY CONTENT</div>
<div id="s-devops" class="sec">DEVOPS CONTENT</div>
</div>

CSS classes: .card .card-title .tbl .badge .b-green .b-red .b-amber .b-blue .b-purple .b-teal .b-gray .note .note.warn .note.ok .note.err .note.info .flow .health-grid .health-card

TASK GENERATION INSTRUCTIONS:

SECURITY tasks — find every vulnerability:
- OWASP category (A01-A10), severity (critical/high/medium/low), exact fix code, effort in minutes
- Look for: weak hashing (MD5/SHA1), SQL/NoSQL injection via string interpolation, hardcoded credentials, missing auth guards, XSS, CSRF, insecure direct object reference, no rate limiting, secrets in code, exposed stack traces

BUG tasks — find real defects and code quality problems:
- Missing try/catch around DB/API calls, TypeScript 'any' types, race conditions, null checks missing, wrong HTTP status codes, silent failures, missing input validation

SCALABLE tasks — find architecture bottlenecks:
- Queries with no LIMIT on large tables, no caching where needed, missing pagination, N+1 patterns, no request queuing for expensive ops, tight coupling, missing indexes

RESEARCH tasks — flag things needing investigation:
- Unclear logic that may be intentional, performance questions needing profiling, config decisions needing team input

AI AGENT detection — scan for ALL LLM integrations:
- fetch() to api.anthropic.com, api.openai.com, generativelanguage.googleapis.com
- new Anthropic(), new OpenAI(), GoogleGenerativeAI() instantiation
- LangChain, Hugging Face, Cohere, Mistral imports
- For each: file, agent_type, provider, model, max_tokens, has_system_prompt, has_tools, call_pattern (Single call/Chat/Streaming)

CRON JOB detection — scan for ALL scheduled tasks:
- vercel.json "crons" array (path + schedule)
- node-cron, cron, bull/bullmq with repeat options
- GitHub Actions .github/workflows with "on: schedule:"
- setInterval used for recurring background tasks
- For each: source, schedule (raw + human readable), path, description, max_duration

End with this EXACT block (no markdown fences, valid JSON):
<!-- STRUCTURED_DATA
{
  "tasks": [
    {
      "category": "security",
      "title": "string",
      "description": "string",
      "business_impact": "string",
      "file_path": "string or null",
      "fix_steps": ["step1","step2"],
      "fix_code": "string or null",
      "effort_minutes": 30,
      "severity": "critical",
      "owasp_category": "A02 Cryptographic Failures",
      "assigned_to": "Developer"
    }
  ],
  "controller_methods": [
    {
      "file_path":"string","class_name":"string or null","method_name":"string",
      "http_method":"GET","auth_level":"admin","purpose":"string",
      "db_tables_read":"string or null","db_tables_write":"string or null",
      "uses_redis":false,"is_ajax":false,"calls_notification":false
    }
  ],
  "data_flows": [
    {
      "flow_id":"login","flow_name":"User Login Flow","step_number":1,
      "step_actor":"Browser","step_action":"POST credentials",
      "step_function":"handleSubmit","step_db_table":null,"step_db_operation":null,
      "step_triggers_notification":false,"step_triggers_cache_bust":false
    }
  ],
  "devops_config": [
    {
      "component":"BigQuery","failure_impact":"All data unavailable","risk_level":"critical",
      "mitigation":"Add retry logic","env_var_name":"GOOGLE_SERVICE_ACCOUNT_JSON",
      "env_var_required_by":"All API routes","env_var_sensitive":true
    }
  ],
  "ai_agents": [
    {
      "file_path":"src/app/api/admin/qd-dev/ai-proxy/route.ts",
      "agent_type":"LLM Call","provider":"Anthropic","model":"claude-sonnet-4-20250514",
      "purpose":"Proxies codebase analysis and chat to Claude",
      "call_pattern":"Single call","max_tokens":20000,
      "has_system_prompt":true,"has_tools":false
    }
  ],
  "cron_jobs": [
    {
      "source":"vercel.json","schedule":"0 * * * *","schedule_human":"Every hour",
      "path":"/api/sync/teramind?scope=fast",
      "description":"Hourly Teramind fast sync","max_duration":300
    }
  ]
}
STRUCTURED_DATA -->`
  }

  // ── Shell save (Step 1 — no HTML yet) ─────────────────────────
  async function saveShellToBigQuery(): Promise<string|null> {
    try {
      const res = await fetch('/api/admin/qd-dev/knowledge-writer',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          project_name:     projName,
          project_type:     projType||'web_app',
          environment:      projEnv||'production',
          repo_url:         projRepo||null,
          live_url:         projUrl||null,
          description:      projDesc||null,
          tech_stack:       Array.from(selectedTech),
          team:             teamRows.filter(m=>m.name.trim()),
          analysis_focus:   projFocus||null,
          priority:         projPriority||null,
          depth:            projDepth||null,
          report_html:      null,
          tables:           schemaFile?.tables||[],
          mongodb_tables:   mongoFile?.collections||[],
          total_files:      zipFile?.readFiles||0,
          total_tables:     (schemaFile?.tables?.length||0)+(mongoFile?.collections?.length||0),
          total_columns:    schemaFile?.tables?.reduce((n,t)=>n+(t.fields?.length||0),0)||0,
          total_loc:        zipFile?.locCount||0,
          folder_structure: zipFile ? JSON.stringify(zipFile.folderTree) : null,
          analysed_by:      'admin',
        }),
      })
      const data = await res.json()
      return data.project_id||null
    } catch { return null }
  }

  // ── Full save (Step 5 — upserts shell row with HTML) ──────────
  async function saveReportToBigQuery(title: string, html: string): Promise<string|null> {
    try {
      const res = await fetch('/api/admin/qd-dev/knowledge-writer',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          project_name:     title,
          project_type:     projType||'web_app',
          environment:      projEnv||'production',
          repo_url:         projRepo||null,
          live_url:         projUrl||null,
          description:      projDesc||null,
          tech_stack:       Array.from(selectedTech),
          team:             teamRows.filter(m=>m.name.trim()),
          analysis_focus:   projFocus||null,
          priority:         projPriority||null,
          depth:            projDepth||null,
          report_html:      html,
          tables:           schemaFile?.tables||[],
          mongodb_tables:   mongoFile?.collections||[],
          total_files:      zipFile?.readFiles||0,
          total_tables:     (schemaFile?.tables?.length||0)+(mongoFile?.collections?.length||0),
          total_columns:    schemaFile?.tables?.reduce((n,t)=>n+(t.fields?.length||0),0)||0,
          total_loc:        zipFile?.locCount||0,
          folder_structure: zipFile ? JSON.stringify(zipFile.folderTree) : null,
          analysed_by:      'admin',
        }),
      })
      const data = await res.json()
      // Surface STRUCTURED_DATA parse warning in done panel (Problem 4)
      if (data.warnings?.length) setDoneSub(data.warnings[0])
      return data.project_id||null
    } catch { return null }
  }

  // ── Run analysis ─────────────────────────────────────────────
  async function startModalAnalysis() {
    if (!projName.trim()||analyzeRunning) return
    setAnalyzeRunning(true)
    setModalPanel('loading')
    setModalStep(3)
    setLoadingTitle('Analysing: '+projName)

    // Build full context string
    const parts=[
      '=== PROJECT METADATA ===',
      'Name: '+projName,
      'Type: '+projType,
      'Environment: '+projEnv,
      projRepo?'Repo: '+projRepo:'',
      projUrl?'Live URL: '+projUrl:'',
      projDesc?'Description: '+projDesc:'',
      selectedTech.size?'Tech Stack: '+Array.from(selectedTech).join(', '):'',
      teamRows.filter(m=>m.name).length?'Team:\n'+teamRows.filter(m=>m.name).map(m=>`  - ${m.name} (${m.role})`).join('\n'):'',
      projFocus?'Analysis Focus: '+projFocus:'',
      '',
    ].filter(Boolean)

    let ctx = parts.join('\n')

    if (zipFile) {
      ctx+='\n=== CODEBASE ===\nFiles: '+zipFile.readFiles
      ctx+='\nLines of Code: '+zipFile.locCount
      ctx+='\n\nFILE LIST:\n'+Object.keys(zipFile.files).join('\n')+'\n\n'
      for (const p in zipFile.files) ctx+=`\n--- ${p} ---\n${zipFile.files[p]}\n`
    }
    if (schemaFile) ctx+='\n\n'+schemaFile.raw

    if (mongoFile&&mongoFile.collections.length>0) {
      ctx+='\n\n=== MONGODB SCHEMA ===\n'
      ctx+=`Collections: ${mongoFile.collections.length}\n\n`
      for (const col of mongoFile.collections) {
        ctx+=`-- ${col.collection} (${col.fields.length} fields${col.doc_count?', ~'+col.doc_count.toLocaleString()+' docs':''})\n`
        for (const f of col.fields) ctx+=`  ${f.name.padEnd(30)} ${f.type}\n`
        ctx+='\n'
      }
    }

    // Capture context size for display in loading panel (Problem 1)
    setContextChars(ctx.length)

    // ── Step 1: Save project shell immediately ─────────────────
    setLoadingSteps(['active','idle','idle','idle','idle'])
    const shellId = await saveShellToBigQuery()
    setLastProjectId(shellId)
    setLoadingSteps(['done','active','idle','idle','idle'])

    // ── Step 2: Context ready ──────────────────────────────────
    setLoadingSteps(['done','done','active','idle','idle'])

    // ── Step 3: Call Claude ────────────────────────────────────
    const t0 = Date.now()
    let html = ''
    try {
      html = await callAI(ctx, projName)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setDoneTitle('Analysis Failed')
      setDoneSub(`${msg} · Project shell saved to BigQuery. Open the report and re-run analysis.`)
      setModalPanel('done')
      setAnalyzeRunning(false)
      return  // ← early exit — do NOT save broken HTML
    }

    setLoadingSteps(['done','done','done','active','idle'])

    // ── Step 4 → 5: Save full report ──────────────────────────
    setLoadingSteps(['done','done','done','done','active'])
    const savedId = await saveReportToBigQuery(projName, html)
    if (savedId) setLastProjectId(savedId)
    setLoadingSteps(['done','done','done','done','done'])

    const elapsed = ((Date.now()-t0)/1000).toFixed(1)
    // doneSub may already be set by saveReportToBigQuery warning — only overwrite if empty
    setDoneTitle(projName+' — Complete!')
    setDoneSub(prev => prev || `Generated in ${elapsed}s · Saved to BigQuery · All tabs populated`)
    setModalStep(4)
    setModalPanel('done')
    setAnalyzeRunning(false)
  }

  function openModal() {
    setModalOpen(true); setModalPanel('upload'); setModalStep(1)
    setZipFile(null); setSchemaFile(null); setMongoFile(null)
    setZipName(''); setSchemaName(''); setMongoName('')
    setProjName(''); setProjType(''); setProjRepo(''); setProjUrl('')
    setProjEnv('production'); setProjDesc(''); setProjFocus('')
    setProjPriority('full'); setProjDepth('standard')
    setTeamRows([{name:'',role:'Developer'}])
    setSelectedTech(new Set()); setCustomTechs([])
    setLoadingSteps(Array(5).fill('idle')); setLastProjectId(null)
    setLoadingNote(''); setContextChars(0)  // ← reset Problem 1 + 3 state
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .qd-proj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
        .qd-pc{background:var(--bg2);border:1px solid var(--border);border-radius:14px;cursor:pointer;transition:all .2s;overflow:hidden}
        .qd-pc:hover{box-shadow:0 4px 20px rgba(0,0,0,.25);transform:translateY(-2px);border-color:var(--border2)}
        .qd-pc-accent{height:3px;width:100%}
        .qd-pc-body{padding:16px}
        .qd-pc-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}
        .qd-pc-icon{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .qd-pc-desc{font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:36px}
        .qd-pc-chips{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}
        .qd-chip{font-size:10px;padding:2px 7px;border-radius:10px;background:var(--bg3);border:1px solid var(--border);color:var(--text3)}
        .qd-pc-foot{display:flex;align-items:center;gap:8px;padding-top:10px;border-top:1px solid var(--border)}
        .qd-btn-open{font-size:11px;padding:5px 12px;border-radius:7px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;border:none;cursor:pointer;font-weight:600}
        .qd-state{text-align:center;padding:80px 20px;color:var(--text3)}
        .qd-spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:#f59e0b;border-radius:50%;animation:qdsp .8s linear infinite;margin:0 auto 14px}
        @keyframes qdsp{to{transform:rotate(360deg)}}
        .qd-filter-btn{font-size:11px;padding:5px 12px;border-radius:20px;border:1px solid var(--border);background:var(--bg2);color:var(--text3);cursor:pointer;transition:all .15s}
        .qd-filter-btn.on{background:var(--text);color:var(--bg);border-color:var(--text)}
        .qd-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
        .qd-modal-box{background:var(--bg2);border-radius:18px;width:100%;max-width:760px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.4)}
        .qd-modal-header{padding:18px 22px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--bg2);border-radius:18px 18px 0 0;z-index:5}
        .qd-modal-body{padding:20px 22px 24px}
        .qd-dz{border:2px dashed var(--border2);border-radius:12px;padding:20px 14px;text-align:center;cursor:pointer;position:relative;transition:all .15s;background:var(--bg3)}
        .qd-dz:hover,.qd-dz.drag{border-color:#f59e0b;background:rgba(245,158,11,.06)}
        .qd-dz.done{border-style:solid;border-color:#22c55e;background:var(--green-dim)}
        .qd-dz input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
        .qd-step-ind{display:flex;align-items:center;gap:0;margin-bottom:22px}
        .qd-mstep{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:500;color:var(--text4)}
        .qd-mstep.active{color:var(--text);font-weight:700}
        .qd-mstep.done{color:#22c55e}
        .qd-mstep-num{width:22px;height:22px;border-radius:50%;border:2px solid currentColor;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0}
        .qd-mstep-line{flex:1;height:1px;background:var(--border);margin:0 8px}
        .qd-field{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
        .qd-field label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3)}
        .qd-field input,.qd-field select,.qd-field textarea{padding:8px 11px;border:1px solid var(--border2);border-radius:8px;font-size:12px;background:var(--bg);color:var(--text);outline:none;font-family:var(--font-sans)}
        .qd-field input:focus,.qd-field select:focus,.qd-field textarea:focus{border-color:#f59e0b}
        .qd-tech-chip{font-size:11px;padding:4px 9px;border-radius:20px;background:var(--bg3);border:1px solid var(--border);color:var(--text3);cursor:pointer;transition:all .12s;user-select:none}
        .qd-tech-chip.on{background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.4);color:#f59e0b}
        .qd-step-row{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:8px;background:var(--bg3);border:1px solid var(--border);font-size:12px;color:var(--text3);transition:all .25s}
        .qd-step-row.active{color:var(--text);border-color:var(--border2)}
        .qd-step-row.done{color:#22c55e;border-color:#22c55e;background:var(--green-dim)}
        .qd-step-dot{width:7px;height:7px;border-radius:50%;background:var(--border2);flex-shrink:0;transition:all .25s}
        .qd-step-row.active .qd-step-dot{background:#f59e0b;animation:qdblink .8s ease-in-out infinite}
        .qd-step-row.done .qd-step-dot{background:#22c55e}
        @keyframes qdblink{0%,100%{opacity:1}50%{opacity:.2}}
        .qd-stats-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:22px}
        .qd-team-row{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:center;margin-bottom:8px}
        .qd-section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin:16px 0 8px;display:flex;align-items:center;gap:8px}
      `}</style>

      <PageShell
        panel="admin"
        session={session}
        activeKey="qd-dev"
        onNav={handleNav}
        title="Admin Dashboard"
        subtitle="QD Dev Analyser"
        topRight={
          <button onClick={openModal} style={{
            padding:'6px 16px',borderRadius:8,border:'none',
            background:'linear-gradient(135deg,#f59e0b,#ef4444)',
            color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',
            fontFamily:'var(--font-sans)',
          }}>+ New Analysis</button>
        }
      >
        {/* Page header */}
        <div style={{marginBottom:24}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#f59e0b',marginBottom:8}}>QD Dev Analyser</div>
          <div style={{fontSize:24,fontWeight:700,letterSpacing:'-.5px',marginBottom:6}}>All Projects</div>
          <div style={{fontSize:13,color:'var(--text3)',lineHeight:1.7}}>Upload a codebase ZIP, SQL schema, and MongoDB schema to generate an AI-powered project report.</div>
        </div>

        {/* Stats strip */}
        {!loading&&!error&&projects.length>0&&(
          <div className="qd-stats-strip">
            <StatCard label="Projects"      value={totals.projects.toLocaleString()} color="var(--accent-c)"/>
            <StatCard label="Total Tables"  value={totals.tables.toLocaleString()}   color="#3b82f6"/>
            <StatCard label="Total Files"   value={totals.files.toLocaleString()}    color="#ef4444"/>
            <StatCard label="Total Columns" value={totals.cols.toLocaleString()}     color="#22c55e"/>
          </div>
        )}

        {/* Controls */}
        {!loading&&!error&&projects.length>0&&(
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20,flexWrap:'wrap'}}>
            <div style={{position:'relative',flex:1,minWidth:180,maxWidth:300}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text4)',fontSize:14}}>⌕</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects…"
                style={{width:'100%',padding:'7px 11px 7px 28px',border:'1px solid var(--border2)',borderRadius:8,background:'var(--bg2)',fontSize:12,color:'var(--text)',fontFamily:'var(--font-sans)',outline:'none'}}/>
            </div>
            {['all','dashboard','api','web_app'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} className={`qd-filter-btn${filter===f?' on':''}`}>
                {f==='all'?'All':f==='web_app'?'Web Apps':f.charAt(0).toUpperCase()+f.slice(1)+'s'}
              </button>
            ))}
            <select value={sort} onChange={e=>setSort(e.target.value)}
              style={{fontSize:12,padding:'6px 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg2)',color:'var(--text2)',marginLeft:'auto',cursor:'pointer',outline:'none'}}>
              <option value="recent">Most recent</option>
              <option value="name">Name A–Z</option>
              <option value="tables">Most tables</option>
            </select>
          </div>
        )}

        {/* Grid */}
        {loading?(
          <div className="qd-state"><div className="qd-spinner"/><div style={{fontSize:14,fontWeight:500,marginBottom:4}}>Loading projects…</div><div style={{fontSize:12}}>Fetching from BigQuery QDDev_Project</div></div>
        ):error?(
          <div className="qd-state">
            <div style={{fontSize:32,marginBottom:12,opacity:.3}}>⚠</div>
            <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>Could not load projects</div>
            <div style={{fontSize:12,marginBottom:16}}>{error}</div>
            <button onClick={loadProjects} style={{padding:'8px 18px',background:'linear-gradient(135deg,#f59e0b,#ef4444)',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600}}>Retry</button>
          </div>
        ):displayed.length===0?(
          <div className="qd-state">
            <div style={{fontSize:36,marginBottom:12,opacity:.3}}>📂</div>
            <div style={{fontSize:15,fontWeight:600,marginBottom:8}}>{projects.length?'No matching projects':'No projects yet'}</div>
            <div style={{fontSize:12,marginBottom:20}}>{projects.length?'Try a different search or filter.':'Click + New Analysis to create your first report.'}</div>
            {!projects.length&&<button onClick={openModal} style={{padding:'8px 20px',background:'linear-gradient(135deg,#f59e0b,#ef4444)',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600}}>+ New Analysis</button>}
          </div>
        ):(
          <div className="qd-proj-grid">
            {displayed.map(p=>{
              const st=TYPE_STYLE[(p.project_type||'').toLowerCase()]||DS
              const typ=(p.project_type||'Project').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
              let stack: string[]=[]; try{stack=JSON.parse(p.tech_stack||'[]')}catch{/**/}
              let team: TeamMember[]=[]; try{team=JSON.parse(p.team_members||'[]')}catch{/**/}
              const hs = p.health_score||0
              const hsColor = hs>=80?'#22c55e':hs>=50?'#f59e0b':'#ef4444'
              return (
                <div key={p.project_id} className="qd-pc" onClick={()=>openProject(p.project_id)}>
                  <div className="qd-pc-accent" style={{background:st.color}}/>
                  <div className="qd-pc-body">
                    <div className="qd-pc-head">
                      <div className="qd-pc-icon" style={{background:st.ibg,border:`1px solid ${st.ib}`}}>{st.icon}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{p.project_name}</div>
                        <div style={{fontSize:11,color:'var(--text3)'}}>{typ}</div>
                      </div>
                      {hs>0&&(
                        <div style={{textAlign:'center',flexShrink:0}}>
                          <div style={{fontSize:16,fontWeight:700,fontFamily:'var(--font-mono)',color:hsColor}}>{hs}</div>
                          <div style={{fontSize:9,color:'var(--text4)',textTransform:'uppercase',letterSpacing:.5}}>Health</div>
                        </div>
                      )}
                    </div>
                    <div className="qd-pc-desc">{p.description||'No description provided.'}</div>
                    <div style={{display:'flex',gap:12,marginBottom:10,flexWrap:'wrap'}}>
                      {p.total_tables?<span style={{fontSize:11,color:'var(--text3)'}}><strong>{p.total_tables}</strong> tables</span>:null}
                      {p.total_loc?<span style={{fontSize:11,color:'var(--text3)'}}><strong>{formatLoc(p.total_loc)}</strong></span>:null}
                      {p.total_files?<span style={{fontSize:11,color:'var(--text3)'}}><strong>{p.total_files}</strong> files</span>:null}
                      {team.length?<span style={{fontSize:11,color:'var(--text3)'}}><strong>{team.length}</strong> members</span>:null}
                    </div>
                    {stack.length>0&&(
                      <div className="qd-pc-chips">
                        {stack.slice(0,5).map(t=><span key={t} className="qd-chip">{t}</span>)}
                      </div>
                    )}
                    <div className="qd-pc-foot">
                      <span style={{fontSize:11,color:'var(--text4)',flex:1}}>Updated {relDate(p.last_analysed)}</span>
                      <button className="qd-btn-open" onClick={e=>{e.stopPropagation();openProject(p.project_id)}}>Open Report →</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── ANALYSIS MODAL ──────────────────────────────────── */}
        {modalOpen&&(
          <div className="qd-modal-overlay" onClick={e=>{if(e.target===e.currentTarget&&modalPanel!=='loading')setModalOpen(false)}}>
            <div className="qd-modal-box">
              <div className="qd-modal-header">
                <div style={{fontSize:15,fontWeight:700}}>
                  {modalPanel==='done'?'Analysis Complete':modalPanel==='loading'?loadingTitle:'New Project Analysis'}
                </div>
                {modalPanel!=='loading'&&(
                  <button onClick={()=>setModalOpen(false)} style={{width:30,height:30,borderRadius:7,border:'1px solid var(--border)',background:'var(--bg3)',cursor:'pointer',fontSize:14,color:'var(--text3)'}}>✕</button>
                )}
              </div>

              <div className="qd-modal-body">
                {/* Step indicator */}
                {modalPanel!=='done'&&(
                  <div className="qd-step-ind">
                    {['Upload Files','Project Setup','AI Analysis','Done'].map((lbl,i)=>(
                      <span key={i} style={{display:'contents'}}>
                        <div className={`qd-mstep${i+1<modalStep?' done':i+1===modalStep?' active':''}`}>
                          <div className="qd-mstep-num">{i+1<modalStep?'✓':i+1}</div>
                          <span>{lbl}</span>
                        </div>
                        {i<3&&<div className="qd-mstep-line"/>}
                      </span>
                    ))}
                  </div>
                )}

                {/* PANEL 1 — UPLOAD */}
                {modalPanel==='upload'&&(
                  <div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>

                      {/* Code ZIP */}
                      <div className={`qd-dz${zipFile?' done':''}`}
                        onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drag')}}
                        onDragLeave={e=>e.currentTarget.classList.remove('drag')}
                        onDrop={async e=>{e.preventDefault();e.currentTarget.classList.remove('drag');const f=e.dataTransfer.files[0];if(f)await handleZipFile(f)}}>
                        <input type="file" accept=".zip" onChange={async e=>{const f=e.target.files?.[0];if(f)await handleZipFile(f)}}/>
                        <div style={{fontSize:22,marginBottom:6}}>{zipFile?'✅':'📦'}</div>
                        <div style={{fontSize:12,fontWeight:600,marginBottom:3}}>Code Repository ZIP</div>
                        <div style={{fontSize:10,color:'var(--text3)'}}>JS, TS, PHP, HTML, SQL extracted</div>
                        {zipName&&<div style={{fontSize:10,color:'#22c55e',marginTop:5}}>{zipName}</div>}
                        {zipFile&&<button onClick={e=>{e.stopPropagation();setZipFile(null);setZipName('')}} style={{position:'absolute',top:6,right:8,fontSize:12,background:'none',border:'none',cursor:'pointer',color:'var(--text3)'}}>✕</button>}
                      </div>

                      {/* SQL Schema */}
                      <div className={`qd-dz${schemaFile?' done':''}`}
                        onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drag')}}
                        onDragLeave={e=>e.currentTarget.classList.remove('drag')}
                        onDrop={async e=>{e.preventDefault();e.currentTarget.classList.remove('drag');const f=e.dataTransfer.files[0];if(f)await handleSchemaFile(f)}}>
                        <input type="file" accept=".json" onChange={async e=>{const f=e.target.files?.[0];if(f)await handleSchemaFile(f)}}/>
                        <div style={{fontSize:22,marginBottom:6}}>{schemaFile?'✅':'🗄️'}</div>
                        <div style={{fontSize:12,fontWeight:600,marginBottom:3}}>SQL / BigQuery Schema</div>
                        <div style={{fontSize:10,color:'var(--text3)'}}>MySQL dump or BigQuery JSON export</div>
                        {schemaName&&<div style={{fontSize:10,color:'#22c55e',marginTop:5}}>{schemaName}</div>}
                        {schemaFile&&<button onClick={e=>{e.stopPropagation();setSchemaFile(null);setSchemaName('')}} style={{position:'absolute',top:6,right:8,fontSize:12,background:'none',border:'none',cursor:'pointer',color:'var(--text3)'}}>✕</button>}
                      </div>

                      {/* MongoDB Schema */}
                      <div className={`qd-dz${mongoFile?' done':''}`}
                        onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drag')}}
                        onDragLeave={e=>e.currentTarget.classList.remove('drag')}
                        onDrop={async e=>{e.preventDefault();e.currentTarget.classList.remove('drag');const f=e.dataTransfer.files[0];if(f)await handleMongoFile(f)}}>
                        <input type="file" accept=".json" onChange={async e=>{const f=e.target.files?.[0];if(f)await handleMongoFile(f)}}/>
                        <div style={{fontSize:22,marginBottom:6}}>{mongoFile?'✅':'🍃'}</div>
                        <div style={{fontSize:12,fontWeight:600,marginBottom:3}}>MongoDB Schema</div>
                        <div style={{fontSize:10,color:'var(--text3)'}}>Collections + fields JSON export</div>
                        {mongoName&&<div style={{fontSize:10,color:'#22c55e',marginTop:5}}>{mongoName}</div>}
                        {mongoFile&&<button onClick={e=>{e.stopPropagation();setMongoFile(null);setMongoName('')}} style={{position:'absolute',top:6,right:8,fontSize:12,background:'none',border:'none',cursor:'pointer',color:'var(--text3)'}}>✕</button>}
                        <div style={{position:'absolute',bottom:6,left:0,right:0,textAlign:'center',fontSize:9,color:'var(--text4)'}}>Optional</div>
                      </div>

                    </div>
                    <div style={{textAlign:'center',marginTop:16}}>
                      <button disabled={!zipFile&&!schemaFile&&!mongoFile}
                        onClick={()=>{setModalPanel('setup');setModalStep(2)}}
                        style={{display:'inline-flex',alignItems:'center',gap:8,padding:'10px 24px',background:(!zipFile&&!schemaFile&&!mongoFile)?'var(--bg3)':'linear-gradient(135deg,#f59e0b,#ef4444)',color:(!zipFile&&!schemaFile&&!mongoFile)?'var(--text3)':'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:600,cursor:(!zipFile&&!schemaFile&&!mongoFile)?'not-allowed':'pointer'}}>
                        Next: Set Up Project →
                      </button>
                      <div style={{fontSize:11,color:'var(--text3)',marginTop:8}}>Upload at least one file to continue.</div>
                    </div>
                  </div>
                )}

                {/* PANEL 2 — PROJECT SETUP */}
                {modalPanel==='setup'&&(
                  <div>
                    <div style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,padding:18,marginBottom:14}}>
                      <div className="qd-section-title">🗂️ Project Information</div>
                      <div className="qd-field"><label>Project Name *</label><input value={projName} onChange={e=>setProjName(e.target.value)} placeholder="Enter project name…"/></div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                        <div className="qd-field"><label>Project Type</label><select value={projType} onChange={e=>setProjType(e.target.value)}><option value="">Select…</option>{['web_app','api','dashboard','cms','data_pipeline','mobile','other'].map(v=><option key={v} value={v}>{v.replace(/_/g,' ')}</option>)}</select></div>
                        <div className="qd-field"><label>Repository URL</label><input value={projRepo} onChange={e=>setProjRepo(e.target.value)} placeholder="https://github.com/…"/></div>
                        <div className="qd-field"><label>Live URL</label><input value={projUrl} onChange={e=>setProjUrl(e.target.value)} placeholder="https://…"/></div>
                        <div className="qd-field"><label>Environment</label><select value={projEnv} onChange={e=>setProjEnv(e.target.value)}>{['production','staging','development','testing'].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
                      </div>
                      <div className="qd-field"><label>Description</label><textarea value={projDesc} onChange={e=>setProjDesc(e.target.value)} placeholder="Briefly describe what this project does…" style={{minHeight:60,resize:'vertical',lineHeight:1.6}}/></div>
                    </div>

                    {/* Tech Stack */}
                    <div style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,padding:18,marginBottom:14}}>
                      <div className="qd-section-title">⚙️ Tech Stack</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10,minHeight:32,padding:'6px 8px',background:'var(--bg2)',borderRadius:8,border:'1px solid var(--border)'}}>
                        {selectedTech.size===0&&customTechs.length===0
                          ?<span style={{fontSize:11,color:'var(--text4)',padding:'2px'}}>None selected — choose below or type custom</span>
                          :[...selectedTech,...customTechs].map(t=>(
                            <span key={t} className="qd-tech-chip on" style={{display:'inline-flex',alignItems:'center',gap:4}}>
                              {t}<span style={{cursor:'pointer',opacity:.6,marginLeft:2}} onClick={()=>{setSelectedTech(prev=>{const n=new Set(prev);n.delete(t);return n});setCustomTechs(prev=>prev.filter(c=>c!==t))}}>✕</span>
                            </span>
                          ))
                        }
                      </div>
                      <div style={{display:'flex',gap:6,marginBottom:12}}>
                        <input value={customTechInput} onChange={e=>setCustomTechInput(e.target.value)}
                          onKeyDown={e=>{if(e.key==='Enter'&&customTechInput.trim()){e.preventDefault();setCustomTechs(p=>[...p,customTechInput.trim()]);setCustomTechInput('')}}}
                          placeholder="Add custom tech…"
                          style={{flex:1,padding:'7px 11px',border:'1px solid var(--border2)',borderRadius:8,fontSize:12,background:'var(--bg)',color:'var(--text)',outline:'none',fontFamily:'var(--font-sans)'}}/>
                        <button onClick={()=>{if(customTechInput.trim()){setCustomTechs(p=>[...p,customTechInput.trim()]);setCustomTechInput('')}}}
                          style={{padding:'7px 14px',borderRadius:8,border:'1px solid rgba(245,158,11,.4)',background:'rgba(245,158,11,.1)',color:'#f59e0b',cursor:'pointer',fontSize:11,fontWeight:600}}>+ Add</button>
                      </div>
                      <button onClick={()=>setTechPickerOpen(p=>!p)}
                        style={{fontSize:11,padding:'5px 12px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg2)',color:'var(--text2)',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                        <span>{techPickerOpen?'▼':'▶'}</span> Browse all technologies
                      </button>
                      {techPickerOpen&&(
                        <div style={{marginTop:10}}>
                          {TECH_CATEGORIES.map(cat=>(
                            <div key={cat.label} style={{marginBottom:10}}>
                              <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--text4)',marginBottom:5}}>{cat.label}</div>
                              <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                                {cat.items.map(t=>(
                                  <span key={t} className={`qd-tech-chip${selectedTech.has(t)?' on':''}`}
                                    onClick={()=>setSelectedTech(prev=>{const n=new Set(prev);n.has(t)?n.delete(t):n.add(t);return n})}>{t}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Team */}
                    <div style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,padding:18,marginBottom:14}}>
                      <div className="qd-section-title">👥 Team Members</div>
                      {teamRows.map((m,i)=>(
                        <div key={i} className="qd-team-row">
                          <input value={m.name} onChange={e=>setTeamRows(prev=>prev.map((r,j)=>j===i?{...r,name:e.target.value}:r))} placeholder="Full name"
                            style={{padding:'7px 10px',border:'1px solid var(--border2)',borderRadius:7,fontSize:12,background:'var(--bg)',color:'var(--text)',outline:'none',fontFamily:'var(--font-sans)'}}/>
                          <select value={m.role} onChange={e=>setTeamRows(prev=>prev.map((r,j)=>j===i?{...r,role:e.target.value}:r))}
                            style={{padding:'7px 10px',border:'1px solid var(--border2)',borderRadius:7,fontSize:12,background:'var(--bg)',color:'var(--text)',outline:'none',cursor:'pointer'}}>
                            {TEAM_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                          </select>
                          <button onClick={()=>setTeamRows(prev=>prev.filter((_,j)=>j!==i))}
                            style={{width:28,height:28,borderRadius:7,border:'1px solid var(--border2)',background:'var(--bg3)',cursor:'pointer',color:'var(--text3)',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                        </div>
                      ))}
                      <button onClick={()=>setTeamRows(prev=>[...prev,{name:'',role:'Developer'}])}
                        style={{fontSize:11,padding:'5px 12px',borderRadius:7,border:'1px dashed var(--border2)',background:'transparent',color:'var(--text3)',cursor:'pointer'}}>+ Add Team Member</button>
                    </div>

                    {/* Analysis focus */}
                    <div style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,padding:18,marginBottom:14}}>
                      <div className="qd-section-title">🎯 Analysis Focus</div>
                      <div className="qd-field"><label>What should the AI focus on?</label>
                        <textarea value={projFocus} onChange={e=>setProjFocus(e.target.value)}
                          placeholder="e.g. Focus on auth flow, DB performance, API security…"
                          style={{minHeight:60,resize:'vertical',lineHeight:1.6}}/></div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                        <div className="qd-field"><label>Priority</label><select value={projPriority} onChange={e=>setProjPriority(e.target.value)}>
                          {[['security','Security First'],['performance','Performance'],['onboarding','New Developer'],['refactor','Refactor'],['full','Full Audit']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                        </select></div>
                        <div className="qd-field"><label>Analysis Depth</label><select value={projDepth} onChange={e=>setProjDepth(e.target.value)}>
                          {[['standard','Standard'],['deep','Deep (Thorough)'],['security_only','Security Only'],['db_only','Database Only']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                        </select></div>
                      </div>
                    </div>

                    <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
                      <button onClick={()=>{setModalPanel('upload');setModalStep(1)}}
                        style={{padding:'9px 16px',background:'transparent',color:'var(--text2)',border:'1px solid var(--border2)',borderRadius:9,fontSize:12,fontWeight:500,cursor:'pointer'}}>← Back</button>
                      <button disabled={!projName.trim()||analyzeRunning} onClick={startModalAnalysis}
                        style={{flex:1,padding:'10px',background:!projName.trim()?'var(--bg3)':'linear-gradient(135deg,#f59e0b,#ef4444)',color:!projName.trim()?'var(--text3)':'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:!projName.trim()?'not-allowed':'pointer'}}>
                        ✦ Run AI Analysis (20k tokens)
                      </button>
                    </div>
                    <div style={{textAlign:'center',fontSize:11,color:'var(--text3)',marginTop:8}}>
                      {[zipFile?'📦 '+zipFile.readFiles+' files ('+formatLoc(zipFile.locCount)+')':'',schemaFile?'🗄️ '+schemaFile.summary:'',mongoFile?'🍃 '+mongoFile.summary:''].filter(Boolean).join(' + ')}
                    </div>
                  </div>
                )}

                {/* PANEL 3 — LOADING */}
                {modalPanel==='loading'&&(
                  <div style={{textAlign:'center',padding:'20px 0'}}>
                    <div style={{width:40,height:40,border:'3px solid var(--border2)',borderTopColor:'#f59e0b',borderRadius:'50%',animation:'qdsp .7s linear infinite',margin:'0 auto 18px'}}/>
                    <div style={{fontSize:15,fontWeight:500,marginBottom:6}}>{loadingTitle}</div>

                    {/* Subtitle + context size (Problem 1) */}
                    <div style={{fontSize:12,color:'var(--text3)',marginBottom:contextChars>0?8:24}}>
                      Claude is reading your codebase and generating a structured guide with 20,000 tokens.
                    </div>

                    {contextChars>0&&(
                      <div style={{display:'flex',justifyContent:'center',gap:16,marginBottom:16,fontSize:11,fontFamily:'var(--font-mono)'}}>
                        <span style={{color:'var(--text4)'}}>
                          Context: <strong style={{color:'var(--text2)'}}>{contextChars.toLocaleString()}</strong> chars
                        </span>
                        <span style={{color:'var(--text4)'}}>≈</span>
                        <span style={{color:'var(--text4)'}}>
                          <strong style={{color:Math.round(contextChars/4)>180000?'#ef4444':'#22c55e'}}>
                            {Math.round(contextChars/4).toLocaleString()}
                          </strong> tokens sent
                        </span>
                        <span style={{color:'var(--text4)'}}>·</span>
                        <span style={{color:'var(--text4)'}}>
                          <strong style={{color:'#f59e0b'}}>20,000</strong> max output
                        </span>
                      </div>
                    )}

                    {/* Retry note (Problem 3) */}
                    {loadingNote&&(
                      <div style={{fontSize:11,color:'#f59e0b',marginBottom:12,padding:'6px 12px',background:'rgba(245,158,11,.1)',border:'1px solid rgba(245,158,11,.3)',borderRadius:8,display:'inline-block'}}>
                        ⟳ {loadingNote}
                      </div>
                    )}

                    <div style={{maxWidth:340,margin:'0 auto',display:'flex',flexDirection:'column',gap:6}}>
                      {[
                        'Saving project to BigQuery',
                        'Building AI context',
                        'Claude analysing codebase',
                        'Parsing structured data',
                        'Saving full report',
                      ].map((lbl,i)=>(
                        <div key={i} className={`qd-step-row${loadingSteps[i]==='active'?' active':loadingSteps[i]==='done'?' done':''}`}>
                          <span style={{fontSize:10,fontWeight:600,minWidth:16,textAlign:'right'}}>{i+1}</span>
                          <span className="qd-step-dot"/>
                          <span>{lbl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PANEL 4 — DONE */}
                {modalPanel==='done'&&(
                  <div style={{textAlign:'center',padding:'28px 16px'}}>
                    <div style={{fontSize:44,marginBottom:14}}>{doneTitle.includes('Failed')?'⚠️':'✅'}</div>
                    <div style={{fontSize:17,fontWeight:700,marginBottom:6}}>{doneTitle}</div>
                    <div style={{fontSize:12,color:'var(--text3)',marginBottom:24}}>{doneSub}</div>
                    <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
                      {lastProjectId&&(
                        <button onClick={()=>{setModalOpen(false);router.push('/admin/qd-dev/'+encodeURIComponent(lastProjectId))}}
                          style={{padding:'10px 22px',background:'linear-gradient(135deg,#f59e0b,#ef4444)',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer'}}>Open Report →</button>
                      )}
                      <button onClick={()=>{setModalOpen(false);loadProjects()}}
                        style={{padding:'10px 22px',background:'var(--bg3)',color:'var(--text2)',border:'1px solid var(--border2)',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer'}}>Back to Projects</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </PageShell>
    </>
  )
}
