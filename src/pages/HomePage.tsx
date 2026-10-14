import { Link } from 'react-router-dom'
import { tools } from '../lib/tools'

export function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="home-title">
        <p className="eyebrow"><span className="status-dot" aria-hidden="true" /> YOUR EVERYDAY PDF WORKSPACE</p>
        <h1 id="home-title">Less friction.<br /><span>More finished.</span></h1>
        <p className="hero-description">Simple tools for the documents in your day. Merge PDFs right in your browser. Split, rotate, and delete pages are coming next.</p>
        <div className="privacy-note"><span className="privacy-icon" aria-hidden="true">✓</span><div><strong>Your files stay in your browser.</strong><p>PDF merging runs on your device. No PDF content is sent to our servers.</p></div></div>
      </section>
      <section className="tools-section" aria-labelledby="tools-title">
        <div className="section-heading"><h2 id="tools-title">A tool for each small task.</h2><span>MERGE NOW. MORE TO COME.</span></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool) => (
            <Link className="tool-card" key={tool.path} to={tool.path} aria-label={`${tool.name} — ${tool.path === '/merge-pdf' ? 'Available' : 'Coming soon'}`}>
              <div className="card-top"><span className="tool-number" aria-hidden="true">{tool.mark}</span><span className="badge">{tool.path === '/merge-pdf' ? 'Available' : 'Coming soon'}</span></div>
              <h3>{tool.name}</h3><p>{tool.description}</p><span className="card-link">Explore tool <span aria-hidden="true">↗</span></span>
            </Link>
          ))}
        </div>
      </section>
      <aside className="foundation-note"><span aria-hidden="true">↳</span><p>Small tools, a clear purpose. We’re building the essentials first, with local document processing at the core.</p></aside>
    </>
  )
}
