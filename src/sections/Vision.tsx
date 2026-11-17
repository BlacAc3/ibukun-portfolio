import { profile } from '../data/profile'
import { Folio, Reveal } from '../components/Reveal'

/** A pull-quote spread: the belief set huge, vision and mission as the column below. */
export function Vision() {
  return (
    <section className="section relative overflow-hidden bg-lavender text-plum-ink">
      <span
        aria-hidden
        className="display pointer-events-none absolute -right-[0.08em] -top-[0.28em] select-none text-[clamp(14rem,34vw,30rem)] leading-none text-plum/[0.06]"
      >
        “
      </span>
      <div className="shell relative">
        <Folio n="06" label="What I believe" className="text-plum/80 [--folio-accent:#6f4a92]" />
        <Reveal as="figure" className="mt-12 max-w-5xl md:mt-16">
          <blockquote className="serif-lede text-[clamp(1.85rem,4.2vw,3.6rem)] text-plum">
            {profile.belief}
          </blockquote>
          <figcaption className="kicker mt-8 flex items-center gap-3 text-plum/60">
            <span aria-hidden className="h-px w-10 bg-gold" /> Ibukun Odedele
          </figcaption>
        </Reveal>

        <div className="mt-20 grid grid-cols-1 gap-14 md:mt-28 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16">
          <Reveal>
            <h2 className="kicker text-plum">Vision</h2>
            <p className="mt-5 max-w-[34rem] text-[1.12rem] leading-[1.75]">{profile.vision}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="kicker text-plum">Mission</h2>
            <ol className="mt-5 space-y-4 text-[1.08rem]">
              {profile.mission.map((m, i) => (
                <li key={m} className="grid grid-cols-[2rem_1fr] gap-2 border-b border-plum/12 pb-4">
                  <span className="kicker pt-1.5 text-[#6f4a92]">{String(i + 1).padStart(2, '0')}</span>
                  <span>{m}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
