import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { CoreState } from '@/crypto/types/CryptoTypes'
import { DataStream } from '../particles/DataStream'
import {
  CORE_COLOR,
  CORE_COLOR_DIM,
  ACCENT_COLOR,
  VIOLET_COLOR,
  DANGER_COLOR,
  STATE_INTENSITY,
} from '../materials/theme'

interface CryptoCoreProps {
  state: CoreState
  /** True while the pointer hovers the core area. */
  hovered?: boolean
  /** Stops travelling particles + rotation (reduced motion). */
  reducedMotion?: boolean
}

/* Per-ring visual configuration — radius, orientation, colour, stream speed. */
const RINGS = [
  { radius: 1.7, tiltX: Math.PI / 2, tiltZ: 0, color: CORE_COLOR, speed: 0.5 },
  { radius: 2.15, tiltX: Math.PI / 2.4, tiltZ: Math.PI / 5, color: VIOLET_COLOR, speed: 0.7 },
  { radius: 2.6, tiltX: Math.PI / 3, tiltZ: -Math.PI / 6, color: ACCENT_COLOR, speed: 0.4 },
] as const

/**
 * THE CRYPTOGRAPHIC CORE
 *
 * The centrepiece 3D object: a nucleus (transformation) wrapped by orbiting
 * rings and data streams (input/output pathways). It visualises
 * INPUT → TRANSFORMATION → OUTPUT.
 *
 * Visual state is driven by the `CoreState` prop. All per-frame animation is
 * done imperatively in `useFrame` against refs so React never re-renders at
 * 60fps. Step 2's crypto engine will flip the `state` to make the core react
 * to real transformations.
 */
export function CryptoCore({ state, hovered = false, reducedMotion = false }: CryptoCoreProps) {
  const groupRef = useRef<THREE.Group>(null)
  const nucleusRef = useRef<THREE.Mesh>(null)
  const innerRef = useRef<THREE.Mesh>(null)
  const ringRefs = useRef<Array<THREE.Mesh | null>>([null, null, null])
  const flashMeshRef = useRef<THREE.Mesh>(null)

  // Lerp the emissive intensity toward the target for the current state.
  const intensityRef = useRef(STATE_INTENSITY.idle.emissive)
  const prevStateRef = useRef<CoreState>('idle')
  const flashIntensity = useRef(0)

  // Node spheres riding on the outer ring.
  const nodePositions = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        return { pos: [Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6] as [number, number, number], a }
      }),
    [],
  )

  // Track state transitions so success/error can trigger a colour flash.
  const [flashColor, setFlashColor] = useState<THREE.Color>(CORE_COLOR)
  // Local time accumulator (avoids depending on the scene Clock type).
  const timeRef = useRef(0)
  // Normalised pointer (-1..1) provided by R3F for subtle parallax.
  const pointer = useThree((s) => s.pointer)

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = timeRef.current

    // Hover nudges an idle core into its more active visual state.
    const effectiveState: CoreState = state === 'idle' && hovered ? 'hover' : state

    // Rotational speeds scaled by the state's `speed` factor.
    const target = STATE_INTENSITY[effectiveState]
    const speed = reducedMotion ? 0 : target.speed
    const group = groupRef.current
    if (group) {
      group.rotation.y += delta * 0.12 * speed
      // Gentle pointer parallax — lean the whole core towards the cursor.
      if (!reducedMotion) {
        group.position.x = pointer.x * 0.35
        group.position.y = pointer.y * 0.22
      }
    }

    // Lerp nucleus emissive intensity towards its target.
    intensityRef.current += (target.emissive - intensityRef.current) * 0.08
    if (nucleusRef.current) {
      const mat = nucleusRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = intensityRef.current
    }

    // Inner nucleus gently breathes.
    if (innerRef.current) {
      const s = 1 + Math.sin(t * 1.4) * 0.03
      innerRef.current.scale.setScalar(s)
    }

    // Rotate each ring a little; streams already orbit independently.
    ringRefs.current.forEach((ring, i) => {
      if (ring) ring.rotation.z += delta * (0.06 * speed * (i + 1) * 0.4)
    })

    // Success / error flash: brighten and tint for a short window.
    const prev = prevStateRef.current
    if (prev !== state) {
      prevStateRef.current = state
      if (state === 'success') {
        flashIntensity.current = 1
        setFlashColor(CORE_COLOR)
      } else if (state === 'error') {
        flashIntensity.current = 1
        setFlashColor(DANGER_COLOR)
      }
    }
    if (flashMeshRef.current && flashIntensity.current > 0) {
      flashIntensity.current *= 0.94
      const m = flashMeshRef.current.material as THREE.MeshBasicMaterial
      m.opacity = flashIntensity.current
    }
  })

  return (
    <group ref={groupRef}>
      {/* ---- Nucleus: the transformation point ---- */}
      <mesh ref={nucleusRef}>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshStandardMaterial
          color="#0c1f1c"
          emissive={CORE_COLOR}
          emissiveIntensity={STATE_INTENSITY.idle.emissive}
          roughness={0.35}
          metalness={0.6}
          wireframe={false}
          flatShading
        />
      </mesh>
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshStandardMaterial
          color={CORE_COLOR_DIM}
          emissive={CORE_COLOR}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.2}
        />
      </mesh>
      {/* Faint wireframe cage around the nucleus. */}
      <mesh scale={1.35}>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshBasicMaterial color={CORE_COLOR} wireframe transparent opacity={0.14} />
      </mesh>

      {/* ---- Orbiting rings ---- */}
      {RINGS.map((ring, i) => (
        <group key={i} rotation={[ring.tiltX, 0, ring.tiltZ]}>
          <mesh ref={(el) => (ringRefs.current[i] = el)}>
            <torusGeometry args={[ring.radius, 0.012, 8, 96]} />
            <meshStandardMaterial
              color={ring.color}
              emissive={ring.color}
              emissiveIntensity={0.5}
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>
          <DataStream
            radius={ring.radius}
            tiltX={0}
            tiltZ={0}
            count={reducedMotion ? 24 : 70}
            speed={ring.speed}
            color={ring.color}
            paused={reducedMotion}
          />
        </group>
      ))}

      {/* ---- Nodes riding the outer ring ---- */}
      {nodePositions.map((n, i) => (
        <mesh key={i} position={n.pos}>
          <octahedronGeometry args={[0.07, 0]} />
          <meshStandardMaterial
            color={CORE_COLOR_DIM}
            emissive={CORE_COLOR}
            emissiveIntensity={0.7}
            roughness={0.3}
            metalness={0.4}
          />
        </mesh>
      ))}

      {/* ---- Success/error flash overlay ---- */}
      <mesh ref={flashMeshRef}>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshBasicMaterial
          color={flashColor}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
