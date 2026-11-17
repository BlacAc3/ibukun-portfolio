import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { useMaxWidth } from "../lib/media";

/* ------------------------------------------------------------------ *
 * Cup dimensions, in scene units. The lathe profiles below are the
 * single source of truth for the cup, the coffee and the saucer.
 * ------------------------------------------------------------------ */
/** Height of the coffee surface on the cup's axis. */
const LEVEL = 0.62;
/** Resting presentation tilt towards the camera, in radians. */
const IDLE_TILT = 0.05;
/** Radians of tilt per pixel dragged. */
const DRAG = 0.0048;
/**
 * Most the drag may tilt the cup. With the surface pinned to the axis at
 * LEVEL, the low lip stays dry while tan(tilt) < (RIM - LEVEL) / RIM_IN,
 * about 0.29 rad; idle tilt, parallax and slosh share what is left.
 */
const TILT_MAX = 0.18;
/** How long the cup holds its tilt after the pointer lets go. */
const HOLD_MS = 650;

/** Fixed physics sub-step, and the most sub-steps one frame may spend. */
const SUB = 1 / 240;
const MAX_STEPS = 10;
/** Slosh: the surface rocks like a damped pendulum (~2.4 Hz). */
const SLOSH_W2 = 225;
const SLOSH_C = 4.2;
/** How hard a change in drag rate kicks the surface, and its limit. */
const SLOSH_KICK = 2.0;
const SLOSH_MAX = 0.2;

/** Spill: lip height, the inner radius there, and how much coffee can go. */
const LIP_Y = 0.778;
const LIP_R = 0.552;
const MIN_LEVEL = LEVEL - 0.07;
/** Units/s² of gravity for droplets, in scene units. */
const GRAVITY = 3.4;
const MAX_DROPS = 96;
const MAX_STAINS = 48;
/** Seconds a puddle sits on the saucer before it starts to fade. */
const STAIN_HOLD = 7;
const STAIN_FADE = 2.5;

const IVORY = "#f2e9da";
const PLUM = "#54366a";
const GOLD = "#d1a85a";

/**
 * Cup body, traversed as one closed contour: base centre → foot →
 * outer wall → rolled lip → inner wall → well → base centre. Stoneware
 * walls are thick at the foot and thin towards the lip.
 */
const CUP_PROFILE: [number, number][] = [
  [0.0, 0.035],
  [0.25, 0.035],
  [0.29, 0.02],
  [0.315, 0.025],
  [0.33, 0.055],
  [0.35, 0.1],
  [0.39, 0.18],
  [0.44, 0.29],
  [0.485, 0.4],
  [0.52, 0.51],
  [0.55, 0.62],
  [0.575, 0.71],
  [0.592, 0.765],
  [0.597, 0.784],
  [0.588, 0.796],
  [0.572, 0.798],
  [0.558, 0.79],
  [0.548, 0.772],
  [0.528, 0.7],
  [0.503, 0.61],
  [0.47, 0.5],
  [0.43, 0.39],
  [0.38, 0.28],
  [0.33, 0.19],
  [0.275, 0.14],
  [0.2, 0.125],
  [0.0, 0.12],
];

/** Shallow saucer with a turned-up rim and a foot ring. */
const SAUCER_PROFILE: [number, number][] = [
  [0.0, 0.02],
  [0.3, 0.02],
  [0.34, 0.024],
  [0.45, 0.028],
  [0.62, 0.042],
  [0.76, 0.064],
  [0.83, 0.088],
  [0.842, 0.082],
  [0.838, 0.07],
  [0.79, 0.052],
  [0.64, 0.024],
  [0.47, 0.004],
  [0.42, -0.014],
  [0.39, -0.014],
  [0.37, 0.0],
  [0.0, 0.0],
];

/** Inner wall radius (less a hair), mirrored in GLSL to trim the surface. */
const CUP_R_GLSL = /* glsl */ `
float cupInnerR(float y) {
  if (y <= 0.125) return 0.0;
  if (y < 0.14)  return mix(0.20,  0.275, (y - 0.125) / 0.015);
  if (y < 0.19)  return mix(0.275, 0.33,  (y - 0.14)  / 0.05);
  if (y < 0.28)  return mix(0.33,  0.38,  (y - 0.19)  / 0.09);
  if (y < 0.39)  return mix(0.38,  0.43,  (y - 0.28)  / 0.11);
  if (y < 0.50)  return mix(0.43,  0.47,  (y - 0.39)  / 0.11);
  if (y < 0.61)  return mix(0.47,  0.503, (y - 0.50)  / 0.11);
  if (y < 0.70)  return mix(0.503, 0.528, (y - 0.61)  / 0.09);
  if (y < 0.772) return mix(0.528, 0.548, (y - 0.70)  / 0.072);
  return 0.0;
}
`;

