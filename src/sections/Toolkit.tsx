import type { ReactNode } from 'react'
import { profile } from '../data/profile'
import { Folio, MaskLines, Reveal } from '../components/Reveal'

function Row({ title, children, i }: { title: string; children: ReactNode; i: number }) {
  return (
    <Reveal delay={i * 0.04}>
      <div className="grid gap-3 border-t border-cream/12 py-7 sm:grid-cols-[13rem_1fr] sm:gap-10">
        <dt className="kicker pt-1 text-gold-soft">{title}</dt>
        <dd className="text-[1.08rem] text-cream/85">{children}</dd>
      </div>
    </Reveal>
  )
}

const Chips = ({ items }: { items: readonly string[] }) => (
  <ul className="flex flex-wrap gap-2">
    {items.map((s) => (
      <li key={s} className="rounded-full border border-cream/18 px-3.5 py-1.5 text-[0.95rem] text-cream/85">
        {s}
      </li>
    ))}
  </ul>
)

export function Toolkit() {
  const { education } = profile
  return (
    <section className="section bg-plum text-cream">
      <div className="shell">
        <Folio n="05" label="Toolkit" className="text-cream/70" />
        <div className="mt-12 grid grid-cols-1 gap-10 md:mt-16 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] md:gap-16">
          <h2 className="display text-[clamp(2.6rem,6vw,5rem)] md:sticky md:top-28 md:self-start">
            <MaskLines lines={['Skills &', 'toolkit']} />
          </h2>
          <dl className="border-b border-cream/12">
            <Row i={0} title="Skills">
              <Chips items={profile.skills} />
            </Row>
            <Row i={1} title="Editing & design">
              <Chips items={profile.tools} />
            </Row>
            <Row i={2} title="Platforms">
              <Chips items={profile.platforms} />
            </Row>
            <Row i={3} title="Languages">
              {profile.languages.map((l, i) => (
                <span key={l.name}>
                  {l.name} <span className="italic text-cream/70">({l.level})</span>
                  {i < profile.languages.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </Row>
            <Row i={4} title="Education">
              <span className="heading block text-xl text-cream">{education.degree}</span>
              <span className="mt-1 block italic text-cream/70">
                {education.school}, {education.year}
              </span>
            </Row>
            <Row i={5} title="Certifications">
              <ul className="space-y-2">
                {profile.certifications.map((c) => (
                  <li key={c.name}>
                    {c.name} <span className="italic text-cream/70">— {c.by}</span>
                  </li>
                ))}
              </ul>
            </Row>
          </dl>
        </div>
      </div>
    </section>
  )
}
