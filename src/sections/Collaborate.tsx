import { profile } from '../data/profile'
import { Folio, MaskLines, Reveal } from '../components/Reveal'

export function Collaborate() {
  return (
    <section className="section bg-paper text-plum-ink">
      <div className="shell">
        <Folio n="07" label="Collaborations" className="text-plum/80 [--folio-accent:#6f4a92]" />
        <div className="mt-12 grid grid-cols-1 gap-14 md:mt-16 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-20">
          <div>
            <h2 className="display text-[clamp(2.4rem,5.4vw,4.6rem)] text-plum">
              <MaskLines lines={['Who I’d love', 'to work with']} />
            </h2>
            <Reveal delay={0.1}>
              <p className="mt-7 max-w-md text-[1.1rem] leading-[1.75]">
                I like to understand the purpose behind a project before deciding how to communicate it. I’m open
                to freelance work, creative partnerships and content production.
              </p>
            </Reveal>
            <ul className="mt-10 grid gap-x-10 sm:grid-cols-2">
              {profile.collaborators.map((c, i) => (
                <Reveal as="li" key={c} delay={i * 0.03} className="flex items-baseline gap-3 border-b border-plum/12 py-4 text-[1.08rem]">
                  <span aria-hidden className="text-[0.7rem] text-gold">✦</span>
                  {c}
                </Reveal>
              ))}
            </ul>
          </div>
          <Reveal as="figure" delay={0.15} className="self-center">
            <div className="relative bg-plum px-7 py-10 text-cream shadow-[0_30px_60px_-30px_rgba(43,26,59,0.6)] sm:px-10 sm:py-12">
              <span aria-hidden className="display absolute -top-6 left-6 text-7xl leading-none text-gold-soft">
                “
              </span>
              <blockquote className="serif-lede text-[clamp(1.35rem,2.4vw,1.85rem)] italic">
                {profile.personalNote}
              </blockquote>
              <figcaption className="kicker mt-7 flex items-center gap-3 text-cream/70">
                <span aria-hidden className="h-px w-8 bg-gold-soft" /> Ibukun
              </figcaption>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
