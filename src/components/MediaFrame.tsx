import { useEffect, useRef, useState } from 'react'
import type { MediaSlot } from '../types'

const aspectClass = {
  portrait: 'aspect-[4/5]',
  landscape: 'aspect-[16/10]',
  square: 'aspect-square',
} as const

/** "https://www.instagram.com/reel/ABC/?x=y" → { kind: 'reel', code: 'ABC' } */
function parseInstagram(url: string) {
  const m = url.match(/instagram\.com\/(p|reel|tv)\/([\w-]+)/)
  return m ? { kind: m[1] === 'p' ? 'p' : 'reel', code: m[2] } : null
}

/**
 * Instagram embeds are heavy (each iframe pulls ~1 MB of Instagram's scripts),
 * so they never block the page:
 *  1. a local still of the post renders instantly, styled like the embed;
 *  2. once a card nears the viewport it joins a queue, and iframes load one
 *     at a time, staggered (so three embeds don't fight over the network);
 *  3. when Instagram reports the post is laid out ("MEASURE"), the live embed
 *     crossfades in over the still.
 * Hovering or tapping a card jumps it to the front of the queue.
 */
const queue: Array<() => void> = []
let busy = false
function pump() {
  if (busy) return
  const next = queue.shift()
  if (!next) return
  busy = true
  next()
}
function release() {
  busy = false
  pump()
}

let warmed = false
/** Open connections to Instagram early, the first time a card is near. */
function warmUp() {
  if (warmed) return
  warmed = true
  for (const href of ['https://www.instagram.com', 'https://static.cdninstagram.com', 'https://scontent.cdninstagram.com']) {
    const l = document.createElement('link')
    l.rel = 'preconnect'
    l.href = href
    l.crossOrigin = ''
    document.head.appendChild(l)
  }
}

