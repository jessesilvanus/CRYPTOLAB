import * as THREE from 'three'

/**
 * Central colour + material constants for the 3D layer.
 * Kept in one place so the 3D accent palette matches the CSS design tokens.
 */

export const CORE_COLOR = new THREE.Color('#5eead4') // teal signal
export const CORE_COLOR_DIM = new THREE.Color('#2f6e66')
export const ACCENT_COLOR = new THREE.Color('#fbbf24') // amber
export const DANGER_COLOR = new THREE.Color('#f87171') // red
export const VIOLET_COLOR = new THREE.Color('#a78bfa') // violet

export const DEEP_BG = new THREE.Color('#06070b')

/** Opacity / emissive intensity by visual state of the core. */
export const STATE_INTENSITY: Record<
  string,
  { emissive: number; speed: number; opacity: number }
> = {
  idle: { emissive: 0.35, speed: 1, opacity: 0.55 },
  hover: { emissive: 0.6, speed: 1.6, opacity: 0.8 },
  processing: { emissive: 0.9, speed: 3, opacity: 1 },
  success: { emissive: 1, speed: 1, opacity: 1 },
  error: { emissive: 1, speed: 1, opacity: 1 },
}
