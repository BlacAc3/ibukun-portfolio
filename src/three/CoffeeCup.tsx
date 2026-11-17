import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useMaxWidth } from "../lib/media";

/** Rim of the cup: world height of the lip and the inner radius there. */
const RIM_Y = 0.742;
const RIM_R = 0.53;
const FLOOR_Y = 0.15;
/** Height of the coffee surface when the cup stands level. */
const LEVEL = 0.6;
/** Radians of tilt per pixel dragged. */
const DRAG = 0.0052;
/** How long the cup holds its tilt after the pointer lets go. */
const HOLD_MS = 650;

/**
 * The scanned tea set (Poly Haven `tea_set_01`, CC0) is in metres with the cup
 * and saucer parked side by side. Scale it up to the scene and re-centre each
 * piece so the cup's rim sits on the Y axis.
 */
const CUP_SCALE = 11.02;
/**
 * The scan's nodes carry their own translations (`0.1534, 0, 0.0613` for the cup,
 * `0.4034, 0, -0.1887` for the saucer) while the vertices are already local, so
 * the pieces are parked side by side by the transform alone. Neutralise both
 * transforms and each piece lands centred on the origin.
 */
const CUP_OFFSET: [number, number, number] = [0, -0.0024, 0];
const SAUCER_OFFSET: [number, number, number] = [0, -0.0025, 0];

/** Inner wall of the cup: [height along the cup's axis, radius]. */
const WALL: [number, number][] = [
  [FLOOR_Y, 0.32],
  [0.3, 0.37],
  [0.52, 0.46],
  [RIM_Y, RIM_R],
];

function wallR(y: number) {
  if (y <= WALL[0][0]) return WALL[0][1];
  for (let i = 1; i < WALL.length; i++) {
    const [y0, r0] = WALL[i - 1];
    const [y1, r1] = WALL[i];
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return WALL[WALL.length - 1][1];
}

/** The scanned set: one cup, one saucer, re-centred. */
function TeaSet() {
  const { scene } = useGLTF("/tea-set.glb");
  const model = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const name = mesh.name;
      if (name.includes("cup_small")) {
        mesh.position.set(...CUP_OFFSET);
      } else if (name.includes("saucer")) {
        mesh.position.set(...SAUCER_OFFSET);
        // The scan is all white porcelain; the saucer carries the plum glaze.
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.color.set("#5a3b57");
        mesh.material = mat;
      }
    });
    return root;
  }, [scene]);
  return (
    <group scale={CUP_SCALE}>
      <primitive object={model} />
    </group>
  );
}
useGLTF.preload("/tea-set.glb");

/** A latte-art heart for the coffee surface. */
function latteTexture() {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 40, s / 2, s / 2, s / 2);
  g.addColorStop(0, "#a8714a");
  g.addColorStop(0.75, "#7a4a2c");
  g.addColorStop(1, "#4e2c19");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  // Warm foam: clearly milk against the cream porcelain, never the same white.
  ctx.fillStyle = "#f0d8b4";
  ctx.beginPath();
  const cx = s / 2,
    cy = s / 2 + 20;
  ctx.moveTo(cx, cy + 110);
  ctx.bezierCurveTo(cx - 190, cy - 10, cx - 120, cy - 170, cx, cy - 70);
  ctx.bezierCurveTo(cx + 120, cy - 170, cx + 190, cy - 10, cx, cy + 110);
  ctx.fill();
  ctx.strokeStyle = "#a8714a";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 60);
  ctx.lineTo(cx, cy + 100);
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const steamVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    // sway more as the wisp rises
    float sway = sin(uv.y * 4.0 - uTime * 1.3 + uSeed) * 0.08 * uv.y;
    p.x += sway;
    p.z += cos(uv.y * 3.0 - uTime + uSeed) * 0.05 * uv.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const steamFragment = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    vec2 uv = vUv;
    float n = noise(vec2(uv.x * 3.0 + uSeed, uv.y * 2.5 - uTime * 0.55));
    n += 0.5 * noise(vec2(uv.x * 7.0 - uSeed, uv.y * 6.0 - uTime * 0.9));
    float centre = 1.0 - smoothstep(0.0, 0.5, abs(uv.x - 0.5 + (n - 0.75) * 0.25));
    float fade = smoothstep(0.0, 0.18, uv.y) * (1.0 - smoothstep(0.55, 1.0, uv.y));
    float a = centre * fade * smoothstep(0.55, 1.2, n) * 0.55;
    gl_FragColor = vec4(vec3(1.0, 0.98, 0.95), a);
  }
