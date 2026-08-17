import { Lock, RotateCcw } from 'lucide-react'
import { Toggle } from '@/components/ui/Toggle'

interface LabControlsProps {
  onEncrypt: () => void
  onReset: () => void
  disabled?: boolean
  encryptLabel?: string
  step: boolean
  slow: boolean
  math: boolean
  onStep: (v: boolean) => void
  onSlow: (v: boolean) => void
  onMath: (v: boolean) => void
  showMath?: boolean
}

/**
 * Shared ENCRYPT / RESET + STEP-BY-STEP / SLOW MOTION / SHOW MATHEMATICS row
 * used by the dedicated cipher labs. Identical layout + toggles to the core
 * Encryption Lab, so every cipher feels like the same system.
 */
export function LabControls({
  onEncrypt,
  onReset,
  disabled,
  encryptLabel = 'ENCRYPT',
  step,
  slow,
  math,
  onStep,
  onSlow,
  onMath,
  showMath = true,
}: LabControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onEncrypt}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--c-core))] px-6 py-2.5 text-xs font-semibold text-[#04110f] shadow-[0_0_22px_rgba(94,234,212,0.35)] transition-transform hover:scale-[1.02] disabled:opacity-40"
      >
        <Lock size={14} />
        {encryptLabel}
      </button>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-5 py-2.5 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[var(--c-border-strong)] hover:text-[var(--c-text)]"
      >
        <RotateCcw size={14} />
        RESET
      </button>
      <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-3">
        <Toggle label="STEP BY STEP" checked={step} onChange={onStep} />
        <Toggle label="SLOW MOTION" checked={slow} onChange={onSlow} />
        {showMath && <Toggle label="SHOW MATHEMATICS" checked={math} onChange={onMath} />}
      </div>
    </div>
  )
}
