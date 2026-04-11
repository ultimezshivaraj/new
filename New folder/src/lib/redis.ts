// ─────────────────────────────────────────────
// UPSTASH REDIS CACHE
// Uses the Upstash REST API (no npm package).
// Exact port of the cache logic in api/run-report.js
// ─────────────────────────────────────────────

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL    // e.g. https://xxx.upstash.io
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN  // e.g. AXxxxx...

// TTL in seconds per category — copied from run-report.js
export const CACHE_TTL: Record<string, number> = {
  'Companies':              21600,  // 6 hours
  'Courses':                21600,
  'Fact Check':             14400,  // 4 hours
  'Content - Categories':   14400,
  'SEO - Search Console':   21600,
  'GSC - Subdomains':       21600,
  'GA4 Analytics':          10800,  // 3 hours
  'Performance':            43200,  // 12 hours
  'UX - Clarity':           43200,
  'Cross-Dataset':          14400,
  'Chat Analytics':         3600,   // 1 hour
}
export const DEFAULT_TTL = 7200 // 2 hours fallback

// ─────────────────────────────────────────────
// GET — returns parsed value or null on miss
// ─────────────────────────────────────────────
export async function redisGet<T>(key: string): Promise<T | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null
  try {
    const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    })
    const data = await res.json() as { result?: string }
    if (data.result) return JSON.parse(data.result) as T
  } catch {
    // Cache miss — fall through to BigQuery
  }
  return null
}

// ─────────────────────────────────────────────
// SET WITH TTL — fire-and-forget friendly
// Uses Upstash pipeline: SET + EXPIRE in one call
// ─────────────────────────────────────────────
export async function redisSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!REDIS_URL || !REDIS_TOKEN) return
  try {
    await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['SET', key, JSON.stringify(value)],
        ['EXPIRE', key, ttlSeconds],
      ]),
    })
  } catch {
    // Non-blocking — cache write failures are acceptable
  }
}
