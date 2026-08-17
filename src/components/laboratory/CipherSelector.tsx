import type { CipherId, CipherMetadata } from '@/crypto/types/CryptoTypes'
import { CIPHERS_EXTENDED, CIPHERS_VTU_CORE } from '@/crypto/algorithms/registry'
import { cn } from '@/utils/cn'

interface CipherSelectorProps {
  value: CipherId
  onChange: (id: CipherId) => void
}

/** Tiny status chip for each catalog entry. */
function StatusChip({ meta }: { meta: CipherMetadata }) {
  if (meta.status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(94,234,212,0.12)] px-2 py-0.5 text-[0.5rem] font-medium text-[rgb(var(--c-core))]">
        <span className="h-1 w-1 rounded-full bg-[rgb(var(--c-core))]" /> ACTIVE
      </span>
    )
  }
  return (
    <span className="mono-label !text-[0.48rem] text-[var(--c-text-faint)]">
      {meta.status === 'LOCKED' ? 'LOCKED' : 'COMING NEXT'}
    </span>
  )
}

/**
 * Cipher selector grouped by syllabus scope.
 *   VTU CORE  — the primary academic path (Module 1)
 *   EXTENDED  — useful techniques beyond the syllabus
 * Only ACTIVE entries are functional; the rest show COMING NEXT / LOCKED.
 */
export function CipherSelector({ value, onChange }: CipherSelectorProps) {
  return (
    <div className="space-y-5">
      <Group label="VTU CORE" hint="MODULE 1 · PRIMARY PATH" items={CIPHERS_VTU_CORE} value={value} onChange={onChange} />
      <Group label="EXTENDED LAB" hint="BEYOND SYLLABUS" items={CIPHERS_EXTENDED} value={value} onChange={onChange} />
    </div>
  )
}

function Group({
  label,
  hint,
  items,
  value,
  onChange,
}: {
  label: string
  hint: string
  items: CipherMetadata[]
  value: CipherId
  onChange: (id: CipherId) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="mono-label !text-[0.55rem] text-[var(--c-text-dim)]">{label}</span>
        <span className="mono-label !text-[0.48rem] text-[var(--c-text-faint)]">{hint}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((c) => {
          const selected = value === c.id
          return (
            <button
              key={c.id}
              onClick={() => onChange(c.id)}
              aria-pressed={selected}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs transition-colors',
                selected
                  ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.1)] text-[var(--c-text)]'
                  : 'border-[var(--c-border)] text-[var(--c-text-dim)] hover:border-[var(--c-border-strong)] hover:text-[var(--c-text)]',
              )}
            >
              <span>{c.name}</span>
              <StatusChip meta={c} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
