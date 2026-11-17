import { useEffect, useRef, useState, type RefObject } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { profile } from '../data/profile'
import { photos } from '../data/photos'

const ease = [0.22, 1, 0.36, 1] as const
const YEAR = new Date().getFullYear()

/** Both copies of the title animate identically so the outline stays registered. */
function Title({ outline = false, reduce }: { outline?: boolean; reduce: boolean | null }) {
  const lines = ['Ibukun’s', 'Portfolio']
  return (
    <h1
      aria-hidden={outline || undefined}
      className={`display text-center text-[clamp(2.4rem,11.9vw,13.5rem)] tracking-[-0.035em] sm:text-[clamp(2.4rem,11.4vw,13.5rem)] sm:tracking-[-0.02em] lg:text-[clamp(2.4rem,10.2vw,12.5rem)] ${outline ? 'display-outline' : 'text-cream'}`}
    >
      {outline ? null : <span className="sr-only">{profile.name} — </span>}
      {lines.map((l, i) => (
        <span
          key={l}
          className={`block overflow-hidden pb-[0.04em] ${i === 0 ? 'max-sm:text-[1.184em] lg:text-left' : 'lg:-mt-[0.06em] lg:text-right'}`}
        >
          <motion.span
            className="block"
            initial={reduce ? false : { y: '108%' }}
            animate={{ y: '0%' }}
            transition={{ duration: 1.3, ease, delay: 0.15 + i * 0.1 }}
          >
            {l}
          </motion.span>
        </span>
      ))}
    </h1>
  )
}

/**
 * True while a mouse is over her silhouette, not just the image's box.
 * The cutout is drawn once into a small canvas and its alpha is sampled at the
 * cursor, so the transparent corners around her never count as "on" her.
 */
