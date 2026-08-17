import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { CORE_COLOR } from '../materials/theme'

interface DataStreamProps {
  /** Base radius of the orbit ring this stream travels along. */
  radius: number
  /** Orientation (radians) of the orbit plane. */
  tiltX?: number
  tiltZ?: number
  count?: number
  /** Relative flow speed multiplier. */
  speed?: number
  color?: THREE.Color
  /** When reduced-motion is on we freeze travelling particles. */
  paused?: boolean
}

/**
 * A stream of small particles orbiting the core along a single circular path.
 *
 * Particles are written into a single THREE.Points buffer and advanced by
 * `useFrame`, so there are no per-particle React re-renders — cheap even on a
 * college laptop. The orbit represents data travelling around the core, which
 * in Step 2 will become plaintext/ciphertext characters.
 */
export function DataStream({
  radius,
  tiltX = 0,
  tiltZ = 0,
  count = 90,
  speed = 1,
  color = CORE_COLOR,
  paused = false,
}: DataStreamProps) {
  const pointsRef = useRef<THREE.Points>(null)

  // Allocate the per-particle orbit data once (angle offset, height jitter).
  const { positions, angles, jitter, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const angles = new Float32Array(count)
    const jitter = new Float32Array(count)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      // Seed particles spread around the full orbit.
      angles[i] = (i / count) * Math.PI * 2
      jitter[i] = (Math.random() - 0.5) * 0.12 // small vertical spread
      speeds[i] = 0.6 + Math.random() * 0.8
    }
    return { positions, angles, jitter, speeds }
  }, [count])

  // Push current particle positions into the buffer each frame.
  useFrame((_, delta) => {
    const pts = pointsRef.current
    if (!pts || paused) return

    const step = delta * speed
    for (let i = 0; i < count; i++) {
      angles[i] += step * speeds[i]
      const a = angles[i]
      const r = radius + Math.sin(a * 3 + i) * 0.02 // gentle breathing
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = jitter[i]
      positions[i * 3 + 2] = Math.sin(a) * r
    }
    const geom = pts.geometry as THREE.BufferGeometry
    geom.attributes.position.needsUpdate = true
  })

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [positions])

  return (
    <group rotation={[tiltX, 0, tiltZ]}>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          color={color}
          size={2.2}
          sizeAttenuation={false}
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
