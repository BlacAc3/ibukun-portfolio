import * as THREE from 'three'
import type { Project } from '../types'
import { drawCover, fontsReady, loadImage, wrapLines } from '../lib/media'

export const PW = 900
export const PH = 1222

const C = {
  plum: '#54366a',
  deep: '#2b1a3b',
  cream: '#f3ebdd',
  paper: '#faf5ec',
  lilac: '#dccdef',
  lavender: '#ece4f6',
  gold: '#b89a74',
  goldSoft: '#ebdcc2',
  ink: '#241632',
}

const toneBg: Record<Project['tone'], string> = {
  cream: C.paper,
  lilac: C.lilac,
  gold: C.goldSoft,
  lavender: C.lavender,
}

function canvas() {
  const c = document.createElement('canvas')
  c.width = PW
  c.height = PH
  const ctx = c.getContext('2d')!
  return { c, ctx }
}

function display(ctx: CanvasRenderingContext2D, px: number) {
  ctx.font = `900 ${px}px Archivo`
  // Archivo's wide cut, as on her cover (ignored by browsers that don't support it).
  ;(ctx as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = 'expanded'
}

/** Largest display size (up to max) at which every line fits within maxWidth. */
function fitDisplay(ctx: CanvasRenderingContext2D, lines: string[], maxWidth: number, max: number) {
  let px = max
  display(ctx, px)
  const widest = () => Math.max(...lines.map((l) => ctx.measureText(l).width))
  while (px > 40 && widest() > maxWidth) {
    px -= 4
    display(ctx, px)
  }
  return px
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, align: CanvasTextAlign = 'left') {
  ctx.font = '500 20px Archivo'
  ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '3px'
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.fillText(text.toUpperCase(), x, y)
  ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px'
}

/** Paper-edge shading toward the spine, so open spreads read as a real magazine. */
function spineShade(ctx: CanvasRenderingContext2D, side: 'left' | 'right') {
  const g = side === 'right'
    ? ctx.createLinearGradient(0, 0, 90, 0)
    : ctx.createLinearGradient(PW, 0, PW - 90, 0)
  g.addColorStop(0, 'rgba(36,20,52,0.22)')
  g.addColorStop(1, 'rgba(36,20,52,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, PW, PH)
}

function tex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Front cover: her own cover layout — name behind, portrait, outline name on top. */
export async function paintCover(cutoutSrc: string) {
  await fontsReady()
  const img = await loadImage(cutoutSrc)
  const { c, ctx } = canvas()
  ctx.fillStyle = C.plum
  ctx.fillRect(0, 0, PW, PH)

  label(ctx, 'Creative portfolio', 56, 80, C.cream)
  label(ctx, 'Lagos', PW - 56, 80, C.cream, 'right')

  const lines = ["IBUKUN'S", 'PORT-', 'FOLIO']
  const size = fitDisplay(ctx, lines, PW - 90, 168)
  ctx.textAlign = 'center'
  const lh = size * 0.9
  const top = 200 + size
  ctx.fillStyle = C.cream
  lines.forEach((l, i) => ctx.fillText(l, PW / 2, top + i * lh))

  // portrait cutout, anchored to the bottom like the cover
  const h = PH * 0.78
  const w = (img.width / img.height) * h
  ctx.drawImage(img, (PW - w) / 2, PH - h, w, h)

  ctx.strokeStyle = C.cream
  ctx.lineWidth = 2.5
  lines.forEach((l, i) => ctx.strokeText(l, PW / 2, top + i * lh))

  label(ctx, 'Ibukunoluwa Odedele', 56, PH - 56, C.cream)
  label(ctx, 'Issue 01', PW - 56, PH - 56, C.cream, 'right')
  return tex(c)
}

/** Left page of a spread: the project's name, big. */
export function paintProjectLeft(p: Project, index: number, total: number) {
  const { c, ctx } = canvas()
  ctx.fillStyle = toneBg[p.tone]
  ctx.fillRect(0, 0, PW, PH)

  label(ctx, `Feature ${index + 1} of ${total}`, 70, 96, C.plum)
  ctx.fillStyle = C.gold
  ctx.fillRect(70, 124, 120, 4)

  const words = p.name.replace('—', '').split(/\s+/).filter(Boolean).map((w) => w.toUpperCase())
  // Size to the longest single word, then wrap at that size.
  const size = fitDisplay(ctx, words, PW - 140, 112)
  ctx.textAlign = 'left'
  ctx.fillStyle = C.plum
  const lh = size * 0.93
  const lines = wrapLines(ctx, words.join(' '), PW - 140)
  lines.forEach((l, i) => ctx.fillText(l, 70, 190 + size + i * lh))

  ctx.font = 'italic 400 42px Fraunces'
  ctx.fillStyle = C.ink
  ctx.fillText(p.role, 70, 190 + size + (lines.length - 1) * lh + 80)

  ctx.font = '400 30px Fraunces'
  ctx.fillStyle = C.ink
  const body = wrapLines(ctx, p.body[0], PW - 140)
  const by = PH - 90 - body.length * 44
  body.forEach((l, i) => ctx.fillText(l, 70, by + i * 44))

  spineShade(ctx, 'left')
  return tex(c)
}

/** A tappable spot on a page, in canvas pixels. */
export interface PageLink {
  href: string
  x: number
  y: number
  w: number
  h: number
}

/** A small play mark for reels, sat on the still itself. */
function playMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(28,16,40,0.45)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(243,235,221,0.85)'
  ctx.lineWidth = 2.5
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.3, cy - r * 0.45)
  ctx.lineTo(cx + r * 0.5, cy)
  ctx.lineTo(cx - r * 0.3, cy + r * 0.45)
  ctx.closePath()
  ctx.fillStyle = C.cream
  ctx.fill()
  ctx.restore()
}