`;

function Steam({ x, seed }: { x: number; seed: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uSeed: { value: seed } }),
    [seed],
  );
  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });
  return (
    <mesh position={[x, 1.25, 0]}>
      <planeGeometry args={[0.55, 1.4, 1, 32]} />
      <shaderMaterial
        ref={mat}
        vertexShader={steamVertex}
        fragmentShader={steamFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Cup({
  canvas,
}: {
  canvas: React.RefObject<HTMLCanvasElement | null>;
}) {
  const turn = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const liquid = useRef<THREE.Group>(null);
  const surface = useRef<THREE.Mesh>(null);
  const { pointer } = useThree();

  // Drag state: offsets added on top of the idle tilt, and when the cup should settle back.
  const drag = useRef({
    active: false,
    id: -1,
    x: 0,
    y: 0,
    rx: 0,
    rz: 0,
    holdUntil: 0,
  });
  // The coffee: surface height, its velocity (for the slosh), and the rendered radius.
  const slosh = useRef({ h: LEVEL, v: 0, r: 0.5 });
  const spin = useRef(0);

  const coffee = useMemo(() => {
    // Unit disc, scaled to the waterline each frame.
    const geo = new THREE.CircleGeometry(1, 96);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);
  const latte = useMemo(() => latteTexture(), []);

  // Drag the cup itself; the liquid answers the tilt.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const d = drag.current;

    const release = (e: PointerEvent) => {
      if (e.pointerId !== d.id) return;
      d.active = false;
      d.id = -1;
      d.holdUntil = performance.now() + HOLD_MS;
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      d.active = true;
      d.id = e.pointerId;
      d.x = e.clientX;
      d.y = e.clientY;
      d.holdUntil = performance.now() + HOLD_MS;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort */
      }
    };
    const move = (e: PointerEvent) => {
      if (!d.active || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      d.x = e.clientX;
      d.y = e.clientY;
      // Grab the rim: drag right spins the near lip right, drag down dips the near lip.
      d.rz = THREE.MathUtils.clamp(d.rz - dx * DRAG, -0.38, 0.38);
      // Pitch down is capped tighter than up: the saucer swings closest to the
      // frame at this angle and would clip the bottom of the canvas.
      d.rx = THREE.MathUtils.clamp(d.rx + dy * DRAG, -0.26, 0.3);
      d.holdUntil = performance.now() + HOLD_MS;
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", release);
      el.removeEventListener("pointercancel", release);
    };
  }, [canvas]);

  const scratch = useMemo(
    () => ({
      q: new THREE.Quaternion(),
      qi: new THREE.Quaternion(),
      qs: new THREE.Quaternion(),
      axis: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      point: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
    }),
    [],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 15);
    const g = tilt.current;
    if (!g) return;
    const d = drag.current;

    // Let the cup settle home a beat after the pointer leaves.
    if (!d.active && performance.now() > d.holdUntil) {
      d.rx = THREE.MathUtils.damp(d.rx, 0, 4.5, dt);
      d.rz = THREE.MathUtils.damp(d.rz, 0, 4.5, dt);
    }

    // Idle presentation tilt + a whisper of pointer parallax + the drag.
    const rx = 0.18 - pointer.y * 0.1 + d.rx;
    const rz = -pointer.x * 0.08 + d.rz;
    const speed = d.active ? 16 : 5;
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, rx, speed, dt);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, rz, speed, dt);
    g.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.02;

    // The cup turns a little slower while you hold it.
    spin.current += dt * (d.active ? 0.06 : 0.25);
    if (turn.current) turn.current.rotation.y = spin.current;

    const f = scratch;
    f.q.setFromEuler(g.rotation);
    const axisY = f.axis.set(0, 1, 0).applyQuaternion(f.q).y;
    // Where the cup's axis leans: the coffee pools to that side.
    const lean = Math.sqrt(Math.max(0, 1 - axisY * axisY));
    if (lean > 1e-4) f.dir.set(f.axis.x / lean, 0, f.axis.z / lean);
    else f.dir.set(0, 0, 1);

    // Keep the surface below the lowest point of the rim so it never spills.
    const tiltMag = Math.acos(THREE.MathUtils.clamp(axisY, -1, 1));
    const cap = Math.max(
      FLOOR_Y + 0.02,
      RIM_Y * axisY - RIM_R * Math.sin(tiltMag) - 0.01,
    );
    const target = Math.min(LEVEL, cap);

    // Semi-implicit spring: the level chases the tilt and wobbles as it settles.
    const s = slosh.current;
    s.v += (140 * (target - s.h) - 17 * s.v) * dt;
    s.h += s.v * dt;
    if (s.h > cap) {
      s.h = cap;
      if (s.v > 0) s.v = 0;
    } else if (s.h < FLOOR_Y + 0.01) {
      s.h = FLOOR_Y + 0.01;
      if (s.v < 0) s.v = 0;
    }

    // Where the waterline meets the wall, uphill (a) and downhill (b).
    const hY = s.h * axisY;
    let a = wallR(hY);
    a = wallR(hY - a * lean);
    a = wallR(hY - a * lean);
    let b = wallR(hY);
    b = wallR(hY + b * lean);
    b = wallR(hY + b * lean);
    const radius = Math.max(0.1, (a + b) / 2) * 0.995;
    const offset = (b - a) / 2;

    s.r = THREE.MathUtils.damp(s.r, radius, 12, dt);
    if (surface.current) surface.current.scale.set(s.r, 1, s.r);

    if (liquid.current) {
      // Tip and slide the disc so it stays horizontal in the world, riding the low side.
      f.point
        .set(f.dir.x * offset, s.h, f.dir.z * offset)
        .applyQuaternion(f.qi.copy(f.q).invert());
      liquid.current.position.copy(f.point);
      // Counter the cup's tilt so the surface is level, while the art still turns with the cup.
      f.qs.setFromAxisAngle(f.up, spin.current);
      liquid.current.quaternion.copy(f.qi).multiply(f.qs);
    }
  });

  return (
    <group ref={tilt}>
      <group ref={turn}>
        <Suspense fallback={null}>
          <TeaSet />
        </Suspense>
      </group>
      {/* The coffee lives outside the spinning group so it can stay level. */}
      <group ref={liquid}>
        <mesh ref={surface} geometry={coffee}>
          <meshPhysicalMaterial
            map={latte}
            roughness={0.18}
            metalness={0.05}
            clearcoat={1}
            clearcoatRoughness={0.12}
          />
        </mesh>
      </group>
      <Steam x={-0.1} seed={1.3} />
      <Steam x={0.12} seed={4.7} />
    </group>
  );
}

export default function CoffeeCup({ active }: { active: boolean }) {
  // Phones: lower pixel ratio and no shadow maps; ContactShadows still grounds the cup.
  const compact = useMaxWidth(768);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  return (
    <div
      className="h-full w-full cursor-grab active:cursor-grabbing"
      style={{ touchAction: "pan-y" }}
    >
      <Canvas
        ref={canvasRef}
        frameloop={active ? "always" : "never"}
        dpr={compact ? [1, 1.5] : [1, 1.75]}
        camera={{ position: [0, 1.5, 3.4], fov: 38 }}
        shadows={compact ? false : "percentage"}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(0, 0.55, 0)}
        aria-label="A 3D cup of coffee with latte art and rising steam. Drag it to tilt the cup."
      >
        <ambientLight intensity={0.8} color="#fff0de" />
        <directionalLight
          position={[2.5, 4, 3]}
          intensity={2.2}
          color="#ffdcae"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.03}
        />
        <directionalLight
          position={[-3, 1.5, -1]}
          intensity={0.9}
          color="#c9a9dd"
        />
        <pointLight position={[0, 2.5, 2]} intensity={0.6} color="#ffffff" />
        <Cup canvas={canvasRef} />
        <ContactShadows
          position={[0, -0.05, 0]}
          opacity={0.45}
          scale={4}
          blur={2.6}
          far={1.2}
          color="#2e1a2e"
        />
      </Canvas>
    </div>
  );
}
