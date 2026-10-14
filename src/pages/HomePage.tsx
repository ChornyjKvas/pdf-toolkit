import { Link } from 'react-router-dom'
import { tools } from '../lib/tools'

export function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="home-title">
        <p className="eyebrow"><span className="status-dot" aria-hidden="true" /> YOUR EVERYDAY PDF WORKSPACE</p>
        <h1 id="home-title">Less friction.<br /><span>More finished.</span></h1>
        <p className="hero-description">Simple tools for the documents in your day. Merge, split, rotate, remove, and visually arrange PDF pages right in your browser.</p>
        <div className="privacy-note"><span className="privacy-icon" aria-hidden="true">✓</span><div><strong>Your files stay in your browser.</strong><p>All five tools run on your device. No PDF content is sent to our servers.</p></div></div>
      </section>
      <section className="tools-section" aria-labelledby="tools-title">
        <div className="section-heading"><h2 id="tools-title">A tool for each small task.</h2><span>FIVE EVERYDAY TOOLS. READY TO USE.</span></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link className="tool-card" key={tool.path} to={tool.path} aria-label={`${tool.name} — Available`}>
              <div className="card-top"><span className="tool-number" aria-hidden="true">{tool.mark}</span><span className="badge">Available</span></div>
              <h3>{tool.name}</h3><p>{tool.description}</p><span className="card-link">Explore tool <span aria-hidden="true">↗</span></span>
            </Link>
          ))}
        </div>
      </section>
      <aside className="foundation-note"><span aria-hidden="true">↳</span><p>Small tools, a clear purpose. Everyday essentials, with local document processing at the core.</p></aside>
    </>
  )
}
