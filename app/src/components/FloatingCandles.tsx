'use client'

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import {
  Group, Mesh, PointLight,
  CylinderGeometry, MeshStandardMaterial, MeshBasicMaterial,
  Color, FrontSide, AdditiveBlending, DoubleSide,
} from 'three'

// ─── CANDLE COMPONENT ───────────────────────────────────────
// Each candle: tapered wax body + wick + layered flame + optional point light

const WAX_GEO = new CylinderGeometry(0.025, 0.032, 0.35, 8)
const WAX_RIM_GEO = new CylinderGeometry(0.035, 0.025, 0.015, 8)
const WICK_GEO = new CylinderGeometry(0.003, 0.003, 0.04, 4)
const FLAME_OUTER_GEO = new CylinderGeometry(0, 0.022, 0.09, 6)
const FLAME_INNER_GEO = new CylinderGeometry(0, 0.012, 0.065, 6)
const FLAME_CORE_GEO = new CylinderGeometry(0, 0.006, 0.04, 4)

const WAX_MAT = new MeshStandardMaterial({
  color: new Color('#e8dcc8'),
  roughness: 0.85,
  metalness: 0,
})
const WAX_RIM_MAT = new MeshStandardMaterial({
  color: new Color('#ddd0b8'),
  roughness: 0.9,
  metalness: 0,
})
const WICK_MAT = new MeshStandardMaterial({ color: new Color('#2a2015') })
const FLAME_OUTER_MAT = new MeshBasicMaterial({
  color: new Color('#d4940a'),
  transparent: true,
  opacity: 0.6,
  side: DoubleSide,
  blending: AdditiveBlending,
  depthWrite: false,
})
const FLAME_MID_MAT = new MeshBasicMaterial({
  color: new Color('#ffb830'),
  transparent: true,
  opacity: 0.8,
  side: DoubleSide,
  blending: AdditiveBlending,
  depthWrite: false,
})
const FLAME_CORE_MAT = new MeshBasicMaterial({
  color: new Color('#fff5e0'),
  transparent: true,
  opacity: 0.9,
  side: FrontSide,
  blending: AdditiveBlending,
  depthWrite: false,
})

// Emissive material for distant candles (no real light)
const WAX_EMISSIVE_MAT = new MeshStandardMaterial({
  color: new Color('#e8dcc8'),
  roughness: 0.85,
  metalness: 0,
  emissive: new Color('#3a2510'),
  emissiveIntensity: 0.4,
})

function Candle({
  position,
  speed,
  floatRange,
  delay,
  hasLight,
}: {
  position: [number, number, number]
  speed: number
  floatRange: number
  delay: number
  hasLight: boolean
}) {
  const groupRef = useRef<Group>(null)
  const flameGroupRef = useRef<Group>(null)
  const lightRef = useRef<PointLight>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + delay

    // Float the whole candle
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 0.8) * floatRange
      groupRef.current.position.x = position[0] + Math.sin(t * 0.5 + 1.3) * floatRange * 0.25
      groupRef.current.position.z = position[2] + Math.sin(t * 0.3 + 2.7) * floatRange * 0.15
      // Very subtle tilt
      groupRef.current.rotation.z = Math.sin(t * 0.6) * 0.03
      groupRef.current.rotation.x = Math.sin(t * 0.4 + 1) * 0.02
    }

    // Flame flicker — layered sine waves for organic feel
    if (flameGroupRef.current) {
      const f1 = Math.sin(t * 9.3) * 0.1
      const f2 = Math.sin(t * 14.7) * 0.06
      const f3 = Math.sin(t * 22.1) * 0.03
      const scaleX = 0.85 + f1 + f3
      const scaleY = 0.9 + f2 + Math.sin(t * 7) * 0.08
      flameGroupRef.current.scale.set(scaleX, scaleY, scaleX)
      // Slight flame sway
      flameGroupRef.current.rotation.z = Math.sin(t * 3.2) * 0.06
    }

    // Light flicker
    if (lightRef.current) {
      lightRef.current.intensity = 0.8 + Math.sin(t * 10) * 0.2 + Math.sin(t * 16) * 0.1
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Wax body */}
      <mesh geometry={WAX_GEO} material={hasLight ? WAX_MAT : WAX_EMISSIVE_MAT} />

      {/* Wax rim at top */}
      <mesh geometry={WAX_RIM_GEO} material={WAX_RIM_MAT} position={[0, 0.175, 0]} />

      {/* Wick */}
      <mesh geometry={WICK_GEO} material={WICK_MAT} position={[0, 0.2, 0]} />

      {/* Flame — 3 layered cones for depth */}
      <group ref={flameGroupRef} position={[0, 0.25, 0]}>
        {/* Outer glow */}
        <mesh geometry={FLAME_OUTER_GEO} material={FLAME_OUTER_MAT} position={[0, 0.04, 0]} />
        {/* Mid flame */}
        <mesh geometry={FLAME_MID_GEO} material={FLAME_MID_MAT} position={[0, 0.03, 0]} />
        {/* White-hot core */}
        <mesh geometry={FLAME_CORE_GEO} material={FLAME_CORE_MAT} position={[0, 0.02, 0]} />
      </group>

      {/* Point light — only on nearest candles */}
      {hasLight && (
        <pointLight
          ref={lightRef}
          position={[0, 0.32, 0]}
          color="#d4a020"
          intensity={0.8}
          distance={5}
          decay={2}
        />
      )}
    </group>
  )
}

