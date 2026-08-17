import { Play, SkipForward, Check, Info } from 'lucide-react'

interface LabStepControlsProps {
  /** Total number of steps. */
  total: number
  /** Steps revealed so far (0..total). */
  revealedCount: number
  /** Current step cursor (0..total). */
  cursor: number
  /** Optional per-step caption shown under the current step. */
  caption?: string | null
  onProcess: () => void
  onNext: () => void
}

/**
 * Shared STEP-BY-STEP controller for the dedicated labs.
 * PROCESS reveals the current step's result; NEXT advances the cursor.
 * Mirrors the core Encryption Lab's walkthrough behaviour.
 */
export function LabStepControls({
  total,
  revealedCount,
  cursor,
  caption,
  onProcess,
  onNext,
}: LabStepControlsProps) {
  const done = cursor >= total
  const progress = done ? total : cursor + 1

  return (
    <div className="flex flex-col gap-4">
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

      {done ? (
        <div className="flex items-center gap-3 text-[var(--c-text-dim)]">
          <Check size={18} className="text-[rgb(var(--c-core))]" />
          <span className="text-sm">All steps complete.</span>
        </div>
      ) : (
        <>
          {caption && (
            <p className="flex items-start gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(94,234,212,0.04)] px-3 py-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
              <Info size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
              <span>{caption}</span>
            </p>
          )}
          {cursor < revealedCount ? (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[rgb(var(--c-core))] px-4 py-2.5 text-xs font-medium text-[rgb(var(--c-core))] transition-colors hover:bg-[rgba(94,234,212,0.1)]"
            >
              <SkipForward size={14} />
              NEXT STEP
            </button>
          ) : (
            <button
              type="button"
              onClick={onProcess}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[rgb(var(--c-core))] px-4 py-2.5 text-xs font-semibold text-[#04110f] shadow-[0_0_18px_rgba(94,234,212,0.35)] transition-transform hover:scale-[1.02]"
            >
              <Play size={14} />
              PROCESS
            </button>
          )}
        </>
      )}
    </div>
  )
}
