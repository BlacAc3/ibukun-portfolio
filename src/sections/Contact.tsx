import { ContactLinks } from '../components/ContactLinks'
import { Folio, MaskLines, Reveal } from '../components/Reveal'
import { profile } from '../data/profile'
import { scrollToTarget } from '../lib/smooth'

const YEAR = new Date().getFullYear()

/** The back cover. */
export function Contact() {
  return (
    <section id="contact" className="relative overflow-hidden bg-plum text-cream">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(201,169,221,0.28),transparent_65%)]"
      />
      <div className="shell relative pt-[var(--section-y)] pb-16">
        <Folio n="08" label="Contact" className="text-cream/70" />
        <h2 className="display mt-12 text-[clamp(2.1rem,8vw,7.5rem)] md:mt-16">
          <MaskLines lines={['Let’s create', 'something', <span key="m" className="display-outline">meaningful</span>]} />
        </h2>
        <Reveal delay={0.1}>
          <p className="serif-lede mt-6 text-[clamp(1.5rem,3vw,2.4rem)] italic text-gold-soft">together.</p>
        </Reveal>
        <Reveal delay={0.15} className="mt-10">
          <ContactLinks />
        </Reveal>

        <div className="mt-14 border-t border-cream/12 pt-10 md:mt-16">
          <Reveal>
            <dl className="grid gap-8 sm:flex sm:flex-wrap sm:gap-x-16 sm:gap-y-8">
              <div>
                <dt className="kicker text-cream/70">Email</dt>
                <dd className="mt-2 text-[1.08rem]">
                  <a className="link-draw [overflow-wrap:anywhere]" href={`mailto:${profile.email}`}>
                    {profile.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="kicker text-cream/70">Phone &amp; WhatsApp</dt>
                <dd className="mt-2 text-[1.08rem]">
                  <a className="link-draw" href={`tel:+${profile.whatsapp}`}>
                    {profile.phoneDisplay}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="kicker text-cream/70">Based in</dt>
                <dd className="mt-2 text-[1.08rem]">{profile.location}</dd>
              </div>
            </dl>
          </Reveal>
        </div>
      </div>

      <footer className="shell relative flex flex-wrap items-center justify-between gap-3 border-t border-cream/12 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <span className="kicker text-cream/70">
          © {YEAR} {profile.name} · Issue 01
        </span>
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault()
            scrollToTarget(0)
          }}
          className="kicker flex min-h-11 items-center gap-2 text-cream/70 transition-colors hover:text-gold-soft"
        >
          Back to the cover <span aria-hidden>↑</span>
        </a>
      </footer>
    </section>
  )
}