const NOISE_GLSL = /* glsl */ `
float sipHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sipHash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float sipNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(sipHash(i), sipHash(i + vec2(1, 0)), u.x),
             mix(sipHash(i + vec2(0, 1)), sipHash(i + vec2(1, 1)), u.x), u.y);
}
float sipFbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * sipNoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return s;
}
`;

/** Espresso, crema and a small latte-art heart. Coordinates in cup space. */
const COFFEE_GLSL = /* glsl */ `
// Inigo Quilez's exact heart SDF; p.y points from the tip to the lobes.
float sdHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
                  dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}
vec3 coffeeTop(vec2 p, float wallR, float t) {
  float r = length(p) / max(wallR, 1e-3);
  vec3 espresso = vec3(0.075, 0.032, 0.012);
  vec3 crema    = vec3(0.36, 0.17, 0.055);
  vec3 tiger    = vec3(0.50, 0.27, 0.10);
  vec3 foam     = vec3(0.86, 0.74, 0.56);

  // Tiger-striped crema: warm streaks drifting slowly round the cup.
  float ang = atan(p.y, p.x);
  float streak = sipFbm(vec2(ang * 2.2 + t * 0.05, r * 5.0) + sipFbm(p * 9.0) * 1.2);
  float fine = sipNoise(p * 70.0);
  vec3 c = mix(crema, tiger, smoothstep(0.45, 0.8, streak));
  c *= 0.9 + 0.12 * fine;
  // Darker espresso where the crema thins at the wall.
  c = mix(c, espresso, smoothstep(0.7, 0.97, r) * 0.9);

  // A modest poured heart, tip towards the handle.
  vec2 h = vec2(-p.y, -p.x) / (wallR * 0.55);
  h.y += 0.5;
  float d = sdHeart(h) + (sipFbm(p * 14.0) - 0.5) * 0.09;
  float heart = 1.0 - smoothstep(-0.04, 0.05, d);
  float halo = (1.0 - smoothstep(0.0, 0.2, d)) * (1.0 - heart);
  c = mix(c, tiger * 1.15, halo * 0.55);
  // Foam is never flat white: crema bleeds through it.
  vec3 f = mix(foam, tiger * 1.4, 0.18 * sipFbm(p * 22.0 + 3.0));
  c = mix(c, f * (0.92 + 0.08 * fine), heart * 0.92);

  // A thin meniscus where the coffee climbs the glaze.
  c += vec3(0.10, 0.06, 0.03) * smoothstep(0.96, 1.0, r);
  return c;
}
`;

type SipUniforms = {
  uTiltInv: { value: THREE.Matrix4 };
  uSpin: { value: number };
  uTime: { value: number };
};

function lathe(profile: [number, number][], segments = 96) {
  const points = profile.map(
    ([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y),
  );
  return new THREE.LatheGeometry(points, segments);
}

/**
 * Stoneware glaze: fine iron speckle and a soft tone variation, carried in
 * object space so it turns with the piece, and glaze that pools darker
 * low on the body.
 */
function patchGlaze(
  mat: THREE.MeshPhysicalMaterial,
  key: string,
  speckle: number,
  pool: number,
  depth = "",
) {
  mat.customProgramCacheKey = () => `sip-glaze-${key}`;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vSipObj;\nvarying vec3 vSipObjN;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n  vSipObj = position;\n  vSipObjN = normal;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vSipObj;
        varying vec3 vSipObjN;
        ${NOISE_GLSL}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec3 sp = vSipObj * 230.0;
        float dots = step(0.9935, sipHash3(floor(sp)));
        float mott = sipNoise(vSipObj.xz * 9.0 + vSipObj.y * 6.0);
        diffuseColor.rgb *= 0.95 + 0.08 * mott;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.14, 0.1), dots * ${speckle.toFixed(3)});
        diffuseColor.rgb *= 1.0 - ${pool.toFixed(3)} * (1.0 - smoothstep(0.02, 0.32, vSipObj.y));
        ${depth}`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (mott - 0.5) * 0.12, 0.04, 1.0);`,
      );
  };
}

