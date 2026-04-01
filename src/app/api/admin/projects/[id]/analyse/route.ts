import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getProject, updateProjectStatus } from '@/lib/qd-dev/bq'
import { extractZip, buildAnalysisPrompt, parseQDMeta } from '@/lib/qd-dev/analysis'
import { verifyAdmin, err } from '@/lib/qd-dev/utils'
import type { AnalysisEvent } from '@/lib/qd-dev/types'

export const maxDuration = 300

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(req)) return err('Unauthorized', 401)
  const { id } = await params

  const project = await getProject(id)
  if (!project) return err('Project not found', 404)

  // Parse multipart: zip file + optional schema text
  const form   = await req.formData()
  const zipFile = form.get('zip') as File | null
  const schema  = (form.get('schema') as string | null) ?? ''

  if (!zipFile) return err('zip file required')

  const buffer = await zipFile.arrayBuffer()

  const stream = new ReadableStream({
    async start(controller) {
      function send(evt: AnalysisEvent) {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(evt)}\n\n`)
        )
      }

      try {
        // Step 1 — Extract
        send({ type: 'progress', step: 1, label: 'Extracting ZIP…' })
        await updateProjectStatus(id, 'analysing')
        const { files, fileCount } = await extractZip(buffer)

        // Step 2 — Build prompt
        send({ type: 'progress', step: 2, label: `Indexing ${fileCount} files…` })
        const prompt = buildAnalysisPrompt(project.project_name, schema, files)

        // Step 3 — Stream Claude
        send({ type: 'progress', step: 3, label: 'QD Dev AI analysing…' })
        const client = new Anthropic()
        let html = ''

        const claudeStream = await client.messages.stream({
          model:      'claude-sonnet-4-5',
          max_tokens: 8192,
          messages:   [{ role: 'user', content: prompt }],
        })

        for await (const chunk of claudeStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            html += chunk.delta.text
          }
        }

        // Step 4 — Parse metadata
        send({ type: 'progress', step: 4, label: 'Parsing report…' })
        const meta = parseQDMeta(html)

        // Step 5 — Save to BigQuery
        send({ type: 'progress', step: 5, label: 'Saving to BigQuery…' })
        await updateProjectStatus(id, 'complete', {
          health_score:    meta?.health_score    ?? 0,
          file_count:      fileCount,
          tech_stack:      meta?.tech_stack      ?? [],
          security_issues: meta?.security_issues ?? [],
          report_html:     html,
        })

        const saved = await getProject(id)
        send({ type: 'complete', data: saved ?? undefined })
      } catch (e) {
        const msg = String(e)
        await updateProjectStatus(id, 'error', { error_message: msg }).catch(() => {})
        send({ type: 'error', message: msg })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
