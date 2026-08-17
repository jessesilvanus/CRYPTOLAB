import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { useWebGL } from '@/hooks/useWebGL'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { CoreState } from '@/crypto/types/CryptoTypes'
import { CryptoCore } from '../core/CryptoCore'
import { CoreFallback2D } from '../fallback/CoreFallback2D'

interface CoreSceneProps {
  state?: CoreState
  hovered?: boolean
  className?: string
  /** Label shown inside the 2D fallback. */
  fallbackLabel?: string
  /**
   * World-space offset applied to the core object (not the backdrop).
   * Lets a page push the core to one side so orbital paths don't cross its
   * text, without affecting pointer parallax (that lives on CryptoCore).
   */
  coreOffset?: [number, number, number]
}

/**
 * Static field of faint points behind the core — adds depth without any
 * animation cost (positions are written once).
 */
function SceneStars({ count = 120 }: { count?: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 6 + Math.random() * 8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi) - 2
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [count])

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#8b93a7"
        size={1.4}
        sizeAttenuation={false}
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </points>
  )
}

/**
 * The WebGL scene wrapper for the Cryptographic Core.
 *
 * Chooses the 3D canvas when WebGL is available, otherwise renders the
 * designed 2D fallback. Camera, lighting and the pointer-driven parallax live
 * here; the core object itself lives in ../core/CryptoCore.
 */
export function CoreScene({
  state = 'idle',
  hovered = false,
  className,
  fallbackLabel,
  coreOffset = [0, 0, 0],
}: CoreSceneProps) {
  const { supported, checked } = useWebGL()
  const reduced = useReducedMotion()

  // While we haven't checked yet, render nothing to avoid a flash of fallback.
  if (!checked) {
    return <div className={className} aria-hidden />
  }

  if (!supported) {
    return (
      <div className={className}>
        <CoreFallback2D label={fallbackLabel} />
      </div>
    )
  }

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        frameloop={reduced ? 'demand' : 'always'}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[6, 4, 6]} intensity={70} color="#5eead4" />
        <pointLight position={[-6, -4, 3]} intensity={40} color="#a78bfa" />
        <SceneStars count={reduced ? 60 : 120} />
        <Suspense fallback={null}>
          <group position={coreOffset}>
            <CryptoCore state={state} hovered={hovered} reducedMotion={reduced} />
          </group>
        </Suspense>
      </Canvas>
    </div>
  )
}
