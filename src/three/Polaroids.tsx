import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { drawCover, fontsReady, loadImage } from '../lib/media'

interface Shot {
  src: string
  caption: string
}

const W = 1, H = 1.2 // polaroid proportions

/** Paint a whole polaroid (frame, photo, handwritten caption) into one texture. */
async function makePolaroidTexture(shot: Shot) {
  await fontsReady()
  const img = await loadImage(shot.src)
  const cw = 600, ch = 720
  const c = document.createElement('canvas')
  c.width = cw
  c.height = ch
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fbf7ef'
  ctx.fillRect(0, 0, cw, ch)
  const pad = 34
  drawCover(ctx, img, pad, pad, cw - pad * 2, cw - pad * 2, 0.22)
  // a whisper of warm fade, like an old print
  ctx.fillStyle = 'rgba(184,154,116,0.08)'
  ctx.fillRect(pad, pad, cw - pad * 2, cw - pad * 2)
  ctx.fillStyle = '#3b2238'
  ctx.font = 'italic 400 40px Fraunces'
  ctx.textAlign = 'center'
  ctx.fillText(shot.caption, cw / 2, cw + 58)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function Polaroid({
  shot, position, rotation, scroll, index,
}: {
  shot: Shot
  position: [number, number, number]
  rotation: number
  scroll?: MotionValue<number>
  index: number
}) {
  const group = useRef<THREE.Group>(null)
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  const offset = useRef(new THREE.Vector3())
  const drag = useRef<{ start: THREE.Vector3; origin: THREE.Vector3 } | null>(null)
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -position[2]), [position])
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    let alive = true
    let made: THREE.Texture | undefined
    makePolaroidTexture(shot).then((t) => {
      made = t
      if (alive) setTex(t)
      else t.dispose()
    })
    return () => {
      alive = false
      made?.dispose()
    }
  }, [shot])

  useEffect(() => {
    document.body.style.cursor = hovered ? (drag.current ? 'grabbing' : 'grab') : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered])

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const p = scroll?.get() ?? 0.5
    // Tilt as the section scrolls past; alternate direction per card.
    const dir = index % 2 ? 1 : -1
    const targetRotZ = rotation + dir * (p - 0.5) * 0.35
    const targetRotX = (p - 0.5) * 0.5
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, targetRotZ, 4, dt)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetRotX, 4, dt)
    // Ease back toward home after being dragged.
    if (!drag.current) offset.current.multiplyScalar(Math.exp(-dt * 0.6))
    g.position.set(position[0] + offset.current.x, position[1] + offset.current.y + dir * (p - 0.5) * 0.4, position[2])
    const s = THREE.MathUtils.damp(g.scale.x, hovered ? 1.06 : 1, 8, dt)
    g.scale.setScalar(s)
  })

  const hit = (e: ThreeEvent<PointerEvent>) => {
    const v = new THREE.Vector3()
    e.ray.intersectPlane(plane, v)
    return v
  }

  return (
    <group ref={group} position={position} rotation={[0, 0, rotation]}>
      <mesh
        castShadow
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onPointerDown={(e) => {
          e.stopPropagation()
          ;(e.target as Element).setPointerCapture(e.pointerId)
          drag.current = { start: hit(e), origin: offset.current.clone() }
          document.body.style.cursor = 'grabbing'
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const now = hit(e)
          offset.current.copy(drag.current.origin).add(now.sub(drag.current.start))
        }}
        onPointerUp={(e) => {
          ;(e.target as Element).releasePointerCapture(e.pointerId)
          drag.current = null
          document.body.style.cursor = hovered ? 'grab' : ''
        }}
      >
        <boxGeometry args={[W, H, 0.012]} />
        {/* sides & back plain paper, front carries the photo */}
        <meshStandardMaterial attach="material-0" color="#efe7da" />
        <meshStandardMaterial attach="material-1" color="#efe7da" />
        <meshStandardMaterial attach="material-2" color="#efe7da" />
        <meshStandardMaterial attach="material-3" color="#efe7da" />
        <meshStandardMaterial key={tex ? tex.uuid : 'blank'} attach="material-4" map={tex} color={tex ? '#ffffff' : '#fbf7ef'} roughness={0.75} />
        <meshStandardMaterial attach="material-5" color="#e9e0d1" roughness={0.9} />
      </mesh>
    </group>
  )
}

function Layout({ shots, scroll, compact }: { shots: Shot[]; scroll?: MotionValue<number>; compact: boolean }) {
  const { viewport } = useThree()
  // Spread the cards across whatever width we have.
  const spread = Math.min(viewport.width / 2 - 0.6, 1.5)
  const slots: { p: [number, number, number]; r: number }[] = compact
    ? [
        { p: [-spread * 0.55, 0.35, 0], r: 0.12 },
        { p: [spread * 0.55, 0.15, 0.15], r: -0.1 },
        { p: [0, -0.55, 0.3], r: 0.04 },
      ]
    : [
        { p: [-spread, 0.55, 0], r: 0.14 },
        { p: [spread * 0.25, 0.85, 0.12], r: -0.08 },
        { p: [spread, -0.15, 0.24], r: 0.1 },
        { p: [-spread * 0.3, -0.75, 0.36], r: -0.13 },
      ]
  return (
    <>
      {slots.map((s, i) => (
        <Float key={i} speed={1.4} rotationIntensity={0.25} floatIntensity={0.5} floatingRange={[-0.06, 0.06]}>
          <Polaroid shot={shots[i % shots.length]} position={s.p} rotation={s.r} scroll={scroll} index={i} />
        </Float>
      ))}
    </>
  )
}

export default function Polaroids({
  shots, scroll, active, compact = false,
}: {
  shots: Shot[]
  scroll?: MotionValue<number>
  active: boolean
  compact?: boolean
}) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={compact ? [1, 1.5] : [1, 1.75]}
      camera={{ position: [0, 0, 4.2], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      shadows={compact ? false : 'percentage'}
      aria-label="Floating polaroid photos of Ibukun. Drag them around."
    >
      <ambientLight intensity={1.1} color="#fff3e6" />
      <directionalLight position={[2.5, 3, 4]} intensity={1.6} color="#ffe2b8" castShadow shadow-bias={-0.0004} shadow-normalBias={0.03} />
      <directionalLight position={[-3, -1, 2]} intensity={0.5} color="#c6afe6" />
      <Layout shots={shots} scroll={scroll} compact={compact} />
    </Canvas>
  )
}
