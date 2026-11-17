import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import type { Project } from '../types'
import { loadImage } from '../lib/media'
import {
  paintClosingLeft, paintContactRight, paintCover, paintProjectLeft, paintProjectRight,
} from './magazinePages'

const W = 1.4
const H = 1.9
const T = 0.006 // page thickness
const SEG = 28 // segments across the page (where it bends)
const HSEG = 8 // segments down the page (lets the fold run diagonally)
const STEPS = 14 // integration steps when bending a column

const paperMat = () => new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: 0.9 })

interface LeafDef {
  front: THREE.Texture
  back: THREE.Texture
  /** Project slug opened by tapping each side. */
  frontSlug?: string
  backSlug?: string
}

/** How far through the flip leaf i is, for scroll progress p (0..1). */
function flipAmount(p: number, i: number, leaves: number) {
  const v = p * (leaves + 0.5) - i - 0.25
  const t = THREE.MathUtils.clamp(v / 0.6, 0, 1)
  return t * t * (3 - 2 * t)
}

/** The spread currently open: 0 = closed cover, k = after k flips. */
function spreadAt(p: number, leaves: number) {
  let k = 0
  for (let i = 0; i < leaves; i++) if (flipAmount(p, i, leaves) > 0.5) k = i + 1
  return k
}

function Leaf({
  def, index, count, scroll, onOpen,
}: {
  def: LeafDef
  index: number
  count: number
  scroll: MotionValue<number>
  onOpen: (slug: string) => void
}) {
  const group = useRef<THREE.Group>(null)
  const geom = useMemo(() => {
    const g = new THREE.BoxGeometry(W, H, T, SEG, HSEG, 1)
    g.translate(W / 2, 0, 0) // hinge on the spine
    // The page moves anywhere within reach of the spine; fixed bounds keep raycasts and culling right.
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), W * 1.3)
    return g
  }, [])
  const base = useMemo(
    () => ({
      pos: Float32Array.from(geom.attributes.position.array),
      nrm: Float32Array.from(geom.attributes.normal.array),
    }),
    [geom],
  )
  // The free edge follows the spine through a spring, so fast scrolls whip it.
  const spring = useRef({ a: 0, v: 0, ready: false, lastT: -1 })
  // The cover is card stock: stiffer and slower to whip than the inside pages.
  const flex = index === 0 ? 0.45 : 1
  const materials = useMemo(
    () => [
      paperMat(), paperMat(), paperMat(), paperMat(),
      new THREE.MeshStandardMaterial({ map: def.front, roughness: 0.62 }),
      new THREE.MeshStandardMaterial({ map: def.back, roughness: 0.62 }),
    ],
    [def],
  )
  useEffect(() => () => {
    geom.dispose()
    materials.forEach((m) => m.dispose())
  }, [geom, materials])

  useFrame((_, rawDt) => {
    const g = group.current
    if (!g) return
    const dt = Math.min(rawDt, 1 / 30)
    const t = flipAmount(scroll.get(), index, count)
    const theta = Math.PI * t

    // Stack order: unflipped leaves sit on the right, flipped ones pile on the left.
    const zRight = (count - index) * T * 1.2
    const zLeft = index * T * 1.2
    g.position.z = THREE.MathUtils.lerp(zRight, zLeft, t) + Math.sin(t * Math.PI) * 0.03

    // Underdamped spring: lags while the page is moving, overshoots when it stops.
    const s = spring.current
    // First frame, or the reader jumped/the scene was paused far from here:
    // land on the right page instead of replaying every flip in between.
    if (!s.ready || Math.abs(theta - s.a) > 1.2) {
      s.a = theta
      s.v = 0
      s.ready = true
    }
    const k = 55 * (index === 0 ? 1.6 : 1)
    s.v += (k * (theta - s.a) - 7.5 * s.v) * dt
    s.a += s.v * dt
    // Skip the vertex work once the page has settled.
    if (Math.abs(s.v) < 1e-4 && Math.abs(s.a - theta) < 1e-4 && t === s.lastT) return
    s.lastT = t

    // How far the outer edge leads (+) or trails (-) the spine, in radians:
    // a peel that lifts the edge early in the turn and lets it drop late,
    // plus the spring's lag, which gives the whip.
    const peel = Math.sin(Math.PI * t) * (0.62 - t) * 1.5
    const lag = THREE.MathUtils.clamp(s.a - theta, -0.8, 0.8) * 1.8
    const lead = (peel + lag) * flex

    const pos = geom.attributes.position as THREE.BufferAttribute
    const nrm = geom.attributes.normal as THREE.BufferAttribute
    const angleAt = (u: number, amt: number) => THREE.MathUtils.clamp(theta + amt * u * u, 0, Math.PI)
    for (let v = 0; v < pos.count; v++) {
      const i = v * 3
      const x = base.pos[i], y = base.pos[i + 1], z = base.pos[i + 2]
      // The bottom corner leads the top, so the fold runs diagonally like a real page.
      const amt = lead * (1 - 0.5 * (y / (H / 2)))
      // Walk out from the spine along the bent page, keeping the paper's length.
      const ds = x / STEPS
      let px = 0, pz = 0
      for (let j = 0; j < STEPS; j++) {
        const a = angleAt(((j + 0.5) * ds) / W, amt)
        px += Math.cos(a) * ds
        pz += Math.sin(a) * ds
      }
      const a = angleAt(x / W, amt)
      const c = Math.cos(a), sn = Math.sin(a)
      // Offset by the page's thickness along the bent surface's normal.
      pos.setXYZ(v, px - sn * z, y, pz + c * z)
      const bx = base.nrm[i], bz = base.nrm[i + 2]
      if (Math.abs(bz) > 0.5) nrm.setXYZ(v, -sn * bz, 0, c * bz)
      else if (Math.abs(bx) > 0.5) nrm.setXYZ(v, c * bx, 0, sn * bx)
    }
    pos.needsUpdate = true
    nrm.needsUpdate = true
  })

  return (
    <group ref={group}>
      <mesh
        geometry={geom}
        material={materials}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          // Box material 4 is the front face, 5 the back; edges count as whichever side is up.
          const m = e.face?.materialIndex
          const front = m === 4 || (m !== 5 && flipAmount(scroll.get(), index, count) < 0.5)
          const slug = front ? def.frontSlug : def.backSlug
          if (slug) onOpen(slug)
        }}
        onPointerOver={() => {
          if (def.frontSlug || def.backSlug) document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => (document.body.style.cursor = '')}
      />
    </group>
  )
}

