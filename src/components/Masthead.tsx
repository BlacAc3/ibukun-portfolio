import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { profile } from '../data/profile'
import { getLenis, scrollToTarget } from '../lib/smooth'

const links = [
  { href: '#about', label: 'About', n: '01' },
  { href: '#work', label: 'Work', n: '03' },
  { href: '#one-sip', label: 'One Sip', n: '04' },
  { href: '#contact', label: 'Contact', n: '08' },
]

const ease = [0.22, 1, 0.36, 1] as const

export function Masthead() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()
  const onHome = pathname === '/'
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 })

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  // Lock the page behind the open menu; Escape closes it.
  useEffect(() => {
    if (!open) return
    const lenis = getLenis()
    lenis?.stop()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      lenis?.start()
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const href = (h: string) => (onHome ? h : `/${h}`)

  // Lenis is paused while the menu is open, so close first, then scroll.
  // The name always means "home": on another page the router goes home (ScrollToTop
  // lands at the top); on the home page itself, return to the cover.
  const toTop = (e: MouseEvent) => {
    setOpen(false)
    if (!onHome) return
    e.preventDefault()
    if (location.hash) history.replaceState(null, '', location.pathname)
    // Lenis is paused while the menu is open, so let it close first.
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToTarget(0)))
  }

  const go = (h: string) => (e: MouseEvent) => {
    setOpen(false)
    if (!onHome) return
    const el = document.getElementById(h.slice(1))
    if (!el) return
    e.preventDefault()
    // Reflect the section in the address bar, but write it rather than let the
    // browser navigate: a real anchor jump would scroll a second time underneath
    // the veil. `replaceState` keeps the router's own history entry intact.
    history.replaceState(history.state, '', h)
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToTarget(el, false, true)))
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`transition-[background-color,backdrop-filter,border-color] duration-500 ${
          scrolled && !open
            ? 'border-b border-cream/10 bg-plum-deep/75 backdrop-blur-xl backdrop-saturate-150'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <nav className="shell flex h-16 items-center justify-between sm:h-[4.5rem]" aria-label="Main">
          <Link to="/" onClick={toTop} aria-label="Ibukun Odedele — back to the top" className="heading relative z-10 flex min-h-11 items-center gap-2.5 text-[0.95rem] text-cream">
            <span
              aria-hidden
              className="grid h-7 w-7 place-items-center rounded-full border border-gold-soft/60 font-serif text-[0.8rem] italic text-gold-soft"
            >
              I
            </span>
            Ibukun Odedele
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={href(l.href)}
                  data-gate
                  className="group flex min-h-11 items-center gap-1.5 px-3 font-serif text-[0.95rem] text-cream/75 transition-colors duration-300 hover:text-cream"
                >
                  <span className="kicker text-[0.6rem] text-gold-soft transition-colors group-hover:text-gold-soft">
                    {l.n}
                  </span>
                  <span className="link-draw">{l.label}</span>
                </a>
              </li>
            ))}
            <li className="ml-3">
              <a href={href('#contact')} data-gate className="btn btn-gold !min-h-10 !px-5 !py-2">
                Work with me
              </a>
            </li>
          </ul>

          <button
            className="relative z-10 -mr-2 grid h-12 w-12 place-items-center text-cream md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            <span aria-hidden className="relative block h-3 w-6">
              <span
                className={`absolute left-0 block h-px w-6 bg-current transition-transform duration-500 ease-[var(--ease-page)] ${
                  open ? 'top-1.5 rotate-45' : 'top-0'
                }`}
              />
              <span
                className={`absolute left-0 block h-px bg-current transition-all duration-500 ease-[var(--ease-page)] ${
                  open ? 'top-1.5 w-6 -rotate-45' : 'top-3 w-4'
                }`}
              />
            </span>
          </button>
        </nav>
        <motion.div
          aria-hidden
          className="h-px origin-left bg-gold-soft/80"
          style={{ scaleX: progress, opacity: scrolled && !open ? 1 : 0 }}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 -z-10 flex flex-col bg-plum-deep md:hidden"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.7, ease }}
          >
            <nav aria-label="Mobile" className="shell flex flex-1 flex-col justify-center pt-16">
              <ul className="space-y-1">
                {links.map((l, i) => (
                  <motion.li
                    key={l.href}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease, delay: 0.15 + i * 0.06 }}
                    className="border-b border-cream/10"
                  >
                    <a
                      href={href(l.href)}
                      onClick={go(l.href)}
                      className="flex min-h-16 items-baseline gap-4 py-3 text-cream"
                    >
                      <span className="kicker text-gold-soft">{l.n}</span>
                      <span className="display text-[clamp(2.4rem,12vw,3.6rem)]">{l.label}</span>
                    </a>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <motion.div
              className="shell pb-[max(1.5rem,env(safe-area-inset-bottom))]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.6 }}
            >
              <p className="kicker mb-4 text-cream/70">{profile.location}</p>
              <div className="grid grid-cols-2 gap-3">
                <a href={`mailto:${profile.email}`} className="btn btn-gold">
                  Email
                </a>
                <a
                  href={`https://wa.me/${profile.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-line text-cream"
                >
                  WhatsApp
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
