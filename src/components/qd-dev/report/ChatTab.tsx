'use client'

import { useState, useEffect, useRef } from 'react'
import type { Project, ChatMessage } from '@/lib/qd-dev/types'

const CHIPS = [
  'What are the critical security issues?',
  'Explain the architecture',
  'How does auth work?',
  'What BigQuery tables are used?',
  'List all API routes',
  'What should I fix first?',
]

function renderMarkdown(text: string): string {
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hup])/gm, '')
}

export default function ChatTab({ project }: { project: Project }) {
  const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY ?? 'coinpedia-admin-2026'
  const headers   = { Authorization: `Bearer ${ADMIN_KEY}` }

  const [messages,  setMessages]  = useState<ChatMessage[]>([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `Hello! I've analysed **${project.project_name}** — health score **${project.health_score}/100**, ${project.security_issues.length} security issue${project.security_issues.length !== 1 ? 's' : ''} (${project.security_issues.filter(i => i.severity === 'critical').length} critical), ${project.file_count} files.\n\nWhat do you want to know about this codebase?`,
    }])
  }, [project])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(content?: string) {
    const text = (content ?? input).trim()
    if (!text || loading) return
    setInput('')
    const history: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setLoading(true)

    try {
      const res = await fetch(`/api/admin/projects/${project.project_id}/chat`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let full     = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += dec.decode(value, { stream: true })
        setMessages(msgs => {
          const c = [...msgs]
          c[c.length - 1] = { role: 'assistant', content: full }
          return c
        })
      }
    } catch (e) {
      setMessages(msgs => {
        const c = [...msgs]
        c[c.length - 1] = { role: 'assistant', content: `Error: ${String(e)}` }
        return c
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="chat-wrap">
      {/* Head */}
      <div className="chat-head">
        <div className="chat-online" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>QD Dev AI</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{project.project_name}</div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
          background: 'rgba(59,130,246,.1)', color: 'var(--blue)',
          border: '1px solid rgba(59,130,246,.2)', fontFamily: 'var(--mono)',
        }}>claude-sonnet</span>
      </div>

      {/* Messages */}
      <div className="chat-body">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role === 'user' ? 'user' : 'ai'}`}>
            <div className={`chat-av ${m.role === 'user' ? 'usr-av' : 'ai-av'}`}>
              {m.role === 'user' ? 'U' : 'AI'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="chat-name">
                {m.role === 'user' ? (project.created_by || 'You') : 'QD Dev AI'}
              </div>
              <div
                className="chat-bubble"
                dangerouslySetInnerHTML={{
                  __html: m.content
                    ? renderMarkdown(m.content)
                    : loading && i === messages.length - 1
                      ? '<span style="opacity:.4">Thinking…</span>'
                      : '',
                }}
              />
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      {messages.length <= 1 && (
        <div className="chat-chips">
          {CHIPS.map(c => (
            <button key={c} className="chat-chip" onClick={() => send(c)}>{c}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="chat-input-row">
        <input
          ref={inputRef}
          className="chat-input"
          placeholder="Ask about code, schema, security…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={loading}
        />
        <button className="chat-send" onClick={() => send()} disabled={!input.trim() || loading}>
          {loading ? '…' : 'Ask →'}
        </button>
      </div>
    </div>
  )
}
