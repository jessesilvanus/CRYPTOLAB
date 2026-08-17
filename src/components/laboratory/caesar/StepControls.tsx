import { Play, SkipForward, Check } from 'lucide-react'
import type { TransformationStep } from '@/crypto/types/CipherAlgorithm'

interface StepControlsProps {
  steps: TransformationStep[]
  /** Current step cursor (0..steps.length). */
  cursor: number
  /** Steps already revealed (0..steps.length). */
  revealedCount: number
  onProcess: () => void
  onNext: () => void
}

function Progress({ cursor, total }: { cursor: number; total: number }) {
  const done = cursor >= total
  const progress = done ? total : cursor + 1
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="mono-label !text-[0.55rem] text-[var(--c-text-dim)]">CURRENT STEP</span>
        <span className="mono-label !text-[0.6rem] text-[var(--c-text)]">
          {done ? 'COMPLETE' : String(cursor + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[rgba(148,163,184,0.2)]">
        <div
          className="h-full rounded-full bg-[rgb(var(--c-core))] transition-all duration-300"
          style={{ width: `${total ? (progress / total) * 100 : 0}%` }}
        />
      </div>
    </div>
  )
}

/**
 * STEP-BY-STEP controls.
 * The student advances one character at a time: see it, PROCESS it, then move
 * to the NEXT CHARACTER. Spaces/punctuation appear as skipped steps.
 */
export function StepControls({ steps, cursor, revealedCount, onProcess, onNext }: StepControlsProps) {
  const total = steps.length

  // Completed walkthrough.
  if (cursor >= total) {
    return (
      <div className="flex flex-col gap-4">
        <Progress cursor={cursor} total={total} />
        <div className="flex items-center gap-3 text-[var(--c-text-dim)]">
          <Check size={18} className="text-[rgb(var(--c-core))]" />
          <span className="text-sm">All characters transformed.</span>
        </div>
      </div>
    )
  }

  const active = steps[cursor]
  const processed = cursor < revealedCount
  const shown = processed ? (active.resultCharacter ?? active.originalCharacter) : '·'
  const shownChar = shown === ' ' ? '␣' : shown

  return (
    <div className="flex flex-col gap-4">
      <Progress cursor={cursor} total={total} />

      {/* Current character + result */}
      <div className="flex items-center justify-center gap-4 py-2">
        <div className="text-center">
          <p className="mono-label !text-[0.5rem]">CHARACTER</p>
          <p className="font-mono text-3xl text-[var(--c-text)]">
            {active.originalCharacter === ' ' ? '␣' : active.originalCharacter}
          </p>
        </div>
        <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">→</span>
        <div className="text-center">
          <p className="mono-label !text-[0.5rem]">RESULT</p>
          <p className="font-mono text-3xl text-[rgb(var(--c-core))]">{shownChar}</p>
        </div>
      </div>

      {processed ? (
        <button
          type="button"
          onClick={onNext}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[rgb(var(--c-core))] px-4 py-2.5 text-xs font-medium text-[rgb(var(--c-core))] transition-colors hover:bg-[rgba(94,234,212,0.1)]"
        >
          <SkipForward size={14} />
          NEXT CHARACTER
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onProcess}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[rgb(var(--c-core))] px-4 py-2.5 text-xs font-semibold text-[#04110f] shadow-[0_0_18px_rgba(94,234,212,0.35)] transition-transform hover:scale-[1.02]"
          >
            <Play size={14} />
            PROCESS
          </button>
          {active.status === 'skipped' && (
            <p className="text-center text-[0.62rem] text-[var(--c-text-faint)]">{active.reason}</p>
          )}
        </>
      )}
    </div>
  )
}
