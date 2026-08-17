import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { normalizeShift } from '@/crypto/algorithms/caesar'

interface CaesarShiftInputProps {
  value: number
  onChange: (n: number) => void
  disabled?: boolean
}

const clamp = (n: number) => Math.min(25, Math.max(0, n))

/**
 * SHIFT KEY control.
 * Clear numeric 0–25 input: − / + steppers, a slider, and a direct numeric
 * field. Invalid/out-of-range values are clamped so the key is always valid.
 */
export function CaesarShiftInput({ value, onChange, disabled }: CaesarShiftInputProps) {
  // Local draft lets the user clear/type freely; committed on valid input.
  const [draft, setDraft] = useState(String(value))

  // Keep the field in sync when the value changes externally (e.g. RESET).
  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commit = (raw: string) => {
    const n = Number(raw)
    if (raw.trim() === '' || Number.isNaN(n)) return // keep current while typing
    onChange(clamp(normalizeShift(n)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="mono-label text-[0.6rem] text-[var(--c-text-dim)]">SHIFT KEY</span>
        <span className="mono-label text-[0.55rem] text-[var(--c-text-faint)]">RANGE 0–25</span>
      </div>

      {/* Steppers + readout */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={disabled || value <= 0}
          aria-label="Decrease shift"
          className="grid h-10 w-10 place-items-center rounded-md border border-[var(--c-border)] text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))] disabled:opacity-30"
        >
          <Minus size={16} />
        </button>

        <div className="relative flex-1 text-center">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft}
            disabled={disabled}
            onChange={(e) => {
              setDraft(e.target.value)
              commit(e.target.value)
            }}
            aria-label="Shift key value"
            className="h-12 w-full rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] text-center font-mono text-2xl font-semibold text-[rgb(var(--c-core))] outline-none transition-colors focus:border-[rgb(var(--c-core))]"
          />
        </div>

        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          disabled={disabled || value >= 25}
          aria-label="Increase shift"
          className="grid h-10 w-10 place-items-center rounded-md border border-[var(--c-border)] text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))] disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={25}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value)
          onChange(n)
          setDraft(String(n))
        }}
        aria-label="Shift key slider"
        className="w-full accent-[rgb(var(--c-core))]"
      />

      <p className="text-xs text-[var(--c-text-dim)]">
        Caesar Cipher uses a numerical shift from <span className="font-mono text-[var(--c-text)]">0–25</span>.
        Every letter moves forward by this amount in the alphabet.
      </p>
    </div>
  )
}