/**
 * One frame of the contact sheet: the post's still, mounted like a print,
 * with a printed caption beneath. `hot` is the hover state.
 */
function contactFrame(
  ctx: CanvasRenderingContext2D,
  r: { x: number; y: number; w: number; h: number },
  img: HTMLImageElement | undefined,
  reel: boolean,
  n: number,
  hot: boolean,
) {
  const { x, y, w, h } = r
  ctx.save()
  ctx.shadowColor = hot ? 'rgba(36,20,52,0.32)' : 'rgba(36,20,52,0.16)'
  ctx.shadowBlur = hot ? 34 : 18
  ctx.shadowOffsetY = hot ? 14 : 8
  ctx.fillStyle = reel ? C.ink : C.lavender
  ctx.fillRect(x, y, w, h)
  ctx.restore()
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  if (img) {
    // a slow push-in on hover, like leaning closer to the print
    const z = hot ? 14 : 0
    drawCover(ctx, img, x - z, y - z, w + z * 2, h + z * 2, reel ? 0.35 : 0)
  }
  ctx.restore()
  if (reel) playMark(ctx, x + w / 2, y + h / 2, 30)
  if (hot) {
    ctx.strokeStyle = C.gold
    ctx.lineWidth = 6
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6)
  }
  // caption: a short gold rule, then FIG. n · POST ↗
  ctx.fillStyle = C.gold
  ctx.fillRect(x, y + h + 26, 22, 3)
  label(ctx, `Fig. ${n} · ${reel ? 'Reel' : 'Post'} ↗`, x + 34, y + h + 34, hot ? C.deep : C.plum)
}

export interface RightPage {
  texture: THREE.Texture
  links: PageLink[]
  /** Redraw with link i highlighted (-1 for none). */
  hover: (i: number) => void
}

/**
 * Right page of a spread: her work on Instagram as a contact sheet, what she
 * did, and a call to open the full story. Projects without Instagram work
 * show her photo if there is one, otherwise go straight to the text.
 */
