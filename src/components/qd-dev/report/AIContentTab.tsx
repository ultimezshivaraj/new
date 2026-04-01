'use client'

import { useEffect, useRef } from 'react'

interface Props {
  html:      string
  sectionId: string
}

export default function AIContentTab({ html, sectionId }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    if (!html) {
      ref.current.innerHTML = `
        <div class="empty" style="padding:48px 24px">
          <div class="empty-icon">📄</div>
          <h3>No report yet</h3>
          <p>Run an analysis to generate this section.</p>
        </div>`
      return
    }

    // Extract the specific section from the AI-generated HTML
    const parser  = new DOMParser()
    const doc     = parser.parseFromString(html, 'text/html')
    const section = doc.getElementById(sectionId)

    ref.current.innerHTML = section
      ? section.innerHTML
      : html  // fallback: render everything

    // Inject "Copy Fix" buttons on all .issue-block elements
    ref.current.querySelectorAll<HTMLElement>('.issue-block').forEach(block => {
      const fix = block.dataset.fix
      if (!fix) return
      if (block.querySelector('.issue-copy-btn')) return  // already added

      const btn = document.createElement('button')
      btn.className   = 'issue-copy-btn'
      btn.textContent = 'Copy Fix'
      btn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(fix)
        btn.textContent = 'Copied ✓'
        setTimeout(() => { btn.textContent = 'Copy Fix' }, 2000)
      })
      block.style.position = 'relative'
      block.appendChild(btn)
    })
  }, [html, sectionId])

  return (
    <div ref={ref} className="ai-content card" style={{ minHeight: 200 }} />
  )
}
