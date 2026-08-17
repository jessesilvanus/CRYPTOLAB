import { EvolutionLab as EvolutionLabComponent } from '@/components/laboratory/evolution/EvolutionLab'

/**
 * EVOLUTION PAGE — thin wrapper around the Evolution Lab component.
 * Keeps routing simple and mirrors the other page patterns.
 */
export function EvolutionLab() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <EvolutionLabComponent />
    </div>
  )
}