export function paintProjectRight(
  p: Project,
  photo?: HTMLImageElement,
  stills: (HTMLImageElement | undefined)[] = [],
): RightPage {
  const { c, ctx } = canvas()
  const ig = p.media.flatMap((m) => (m.kind === 'instagram' ? [m.url] : [])).slice(0, 3)
  const links: PageLink[] = ig.map((href, i) => ({ href, x: 70 + i * 260, y: 116, w: 240, h: 300 }))
  const texture = tex(c)
  let shown = -2

  const draw = (hot: number) => {
    if (hot === shown) return
    shown = hot
    ctx.fillStyle = C.paper
    ctx.fillRect(0, 0, PW, PH)

    let y = 90
    if (links.length) {
      label(ctx, 'On Instagram — tap a frame', 70, 86, C.plum)
      links.forEach((r, i) => contactFrame(ctx, r, stills[i], r.href.includes('/reel/'), i + 1, i === hot))
      y = 116 + 300 + 120
    } else if (photo) {
      drawCover(ctx, photo, 70, 70, PW - 140, 520, 0.25)
      y = 660
    }

    ctx.font = 'italic 400 40px Fraunces'
    ctx.fillStyle = C.plum
    wrapLines(ctx, p.summary, PW - 140).forEach((l, i) => ctx.fillText(l, 70, y + i * 52))
    y += wrapLines(ctx, p.summary, PW - 140).length * 52 + 50

    ctx.font = '400 30px Fraunces'
    ctx.fillStyle = C.ink
    p.contributions.slice(0, 5).forEach((item, i) => {
      ctx.fillStyle = C.gold
      ctx.fillRect(70, y + i * 48 - 10, 14, 4)
      ctx.fillStyle = C.ink
      ctx.fillText(item, 100, y + i * 48)
    })

    label(ctx, 'Open the page to read the story', PW - 70, PH - 70, C.plum, 'right')
    spineShade(ctx, 'right')
    texture.needsUpdate = true
  }

  draw(-1)
  return { texture, links, hover: draw }
}

/** Closing spread, left: the sign-off. */
export function paintClosingLeft() {
  const { c, ctx } = canvas()
  ctx.fillStyle = C.plum
  ctx.fillRect(0, 0, PW, PH)
  display(ctx, 104)
  ctx.textAlign = 'left'
  ctx.fillStyle = C.cream
  ;["LET'S", 'CREATE', 'SOME-', 'THING'].forEach((l, i) => ctx.fillText(l, 70, 330 + i * 104))
  ctx.font = 'italic 400 64px Fraunces'
  ctx.fillStyle = C.goldSoft
  ctx.fillText('meaningful together.', 70, 330 + 4 * 104 + 30)
  spineShade(ctx, 'left')
  return tex(c)
}

/** Inside back cover: how to reach her. */
export function paintContactRight(email: string, phone: string) {
  const { c, ctx } = canvas()
  ctx.fillStyle = C.deep
  ctx.fillRect(0, 0, PW, PH)
  ctx.fillStyle = C.gold
  ctx.fillRect(70, 300, 120, 4)
  ctx.font = 'italic 400 44px Fraunces'
  ctx.fillStyle = C.cream
  ctx.textAlign = 'left'
  ctx.fillText('Write to me', 70, 390)
  ctx.font = '400 38px Fraunces'
  ctx.fillText(email, 70, 450)
  ctx.font = 'italic 400 44px Fraunces'
  ctx.fillText('Call or WhatsApp', 70, 580)
  ctx.font = '400 38px Fraunces'
  ctx.fillText(phone, 70, 640)
  ctx.font = 'italic 400 44px Fraunces'
  ctx.fillText('Based in', 70, 770)
  ctx.font = '400 38px Fraunces'
  ctx.fillText('Lagos, Nigeria', 70, 830)
  spineShade(ctx, 'right')
  return tex(c)
}
