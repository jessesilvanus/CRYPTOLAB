import { useEffect, useState } from 'react'

/**
 * Detects whether a functional WebGL context can be created.
 * When it cannot (old GPU, disabled hardware accel, iframe policy…),
 * we render a designed 2D fallback for the Cryptographic Core instead of
 * letting the canvas fail silently.
 */
export function useWebGL(): { supported: boolean; checked: boolean } {
  const [state, setState] = useState({ supported: true, checked: false })

  useEffect(() => {
    let supported = true
    try {
      const canvas = document.createElement('canvas')
      // Some browsers only expose the context the first time; guard both.
      const gl =
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')
      supported = !!gl
    } catch {
      supported = false
    }
    setState({ supported, checked: true })
  }, [])

  return state
}