function useOverCutout(section: RefObject<HTMLElement | null>, img: RefObject<HTMLImageElement | null>) {
  const [over, setOver] = useState(false)
  useEffect(() => {
    const el = section.current
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let mask: { data: Uint8ClampedArray; w: number; h: number } | null = null
    const build = () => {
      const im = img.current
      if (!im || !im.complete || !im.naturalWidth) return
      const w = 160
      const h = Math.round((w * im.naturalHeight) / im.naturalWidth)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.drawImage(im, 0, 0, w, h)
      try {
        mask = { data: ctx.getImageData(0, 0, w, h).data, w, h }
      } catch {
        mask = null
      }
    }
    let raf = 0
    let last = false
    const test = (x: number, y: number) => {
      const im = img.current
      if (!im) return false
      if (!mask) build()
      const r = im.getBoundingClientRect()
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false
      if (!mask) return true // no alpha available: fall back to the box
      const mx = Math.min(mask.w - 1, Math.floor(((x - r.left) / r.width) * mask.w))
      const my = Math.min(mask.h - 1, Math.floor(((y - r.top) / r.height) * mask.h))
      return mask.data[(my * mask.w + mx) * 4 + 3] > 96
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const now = test(e.clientX, e.clientY)
        if (now !== last) setOver((last = now))
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(raf)
      if (last) setOver((last = false))
    }
    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [section, img])
  return over
}

/**
 * Her own cover, rebuilt: the name in heavy cream caps behind her,
 * and an outline copy of the same words on top where they cross her.
 * Scrolling away pulls the layers apart for a little depth.
 */
export function Hero() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const photo = useRef<HTMLImageElement>(null)
  // Hover her and she steps out in front of the title; leave and the cover settles back.
  const over = useOverCutout(ref, photo)

  // scroll-out depth
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const titleY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-35%'])
  const photoY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '12%'])
  const photoScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.06])
  const shade = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 0.55])

  return (
    <section
      ref={ref}
      id="top"
      data-over={over || undefined}
      className="group/hero relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-plum"
    >
      {/* soft light behind her, like a studio backdrop */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-[85%] bg-[radial-gradient(ellipse_at_50%_82%,rgba(198,175,230,0.34),transparent_62%)]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(43,26,59,0.55),transparent_70%)]"
      />

      {/* layer 2: her */}
      <motion.div
        style={{ y: photoY, scale: photoScale }}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex origin-bottom justify-center"
      >
        <div className="hero-float">
          <div className="origin-bottom transition-[transform,filter] duration-[900ms] ease-[var(--ease-page)] group-data-[over]/hero:scale-[1.025] group-data-[over]/hero:[filter:brightness(1.05)_drop-shadow(0_24px_48px_rgba(28,16,40,0.45))]">
          <motion.img
            ref={photo}
            src={photos.cutout}
            alt="Ibukun smiling, in a pale-blue tweed dress with pearl trim"
            fetchPriority="high"
            initial={reduce ? false : { opacity: 0, y: 70, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.5, delay: 0.35, ease }}
            className="h-[84svh] max-h-[1000px] w-auto max-w-none object-contain object-bottom sm:h-[94svh]"
          />
          </div>
        </div>
      </motion.div>

      {/* her hem dissolves into the page instead of ending in a hard edge */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-[40svh] bg-gradient-to-t from-plum from-25% via-plum/75 to-transparent sm:h-[22svh] sm:from-0%" />
      {/* dims as the cover leaves, so the next page feels like it slides over */}
      <motion.div aria-hidden style={{ opacity: shade }} className="absolute inset-0 z-[25] bg-plum-ink" />

      <motion.div
        className="kicker shell relative z-30 flex justify-between pt-20 text-cream/80 sm:pt-24"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.6 }}
      >
        <span className="sm:hidden">
          Issue 01 <span className="text-gold-soft">·</span> {YEAR}
        </span>
        <span className="hidden sm:inline">Creative portfolio</span>
        <span className="hidden sm:inline">Issue 01 · {YEAR}</span>
        <span>{profile.location}</span>
      </motion.div>

      <div className="relative flex flex-1 items-start justify-center pt-[8.5svh] sm:pt-[4vh]">
        {/* layer 1: solid words */}
        <motion.div
          style={{ y: titleY }}
          className="relative z-0 px-1 transition-opacity duration-700 ease-[var(--ease-page)] group-data-[over]/hero:opacity-80 sm:px-2 lg:w-full lg:px-[var(--gutter)]"
        >
          <div className="hero-drift">
            <Title reduce={reduce} />
          </div>
        </motion.div>

        {/* layer 3: outline words, drawn over her */}
        <motion.div
          aria-hidden
          style={{ y: titleY }}
          className="pointer-events-none absolute inset-x-0 top-[8.5svh] z-20 px-1 sm:top-[4vh] sm:px-2 lg:px-[var(--gutter)]"
        >
          {/* Fade only: the outline must stay registered on the solid words, or the
              gap between them shows as a doubled ghost while it fades. */}
          <div className="transition-opacity duration-[450ms] ease-[var(--ease-silk)] group-data-[over]/hero:opacity-0">
          <div className="hero-drift">
            <Title outline reduce={reduce} />
          </div>
          </div>
        </motion.div>

      </div>

      {/* cover line: the teaser every magazine cover carries, and a way in */}
      <motion.a
        href="#one-sip"
        className="group absolute bottom-[calc(7.25rem+env(safe-area-inset-bottom))] right-[var(--gutter)] z-30 block max-w-[12.5rem] text-right text-cream [text-shadow:0_1px_14px_rgba(28,16,40,0.55)] sm:left-[var(--gutter)] sm:right-auto sm:bottom-[22%] sm:max-w-[13rem] sm:text-left sm:[text-shadow:0_1px_14px_rgba(28,16,40,0.65)]"
        initial={reduce ? false : { opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.2, delay: 1.1, ease }}
      >
        <span aria-hidden className="ml-auto block h-px w-10 bg-gold-soft sm:ml-0 transition-all duration-700 ease-[var(--ease-page)] group-hover:w-16" />
        <span className="kicker mt-3 block text-gold-soft">Inside this issue</span>
        <span className="mt-1.5 block font-serif text-[1.08rem] italic leading-snug sm:text-[1.15rem]">
          One Sip at a Time —<br className="sm:hidden" /> her café magazine<span className="hidden sm:inline">, made end to end</span>
          <span aria-hidden className="ml-1.5 not-italic text-gold-soft transition-transform duration-500 group-hover:translate-x-1 sm:hidden">→</span>
        </span>
      </motion.a>

      {/* large screens: a second cover line balances the first */}
      <motion.a
        href="#work"
        className="group absolute bottom-[22%] right-[var(--gutter)] z-30 hidden max-w-[13rem] text-right text-cream [text-shadow:0_1px_14px_rgba(28,16,40,0.65)] lg:block"
        initial={reduce ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.2, delay: 1.25, ease }}
      >
        <span aria-hidden className="ml-auto block h-px w-10 bg-gold-soft transition-all duration-700 ease-[var(--ease-page)] group-hover:w-16" />
        <span className="kicker mt-3 block text-gold-soft">Cover story</span>
        <span className="mt-1.5 block font-serif text-[1.15rem] italic leading-snug">
          Behind the lens — the cafés, brands and stories she films
        </span>
      </motion.a>

      {/* phones: titles left, primary action right — where the thumb already is */}
      <motion.div
        className="shell relative z-30 grid grid-cols-[1fr_auto] items-end gap-4 border-t border-cream/15 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:hidden"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.9, ease }}
      >
        <p className="kicker whitespace-nowrap leading-[1.7] tracking-[0.12em] text-cream/85">
          Content creator
          <br />
          <span className="text-gold-soft">&amp;</span> videographer
        </p>
        <a href="#contact" className="btn btn-gold !px-4 min-[380px]:!px-5">
          Work with me <span className="arrow" aria-hidden>→</span>
        </a>
      </motion.div>

      {/* desktop strap: unchanged */}
      <motion.div
        className="kicker shell relative z-30 hidden grid-cols-[1fr_auto_1fr] items-end gap-3 pb-8 text-cream/85 sm:grid"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.9 }}
      >
        <span>Content creator &amp; videographer</span>
        <a href="#about" className="flex min-h-11 flex-col items-center justify-end gap-2" aria-label="Scroll to about">
          <span>Scroll</span>
          <span aria-hidden className="relative block h-10 w-px overflow-hidden bg-cream/15">
            <span className="cue-line absolute inset-0 bg-gold-soft" />
          </span>
        </a>
        <a
          href={`mailto:${profile.email}`}
          className="flex min-h-11 items-end justify-self-end text-right transition-colors hover:text-gold-soft"
        >
          {profile.email}
        </a>
      </motion.div>
    </section>
  )
}
