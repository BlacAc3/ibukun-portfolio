import { useEffect, useLayoutEffect, useRef } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { Masthead } from './components/Masthead'
import Home from './pages/Home'
import ProjectPage from './pages/ProjectPage'
import { scrollToTarget, startSmoothScroll } from './lib/smooth'
import { gate, reveal, setNavigator, armSettle } from './lib/gate'

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    startSmoothScroll()
  }, [])
  useEffect(() => {
    if (!hash) scrollToTarget(0, true)
  }, [pathname, hash])
  return null
}

/**
 * Page switches fade through plum. Internal links are caught in the
 * capture phase — before React Router's <Link> handles them — so the gate
 * covers the old page first, then the route changes underneath it.
 */
function FilmGateRouting() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const navType = useNavigationType()
  const first = useRef(true)

  useEffect(() => {
    setNavigator((to) => navigate(to))
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin || url.pathname === location.pathname) return
      e.preventDefault()
      // A hash means the destination page has to settle a section jump before
      // the veil lifts; arm the handshake before the route changes.
      const hold = url.hash ? armSettle() : undefined
      void gate(() => navigate(url.pathname + url.hash), hold)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [navigate, pathname])

  // Back / forward: the new page is already mounted, so cover before paint and reveal.
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (navType === 'POP') void reveal()
  }, [pathname, navType])

  return null
}

function TitleReset() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname === '/') document.title = 'Ibukun Odedele — Content Creator & Videographer'
  }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <FilmGateRouting />
      <TitleReset />
      <a href="#about" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:bg-cream focus:px-4 focus:py-2 focus:text-plum">
        Skip to content
      </a>
      <Masthead />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/work/:slug" element={<ProjectPage />} />
        <Route path="*" element={<ProjectPage />} />
      </Routes>
      <div className="vintage" aria-hidden />
      <div className="grain" aria-hidden />
    </BrowserRouter>
  )
}