function InstagramEmbed({
  url, thumb, handle, caption, n,
}: { url: string; thumb?: string; handle?: string; caption?: string; n: number }) {
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [load, setLoad] = useState(false)
  const [ready, setReady] = useState(false)
  const [height, setHeight] = useState<number | null>(null)
  const start = useRef<() => void>(() => {})
  const info = parseInstagram(url)

  // Queue the embed once the card is within a screen of the viewport.
  useEffect(() => {
    const el = box.current
    if (!el) return
    let queued = false
    const go = () => setLoad(true)
    start.current = () => {
      warmUp()
      if (queued) {
        // already waiting: move to the front
        const i = queue.indexOf(go)
        if (i > 0) queue.unshift(...queue.splice(i, 1))
        return
      }
      queued = true
      queue.unshift(go)
      pump()
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || queued) return
        warmUp()
        queued = true
        queue.push(go)
        pump()
        io.disconnect()
      },
      { rootMargin: '100% 0px' },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      const i = queue.indexOf(go)
      if (i >= 0) queue.splice(i, 1)
    }
  }, [])

  // Hand the queue on as soon as this embed has laid out, or after 1.2 s — a stagger, not a wait.
  const busyOwner = useRef(false)
  const handOn = useRef<() => void>(() => {})
  useEffect(() => {
    if (!load) return
    busyOwner.current = true
    const done = () => {
      if (!busyOwner.current) return
      busyOwner.current = false
      release()
    }
    let revealed = false
    handOn.current = done
    const t = window.setTimeout(done, 1200)
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://www.instagram.com' || e.source !== frame.current?.contentWindow) return
      try {
        const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (msg?.type === 'MEASURE' && msg.details?.height) {
          const h = Math.ceil(msg.details.height)
          if (revealed) {
            setHeight(h)
          } else {
            revealed = true
            // pin the current height so the change to Instagram's can animate,
            // and give Instagram a beat to paint the media before revealing it
            setHeight(box.current?.offsetHeight ?? h)
            window.setTimeout(() => {
              setHeight(h)
              setReady(true)
            }, 250)
          }
          done()
        }
      } catch {
        /* not a message for us */
      }
    }
    window.addEventListener('message', onMessage)
    return () => {
      clearTimeout(t)
      window.removeEventListener('message', onMessage)
      done()
    }
  }, [load])

  if (!info) return null
  const label = info.kind === 'reel' ? 'Reel' : 'Post'
  const link = `https://www.instagram.com/${info.kind}/${info.code}/`
  const reel = info.kind === 'reel'

  return (
    <figure>
      <div
        ref={box}
        onPointerEnter={() => start.current()}
        className="relative overflow-hidden rounded-md border border-plum/12 bg-white shadow-[0_18px_40px_-24px_rgba(43,26,59,0.45)] transition-[height] duration-700 ease-[var(--ease-page)]"
        style={height ? { height } : undefined}
      >
        {/* The still: looks like the post, links to it, and holds the space. */}
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            // before the embed is live, a tap brings it in rather than leaving the site
            if (!ready && load === false) {
              e.preventDefault()
              start.current()
            }
          }}
          aria-label={`${label} ${n} on Instagram`}
          className={`block transition-opacity duration-700 ease-[var(--ease-page)] ${ready ? 'pointer-events-none opacity-0' : ''}`}
        >
          <span className="flex h-[54px] items-center gap-2.5 border-b border-plum/8 px-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[conic-gradient(from_200deg,#c6afe6,#b89a74,#54366a,#c6afe6)] p-[2px]">
              <span className="h-full w-full rounded-full bg-lavender" />
            </span>
            <span className="min-w-0 truncate text-[0.86rem] font-semibold text-plum-ink">{handle ?? 'instagram'}</span>
            <span className="ml-auto shrink-0 rounded-md bg-plum px-3 py-1.5 text-[0.78rem] font-semibold text-cream">View</span>
          </span>
          <span className={`relative block ${reel ? 'aspect-[4/5] bg-plum-ink' : 'aspect-[4/5] bg-lavender'}`}>
            {thumb && (
              <img
                src={thumb}
                alt=""
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 h-full w-full ${reel ? 'object-cover' : 'object-cover object-top'}`}
              />
            )}
            {reel && (
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-plum-ink/45 backdrop-blur-sm ring-1 ring-cream/60">
                  <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-cream" aria-hidden>
                    <path d="M7 4.5v15l12.5-7.5z" />
                  </svg>
                </span>
              </span>
            )}
            {load && !ready && (
              <span className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-plum/15">
                <span className="block h-full w-1/3 animate-[ig-load_1.1s_var(--ease-silk)_infinite] bg-gold-soft" />
              </span>
            )}
          </span>
          <span className="flex h-[52px] items-center px-3 text-[0.86rem] font-semibold text-plum">View more on Instagram</span>
        </a>

        {load && (
          <iframe
            ref={frame}
            src={`${link}embed/`}
            title={`Instagram ${label.toLowerCase()} ${n}`}
            allow="encrypted-media; picture-in-picture; clipboard-write"
            scrolling="no"
            // Fallback if Instagram never reports its size: reveal shortly after load anyway.
            // The page itself has loaded: let the next embed start now.
            onLoad={() => {
              handOn.current()
              window.setTimeout(() => setReady(true), 2000)
            }}
            className={`absolute inset-0 block h-full w-full border-0 bg-white transition-opacity duration-700 ease-[var(--ease-page)] ${ready ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          />
        )}
      </div>
      <figcaption className="mt-3 flex items-baseline justify-between gap-4">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-plum/60">
          Fig. {n} · {caption ?? label}
        </span>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="link-draw shrink-0 font-serif text-[0.98rem] italic text-plum"
        >
          View on Instagram <span aria-hidden className="not-italic">↗</span>
        </a>
      </figcaption>
    </figure>
  )
}

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
  if (slot.kind === 'instagram') return <InstagramEmbed url={slot.url} thumb={slot.thumb} handle={slot.handle} caption={slot.caption} n={n} />
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
