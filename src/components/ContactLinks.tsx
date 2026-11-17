import { profile } from '../data/profile'

export function ContactLinks({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <a
        className={`btn ${tone === 'light' ? 'btn-gold' : 'btn-ink'}`}
        href={`mailto:${profile.email}?subject=${encodeURIComponent('Hello Ibukun — let’s work together')}`}
      >
        Email me <span className="arrow" aria-hidden>→</span>
      </a>
      <a
        className={`btn btn-line ${tone === 'light' ? 'text-cream' : 'text-plum'}`}
        href={`https://wa.me/${profile.whatsapp}?text=${encodeURIComponent('Hi Ibukun, I saw your portfolio and would love to talk about a project.')}`}
        target="_blank"
        rel="noreferrer"
      >
        Message on WhatsApp
      </a>
    </div>
  )
}
