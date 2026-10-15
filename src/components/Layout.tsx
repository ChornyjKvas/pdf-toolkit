import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { tools } from '../lib/tools'

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)

  useEffect(() => {
    const title = tools.find((tool) => tool.path === pathname)?.name
    document.title = pathname === '/' ? 'PDF Toolkit — Simple tools, local files' : `${title ?? 'Page not found'} — PDF Toolkit`
  }, [pathname])

  useEffect(() => {
    if (previousPath.current !== pathname) {
      mainRef.current?.focus()
      window.scrollTo(0, 0)
      previousPath.current = pathname
    }
  }, [pathname])

  return (
    <div className={pathname === '/' ? 'shell home-shell' : 'shell'}>
      <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); mainRef.current?.focus() }}>Skip to content</a>
      <header className="site-header">
        <Link to="/" className="brand"><span className="brand-mark">P.</span> PDF Toolkit</Link>
        {pathname !== '/' && <span className="header-note">A little less paperwork.</span>}
      </header>
      <main ref={mainRef} id="main-content" tabIndex={-1}>{children}</main>
      <footer className="site-footer"><p>PDF Toolkit <span aria-hidden="true">/</span> In development</p><a href="./THIRD_PARTY_NOTICES.txt">Dependency licenses</a><Link to="/">Back to home <span aria-hidden="true">↗</span></Link></footer>
    </div>
  )
}
