import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProject, projects } from '../data/projects'
import { MediaFrame } from '../components/MediaFrame'
import { ContactLinks } from '../components/ContactLinks'
import { MaskLines, Reveal } from '../components/Reveal'

export default function ProjectPage() {
  const { slug } = useParams()
  const project = getProject(slug)

  useEffect(() => {
    document.title = project ? `${project.name} — Ibukun Odedele` : 'Project not found — Ibukun Odedele'
  }, [project])

  if (!project) {
    return (
      <main className="flex min-h-[100svh] flex-col items-start justify-center bg-plum px-4 text-cream sm:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="display text-[clamp(2.5rem,8vw,6rem)]">Page not found</h1>
          <p className="mt-6 text-lg text-cream/80">This project doesn’t exist, or its link has changed.</p>
          <Link to="/#work" className="mt-8 inline-block border-b border-gold pb-0.5 text-gold-soft">
            See all projects
          </Link>
        </div>
      </main>
    )
  }

  const i = projects.indexOf(project)
  const next = projects[(i + 1) % projects.length]

  return (
    <main key={project.slug}>
      <header className="relative overflow-hidden bg-plum pt-28 pb-16 text-cream md:pt-36 md:pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[80%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(201,169,221,0.26),transparent_65%)]"
        />
        <div className="shell relative">
          <Link to="/#work" className="kicker inline-flex min-h-11 items-center gap-2 text-cream/70 transition-colors hover:text-gold-soft">
            <span aria-hidden>←</span> All work
          </Link>
          <p className="folio mt-10 text-cream/70">
            <span>
              <b>{String(i + 1).padStart(2, '0')}</b> <span className="opacity-60">—</span> Feature {i + 1} of {projects.length}
            </span>
          </p>
          <p className="serif-lede mt-8 text-[1.4rem] italic text-gold-soft">{project.role}</p>
          <h1 className="display mt-4 text-[clamp(2rem,7vw,6.5rem)] [overflow-wrap:anywhere]">
            <MaskLines lines={[project.name]} />
          </h1>
          <p className="serif-lede mt-8 max-w-2xl text-[clamp(1.3rem,2.3vw,1.75rem)] text-cream/85">
            {project.summary}
          </p>
        </div>
      </header>

      <section className="bg-paper text-plum-ink">
        <div className="shell section grid grid-cols-1 gap-12 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-16">
          <Reveal className="prose-mag max-w-[38rem] text-[1.1rem] leading-[1.78]">
            {project.body.map((p, j) => (
              <p key={j} className={j === 0 ? 'dropcap' : undefined}>{p}</p>
            ))}
          </Reveal>
          <Reveal delay={0.1} className="md:sticky md:top-28 md:self-start">
            <h2 className="kicker text-plum">My part</h2>
            <ul className="mt-4 space-y-2 text-lg">
              {project.contributions.map((c) => (
                <li key={c} className="flex gap-3">
                  <span aria-hidden className="mt-[0.75em] h-px w-5 shrink-0 bg-gold" />
                  {c}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="shell pb-[var(--section-y)]">
          <h2 className="folio text-plum/70">From the work</h2>
          <div className="mt-8 grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {project.media.map((m, j) => (
              <MediaFrame key={j} slot={m} n={j + 1} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-plum-deep text-cream">
        <div className="shell flex flex-col gap-12 py-16 md:flex-row md:items-end md:justify-between md:py-24">
          <Link to={`/work/${next.slug}`} className="group">
            <span className="kicker block text-cream/70">Next story →</span>
            <span className="display mt-3 block text-[clamp(2rem,5vw,4rem)] transition-colors duration-500 group-hover:text-gold-soft">{next.name}</span>
          </Link>
          <div>
            <p className="serif-lede mb-5 text-xl italic text-cream/75">Have a project like this in mind?</p>
            <ContactLinks />
          </div>
        </div>
      </section>
    </main>
  )
}
