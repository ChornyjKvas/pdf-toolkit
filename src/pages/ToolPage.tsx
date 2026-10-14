import { Link } from 'react-router-dom'
import type { Tool } from '../lib/tools'

export function ToolPage({ tool }: { tool: Tool }) {
  return (
    <section className="detail-page" aria-labelledby="tool-title">
      <Link className="back-link" to="/">← All tools</Link>
      <p className="eyebrow">PDF TOOLKIT / {tool.mark}</p>
      <h1 id="tool-title">{tool.name}</h1>
      <p className="detail-description">{tool.detail}</p>
      <div className="placeholder-panel"><span className="badge">Coming soon</span><h2>A simpler way is on its way.</h2><p>This tool is still in development. There is currently no file upload or PDF processing functionality.</p><p>When implemented, processing will happen locally in your browser, without sending your documents to a server.</p></div>
      <Link className="primary-link" to="/">Back to home <span aria-hidden="true">↗</span></Link>
    </section>
  )
}
