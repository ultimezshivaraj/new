import JSZip from 'jszip'
import type { SecurityIssue } from './types'

// ─── ZIP Extraction ───────────────────────────────────────────────────────────

export interface ExtractedFile {
  path:    string
  content: string
}

const SKIP_EXT   = new Set(['.png','.jpg','.jpeg','.gif','.webp','.svg','.ico','.woff','.woff2','.ttf','.eot','.mp4','.mp3','.pdf','.zip','.tar','.gz'])
const SKIP_DIRS  = new Set(['node_modules','.git','.next','dist','build','.cache','coverage','__pycache__','vendor'])
const MAX_FILE_SIZE = 80_000   // chars
const MAX_TOTAL     = 180_000  // chars fed to Claude

export async function extractZip(buffer: ArrayBuffer): Promise<{
  files:     ExtractedFile[]
  fileCount: number
  skipped:   number
}> {
  const zip      = await JSZip.loadAsync(buffer)
  const results: ExtractedFile[] = []
  let total   = 0
  let skipped = 0

  const entries = Object.entries(zip.files)
    .filter(([, f]) => !f.dir)
    .sort(([a], [b]) => a.localeCompare(b))

  for (const [path, file] of entries) {
    const parts = path.split('/')
    if (parts.some(p => SKIP_DIRS.has(p))) { skipped++; continue }
    const ext = path.includes('.') ? '.' + path.split('.').pop()!.toLowerCase() : ''
    if (SKIP_EXT.has(ext)) { skipped++; continue }

    try {
      const text = await file.async('string')
      if (text.length > MAX_FILE_SIZE) { skipped++; continue }
      if (total + text.length > MAX_TOTAL) break
      results.push({ path, content: text })
      total += text.length
    } catch {
      skipped++
    }
  }

  return { files: results, fileCount: entries.length, skipped }
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

export function buildAnalysisPrompt(
  projectName: string,
  schema:      string,
  files:       ExtractedFile[]
): string {
  const fileBlock = files
    .map(f => `### FILE: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n')

  return `You are QD Dev, an internal developer intelligence AI for Ultimez Technology / Coinpedia.
Analyse the codebase below and produce a full HTML technical report.

PROJECT: ${projectName}
${schema ? `BIGQUERY SCHEMA:\n${schema}` : ''}

CODEBASE:
${fileBlock}

---

OUTPUT: Return ONLY valid HTML (no markdown, no \`\`\`html fences).
The HTML must contain exactly these two section IDs: #section-overview and #section-code-db

Use inline CSS only (no external stylesheets). Dark theme: bg #0e1117, text #e8eaf0, accent #f59e0b.
Tables: width:100%, border-collapse:collapse, font-size:12px. th: background:#1a1f2e, padding:8px 10px. td: padding:7px 10px, border-bottom:1px solid rgba(255,255,255,0.06).

For #section-overview produce ALL of:
1. Plain-English summary (3–4 sentences — what the project does, who uses it, what tech it runs on)
2. Stats: health score 0–100, file count, detected line count estimate, team size if inferable
3. Tech stack (list of detected technologies as coloured pills)
4. External services / integrations detected
5. User roles and their access (table or cards: role, path prefix, what they can do, auth method)
6. Risk summary table: Critical / High / Medium / Low / Info counts

For #section-code-db produce ALL of:
1. Folder structure (monospace tree)
2. Key API routes table — Method | Route | Auth | Description
3. Database tables list — table name, key columns, purpose, any concerns
4. Key execution flows (3–5 numbered step flows: login, report run, etc.)
5. Environment variables / cache keys / Vercel config notes

Security issues: embed them in #section-overview risk summary AND as individual
<div class="issue-block" data-severity="critical|high|medium|low|info" data-fix="EXACT FIX CODE">
  <strong>Title</strong> — description. File: path:line if known.
</div>

Also include a JSON block at the very end (inside <!-- --> comment) with this exact shape:
<!--QDMETA
{
  "health_score": <number 0-100>,
  "tech_stack": ["Next.js","BigQuery",...],
  "security_issues": [
    {"id":"s1","severity":"critical","title":"...","description":"...","file":"...","line":0,"fix":"..."}
  ]
}
QDMETA-->
`
}

// ─── Parse AI meta from HTML comment ─────────────────────────────────────────

export function parseQDMeta(html: string): {
  health_score:    number
  tech_stack:      string[]
  security_issues: SecurityIssue[]
} | null {
  const m = html.match(/<!--QDMETA\s*([\s\S]*?)\s*QDMETA-->/)
  if (!m) return null
  try {
    const raw = JSON.parse(m[1])
    return {
      health_score:    Number(raw.health_score) || 0,
      tech_stack:      Array.isArray(raw.tech_stack) ? raw.tech_stack : [],
      security_issues: Array.isArray(raw.security_issues) ? raw.security_issues : [],
    }
  } catch {
    return null
  }
}
