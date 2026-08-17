import { useSyncExternalStore } from 'react'

/**
 * Tracks the user's `prefers-reduced-motion` preference and exposes it to the
 * rest of the app so we can tone down 3D movement and particle counts.
 */
const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(callback: () => void): () => void {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot(): boolean {
  return false
}

/** Returns `true` when the user prefers reduced motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
