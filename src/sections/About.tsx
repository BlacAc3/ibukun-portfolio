import { lazy, useRef } from 'react'
import { useScroll } from 'framer-motion'
import { profile } from '../data/profile'
import { polaroids } from '../data/photos'
import { LazyScene } from '../components/LazyScene'
import { Folio, MaskLines, Reveal } from '../components/Reveal'
import { useMaxWidth } from '../lib/media'

const Polaroids = lazy(() => import('../three/Polaroids'))

function StaticPolaroids() {
  const tilt = ['-rotate-6', 'rotate-3', '-rotate-2', 'rotate-6']
  return (
    <div className="grid h-full grid-cols-2 place-content-center gap-5 p-4">
      {polaroids.map((p, i) => (
        <figure key={p.src} className={`${tilt[i]} bg-[#fbf7ef] p-2.5 pb-3 shadow-[0_18px_40px_-16px_rgba(43,26,59,0.5)]`}>
          <img src={p.src} alt="" loading="lazy" className="aspect-square w-full object-cover object-[50%_22%]" />
          <figcaption className="mt-2 text-center text-sm italic text-plum">{p.caption}</figcaption>
        </figure>
      ))}
    </div>
  )
}

export function About() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const compact = useMaxWidth(640)

  return (
    <section id="about" ref={ref} className="section relative bg-paper text-plum-ink">
      <div className="shell">
        <Folio n="01" label="About" className="text-plum/80 [--folio-accent:#6f4a92]" />
        <div className="mt-12 grid grid-cols-1 gap-12 md:mt-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-16">
          <div className="max-w-[36rem]">
            <h2 className="display text-[clamp(2.6rem,6.4vw,5.4rem)] text-plum">
              <MaskLines lines={['Hello,', 'I’m Ibukun.']} />
            </h2>
            <Reveal delay={0.1}>
              <p className="serif-lede mt-7 text-[clamp(1.35rem,2.3vw,1.75rem)] italic text-plum/85">{profile.intro}</p>
            </Reveal>
            <Reveal delay={0.15} className="prose-mag mt-9 text-[1.075rem] leading-[1.78] text-plum-ink/90">
              {profile.about.map((p, i) => (
                <p key={i} className={i === 0 ? 'dropcap' : undefined}>
                  {p}
                </p>
              ))}
            </Reveal>
          </div>

          <LazyScene
            className="relative -mx-[var(--gutter)] h-[440px] sm:mx-0 sm:h-[560px] md:sticky md:top-24 md:h-[640px]"
            fallback={<StaticPolaroids />}
          >
            {(active) => (
              <>
                <Polaroids shots={polaroids} scroll={scrollYProgress} active={active} compact={compact} />
                <p className="kicker pointer-events-none absolute inset-x-0 bottom-2 flex items-center justify-center gap-2 text-plum/55">
                  <span aria-hidden>↔</span> {compact ? 'Drag a photo' : 'Drag the photos around'}
                </p>
              </>
            )}
          </LazyScene>
        </div>
      </div>
    </section>
  )
}
