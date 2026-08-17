import { useState } from 'react'
import { Dices, RefreshCcw, Check, AlertTriangle } from 'lucide-react'
import {
  generateMonoKey,
  validateMonoKey,
  MONO_ALPHABET,
} from '@/crypto/algorithms/monoalphabetic'

interface MonoKeyInputProps {
  value: string
  onChange: (key: string) => void
  disabled?: boolean
}

/**
 * MONOALPHABETIC KEY input.
 * A 26-letter substitution alphabet. Live validation + random generation make
 * it clear the key is an arbitrary permutation of A–Z, not a word.
 */
export function MonoKeyInput({ value, onChange, disabled }: MonoKeyInputProps) {
  const [generated, setGenerated] = useState(false)
  const validation = validateMonoKey(value)

  const handleGenerate = () => {
    onChange(generateMonoKey())
    setGenerated(true)
  }

  return (
    <div className="space-y-4">
      {/* Plain alphabet reference */}
      <div>
        <span className="mono-label mb-1.5 block !text-[0.5rem] text-[var(--c-text-dim)]">
          PLAINTEXT ALPHABET
        </span>
        <div className="flex flex-wrap gap-1">
          {MONO_ALPHABET.split('').map((ch) => (
            <span
              key={ch}
              className="grid h-6 w-6 place-items-center rounded border border-[var(--c-border)] font-mono text-[0.6rem] text-[var(--c-text-dim)]"
            >
              {ch}
            </span>
          ))}
        </div>
      </div>

      {/* Substitution key input */}
      <div>
        <span className="mono-label mb-1.5 block !text-[0.5rem] text-[var(--c-text-dim)]">
          SUBSTITUTION KEY
        </span>
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setGenerated(false)
            onChange(e.target.value.toUpperCase())
          }}
          maxLength={26}
          placeholder="QWERTYUIOPASDFGHJKLZXCVBNM"
          aria-label="26-letter substitution key"
          spellCheck={false}
          className="w-full rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2.5 font-mono text-sm tracking-[0.18em] text-[var(--c-text)] outline-none transition-colors focus:border-[rgb(var(--c-core))]"
        />
        <p className="mt-1 text-[0.62rem] leading-relaxed text-[var(--c-text-faint)]">
          A valid key is 26 unique letters — every A–Z exactly once.
        </p>
      </div>

      {/* Validation message */}
      <div
        role="status"
        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
          validation.valid
            ? 'border-[rgba(94,234,212,0.4)] bg-[rgba(94,234,212,0.06)] text-[rgb(var(--c-core))]'
            : 'border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.06)] text-[var(--c-danger)]'
        }`}
      >
        {validation.valid ? <Check size={14} className="shrink-0" /> : <AlertTriangle size={14} className="shrink-0" />}
        <span>{validation.message}</span>
      </div>

      {generated && (
        <p className="text-[0.62rem] text-[rgb(var(--c-core))]">
          ✓ 26-LETTER SUBSTITUTION KEY GENERATED
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--c-core))] px-3.5 py-1.5 text-[0.62rem] text-[rgb(var(--c-core))] transition-colors hover:bg-[rgba(94,234,212,0.1)] disabled:opacity-40"
        >
          <Dices size={13} />
          GENERATE RANDOM KEY
        </button>
        <button
          type="button"
          onClick={() => {
            setGenerated(false)
            onChange(MONO_ALPHABET)
          }}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-3.5 py-1.5 text-[0.62rem] text-[var(--c-text-dim)] transition-colors hover:border-[var(--c-border-strong)] hover:text-[var(--c-text)] disabled:opacity-40"
        >
          <RefreshCcw size={13} />
          RESET TO ALPHABET
        </button>
      </div>
    </div>
  )
}
