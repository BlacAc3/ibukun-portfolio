import { lazy, useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { Link } from 'react-router-dom'
import { projects } from '../data/projects'
import { profile } from '../data/profile'
import { photos } from '../data/photos'
import { LazyScene } from '../components/LazyScene'
import { Folio, MaskLines, Reveal } from '../components/Reveal'
import { useCan3D, useMaxWidth } from '../lib/media'
import { getLenis, scrollToTarget } from '../lib/smooth'
import { goTo } from '../lib/gate'

const Magazine = lazy(() => import('../three/Magazine'))
const noop = () => {}

/** Photos that appear on a project's right-hand page. */
const photoFor: Record<string, string> = { 'one-sip-at-a-time': photos.blue }

/** Leaves in the magazine: the cover plus one per project. */
const LEAVES = projects.length + 1

/**
 * The open spread for scroll progress p — same maths as the 3D book
 * (leaf i counts as turned once u > i + 0.55), so the caption is right
 * even before the scene has loaded.
 */
function spreadFor(p: number) {
  const u = p * (LEAVES + 0.5)
  return Math.max(0, Math.min(LEAVES, Math.floor(u - 0.55) + 1))
}

function ProjectList() {
  return (
    <ol className="border-b border-cream/12">
      {projects.map((p, i) => (
        <Reveal as="li" key={p.slug} delay={i * 0.05}>
          <Link
            to={`/work/${p.slug}`}
            className="group relative grid grid-cols-[2.5rem_1fr_auto] items-start gap-x-4 border-t border-cream/12 py-7 sm:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-x-8 sm:py-9"
          >
            <span
              aria-hidden
              className="absolute inset-0 origin-bottom scale-y-0 bg-plum-deep transition-transform duration-700 ease-[var(--ease-page)] group-hover:scale-y-100"
            />
            <span className="kicker relative col-start-1 row-start-1 pt-2 text-gold sm:pt-0">{String(i + 1).padStart(2, '0')}</span>
            <span className="relative col-start-2 row-start-1">
              <span className="heading block text-[clamp(1.45rem,3vw,2.4rem)] text-cream transition-transform duration-700 ease-[var(--ease-page)] sm:group-hover:translate-x-2">
                {p.name}
              </span>
              <span className="mt-1.5 block font-serif text-[0.95rem] italic text-gold-soft">{p.role}</span>
            </span>
            <span className="relative col-span-2 col-start-2 mt-3 block max-w-md text-cream/70 sm:col-span-1 sm:col-start-3 sm:mt-0">
              {p.summary}
            </span>
            <span
              aria-hidden
              className="relative col-start-3 row-start-1 grid h-11 w-11 place-items-center rounded-full border border-cream/25 text-cream transition-colors duration-500 group-hover:border-gold-soft group-hover:bg-gold-soft group-hover:text-plum-ink sm:col-start-4"
            >
              →
            </span>
          </Link>
        </Reveal>
      ))}
    </ol>
  )
}

/** Caption + controls under the magazine. Buttons are the fallback for the scroll gesture. */
function Stage({ spread, go }: { spread: number; go: (k: number) => void }) {
  const project = spread >= 1 ? projects[spread - 1] : undefined
  const text =
    spread === 0 ? 'Scroll to open the magazine' : project ? project.name : 'That’s the issue. Say hello below.'
  return (
    <div className="shell grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-6">
      <button
        type="button"
        onClick={() => go(spread - 1)}
        disabled={spread === 0}
        className="grid h-12 w-12 place-items-center rounded-full border border-cream/25 text-cream transition-colors hover:border-gold-soft hover:text-gold-soft disabled:opacity-30 disabled:hover:border-cream/25 disabled:hover:text-cream"
      >
        <span aria-hidden>←</span>
        <span className="sr-only">Previous page</span>
      </button>

      <div className="min-w-0 text-center" aria-live="polite">
        <p className="kicker text-cream/70">
          {spread === 0 ? (
            'Cover'
          ) : project ? (
            <>
              Feature <span className="text-gold-soft">{spread}</span> of {projects.length}
            </>
          ) : (
            'Back cover'
          )}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={spread}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-1 truncate font-serif text-[1.05rem] italic text-cream/90 sm:text-lg"
          >
            {project ? (
              <Link to={`/work/${project.slug}`} className="link-draw">
                {text} <span className="not-italic text-gold-soft">— read</span>
              </Link>
            ) : (
              text
            )}
          </motion.p>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => go(spread + 1)}
        disabled={spread >= LEAVES}
        className="grid h-12 w-12 place-items-center rounded-full bg-gold-soft text-plum-ink transition-colors hover:bg-cream disabled:opacity-30"
      >
        <span aria-hidden>→</span>
        <span className="sr-only">Next page</span>
      </button>
    </div>
  )
}

