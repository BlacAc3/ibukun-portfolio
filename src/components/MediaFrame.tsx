import type { MediaSlot } from '../types'

const aspectClass = {
  portrait: 'aspect-[4/5]',
  landscape: 'aspect-[16/10]',
  square: 'aspect-square',
} as const

export function MediaFrame({ slot, n = 1 }: { slot: MediaSlot; n?: number }) {
  if (slot.kind === 'image') {
    return (
      <figure>
        <img src={slot.src} alt={slot.alt} loading="lazy" className="w-full rounded-sm object-cover" />
        {slot.caption && <figcaption className="mt-2 text-sm italic opacity-75">{slot.caption}</figcaption>}
      </figure>
    )
  }
  if (slot.kind === 'video') {
    return (
      <figure>
        <video src={slot.src} poster={slot.poster} controls playsInline preload="metadata" className="w-full rounded-sm" />
        {slot.caption && <figcaption className="mt-2 text-sm italic opacity-75">{slot.caption}</figcaption>}
      </figure>
    )
  }
  // Media still in the edit: a quiet dashed frame, so a gap reads as intentional.
  return (
    <figure
      className={`${aspectClass[slot.aspect ?? 'portrait']} relative grid place-items-center rounded-sm border border-dashed border-plum/40 bg-lavender/60 px-6 text-center`}
    >
      <div>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="mx-auto h-7 w-7 text-plum/50"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeDasharray="3 3"
        >
          <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
          <circle cx="12" cy="12" r="3.4" />
        </svg>
        <figcaption className="mt-3">
          <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-plum/55">
            Fig. {n} · coming soon
          </span>
          <span className="mt-1.5 block font-serif text-lg italic text-plum">{slot.label}</span>
        </figcaption>
      </div>
    </figure>
  )
}
