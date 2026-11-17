import { profile } from '../data/profile'
import { Folio, MaskLines, Reveal } from '../components/Reveal'

/** Services as a magazine contents page: numbered rows, title left, detail right. */
export function WhatIDo() {
  return (
    <section className="section relative bg-plum-deep text-cream">
      <div className="shell">
        <Folio n="02" label="Services" className="text-cream/70" />
        <div className="mt-12 grid grid-cols-1 gap-10 md:mt-16 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] md:gap-16">
          <div className="md:sticky md:top-28 md:self-start">
            <h2 className="display text-[clamp(2.6rem,6vw,5rem)]">
              <MaskLines lines={['What', 'I do']} />
            </h2>
            <Reveal delay={0.1}>
              <p className="serif-lede mt-7 max-w-sm text-[1.35rem] italic text-cream/75">
                From the very first idea: planning the content, capturing the visuals and shaping it into
                something ready to share.
              </p>
            </Reveal>
          </div>

          <dl className="border-b border-cream/12">
            {profile.whatIDo.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.04}>
                <div className="group relative grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-cream/12 py-7 sm:grid-cols-[3.5rem_minmax(0,0.9fr)_minmax(0,1.1fr)] sm:gap-x-8 sm:py-9">
                  {/* a warm wash slides in on hover — decoration only, nothing hides behind it */}
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-0 origin-left scale-x-0 bg-plum/50 transition-transform duration-700 ease-[var(--ease-page)] group-hover:scale-x-100"
                  />
                  <span className="kicker relative pt-1.5 text-gold">{String(i + 1).padStart(2, '0')}</span>
                  <dt className="heading relative text-[clamp(1.3rem,2.2vw,1.75rem)] text-cream transition-transform duration-700 ease-[var(--ease-page)] sm:group-hover:translate-x-2">
                    {item.title}
                  </dt>
                  <dd className="relative col-start-2 mt-2 text-cream/70 sm:col-start-3 sm:mt-0">{item.detail}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
