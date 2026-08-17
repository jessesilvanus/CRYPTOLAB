import { AttackLab as AttackLabComponent } from '@/components/laboratory/attack/AttackLab'

/**
 * CRYPTO ATTACK & ANALYSIS LAB — thin page wrapper around the lab component.
 * All cryptanalysis, generation and analysis happens locally in the browser.
 */
export function AttackLab() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <AttackLabComponent />
    </div>
  )
}