function Book({
  leaves, backBoard, scroll, onOpen, onSpread,
}: {
  leaves: LeafDef[]
  backBoard: THREE.Texture
  scroll: MotionValue<number>
  onOpen: (slug: string) => void
  onSpread: (k: number) => void
}) {
  const root = useRef<THREE.Group>(null)
  const last = useRef(-1)
  const { viewport, pointer } = useThree()
  // Portrait screens can't show a whole spread legibly, so they read one page at a time.
  const single = viewport.width / viewport.height < 0.95
  const scale = single
    ? Math.min(1, (viewport.width * 0.9) / W, (viewport.height * 0.84) / H)
    : Math.min(1, (viewport.width * 0.94) / (2 * W), (viewport.height * 0.86) / H)

  useFrame((_, dt) => {
    const g = root.current
    if (!g) return
    const p = scroll.get()
    const n = leaves.length
    if (single) {
      // Camera follows each turning page to the left (the title), then glides back
      // to the right page (the story) before the next turn.
      const u = p * (n + 0.5)
      let pan = 0
      for (let i = 0; i < n; i++) {
        const back = THREE.MathUtils.clamp((u - i - 0.95) / 0.25, 0, 1)
        pan += flipAmount(p, i, n) - back * back * (3 - 2 * back)
      }
      g.position.x = (-W / 2 + W * pan) * scale
    } else {
      // Closed: centre the cover. Open: centre the spine.
      const opening = flipAmount(p, 0, n)
      g.position.x = THREE.MathUtils.lerp(-W / 2, 0, opening) * scale
    }
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, pointer.x * 0.12, 3, dt)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -0.12 - pointer.y * 0.08, 3, dt)
    const k = spreadAt(p, n)
    if (k !== last.current) {
      last.current = k
      onSpread(k)
    }
  })

  return (
    <group ref={root} scale={scale}>
      {leaves.map((def, i) => (
        <Leaf key={i} def={def} index={i} count={leaves.length} scroll={scroll} onOpen={onOpen} />
      ))}
      {/* inside back cover, always on the right */}
      <mesh position={[W / 2, 0, 0]} receiveShadow>
        <boxGeometry args={[W, H, T]} />
        <meshStandardMaterial attach="material-0" color="#2b1a3b" />
        <meshStandardMaterial attach="material-1" color="#2b1a3b" />
        <meshStandardMaterial attach="material-2" color="#2b1a3b" />
        <meshStandardMaterial attach="material-3" color="#2b1a3b" />
        <meshStandardMaterial attach="material-4" map={backBoard} roughness={0.7} />
        <meshStandardMaterial attach="material-5" color="#2b1a3b" />
      </mesh>
    </group>
  )
}

