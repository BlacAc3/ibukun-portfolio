import { useEffect, useState } from 'react'

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** True below the given width; updates on resize. */
export function useMaxWidth(px: number) {
  const query = `(max-width: ${px}px)`
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Make sure the web fonts are ready before drawing them onto canvas textures. */
export async function fontsReady() {
  await Promise.all([
    document.fonts.load('900 80px Archivo'),
    document.fonts.load('italic 400 40px Fraunces'),
    document.fonts.load('400 30px Fraunces'),
  ]).catch(() => undefined)
}

/** Draw an image covering a box, like CSS object-fit: cover. */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  focusY = 0.3,
) {
  const s = Math.max(w / img.width, h / img.height)
  const sw = w / s
  const sh = h / s
  const sx = (img.width - sw) / 2
  const sy = (img.height - sh) * focusY
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

/** Wrap text into lines that fit maxWidth. */
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

/** WebGL available and the visitor hasn't asked for reduced motion. */
export function useCan3D() {
  const [webgl] = useState(() => typeof window !== 'undefined' && hasWebGL())
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return webgl && !reduced
}
