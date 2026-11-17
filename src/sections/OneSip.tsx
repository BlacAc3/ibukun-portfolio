import { lazy } from 'react'
import { Link } from 'react-router-dom'
import { LazyScene } from '../components/LazyScene'
import { Folio, MaskLines, Reveal } from '../components/Reveal'
import { photos } from '../data/photos'
import { getProject } from '../data/projects'

const CoffeeCup = lazy(() => import('../three/CoffeeCup'))

export function OneSip() {
  const project = getProject('one-sip-at-a-time')!
  return (
    <section id="one-sip" className="section relative overflow-hidden bg-latte text-plum-ink">
      {/* café-window light from the top left */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[30%] -top-[30%] h-[110%] w-[110%] bg-[radial-gradient(closest-side,rgba(255,250,238,0.75),rgba(255,250,238,0.25)_55%,transparent)]"
      />
      <div className="shell relative">
        <Folio n="04" label="My own magazine" className="text-plum/80 [--folio-accent:#6f4a92]" />
        <div className="mt-10 grid grid-cols-1 items-center gap-8 md:mt-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16">
          <div className="relative order-2 md:order-1">
            <LazyScene
              className="relative aspect-square w-full max-md:overflow-visible"
              fallback={
                <img
                  src={photos.mustard}
                  alt="Ibukun at a café in a mustard satin top"
                  loading="lazy"
                  className="h-full w-full rounded-sm object-cover object-[50%_35%]"
                />
              }
            >
              {(active) => <CoffeeCup active={active} />}
            </LazyScene>
            {/* her photo, pinned like a print beside the cup */}
            <Reveal
              as="figure"
              delay={0.2}
              className="absolute -bottom-4 right-0 w-[38%] max-w-[13rem] rotate-[4deg] bg-[#fbf7ef] p-2 pb-8 shadow-[0_24px_50px_-20px_rgba(43,26,59,0.55)] sm:-bottom-6 sm:right-2"
            >
              <img
                src={photos.mustard}
                alt="Ibukun at a café in a mustard satin top"
                loading="lazy"
                className="aspect-[4/5] w-full object-cover object-[50%_30%]"
              />
              <figcaption className="absolute inset-x-0 bottom-1.5 text-center font-serif text-[0.85rem] italic text-plum">
                golden hour
              </figcaption>
            </Reveal>
          </div>

          {/* on phones the cup's steam rises up behind this column, so it sits above */}
          <div className="relative z-10 order-1 max-w-xl md:static md:z-auto md:order-2">
            <p className="serif-lede text-[1.4rem] italic text-plum">Issue by issue, café by café</p>
            <h2 className="display mt-4 text-[clamp(2.8rem,7vw,6rem)] text-plum">
              <MaskLines lines={['One sip', 'at a time']} />
            </h2>
            <Reveal delay={0.1}>
              <p className="mt-7 text-[1.1rem] leading-[1.75]">
                A digital lifestyle magazine about café culture, food discoveries and the little details that
                make ordinary days memorable. I run it end to end: the visits, the photographs and films, the
                writing and the social pages.
              </p>
              <ul className="mt-7 flex flex-wrap gap-1.5 sm:gap-2">
                {project.contributions.map((c) => (
                  <li
                    key={c}
                    className="rounded-full border border-plum/25 bg-paper/40 px-3 py-1 text-[0.85rem] text-plum sm:px-3.5 sm:py-1.5 sm:text-[0.92rem]"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <p className="mt-7 border-l-2 border-gold pl-4 font-serif italic text-plum/85">
                Cafés and lifestyle brands: I’m always open to a visit and a collaboration.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to={`/work/${project.slug}`} className="btn btn-ink">
                  Read about the magazine <span className="arrow" aria-hidden>→</span>
                </Link>
                <a href="#contact" className="btn btn-line text-plum">
                  Pitch a visit
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