function useMagazine(projects: Project[], cutout: string, photoFor: Record<string, string>, email: string, phone: string) {
  const [state, setState] = useState<{ leaves: LeafDef[]; backBoard: THREE.Texture } | null>(null)
  useEffect(() => {
    let alive = true
    const made: THREE.Texture[] = []
    ;(async () => {
      const cover = await paintCover(cutout)
      const photos = await Promise.all(
        projects.map((p) => (photoFor[p.slug] ? loadImage(photoFor[p.slug]).catch(() => undefined) : undefined)),
      )
      const lefts = projects.map((p, i) => paintProjectLeft(p, i, projects.length))
      const rights = projects.map((p, i) => paintProjectRight(p, photos[i]))
      const closing = paintClosingLeft()
      const backBoard = paintContactRight(email, phone)
      const leaves: LeafDef[] = [{ front: cover, back: lefts[0], backSlug: projects[0].slug }]
      projects.forEach((p, i) => {
        const next = projects[i + 1]
        leaves.push({
          front: rights[i],
          frontSlug: p.slug,
          back: next ? lefts[i + 1] : closing,
          backSlug: next?.slug,
        })
      })
      made.push(cover, ...lefts, ...rights, closing, backBoard)
      if (alive) setState({ leaves, backBoard })
      else made.forEach((t) => t.dispose())
    })()
    return () => {
      alive = false
      made.forEach((t) => t.dispose())
    }
  }, [projects, cutout, photoFor, email, phone])
  return state
}

export default function Magazine({
  projects, cutout, photoFor, email, phone, scroll, active, onOpen, onSpread, compact = false,
}: {
  compact?: boolean
  projects: Project[]
  cutout: string
  photoFor: Record<string, string>
  email: string
  phone: string
  scroll: MotionValue<number>
  active: boolean
  onOpen: (slug: string) => void
  onSpread: (k: number) => void
}) {
  const mag = useMagazine(projects, cutout, photoFor, email, phone)
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={compact ? [1, 1.5] : [1, 1.75]}
      camera={{ position: [0, 0.2, 3.6], fov: 40 }}
      shadows={compact ? false : 'percentage'}
      gl={{ antialias: true, alpha: true }}
      aria-label="A 3D magazine of Ibukun's work. Scroll to turn the pages."
    >
      <ambientLight intensity={1.05} color="#fff1e2" />
      <directionalLight position={[1.5, 2.5, 4]} intensity={1.7} color="#ffe0b3" castShadow shadow-bias={-0.0004} shadow-normalBias={0.03} />
      <directionalLight position={[-3, 1, 2]} intensity={0.45} color="#c6afe6" />
      {mag && <Book leaves={mag.leaves} backBoard={mag.backBoard} scroll={scroll} onOpen={onOpen} onSpread={onSpread} />}
    </Canvas>
  )
}
