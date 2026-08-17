import { BarChart3, Info } from 'lucide-react'
import { cn } from '@/utils/cn'

interface FrequencyPreviewProps {
  /** Ciphertext (or plaintext) to analyse. */
  text: string
}

const MIN_SAMPLE = 20

/**
 * WHY FREQUENCY ANALYSIS WORKS — educational preview (not a cracking engine).
 * Counts letter frequencies in the given text and shows the top letters as a
 * bar chart. If the sample is too short, it explains that longer ciphertext is
 * more reliable.
 */
export function FrequencyPreview({ text }: FrequencyPreviewProps) {
  const letters = text.toUpperCase().replace(/[^A-Z]/g, '').split('')

  if (letters.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--c-text-faint)]">
        <BarChart3 size={15} className="text-[rgb(var(--c-core))]" />
        Encrypt a message to analyse its letter frequencies.
      </div>
    )
  }

  const counts = new Map<string, number>()
  for (const ch of letters) counts.set(ch, (counts.get(ch) ?? 0) + 1)
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  const max = sorted[0]?.[1] ?? 1

  return (
    <div className="space-y-4">
      {letters.length < MIN_SAMPLE && (
        <div className="flex items-start gap-2 rounded-md border border-[var(--c-accent)] bg-[rgba(251,191,36,0.06)] px-3 py-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
          <Info size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
          <span>
            {letters.length} letter{letters.length === 1 ? '' : 's'} — longer ciphertext produces more
            reliable frequency information.
          </span>
        </div>
      )}

      <div className="flex items-end gap-2" role="img" aria-label="Letter frequency chart">
        {sorted.map(([ch, n]) => (
          <div key={ch} className="flex flex-1 flex-col items-center gap-1">
            <span className="font-mono text-[0.55rem] text-[var(--c-text-dim)]">{n}</span>
            <div
              className={cn('w-full rounded-t', ch === 'E' || ch === 'T' ? 'bg-[rgb(var(--c-core))]' : 'bg-[rgba(94,234,212,0.4)]')}
              style={{ height: `${Math.max(6, (n / max) * 64)}px` }}
            />
            <span className="font-mono text-[0.6rem] text-[var(--c-text)]">{ch}</span>
          </div>
        ))}
      </div>

      <p className="flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-faint)]">
        <BarChart3 size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
        In English, E and T are the most common letters. A monoalphabetic substitution keeps those
        frequencies — so an attacker can match the peaks and reverse the mapping.
      </p>
    </div>
  )
}
