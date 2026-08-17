import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { CoreState } from '@/crypto/types/CryptoTypes'

/**
 * Core state controller.
 *
 * Exposes the visual state of the 3D Cryptographic Core and a small API to
 * change it. In Step 2 the crypto engine will drive this: begin a transform ->
 * setProcessing(), finish -> setSuccess(), throw -> setError().
 */
interface CoreStateContextValue {
  state: CoreState
  setState: (s: CoreState) => void
  setProcessing: () => void
  setSuccess: () => void
  setError: () => void
  setIdle: () => void
}

const CoreStateContext = createContext<CoreStateContextValue | null>(null)

export function CoreStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CoreState>('idle')

  const value = useMemo<CoreStateContextValue>(
    () => ({
      state,
      setState,
      setProcessing: () => setState('processing'),
      setSuccess: () => setState('success'),
      setError: () => setState('error'),
      setIdle: () => setState('idle'),
    }),
    [state],
  )

  return <CoreStateContext.Provider value={value}>{children}</CoreStateContext.Provider>
}

export function useCoreState(): CoreStateContextValue {
  const ctx = useContext(CoreStateContext)
  if (!ctx) throw new Error('useCoreState must be used within <CoreStateProvider>')
  return ctx
}