export function Work() {
  const can3D = useCan3D()
  const compact = useMaxWidth(768)
  const ref = useRef<HTMLDivElement>(null)
  const [spread, setSpread] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const onOpen = useCallback((slug: string) => goTo(`/work/${slug}`), [])
  useMotionValueEvent(scrollYProgress, 'change', (p) => setSpread(spreadFor(p)))

  // Scroll the pinned track to the point where spread k sits settled.
  // (u = k + 0.2 is just past flip k, before flip k+1 starts at k + 0.25.)
  const go = useCallback((k: number) => {
    const el = ref.current
    if (!el) return
    const target = Math.max(0, Math.min(LEAVES, k))
    const u = target === 0 ? 0 : target + 0.2
    const p = Math.min(1, u / (LEAVES + 0.5))
    const top = el.getBoundingClientRect().top + window.scrollY
    scrollToTarget(top + p * (el.offsetHeight - window.innerHeight))
  }, [])

  // Phones: never leave a page half-turned. When the finger lifts and scrolling
  // settles inside the pinned track, glide to the nearest settled page.
  useEffect(() => {
    if (!can3D || !compact) return
    let timer = 0
    let touching = false
    const settle = () => {
      const el = ref.current
      if (!el || touching) return
      const r = el.getBoundingClientRect()
      if (r.top > 0 || r.bottom < window.innerHeight) return
      const u = scrollYProgress.get() * (LEAVES + 0.5)
      const k = Math.max(0, Math.min(LEAVES, Math.round(u - 0.2)))
      const target = k === 0 ? 0 : k + 0.2
      if (Math.abs(u - target) > 0.04) go(k)
    }
    const onScroll = () => {
      clearTimeout(timer)
      timer = window.setTimeout(settle, 160)
    }
    const down = () => {
      touching = true
      // a finger always wins: cancel any snap still gliding
      const l = getLenis()
      if (l?.isScrolling) l.scrollTo(window.scrollY, { immediate: true })
    }
    const up = () => {
      touching = false
      onScroll()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchend', up, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('touchstart', down)
      window.removeEventListener('touchend', up)
    }
  }, [can3D, compact, go, scrollYProgress])

  return (
    <section id="work" className="relative bg-plum text-cream">
      <div className="shell pt-[var(--section-y)]">
        <Folio n="03" label="Selected work" className="text-cream/70" />
        <div className="mt-12 grid grid-cols-1 gap-6 md:mt-16 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] md:items-end md:gap-16">
          <h2 className="display text-[clamp(2.8rem,8vw,7.5rem)]">
            <MaskLines lines={['The', 'Issue']} />
          </h2>
          <Reveal delay={0.1}>
            <p className="serif-lede text-[clamp(1.25rem,2vw,1.6rem)] italic text-cream/80">
              Agency content, church media, documentary work and a magazine of my own.
              {can3D && <span className="text-cream/70"> Scroll to turn the pages — tap a page to read its story.</span>}
            </p>
          </Reveal>
        </div>
      </div>

      {/* Tall track: the magazine stays pinned while scrolling turns its pages. */}
      <div ref={ref} className={can3D ? 'relative h-[460vh] max-md:h-[540vh]' : 'relative'}>
        {can3D && (
          <div className="sticky top-0 flex h-[100svh] flex-col pt-16 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-[4.5rem] sm:pb-8">
            {/* warm pool of light the magazine sits in */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgba(232,214,185,0.16),transparent_60%)]"
            />
            <LazyScene
              eager
              className="relative min-h-0 flex-1"
              fallback={
                <div className="grid h-full place-items-center">
                  <span className="kicker animate-pulse text-cream/70">Printing the issue…</span>
                </div>
              }
            >
              {(active) => (
                <Magazine
                  projects={projects}
                  cutout={photos.cutout}
                  photoFor={photoFor}
                  email={profile.email}
                  phone={profile.phoneDisplay}
                  scroll={scrollYProgress}
                  active={active}
                  onOpen={onOpen}
                  onSpread={noop}
                  compact={compact}
                />
              )}
            </LazyScene>
            <a
              href="#all-projects"
              onClick={(e) => {
                const el = document.getElementById('all-projects')
                if (!el) return
                e.preventDefault()
                scrollToTarget(el)
              }}
              className="kicker absolute right-[var(--gutter)] top-[4.75rem] z-10 flex min-h-11 items-center gap-2 text-cream/70 transition-colors hover:text-gold-soft sm:top-[5.5rem]"
            >
              Skip to contents <span aria-hidden>↓</span>
            </a>
            <Stage spread={spread} go={go} />
          </div>
        )}
      </div>

      <div id="all-projects" className="shell scroll-mt-24 pt-16 pb-[var(--section-y)] md:pt-24">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h3 className="kicker text-cream/70">{can3D ? 'Contents — every story' : 'Contents'}</h3>
          <span className="kicker text-cream/70">{projects.length} stories</span>
        </div>
        <ProjectList />
      </div>
    </section>
  )
}
