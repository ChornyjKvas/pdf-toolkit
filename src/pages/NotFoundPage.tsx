import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return <section className="detail-page"><p className="eyebrow">404 / PAGE NOT FOUND</p><h1>Page not found</h1><p className="detail-description">This page may have moved, or the address may be incorrect.</p><Link className="primary-link" to="/">Back to home <span aria-hidden="true">↗</span></Link></section>
}
