import type { TransformationStep } from '@/crypto/types/CipherAlgorithm'
import { cn } from '@/utils/cn'

interface CharacterTransformationProps {
  steps: TransformationStep[]
  /** How many character results are revealed so far (0..steps.length). */
  revealedCount: number
  /** Index currently mid-transformation (-1 when none). */
  activeIndex: number
  selectedIndex: number | null
  onSelect: (index: number) => void
}

/** Render a space symbol so empty cells stay legible in the grid. */
const display = (ch: string) => (ch === ' ' ? '␣' : ch)

/**
 * The character machine: plaintext character on top, its transformed result
 * below, revealed one by one as data moves through the Caesar core. Clicking a
 * column selects it for the inspector.
 */
export function CharacterTransformation({
  steps,
  revealedCount,
  activeIndex,
  selectedIndex,
  onSelect,
}: CharacterTransformationProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Character transformation">
      {steps.map((step, i) => {
        const revealed = i < revealedCount
        const isActive = i === activeIndex
        const isSelected = i === selectedIndex
        const isSkipped = step.status === 'skipped'
        const cipherChar = revealed ? step.resultCharacter ?? step.originalCharacter : ''

        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-pressed={isSelected}
            title={revealed && isSkipped ? step.reason : `Character ${step.originalCharacter}`}
            className={cn(
              'flex min-w-[34px] flex-col items-center gap-1 rounded-md border px-1.5 py-1.5 transition-all',
              isSelected && 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.08)]',
              isActive && 'animate-pulse border-[var(--c-accent)] bg-[rgba(251,191,36,0.1)] shadow-[0_0_12px_rgba(251,191,36,0.35)]',
              !isActive && !isSelected && (revealed ? 'border-[var(--c-border)]' : 'border-[rgba(148,163,184,0.1)]'),
            )}
          >
            {/* Plaintext character */}
            <span
              className={cn(
                'font-mono text-base leading-none',
                isActive ? 'text-[var(--c-text)]' : isSkipped ? 'text-[var(--c-text-faint)]' : 'text-[var(--c-text)]',
              )}
            >
              {display(step.originalCharacter)}
            </span>
            {/* Arrow */}
            <span className="text-[8px] leading-none text-[var(--c-text-faint)]" aria-hidden="true">
              {revealed ? (isSkipped ? '·' : '↓') : '·'}
            </span>
            {/* Cipher character (revealed as the machine runs) */}
            <span
              className={cn(
                'font-mono text-base leading-none',
                !revealed && 'opacity-0',
                revealed && isSkipped && 'text-[var(--c-text-faint)]',
                revealed && !isSkipped && 'text-[rgb(var(--c-core))]',
              )}
            >
              {display(cipherChar)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
