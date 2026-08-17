import { MousePointerClick, Equal } from 'lucide-react'
import type { TransformationStep } from '@/crypto/types/CipherAlgorithm'

interface CharacterInspectorProps {
  step: TransformationStep | null
  /** Which row layout to show: a numeric shift (Caesar) or a substitution rule. */
  variant?: 'shift' | 'substitution'
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--c-border)] py-2 last:border-0">
      <span className="mono-label !text-[0.55rem] text-[var(--c-text-dim)]">{label}</span>
      <span
        className={
          accent
            ? 'font-mono text-lg font-semibold text-[rgb(var(--c-core))]'
            : 'font-mono text-sm text-[var(--c-text)]'
        }
      >
        {value}
      </span>
    </div>
  )
}

/**
 * CHARACTER TRANSFORMATION inspector.
 * Shows the exact mathematical operation for a selected character — the core
 * educational feature. Data comes from the engine's TransformationStep.
 */
export function CharacterInspector({ step, variant = 'shift' }: CharacterInspectorProps) {
  if (!step) {
    return (
      <div className="grid h-full min-h-[220px] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <MousePointerClick size={22} className="text-[var(--c-text-faint)]" />
          <p className="max-w-[220px] text-xs leading-relaxed text-[var(--c-text-dim)]">
            Select any character above to inspect its exact transformation.
          </p>
        </div>
      </div>
    )
  }

  if (step.status === 'skipped') {
    return (
      <div className="grid h-full min-h-[220px] place-items-center">
        <div className="text-center">
          <p className="font-mono text-4xl text-[var(--c-text-faint)]">{step.originalCharacter === ' ' ? '␣' : step.originalCharacter}</p>
          <p className="mono-label mt-4 !text-[0.6rem] text-[var(--c-text-dim)]">{step.reason}</p>
          <p className="mt-1 text-xs text-[var(--c-text-faint)]">
            Non-alphabetic characters are passed through unchanged.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="text-center">
          <p className="mono-label !text-[0.5rem]">INPUT</p>
          <p className="font-mono text-3xl text-[var(--c-text)]">{step.originalCharacter}</p>
        </div>
        <Equal size={14} className="text-[var(--c-text-faint)]" />
        <div className="text-center">
          <p className="mono-label !text-[0.5rem]">OUTPUT</p>
          <p className="font-mono text-3xl text-[rgb(var(--c-core))]">{step.resultCharacter}</p>
        </div>
      </div>

      <div className="mt-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3">
        {variant === 'shift' ? (
          <>
            <Row label="INPUT CHARACTER" value={step.originalCharacter} />
            <Row label="ALPHABET VALUE" value={String(step.originalValue)} />
            <Row label="SHIFT KEY" value={String(step.shift)} />
            <Row label="CALCULATION" value={step.calculation ?? '—'} />
            <Row label="RESULT VALUE" value={String(step.resultValue)} />
            <Row label="OUTPUT CHARACTER" value={step.resultCharacter ?? '—'} accent />
          </>
        ) : (
          <>
            <Row label="INPUT" value={step.originalCharacter} />
            <Row label="POSITION (A=0)" value={String(step.originalValue)} />
            <Row label="SUBSTITUTION" value={step.calculation ?? '—'} />
            <Row label="OUTPUT" value={step.resultCharacter ?? '—'} accent />
          </>
        )}
      </div>

      {step.note && (
        <p className="mt-3 rounded-md border border-[var(--c-border)] bg-[rgba(94,234,212,0.04)] px-3 py-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
          {step.note}
        </p>
      )}
    </div>
  )
}
