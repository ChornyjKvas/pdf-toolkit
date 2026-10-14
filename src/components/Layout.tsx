import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)

  useEffect(() => {
    if (previousPath.current !== pathname) {
      mainRef.current?.focus()
      window.scrollTo(0, 0)
      previousPath.current = pathname
    }
  }, [pathname])

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); mainRef.current?.focus() }}>Skip to content</a>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="PDF Toolkit home"><span className="brand-mark" aria-hidden="true">P.</span>PDF Toolkit</Link>
        <span className="header-note">A little less paperwork.</span>
      </header>
      <main ref={mainRef} id="main-content" tabIndex={-1}>{children}</main>
      <footer className="site-footer"><p>PDF Toolkit <span aria-hidden="true">/</span> In development</p><Link to="/">Back to home <span aria-hidden="true">↗</span></Link></footer>
    </div>
  )
}
