import { useSyncExternalStore } from 'react'

/**
 * Tracks the desktop breakpoint (`lg` = 1024px). Lets a page choose a
 * different composition on smaller screens without duplicating layouts.
 */
const QUERY = '(min-width: 1024px)'

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

/** Returns `true` when the viewport is desktop-sized (≥1024px). */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