/**
 * The surface is one oversized disc lying in the (gently sloshing) surface
 * plane, trimmed back to the cup wall. `uTiltInv` maps the fragment into
 * cup space, where the wall profile is known and the crema lives.
 */
function patchCoffee(mat: THREE.MeshPhysicalMaterial, u: SipUniforms) {
  mat.customProgramCacheKey = () => "sip-coffee";
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTiltInv = u.uTiltInv;
    shader.uniforms.uSpin = u.uSpin;
    shader.uniforms.uTime = u.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSipWorld;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\n  vSipWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform mat4 uTiltInv;
        uniform float uSpin;
        uniform float uTime;
        varying vec3 vSipWorld;
        ${CUP_R_GLSL}
        ${NOISE_GLSL}
        ${COFFEE_GLSL}`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        vec3 cupP = (uTiltInv * vec4(vSipWorld, 1.0)).xyz;
        float wallR = cupInnerR(cupP.y);
        if (length(cupP.xz) > wallR) discard;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        // Turn the crema with the cup.
        float cs = cos(uSpin), sn = sin(uSpin);
        vec2 artP = vec2(cs * cupP.x - sn * cupP.z, sn * cupP.x + cs * cupP.z);
        diffuseColor.rgb = coffeeTop(artP, wallR, uTime);`,
      );
  };
}

/* ------------------------------------------------------------------ *
 * Steam: soft, domain-warped wisps that rise, widen and thin out.
 * Each wisp turns about Y to face the camera, so it stays upright.
 * ------------------------------------------------------------------ */
const steamVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const steamFragment = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform float uOpacity;
  varying vec2 vUv;
  ${NOISE_GLSL}
  void main() {
    vec2 uv = vUv;
    float t = uTime;
    // Warp field drifting upward.
    float w = sipFbm(vec2(uv.x * 2.2 + uSeed, uv.y * 1.8 - t * 0.55));
    // The column sways, and the sway itself travels up the plume.
    float x = uv.x - 0.5
      + (w - 0.5) * 0.7 * uv.y
      + sin(uv.y * 5.0 - t * 1.6 + uSeed) * 0.085 * uv.y
      + sin(t * 0.7 + uSeed * 2.0) * 0.03 * uv.y;
    float width = mix(0.05, 0.27, smoothstep(0.0, 1.0, uv.y));
    float column = exp(-(x * x) / (width * width));
    float dens = sipFbm(vec2(x * 4.0 + uSeed, uv.y * 2.6 - t * 0.85) + w * 1.6);
    // Puffs: soft bands of denser steam that rise and dissolve.
    float puff = 0.62 + 0.38 * sin(uv.y * 8.0 - t * 2.4 + uSeed * 3.0 + w * 3.0);
    float breathe = 0.82 + 0.18 * sin(t * 0.9 + uSeed);
    float a = column
      * puff
      * breathe
      * smoothstep(0.26, 0.7, dens)
      * smoothstep(0.0, 0.18, uv.y)
      * (1.0 - smoothstep(0.42, 1.0, uv.y))
      * uOpacity;
    gl_FragColor = vec4(mix(vec3(0.86, 0.83, 0.95), vec3(1.0), uv.y * 0.35), a);
  }
