import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getProject } from '@/lib/qd-dev/bq'
import { verifyAdmin, err } from '@/lib/qd-dev/utils'
import type { ChatMessage } from '@/lib/qd-dev/types'

export const maxDuration = 120

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(req)) return err('Unauthorized', 401)
  const { id } = await params

  const { messages }: { messages: ChatMessage[] } = await req.json()
  if (!messages?.length) return err('messages required')

  const project = await getProject(id)
  if (!project) return err('Project not found', 404)

  // Build system prompt with full project context
  const systemPrompt = `You are QD Dev AI — the internal developer intelligence assistant for Ultimez Technology / Coinpedia.
You have deep knowledge of the following project.

PROJECT: ${project.project_name}
STATUS: ${project.status}
HEALTH SCORE: ${project.health_score}/100
TECH STACK: ${project.tech_stack.join(', ')}
FILES ANALYSED: ${project.file_count}
SECURITY ISSUES: ${project.security_issues.length} total (${project.security_issues.filter(i => i.severity === 'critical').length} critical)

${project.report_html ? `FULL ANALYSIS REPORT (use this as your primary reference):\n${project.report_html.slice(0, 40000)}` : 'No report generated yet.'}

Answer developer questions about this codebase. Be specific, cite file paths and line numbers when known. For security issues, always provide actionable fix code. Keep responses concise but technically precise.`

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      try {
        const client = new Anthropic()
        const claudeStream = await client.messages.stream({
          model:      'claude-sonnet-4-5',
          max_tokens: 2048,
          system:     systemPrompt,
          messages:   messages.map(m => ({ role: m.role, content: m.content })),
        })
        for await (const chunk of claudeStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(enc.encode(chunk.delta.text))
          }
        }
      } catch (e) {
        controller.enqueue(enc.encode(`\n\nError: ${String(e)}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
