import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

const ease = [0.22, 1, 0.36, 1] as const

/** Fade-and-rise once when the block scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'li' | 'section' | 'figure'
}) {
  const reduce = useReducedMotion()
  const M = motion[as]
  return (
    <M
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 1, ease, delay }}
    >
      {children}
    </M>
  )
}

/** Heading lines that slide up from behind a mask, like type being set. */
export function MaskLines({ lines, className }: { lines: ReactNode[]; className?: string }) {
  const reduce = useReducedMotion()
  // Observe the (unclipped) wrapper, not each line: a line parked below its mask is
  // fully clipped, and IntersectionObserver reports clipped elements as out of view.
  return (
    <motion.span
      className={`block ${className ?? ''}`}
      initial={reduce ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ staggerChildren: 0.08 }}
    >
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.06em]">
          <motion.span
            className="block"
            variants={{ hidden: { y: '105%' }, show: { y: '0%' } }}
            transition={{ duration: 1.1, ease }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </motion.span>
  )
}

/** Running folio over each section: "02 — About". */
export function Folio({ n, label, className = '' }: { n: string; label: string; className?: string }) {
  return (
    <Reveal className={`folio ${className}`}>
      <span>
        <b>{n}</b> <span className="opacity-60">—</span> {label}
      </span>
    </Reveal>
  )
}