// Rename the intermediate flame geometry to avoid confusion
const FLAME_MID_GEO = new CylinderGeometry(0, 0.016, 0.075, 6)

// ─── SCENE LAYOUT ───────────────────────────────────────────
// Spread wide across the "ceiling" — Hogwarts Great Hall style
// First 4 get real point lights, rest use emissive

const CANDLES: { pos: [number, number, number]; spd: number; rng: number; dly: number }[] = [
  // Near — these 4 get lights
  { pos: [-3.5, 2.2, -3],   spd: 0.35, rng: 0.2,  dly: 0 },
  { pos: [3.2,  2.0, -2.5], spd: 0.4,  rng: 0.18, dly: 1.2 },
  { pos: [-1.0, 1.8, -2],   spd: 0.38, rng: 0.22, dly: 0.6 },
  { pos: [1.5,  2.4, -3.5], spd: 0.32, rng: 0.2,  dly: 2.0 },
  // Mid spread
  { pos: [-5.0, 3.2, -5],   spd: 0.28, rng: 0.28, dly: 0.8 },
  { pos: [-2.0, 3.8, -6],   spd: 0.33, rng: 0.25, dly: 1.8 },
  { pos: [0.8,  3.0, -4.5], spd: 0.36, rng: 0.22, dly: 0.3 },
  { pos: [3.8,  3.5, -5.5], spd: 0.3,  rng: 0.26, dly: 1.5 },
  { pos: [-3.8, 2.8, -4.5], spd: 0.42, rng: 0.2,  dly: 2.5 },
  { pos: [5.5,  2.8, -4],   spd: 0.34, rng: 0.22, dly: 0.9 },
  // Far — high up, deep
  { pos: [-6.0, 4.5, -8],   spd: 0.24, rng: 0.32, dly: 1.0 },
  { pos: [-2.5, 5.0, -9],   spd: 0.27, rng: 0.3,  dly: 2.2 },
  { pos: [1.0,  4.5, -7.5], spd: 0.3,  rng: 0.28, dly: 0.5 },
  { pos: [4.0,  4.2, -8],   spd: 0.26, rng: 0.3,  dly: 1.6 },
  { pos: [6.5,  4.0, -7],   spd: 0.32, rng: 0.25, dly: 3.0 },
  // Very far — fade into darkness
  { pos: [-4.5, 5.5, -11],  spd: 0.2,  rng: 0.35, dly: 2.8 },
  { pos: [2.0,  5.8, -12],  spd: 0.18, rng: 0.38, dly: 1.4 },
  { pos: [-7.0, 3.8, -6],   spd: 0.3,  rng: 0.22, dly: 0.4 },
  { pos: [7.0,  3.5, -5.5], spd: 0.35, rng: 0.2,  dly: 2.3 },
  { pos: [0,    6.0, -13],  spd: 0.16, rng: 0.4,  dly: 3.5 },
]

const LIT_COUNT = 4

// ─── SCENE CLEANUP ──────────────────────────────────────────

function SceneDisposer() {
  const { gl, scene } = useThree()
  useEffect(() => {
    return () => {
      scene.traverse((obj) => {
        if ('geometry' in obj && obj.geometry) {
          (obj.geometry as { dispose: () => void }).dispose()
        }
        if ('material' in obj && obj.material) {
          const mat = obj.material
          if (Array.isArray(mat)) {
            mat.forEach((m: { dispose: () => void }) => m.dispose())
          } else {
            (mat as { dispose: () => void }).dispose()
          }
        }
      })
      gl.dispose()
    }
  }, [gl, scene])
  return null
}

// ─── SCENE ──────────────────────────────────────────────────

function Scene() {
  return (
    <>
      <SceneDisposer />

      {/* Very dim ambient — candles should be the main light source */}
      <ambientLight intensity={0.015} color="#0d0a14" />

      {/* Depth fog */}
      <fog attach="fog" args={['#08080c', 4, 16]} />

      {/* Floating candles */}
      {CANDLES.map((c, i) => (
        <Float
          key={i}
          speed={c.spd * 1.5}
          rotationIntensity={0.05}
          floatIntensity={0.3}
          floatingRange={[-0.05, 0.05]}
        >
          <Candle
            position={c.pos}
            speed={c.spd}
            floatRange={c.rng}
            delay={c.dly}
            hasLight={i < LIT_COUNT}
          />
        </Float>
      ))}

      {/* Sparkles — magical dust drifting in the candlelight */}
      <Sparkles
        count={60}
        scale={[16, 8, 14]}
        size={1.5}
        speed={0.3}
        opacity={0.3}
        color="#d4af37"
        noise={[0.5, 0.3, 0.5]}
      />

      {/* Bloom post-processing — makes flames glow */}
      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

// ─── EXPORT ─────────────────────────────────────────────────

export function FloatingCandles({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <Canvas
        camera={{ position: [0, 2.5, 6], fov: 55, near: 0.5, far: 20 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'low-power',
        }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
