/**
 * A quiet fade-through for route changes and long in-page jumps, so nothing
 * scroll-driven (the magazine) is ever fast-forwarded in front of the reader.
 */
let el: HTMLDivElement | null = null
let busy = false

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

function build() {
  if (el) return el
  el = document.createElement('div')
  el.className = 'page-fade'
  el.setAttribute('aria-hidden', 'true')
  document.body.appendChild(el)
  return el
}

async function out(g: HTMLDivElement) {
  await frame()
  await frame()
  await wait(110)
  g.dataset.state = 'out'
  await wait(640)
  g.dataset.state = ''
}

/* When a route change lands on a section, the destination page reports when the
 * jump has actually settled, so the veil never lifts mid-layout. */
let settleCurrent: (() => void) | null = null

export function armSettle(timeout = 2400) {
  return new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer)
      if (settleCurrent === done) settleCurrent = null
      resolve()
    }
    const timer = setTimeout(done, timeout)
    settleCurrent = done
  })
}

export function settle() {
  settleCurrent?.()
}

/** Cover → run `work` (navigate / jump) underneath → reveal. */
export async function gate(work: () => void, hold?: Promise<void>) {
  if (busy || reduced()) return work()
  busy = true
  const g = build()
  // Settle on the resting state and force the browser to compute it. Without
  // this the first paint can land straight on the covered state and the fade
  // never runs (rAF callbacks fire before style is calculated).
  g.dataset.state = ''
  void g.offsetWidth
  g.dataset.state = 'in'
  await wait(400)
  work()
  if (hold) await hold
  await out(g)
  busy = false
}

/** Back/forward: the page has already changed, so start covered and reveal. */
export async function reveal() {
  if (busy || reduced()) return
  busy = true
  const g = build()
  g.dataset.state = 'cover'
  await wait(120)
  await out(g)
  busy = false
}

/* Router hook-up: lets non-link code (the 3D magazine) navigate through the gate. */
let navigateFn: ((to: string) => void) | null = null
export function setNavigator(fn: (to: string) => void) {
  navigateFn = fn
}
export function goTo(to: string) {
  const url = new URL(to, location.href)
  if (!navigateFn) return void (location.href = url.href)
  void gate(() => navigateFn!(url.pathname + url.hash))
}