`;

function Wisp({
  x,
  z,
  seed,
  opacity,
  speed,
}: {
  x: number;
  z: number;
  seed: number;
  opacity: number;
  speed: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: seed * 3.0 },
      uSeed: { value: seed },
      uOpacity: { value: opacity },
    }),
    [seed, opacity],
  );
  useFrame(({ camera }, dt) => {
    uniforms.uTime.value += dt * speed;
    const m = mesh.current;
    if (m) m.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z);
  });
  return (
    <mesh ref={mesh} position={[x, 1.42, z]} renderOrder={4}>
      <planeGeometry args={[0.62, 1.35]} />
      <shaderMaterial
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

function Steam() {
  return (
    <group>
      <Wisp x={-0.1} z={0.05} seed={1.3} opacity={0.95} speed={1.0} />
      <Wisp x={0.12} z={-0.06} seed={4.7} opacity={0.8} speed={0.85} />
      <Wisp x={0.0} z={-0.12} seed={8.1} opacity={0.65} speed={1.15} />
    </group>
  );
}

/** Top surface of the saucer, [radius, height], for droplets to land on. */
const SAUCER_TOP: [number, number][] = [
  [0.34, 0.024],
  [0.45, 0.028],
  [0.62, 0.042],
  [0.76, 0.064],
  [0.83, 0.088],
  [0.842, 0.082],
];

function saucerTop(r: number): { y: number; slope: number } | null {
  if (r < SAUCER_TOP[0][0] || r > SAUCER_TOP[SAUCER_TOP.length - 1][0])
    return null;
  for (let i = 1; i < SAUCER_TOP.length; i++) {
    const [r1, y1] = SAUCER_TOP[i];
    const [r0, y0] = SAUCER_TOP[i - 1];
    if (r <= r1) {
      const t = (r - r0) / (r1 - r0);
      return { y: y0 + (y1 - y0) * t, slope: (y1 - y0) / (r1 - r0) };
    }
  }
  return null;
}

type Drop = { p: THREE.Vector3; v: THREE.Vector3; alive: boolean; size: number; off: boolean };

/** Puddles stay inside the saucer's well; anything further out runs over the lip. */
const WELL_R = 0.8;
const LIP_OUT_R = 0.846;
const LIP_OUT_Y = 0.084;

/**
 * The colour the coffee reads as in the cup (crema with tiger streaks, in
 * linear space like the surface shader), so drops and puddles match it.
 */
const SPILT = new THREE.Color().setRGB(0.22, 0.115, 0.05);
type Stain = { p: THREE.Vector3; n: THREE.Vector3; age: number; size: number; sx: number; rot: number; alive: boolean };
export type SpillBus = { emit: (p: THREE.Vector3, v: THREE.Vector3) => void };

/**
 * Coffee that leaves the cup: droplets fly off the lip under gravity and
 * splash into glossy puddles on the saucer, which slowly soak away.
 * Everything lives in the tilt group's frame, like the saucer itself.
 */
function Spill({ bus }: { bus: SpillBus }) {
  const drops = useRef<THREE.InstancedMesh>(null);
  const stains = useRef<THREE.InstancedMesh>(null);

  const state = useMemo(() => {
    const d: Drop[] = Array.from({ length: MAX_DROPS }, () => ({
      p: new THREE.Vector3(),
      v: new THREE.Vector3(),
      alive: false,
      size: 1,
      off: false,
    }));
    const s: Stain[] = Array.from({ length: MAX_STAINS }, () => ({
      p: new THREE.Vector3(),
      n: new THREE.Vector3(0, 1, 0),
      age: 0,
      size: 0,
      sx: 1,
      rot: 0,
      alive: false,
    }));
    return { d, s, nextD: 0, nextS: 0 };
  }, []);

  const spawn = (p: THREE.Vector3, v: THREE.Vector3, size: number, off: boolean) => {
    const drop = state.d[state.nextD];
    state.nextD = (state.nextD + 1) % MAX_DROPS;
    drop.p.copy(p);
    drop.v.copy(v);
    drop.size = size;
    drop.off = off;
    drop.alive = true;
  };
  bus.emit = (p, v) => spawn(p, v, 0.7 + Math.random() * 0.6, false);

  const assets = useMemo(() => {
    // Same liquid as in the cup, just wet and glossy out in the open.
    const coffee = new THREE.MeshPhysicalMaterial({
      color: SPILT,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 0.55,
    });
    const puddle = new THREE.MeshPhysicalMaterial({
      color: SPILT,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 0.55,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    return {
      coffee,
      puddle,
      drop: new THREE.SphereGeometry(0.012, 12, 10),
      // A shallow dome so the puddle catches a highlight like a real bead.
      stain: new THREE.SphereGeometry(1, 28, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.12, 1),
    };
  }, []);

  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      q2: new THREE.Quaternion(),
      s: new THREE.Vector3(),
      g: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      lipP: new THREE.Vector3(),
      lipV: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      zero: new THREE.Matrix4().makeScale(0, 0, 0),
    }),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const dm = drops.current;
    const sm = stains.current;
    if (!dm || !sm) return;
    const t = tmp;

    // Gravity in the (tilted) local frame.
    dm.parent?.getWorldQuaternion(t.q);
    t.g.set(0, -GRAVITY, 0).applyQuaternion(t.q.invert());

    state.d.forEach((drop, i) => {
      if (!drop.alive) {
        dm.setMatrixAt(i, t.zero);
        return;
      }
      drop.v.addScaledVector(t.g, dt);
      drop.p.addScaledVector(drop.v, dt);
      const r = Math.hypot(drop.p.x, drop.p.z);
      const top = drop.off ? null : saucerTop(r);
      if (top && drop.p.y <= top.y + 0.004 && drop.v.y < 0) {
        t.dir.set(drop.p.x, 0, drop.p.z).normalize();
        const want = (0.022 + Math.random() * 0.026) * drop.size;
        const room = (WELL_R - r) / 1.35; // widest puddle stretch
        // Overflow beyond the well runs over the lip and drips off the edge.
        const runOff = () => {
          t.lipP.set(t.dir.x * LIP_OUT_R, LIP_OUT_Y, t.dir.z * LIP_OUT_R);
          t.lipV.set(t.dir.x * 0.12, -0.05, t.dir.z * 0.12);
        };
        if (room < want * 0.5) {
          // Landed on the rim: the whole drop rolls off.
          runOff();
          drop.p.copy(t.lipP);
          drop.v.copy(t.lipV);
          drop.size *= 0.85;
          drop.off = true;
          dm.setMatrixAt(i, t.zero);
          return;
        }
        drop.alive = false;
        if (want > room) {
          // Part of it fits; the rest spills over the edge.
          runOff();
          spawn(t.lipP, t.lipV, drop.size * 0.6, true);
        }
        // Splash: a puddle where it lands, oriented to the saucer's slope.
        const st = state.s[state.nextS];
        state.nextS = (state.nextS + 1) % MAX_STAINS;
        st.p.set(drop.p.x, top.y + 0.001, drop.p.z);
        st.n.set(-t.dir.x * top.slope, 1, -t.dir.z * top.slope).normalize();
        st.size = Math.min(want, room);
        st.sx = 0.75 + Math.random() * 0.6;
        st.rot = Math.random() * Math.PI;
        st.age = 0;
        st.alive = true;
        dm.setMatrixAt(i, t.zero);
        return;
      }
      if (drop.p.y < -1.2) {
        drop.alive = false;
        dm.setMatrixAt(i, t.zero);
        return;
      }
      // Stretch the droplet along its flight.
      const speed = drop.v.length();
      t.dir.copy(drop.v).divideScalar(Math.max(speed, 1e-4));
      t.q2.setFromUnitVectors(t.up, t.dir);
      t.s.set(drop.size, drop.size * (1 + speed * 0.45), drop.size);
      t.m.compose(drop.p, t.q2, t.s);
      dm.setMatrixAt(i, t.m);
    });
    dm.instanceMatrix.needsUpdate = true;

    state.s.forEach((st, i) => {
      if (!st.alive) {
        sm.setMatrixAt(i, t.zero);
        return;
      }
      st.age += dt;
      const grow = 1 - Math.pow(1 - Math.min(st.age / 0.18, 1), 3);
      const fade =
        st.age < STAIN_HOLD
          ? 1
          : Math.max(0, 1 - (st.age - STAIN_HOLD) / STAIN_FADE);
      if (fade <= 0) st.alive = false;
      const k = st.size * grow * Math.sqrt(fade);
      t.q2.setFromUnitVectors(t.up, st.n);
      t.q.setFromAxisAngle(t.up, st.rot);
      t.q2.multiply(t.q);
      t.s.set(k * st.sx, k * fade, k / st.sx);
      t.m.compose(st.p, t.q2, t.s);
      sm.setMatrixAt(i, t.m);
    });
    sm.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh
        ref={drops}
        args={[assets.drop, assets.coffee, MAX_DROPS]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={stains}
        args={[assets.stain, assets.puddle, MAX_STAINS]}
        frustumCulled={false}
      />
    </>
  );
}

function Cup({
  canvas,
}: {
  canvas: React.RefObject<HTMLCanvasElement | null>;
}) {
  const turn = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const surface = useRef<THREE.Mesh>(null);

  const { pointer } = useThree();

  // Drag target on top of the idle tilt, plus when the cup should settle home.
  const drag = useRef({
    active: false,
    id: -1,
    x: 0,
    y: 0,
    rx: 0,
    rz: 0,
    holdUntil: 0,
  });

  /*
   * Rotation is split in two: a calm "pose" (idle tilt + hover parallax)
   * and the "hand" (what the drag does). Only the hand sloshes the coffee,
   * so hovering never makes the liquid bounce.
   */
  const motion = useRef({
    poseX: IDLE_TILT,
    poseZ: 0,
    handX: 0,
    handZ: 0,
    prevVX: 0,
    prevVZ: 0,
    // Surface slosh angles (about world x and z) and their velocities.
    sx: 0,
    sz: 0,
    svx: 0,
    svz: 0,
    acc: 0,
    seeded: false,
    // Coffee left in the cup, and droplets owed to the current spill.
    level: LEVEL,
    pour: 0,
  });
  const bus = useMemo<SpillBus>(() => ({ emit: () => {} }), []);
  const spin = useRef(-0.35);

  const uniforms = useMemo<SipUniforms>(
    () => ({
      uTiltInv: { value: new THREE.Matrix4() },
      uSpin: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  );

  const geometry = useMemo(
    () => ({
      cup: lathe(CUP_PROFILE, 128),
      saucer: lathe(SAUCER_PROFILE, 128),
      surface: new THREE.CircleGeometry(0.7, 96).rotateX(-Math.PI / 2),
      saucerRim: new THREE.TorusGeometry(0.8385, 0.0075, 12, 160).rotateX(
        Math.PI / 2,
      ),
      cupRim: new THREE.TorusGeometry(0.5825, 0.0105, 12, 160).rotateX(
        Math.PI / 2,
      ),
      handle: new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.4, 0.26, 0),
          new THREE.Vector3(0.66, 0.31, 0),
          new THREE.Vector3(0.79, 0.48, 0),
          new THREE.Vector3(0.75, 0.65, 0),
          new THREE.Vector3(0.565, 0.7, 0),
        ]),
        96,
        0.046,
        24,
        false,
      ),
    }),
    [],
  );

  const materials = useMemo(() => {
    // Ivory stoneware under a clear, glossy glaze.
    const cup = new THREE.MeshPhysicalMaterial({
      color: IVORY,
      roughness: 0.38,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      sheen: 0.25,
      sheenColor: new THREE.Color("#fff6ea"),
      envMapIntensity: 1,
      side: THREE.DoubleSide,
    });
    // Inside the cup the light falls off towards the coffee.
    patchGlaze(
      cup,
      "cup",
      0.6,
      0.1,
      `float sipIn = step(dot(vSipObjN.xz, vSipObj.xz), 0.0) * step(0.2, vSipObj.y);
       diffuseColor.rgb *= mix(1.0, mix(0.55, 1.0, smoothstep(${LEVEL.toFixed(3)}, 0.79, vSipObj.y)), sipIn);`,
    );

    // Plum glaze, a little deeper and satin.
    const saucer = new THREE.MeshPhysicalMaterial({
      color: PLUM,
      roughness: 0.42,
      clearcoat: 0.85,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1,
      side: THREE.DoubleSide,
    });
    // A soft contact darkening where the cup's foot meets the well.
    patchGlaze(
      saucer,
      "saucer",
      0.35,
      0.0,
      `float sipR = length(vSipObj.xz);
       diffuseColor.rgb *= 1.0 - 0.35 * (1.0 - smoothstep(0.26, 0.5, sipR));`,
    );

    // Crema: soft sheen with a wet clearcoat over it.
    const coffee = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.48,
      sheen: 0.5,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color("#c9935c"),
      clearcoat: 0.55,
      clearcoatRoughness: 0.22,
      envMapIntensity: 0.55,
    });
    patchCoffee(coffee, uniforms);

    const gold = new THREE.MeshPhysicalMaterial({
      color: GOLD,
      metalness: 1,
      roughness: 0.2,
      envMapIntensity: 1.3,
    });

    return { cup, saucer, coffee, gold };
  }, [uniforms]);

  // Drag the cup itself; the coffee answers the tilt.
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
      // Grab the rim: drag right rolls the near lip right, drag down dips it.
      d.rz -= dx * DRAG;
      d.rx += dy * DRAG;
      // One circular cap, so the low lip stays dry in every direction.
      const mag = Math.hypot(d.rx, d.rz);
      if (mag > TILT_MAX) {
        d.rx *= TILT_MAX / mag;
        d.rz *= TILT_MAX / mag;
      }
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
      qs: new THREE.Quaternion(),
      euler: new THREE.Euler(),
      n: new THREE.Vector3(),
      p: new THREE.Vector3(),
      v: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const g = tilt.current;
    if (!g || dt <= 0) return;
    const d = drag.current;
    const m = motion.current;
    const f = scratch;

    // Settle home a beat after the pointer leaves.
    if (!d.active && performance.now() > d.holdUntil) {
      d.rx = THREE.MathUtils.damp(d.rx, 0, 3.5, dt);
      d.rz = THREE.MathUtils.damp(d.rz, 0, 3.5, dt);
    }

    // Pose: idle tilt + a slow whisper of hover parallax. No slosh.
    m.poseX = THREE.MathUtils.damp(m.poseX, IDLE_TILT - pointer.y * 0.03, 2, dt);
    m.poseZ = THREE.MathUtils.damp(m.poseZ, -pointer.x * 0.03, 2, dt);

    // Hand: follows the drag, briskly while held.
    const speed = d.active ? 14 : 5;
    const hx = THREE.MathUtils.damp(m.handX, d.rx, speed, dt);
    const hz = THREE.MathUtils.damp(m.handZ, d.rz, speed, dt);
    const vx = (hx - m.handX) / dt;
    const vz = (hz - m.handZ) / dt;
    m.handX = hx;
    m.handZ = hz;

    g.rotation.set(m.poseX + m.handX, 0, m.poseZ + m.handZ);
    g.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.006;
    g.updateMatrixWorld();

    // The cup turns slowly, and slower still while you hold it.
    spin.current += dt * (d.active ? 0.04 : 0.14);
    if (turn.current) turn.current.rotation.y = spin.current;

    // Slosh: a change in how fast the hand tilts the cup kicks the surface,
    // which lags behind (opposite the motion) and rocks back to level.
    if (m.seeded) {
      m.svx -= THREE.MathUtils.clamp((vx - m.prevVX) * SLOSH_KICK, -2.5, 2.5);
      m.svz -= THREE.MathUtils.clamp((vz - m.prevVZ) * SLOSH_KICK, -2.5, 2.5);
    }
    m.prevVX = vx;
    m.prevVZ = vz;
    m.seeded = true;

    m.acc = Math.min(m.acc + dt, SUB * MAX_STEPS);
    while (m.acc >= SUB) {
      m.svx += (-SLOSH_W2 * m.sx - SLOSH_C * m.svx) * SUB;
      m.svz += (-SLOSH_W2 * m.sz - SLOSH_C * m.svz) * SUB;
      m.sx += m.svx * SUB;
      m.sz += m.svz * SUB;
      m.acc -= SUB;
    }
    m.sx = THREE.MathUtils.clamp(m.sx, -SLOSH_MAX, SLOSH_MAX);
    m.sz = THREE.MathUtils.clamp(m.sz, -SLOSH_MAX, SLOSH_MAX);

    uniforms.uTiltInv.value.copy(g.matrixWorld).invert();
    uniforms.uSpin.value = spin.current;
    uniforms.uTime.value = state.clock.elapsedTime;

    // Lay the disc level in the world (plus slosh), through the axis at LEVEL.
    const disc = surface.current;
    if (disc) {
      f.euler.set(m.sx, 0, m.sz);
      f.qs.setFromEuler(f.euler);
      f.q.setFromEuler(g.rotation).invert();
      disc.position.set(0, m.level, 0);
      disc.quaternion.copy(f.q).multiply(f.qs);

      // Spill: how far the surface climbs past the lip on its high side.
      f.n.set(0, 1, 0).applyQuaternion(disc.quaternion);
      const lean = Math.hypot(f.n.x, f.n.z);
      const crest = m.level + (LIP_R * lean) / Math.max(f.n.y, 0.2);
      const over = crest - LIP_Y;
      if (over > 0 && lean > 1e-4) {
        // The wave that leaves takes its energy with it.
        const loss = Math.exp(-over * 60 * dt);
        m.svx *= loss;
        m.svz *= loss;
        m.level = Math.max(MIN_LEVEL, m.level - over * dt * 0.35);
        // A crest that breaks the lip always throws a few drops at once.
        if (m.pour <= 0) m.pour = 3 + Math.random() * 3;
        m.pour += over * dt * 3200;
        const ux = -f.n.x / lean;
        const uz = -f.n.z / lean;
        while (m.pour >= 1) {
          m.pour -= 1;
          const a = Math.atan2(uz, ux) + (Math.random() - 0.5) * 0.7;
          const cx = Math.cos(a);
          const cz = Math.sin(a);
          const out = 0.08 + Math.random() * 0.22 + over * 2;
          f.p.set(cx * (LIP_R + 0.03), LIP_Y + 0.008, cz * (LIP_R + 0.03));
          f.v.set(
            cx * out + (Math.random() - 0.5) * 0.08,
            0.04 + Math.random() * 0.18 + over * 2,
            cz * out + (Math.random() - 0.5) * 0.08,
          );
          bus.emit(f.p, f.v);
        }
      } else {
        m.pour = Math.max(0, m.pour - dt * 4) * (m.pour < 1 ? 0 : 1);
        // A barista quietly tops the cup back up.
        m.level = Math.min(LEVEL, m.level + dt * 0.004);
      }
    }
  });

  return (
    <group ref={tilt}>
      <mesh geometry={geometry.saucer} material={materials.saucer} />
      <mesh
        geometry={geometry.saucerRim}
        material={materials.gold}
        position={[0, 0.0845, 0]}
      />
      <group ref={turn}>
        <mesh geometry={geometry.cup} material={materials.cup} />
        <mesh geometry={geometry.handle} material={materials.cup} />
        <mesh
          geometry={geometry.cupRim}
          material={materials.gold}
          position={[0, 0.794, 0]}
        />
      </group>
      <Spill bus={bus} />
      {/* The coffee sits outside the spinning group so it can stay level. */}
      <mesh
        ref={surface}
        geometry={geometry.surface}
        material={materials.coffee}
      />
    </group>
  );
}

/**
 * Phones only: the canvas is taller than its square box (it grows upward) so
 * the steam can keep rising past the box instead of being cut off at its edge.
 * The camera renders the original square framing in the bottom of the canvas,
 * and the extra height above simply continues the same view.
 */
const TALL_EXTEND = 0.34;

function TallView() {
  useFrame(({ camera, size }) => {
    const cam = camera as THREE.PerspectiveCamera;
    const w = size.width;
    const v = cam.view;
    if (
      cam.aspect !== 1 ||
      !v?.enabled ||
      v.fullWidth !== w ||
      v.height !== size.height
    ) {
      cam.aspect = 1;
      cam.setViewOffset(w, w, 0, w - size.height, w, size.height);
    }
  });
  return null;
}

export default function CoffeeCup({ active }: { active: boolean }) {
  const compact = useMaxWidth(768);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  return (
    <div
      className={
        compact
          ? "absolute inset-x-0 bottom-0 cursor-grab active:cursor-grabbing"
          : "h-full w-full cursor-grab active:cursor-grabbing"
      }
      style={{
        touchAction: "pan-y",
        ...(compact ? { height: `${(1 + TALL_EXTEND) * 100}%` } : null),
      }}
    >
      <Canvas
        ref={canvasRef}
        frameloop={active ? "always" : "never"}
        dpr={compact ? [1, 1.5] : [1, 2]}
        camera={{ position: [0, 2.2, 3.2], fov: 36 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        onCreated={({ camera, gl }) => {
          gl.setClearColor(0x000000, 0);
          camera.lookAt(0, 0.48, 0);
        }}
        aria-label="A 3D stoneware cup of coffee with latte art on a plum saucer. Drag it to tilt the cup and watch the coffee slosh and settle level."
      >
        {compact && <TallView />}
        <ambientLight intensity={0.12} color="#fff0de" />
        <directionalLight position={[-2.5, 4, 2.5]} intensity={1.7} color="#ffe2bd" />
        <directionalLight position={[3, 1.5, -1]} intensity={0.7} color="#c6afe6" />
        {/* A small café studio: warm window softbox, fill and a lilac kicker. */}
        <Environment resolution={256} frames={1}>
          <color attach="background" args={["#1b1410"]} />
          <Lightformer
            form="rect"
            intensity={2.2}
            color="#fff1dc"
            position={[-2.5, 3.5, 2]}
            rotation={[-Math.PI / 4, -Math.PI / 6, 0]}
            scale={[3, 2.2, 1]}
          />
          <Lightformer
            form="rect"
            intensity={1.2}
            color="#ffe2c2"
            position={[0, 5, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[4, 4, 1]}
          />
          <Lightformer
            form="rect"
            intensity={0.9}
            color="#e4d0ee"
            position={[3.5, 1.2, -1.5]}
            rotation={[0, -Math.PI / 2.4, 0]}
            scale={[1.2, 3, 1]}
          />
          <Lightformer
            form="rect"
            intensity={0.6}
            color="#f6e7d2"
            position={[0, 0.5, 4]}
            scale={[5, 1.2, 1]}
          />
        </Environment>
        <Cup canvas={canvasRef} />
        <Steam />
      </Canvas>
    </div>
  );
}
