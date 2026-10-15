import { Link } from 'react-router-dom'
import { ToolIcon } from '../components/ToolIcon'
import { getAvailableTools } from '../lib/tools'

export function HomePage() {
  return <div className="home-page">
    <section aria-labelledby="home-title">
      <div className="home-intro">
        <h1 id="home-title">What do you want to do?</h1>
        <p>Choose a tool and get straight to your PDF.</p>
      </div>
      <ul className="home-tool-grid" aria-label="PDF tools">
        {getAvailableTools().map((tool) => <li key={tool.id}>
          <Link className="home-tool-card" to={tool.path}>
            <div className="home-card-top"><span className="home-tool-icon"><ToolIcon name={tool.icon} /></span><span className="home-tool-state">Available</span></div>
            <h2>{tool.name}</h2>
            <p>{tool.description}</p>
            <span className="home-tool-action">Open tool <span aria-hidden="true">↗</span></span>
          </Link>
        </li>)}
      </ul>
    </section>
    <aside className="home-privacy" aria-label="Local processing">
      <span aria-hidden="true">✓</span>
      <p>The five tools above process PDF files in your browser. No PDF content is sent to our servers.</p>
    </aside>
  </div>
}
