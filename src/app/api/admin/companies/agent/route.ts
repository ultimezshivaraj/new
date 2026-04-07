// src/app/api/admin/companies/agent/route.ts
// POST — run the AI enrichment agent on a company
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, DS_APP } from '@/lib/bigquery'

const COMPANY_TABLE = `${PROJECT}.${DS_APP}.main_db_cln_company_lists`
const STAGING_TABLE = `${PROJECT}.${DS_APP}.Companies_Analyst_AGENT`
const GEMINI_MODEL = `${PROJECT}.cp_wp_bigquery.gemini_model`
const AGENT_VERSION = 'companies-analyst-v3'
const ALL_SECTIONS = ['about', 'details', 'funding', 'team', 'products']

export async function POST(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const t0 = Date.now()

  try {
    const body = await req.json()
    const company_id = body.company_id as string
    const sections = (body.sections as string[]) || ALL_SECTIONS
    const dry_run = (body.dry_run as boolean) || false

    if (!company_id)
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 })

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    // ── 1. Fetch company ─────────────────────────────────────────
    // company_id comes from a verified admin request body — safe to inline
    const safeCid = company_id.replace(/'/g, "''")
    const companyRows = await bqQuery<Record<string, string>>(`
      SELECT
        JSON_VALUE(data,'$._id')                  AS company_id,
        JSON_VALUE(data,'$.company_name')         AS company_name,
        JSON_VALUE(data,'$.company_url')          AS company_url,
        JSON_VALUE(data,'$.website_link')         AS website_link,
        JSON_VALUE(data,'$.company_description')  AS company_description,
        JSON_VALUE(data,'$.describe_in_one_line') AS tagline,
        JSON_VALUE(data,'$.launch_date')          AS launch_date,
        JSON_VALUE(data,'$.company_size')         AS company_size,
        JSON_VALUE(data,'$.valuation')            AS valuation,
        JSON_VALUE(data,'$.email')                AS email,
        JSON_VALUE(data,'$.company_location')     AS location,
        JSON_VALUE(data,'$.primary_category')     AS category
      FROM \`${COMPANY_TABLE}\`
      WHERE JSON_VALUE(data,'$._id') = '${safeCid}'
      LIMIT 1
    `)

    const company = companyRows[0]
    if (!company)
      return NextResponse.json({ error: `Company ${company_id} not found` }, { status: 404 })

    // ── 2. Fetch web content ─────────────────────────────────────
    const web = await fetchWebContent(company)
    const context = buildContext(web)

    if (context.length < 100) {
      return NextResponse.json({
        success: false,
        company_name: company.company_name,
        message: 'No web content found — Wikipedia may not have an article for this company',
      })
    }

    // ── 3. Extract per section via Gemini ────────────────────────
    const stagedRows: Record<string, unknown>[] = []
    for (const sec of sections) {
      try {
        const rows = await extractSection(sec, company, web, context, runId)
        stagedRows.push(...rows)
      } catch (e) {
        console.error(`[Agent] ${sec} failed:`, e instanceof Error ? e.message : e)
      }
    }

    // ── 4. Write to staging ──────────────────────────────────────
    if (!dry_run && stagedRows.length > 0) {
      await insertStaging(stagedRows)
    }

    return NextResponse.json({
      success: true,
      run_id: runId,
      company_id,
      company_name: company.company_name,
      sections_run: sections,
      rows_staged: stagedRows.length,
      content_chars: context.length,
      dry_run,
      duration: `${((Date.now() - t0) / 1000).toFixed(1)}s`,
      preview: dry_run ? stagedRows : undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Agent] Fatal:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// ── Web fetching ──────────────────────────────────────────────────────────────
async function fetchWebContent(company: Record<string, string>) {
  const web: Record<string, string> = {}

  const [wikiRes, siteRes] = await Promise.allSettled([
    fetchWikipedia(company.company_name),
    company.website_link ? fetchWebsite(company.website_link) : Promise.resolve(null),
  ])

  if (wikiRes.status === 'fulfilled' && wikiRes.value) {
    web.wiki = wikiRes.value.text
    web.wiki_url = wikiRes.value.url
  }
  if (siteRes.status === 'fulfilled' && siteRes.value) {
    web.site = siteRes.value.text
    web.site_url = siteRes.value.url
  }

  // Wikipedia fallback variations
  if (!web.wiki) {
    const tries = [
      `${company.company_name} (company)`,
      `${company.company_name} (cryptocurrency)`,
      `${company.company_name} (exchange)`,
      company.company_name.replace(/ foundation$/i, ''),
      company.company_name.split(' ')[0],
    ].filter(t => t !== company.company_name && t.length > 1)

    for (const t of tries) {
      const r = await fetchWikipedia(t)
      if (r) { web.wiki = r.text; web.wiki_url = r.url; break }
    }
  }

  return web
}

async function fetchWikipedia(name: string) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/\s+/g, '_'))}`
    const r = await fetch(url, {
      headers: { 'User-Agent': 'CoinpediaBot/3.0' },
      signal: AbortSignal.timeout(10000),
    })
    if (!r.ok) return null
    const d = await r.json() as Record<string, unknown>
    if (d.type === 'disambiguation' || !d.extract || (d.extract as string).length < 50) return null
    const urls = d.content_urls as Record<string, Record<string, string>> | undefined
    return {
      text: (d.description ? `[${d.description}]\n\n` : '') + String(d.extract),
      url: urls?.desktop?.page || url,
    }
  } catch { return null }
}

async function fetchWebsite(siteUrl: string) {
  const base = siteUrl.trim().replace(/\/$/, '').replace(/^(?!https?:\/\/)/, 'https://')
  for (const path of ['', '/about', '/about-us', '/company', '/en/about']) {
    try {
      const r = await fetch(base + path, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(9000),
      })
      if (!r.ok) continue
      const txt = stripHTML(await r.text())
      if (txt.length > 200) return { text: txt.substring(0, 6000), url: base + path }
    } catch { /* try next path */ }
  }
  return null
}

function stripHTML(h: string) {
  return h
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

function buildContext(web: Record<string, string>) {
  const parts: string[] = []
  if (web.wiki) parts.push(`=== WIKIPEDIA ===\nSource: ${web.wiki_url}\n${web.wiki}`)
  if (web.site) parts.push(`=== WEBSITE ===\nSource: ${web.site_url}\n${web.site}`)
  return parts.join('\n\n').substring(0, 10000)
}

// ── Gemini extraction via BigQuery ML ─────────────────────────────────────────
// The prompt is passed as a BQ named parameter (@prompt) to safely handle
// apostrophes, quotes, newlines and other special characters in web content.
async function extractSection(
  section: string,
  company: Record<string, string>,
  web: Record<string, string>,
  context: string,
  runId: string,
) {
  const prompt = buildPrompt(section, company, context)

  // Inline the prompt safely — escape single quotes
  const safePrompt = prompt.replace(/'/g, "''")

  const rows = await bqQuery<{ result: string }>(`
    SELECT ml_generate_text_result AS result
    FROM ML.GENERATE_TEXT(
      MODEL \`${GEMINI_MODEL}\`,
      (SELECT '${safePrompt}' AS prompt),
      STRUCT(2000 AS max_output_tokens, 0.1 AS temperature, 0.8 AS top_p)
    )
  `)

  const raw = rows[0]?.result
  if (!raw) return []

  const parsed = parseGemini(raw)
  if (!Array.isArray(parsed)) return []

  const isStruct = ['funding', 'team', 'products'].includes(section)
  const srcUrl = web.wiki_url || web.site_url || null

  return parsed
    .map(item => ({
      id: `agent_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      company_id: company.company_id,
      company_name: company.company_name,
      company_url: company.company_url || slugify(company.company_name),
      section,
      field_name: item.field_name || null,
      current_value: getField(company, item.field_name as string),
      agent_value: !isStruct ? (item.value || null) : null,
      agent_data: isStruct ? JSON.stringify(item.data || item) : null,
      source_url: item.source_url || srcUrl,
      source_name: item.source_name || (String(item.source_url || '').includes('wikipedia') ? 'wikipedia' : 'website'),
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.7,
      agent_version: AGENT_VERSION,
      run_id: runId,
    }))
    .filter(r => r.agent_value || r.agent_data)
}

function parseGemini(raw: string): Record<string, unknown>[] {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    let text = ''
    if (parsed?.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = parsed.candidates[0].content.parts[0].text
    } else if (typeof raw === 'string') {
      text = raw
    }
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const s = clean.indexOf('['), e = clean.lastIndexOf(']')
    if (s < 0 || e < 0) return []
    return JSON.parse(clean.substring(s, e + 1))
  } catch { return [] }
}

function buildPrompt(section: string, company: Record<string, string>, context: string) {
  const base =
    `You are Companies AI Analyst for Coinpedia.\n` +
    `Company: ${company.company_name}\n` +
    `Website: ${company.website_link || 'unknown'}\n` +
    `Category: ${company.category || 'crypto'}\n\n` +
    `SOURCE CONTENT:\n${context}\n\n` +
    `RULES: Only use data from the source above. Never invent data. ` +
    `Return ONLY a raw JSON array, no markdown, no backticks.\n\n`

  if (section === 'about')
    return base + 'Extract description fields:\n[{"field_name":"company_description","value":"2-4 factual sentences about what company does, when founded, key metric","source_url":"URL","source_name":"wikipedia or website","confidence":0.90},{"field_name":"tagline","value":"one line under 100 chars","source_url":"URL","source_name":"wikipedia or website","confidence":0.85}]'

  if (section === 'details')
    return base + 'Extract company details (only include fields found in content):\n[{"field_name":"launch_date","value":"YYYY-MM","source_url":"URL","source_name":"wikipedia","confidence":0.90},{"field_name":"location","value":"City, Country","source_url":"URL","source_name":"wikipedia","confidence":0.85},{"field_name":"company_size","value":"one of: 1-10,11-50,51-200,201-500,501-1000,1000+","source_url":"URL","source_name":"website","confidence":0.75},{"field_name":"valuation","value":"USD millions as number only","source_url":"URL","source_name":"wikipedia","confidence":0.70},{"field_name":"email","value":"email@company.com","source_url":"URL","source_name":"website","confidence":0.95}]'

  if (section === 'funding')
    return base + 'Extract funding rounds. Return [] if none found:\n[{"field_name":"funding_round","data":{"investor_name":"Name","investor_category":"VC or Angel or Corporate","funding_type":"Seed or Series A or Series B","funding_date":"YYYY-MM","amount":"15000000","currency":"USD","invested_by":"Investor1, Investor2"},"source_url":"URL","source_name":"wikipedia","confidence":0.85}]'

  if (section === 'team')
    return base + 'Extract founders and C-suite (max 8). Return [] if none found:\n[{"field_name":"team_member","data":{"full_name":"Name","role":"CEO and Co-founder","member_type":"board or team","linkedin_url":"URL or null","twitter_url":"URL or null","login_status":1,"approval_status":1},"source_url":"URL","source_name":"website","confidence":0.90}]'

  if (section === 'products')
    return base + 'Extract main products/services (max 8). Return [] if none found:\n[{"field_name":"product","data":{"product_name":"Name","product_description":"one sentence max 100 chars","product_url":"URL or null","product_category":"Exchange or Wallet or DeFi or Analytics"},"source_url":"URL","source_name":"website","confidence":0.85}]'

  return base + 'Extract key information as a JSON array.'
}

// ── DML INSERT to staging ─────────────────────────────────────────────────────
// Uses bqQuery with a DML statement — bqInsert is not needed since bqQuery
// handles both SELECT and DML (INSERT/UPDATE) statements in BigQuery.
async function insertStaging(rows: Record<string, unknown>[]) {
  if (!rows.length) return

  function esc(v: unknown): string {
    if (v == null) return 'NULL'
    return `'${String(v).replace(/'/g, "''").substring(0, 5000)}'`
  }

  function escJ(v: unknown): string {
    if (v == null) return 'NULL'
    // BigQuery JSON literal syntax
    return `JSON '${String(v).replace(/'/g, "''")}'`
  }

  const vals = rows.map(r => {
    const conf = r.confidence != null ? String(r.confidence) : 'NULL'
    return `(${[
      esc(r.id), esc(r.company_id), esc(r.company_name), esc(r.company_url),
      esc(r.section), esc(r.field_name),
      esc(r.current_value), esc(r.agent_value),
      escJ(r.agent_data),
      esc(r.source_url), esc(r.source_name),
      conf,
      `'pending'`, 'NULL', 'NULL', 'NULL', 'NULL',
      'CURRENT_TIMESTAMP()',
      esc(r.agent_version), esc(r.run_id),
    ].join(',')})`
  })

  // bqQuery handles DML statements — no separate bqInsert needed
  await bqQuery(`
    INSERT INTO \`${STAGING_TABLE}\`
    (id, company_id, company_name, company_url, section, field_name,
     current_value, agent_value, agent_data, source_url, source_name,
     confidence, status, reviewed_by, final_value, review_notes, reviewed_at,
     created_at, agent_version, run_id)
    VALUES ${vals.join(',\n')}
  `)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(n: string) {
  return (n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getField(c: Record<string, string>, f: string): string | null {
  const map: Record<string, string | undefined> = {
    company_description: c.company_description,
    tagline: c.tagline,
    launch_date: c.launch_date,
    company_size: c.company_size,
    valuation: c.valuation,
    email: c.email,
    location: c.location,
  }
  return map[f] || null
}