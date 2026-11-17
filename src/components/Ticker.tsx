import { profile } from '../data/profile'

function Run() {
  return (
    <div className="flex shrink-0 items-center">
      {profile.titles.map((title) => (
        <span key={title} className="flex items-center">
          <span className="display px-6 text-[0.72rem] uppercase tracking-[0.3em] text-plum/80 sm:px-9 sm:text-[0.8rem]">
            {title}
          </span>
          <span aria-hidden className="text-[0.5rem] text-gold">
            ✦
          </span>
        </span>
      ))}
    </div>
  )
}

/** Her titles running under the cover, like a masthead rule. */
export function Ticker() {
  return (
    <section
      aria-label="What she does"
      className="relative overflow-hidden border-y border-plum/15 bg-cream py-4 text-plum"
    >
      <p className="sr-only">{profile.titles.join(', ')}</p>
      <div aria-hidden className="ticker-track flex w-max hover:[animation-play-state:paused]">
        <Run />
        <Run />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-cream to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-cream to-transparent sm:w-24" />
    </section>
  )
}
