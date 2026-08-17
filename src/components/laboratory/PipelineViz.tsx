import { ArrowDown } from 'lucide-react'
import { getCipher } from '@/crypto/algorithms/registry'
import type { CipherId } from '@/crypto/types/CryptoTypes'
import { CipherModule } from './CipherModule'

interface PipelineVizProps {
  stages: CipherId[]
  /** Which stage index is currently highlighted (0-based), if any. */
  activeStage?: number
  inputLabel?: string
  outputLabel?: string
}

/**
 * Visual pipeline: PLAINTEXT → [CIPHER MODULE] → … → CIPHERTEXT.
 *
 * This is the architectural skeleton for Step 2, where stages become
 * draggable / re-orderable / inspectable and data visibly moves through them.
 * The output label is intentionally honest ("awaiting engine") — no fake
 * ciphertext is produced in this step.
 */
export function PipelineViz({
  stages,
  activeStage,
  inputLabel = 'PLAINTEXT',
  outputLabel = 'CIPHERTEXT',
}: PipelineVizProps) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <span className="mono-label !text-[0.6rem] text-[var(--c-text)]">{inputLabel}</span>
      <ArrowDown size={14} className="text-[var(--c-text-faint)]" aria-hidden="true" />

      <div className="flex flex-wrap items-stretch justify-center gap-3">
        {stages.map((id, i) => {
          const meta = getCipher(id)
          if (!meta) return null
          const state = activeStage === i ? 'active' : activeStage != null && activeStage > i ? 'passed' : 'idle'
          return (
            <div key={`${id}-${i}`} className="flex items-center">
              <CipherModule meta={meta} index={i} state={state} />
              {i < stages.length - 1 && (
                <ArrowDown className="mx-1 shrink-0 text-[var(--c-text-faint)]" size={14} aria-hidden="true" />
              )}
            </div>
          )
        })}
      </div>

      <ArrowDown size={14} className="text-[var(--c-text-faint)]" aria-hidden="true" />
      <span className="mono-label !text-[0.6rem] text-[rgb(var(--c-core))]">{outputLabel}</span>
      <span className="mt-1 text-center text-[0.62rem] italic text-[var(--c-text-faint)]">
        Output awaits the crypto engine (Step 2) — no transformation is performed yet.
      </span>
    </div>
  )
}
