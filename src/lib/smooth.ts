import Lenis from 'lenis'
import { gate } from './gate'

/**
 * One shared Lenis instance. Lenis smooths wheel scrolling but still moves the
 * real window scroll, so sticky sections and framer's useScroll keep working.
 * Touch keeps native momentum (syncTouch off) — phones already scroll smoothly.
 */
let lenis: Lenis | null = null

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function startSmoothScroll() {
  if (lenis || typeof window === 'undefined') return lenis
  installAnchorJumps()
  if (reducedMotion()) return null
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => 1 - Math.pow(1 - t, 4),
    // In-page links are handled by installAnchorJumps (long jumps fade instead).
    anchors: false,
    wheelMultiplier: 0.95,
  })
  const raf = (time: number) => {
    lenis?.raf(time)
    requestAnimationFrame(raf)
  }
  requestAnimationFrame(raf)
  return lenis
}

export function getLenis() {
  return lenis
}

/** Document y for an element, honouring its scroll-margin-top. */
function targetY(target: number | HTMLElement) {
  if (typeof target === 'number') return target
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0
  return target.getBoundingClientRect().top + window.scrollY - margin
}

function jumpNow(y: number) {
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true })
  else window.scrollTo({ top: y, behavior: 'auto' })
}

/**
 * Scroll to a y position or element.
 * - short moves glide (and stay smooth inside the magazine for prev/next);
 * - long moves (> ~1 screen) fade through, so nothing
 *   scroll-driven — like the magazine — is fast-forwarded past the reader.
 */
export function scrollToTarget(target: number | HTMLElement, immediate = false, forceGate = false) {
  const y = Math.max(0, targetY(target))
  if (immediate || reducedMotion()) return jumpNow(y)
  const distance = Math.abs(y - window.scrollY)
  if (forceGate || distance > window.innerHeight * 1.1) {
    void gate(() => jumpNow(y))
    return
  }
  if (lenis) lenis.scrollTo(y, { duration: 1.1 })
  else window.scrollTo({ top: y, behavior: 'smooth' })
}

/** Every same-page "#section" link goes through scrollToTarget. */
let anchorsInstalled = false
function installAnchorJumps() {
  if (anchorsInstalled) return
  anchorsInstalled = true
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!a || (a.target && a.target !== '_self')) return
    const url = new URL(a.href, location.href)
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return
    const el = document.getElementById(decodeURIComponent(url.hash.slice(1)))
    if (!el) return
    e.preventDefault()
    if (url.hash !== location.hash) history.pushState(null, '', url.hash)
    scrollToTarget(el, false, a.hasAttribute('data-gate'))
  })
}
