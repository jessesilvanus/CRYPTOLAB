import { motion } from 'framer-motion'
import { caesarCipher } from '@/crypto/algorithms/caesar'
import { cn } from '@/utils/cn'

interface CaesarAlphabetProps {
  shift: number
  /** Plain-character alphabet value (0–25) to highlight, or null. */
  highlightValue: number | null
}

/**
 * Caesar alphabet wheel.
 * PLAIN (A–Z) and the dynamically rotated CIPHER row. The mapping updates live
 * with the shift and the selected character's plain→cipher pair is highlighted.
 */
export function CaesarAlphabet({ shift, highlightValue }: CaesarAlphabetProps) {
  const viz = caesarCipher.getVisualizationData(shift)

  return (
    <div className="space-y-3">
      <Row label="PLAIN" letters={viz.alphabet} highlight={highlightValue} />
      <div className="flex items-center gap-2 px-1">
        <span className="h-px flex-1 bg-[var(--c-border)]" />
        <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">SHIFT {shift}</span>
        <span className="h-px flex-1 bg-[var(--c-border)]" />
      </div>
      {/* Keyed by shift so the cipher row re-animates on every key change. */}
      <motion.div
        key={shift}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Row label="CIPHER" letters={viz.cipherAlphabet} highlight={highlightValue} />
      </motion.div>
    </div>
  )
}

function Row({
  label,
  letters,
  highlight,
}: {
  label: string
  letters: string[]
  highlight: number | null
}) {
  return (
    <div>
      <span className="mono-label mb-1.5 block !text-[0.5rem] text-[var(--c-text-dim)]">{label}</span>
      <div className="flex flex-wrap gap-1">
        {letters.map((letter, i) => {
          const active = highlight === i
          return (
            <span
              key={letter}
              className={cn(
                'grid h-7 w-7 place-items-center rounded border font-mono text-xs',
                active
                  ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.15)] font-semibold text-[rgb(var(--c-core))]'
                  : 'border-[var(--c-border)] text-[var(--c-text-dim)]',
              )}
            >
              {letter}
            </span>
          )
        })}
      </div>
    </div>
  )
}
