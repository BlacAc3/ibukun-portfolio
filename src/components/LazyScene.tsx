import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useCan3D } from '../lib/media'

interface Props {
  /** Rendered once the box is near the viewport. `active` is false while scrolled away, so scenes can pause. */
  children: (active: boolean) => ReactNode
  /** Shown for reduced motion, no WebGL, and while the 3D code loads. */
  fallback: ReactNode
  className?: string
  /** Also mount once the page is idle, so a reader who jumps past it never meets a loader on the way back. */
  eager?: boolean
}

/** Mounts a 3D scene only when needed and pauses it offscreen. */
export function LazyScene({ children, fallback, className, eager = false }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState(false)
  const use3D = useCan3D()

  useEffect(() => {
    if (!eager || !use3D) return
    // Mounted but not active: textures paint, the render loop stays paused.
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const id = ric(() => setMounted(true), { timeout: 4000 })
    return () => cancel(id)
  }, [eager, use3D])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        setActive(entry.isIntersecting)
        if (entry.isIntersecting) setMounted(true)
      },
      { rootMargin: '300px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={`min-w-0 overflow-hidden ${className ?? ''}`}>
      {use3D && mounted ? <Suspense fallback={fallback}>{children(active)}</Suspense> : fallback}
    </div>
  )
}
