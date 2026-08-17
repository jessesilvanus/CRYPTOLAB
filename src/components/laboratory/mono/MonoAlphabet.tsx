import { motion } from 'framer-motion'
import { monoalphabeticCipher } from '@/crypto/algorithms/monoalphabetic'
import { cn } from '@/utils/cn'

interface MonoAlphabetProps {
  /** The 26-letter substitution key. */
  keyString: string
  /** Plain-letter index (0–25) to highlight, or null. */
  highlightIndex: number | null
}

/**
 * Monoalphabetic mapping console.
 * Shows the plain alphabet (A–Z) and the permuted cipher alphabet from the
 * key, each column connected so the selected plain→cipher rule glows. The
 * mapping re-animates whenever the key changes.
 */
export function MonoAlphabet({ keyString, highlightIndex }: MonoAlphabetProps) {
  const viz = monoalphabeticCipher.getVisualizationData(keyString)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {viz.alphabet.map((ch, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.012 * i }}
            className="flex flex-col items-center gap-1"
          >
            {/* Plain letter */}
            <span
              className={cn(
                'grid h-6 w-6 place-items-center rounded border font-mono text-[0.62rem]',
                highlightIndex === i
                  ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.15)] font-semibold text-[rgb(var(--c-core))]'
                  : 'border-[var(--c-border)] text-[var(--c-text-dim)]',
              )}
            >
              {ch}
            </span>
            {/* Connector */}
            <span
              className={cn(
                'text-[9px] leading-none',
                highlightIndex === i ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-faint)]',
              )}
              aria-hidden="true"
            >
              ↓
            </span>
            {/* Cipher letter (from key) */}
            <span
              className={cn(
                'grid h-6 w-6 place-items-center rounded border font-mono text-[0.62rem]',
                highlightIndex === i
                  ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.12)] font-semibold text-[rgb(var(--c-core))]'
                  : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.15)] text-[var(--c-text)]',
              )}
            >
              {viz.cipherAlphabet[i] ?? '?'}
            </span>
          </motion.div>
        ))}
      </div>

      <p className="mt-2 text-[0.62rem] leading-relaxed text-[var(--c-text-faint)]">
        PLAIN ↓ CIPHER — each letter maps to exactly one ciphertext letter. The mapping changes whenever
        the key changes.
      </p>
    </div>
  )
}
