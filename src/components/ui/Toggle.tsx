import { cn } from '@/utils/cn'

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

/**
 * A laboratory toggle (STEP BY STEP, SLOW MOTION, SHOW MATHEMATICS, …).
 *
 * Layout guarantee: the switch and its label live in a single flex row with a
 * fixed gap and `whitespace-nowrap`, so the knob can never sit on top of or
 * underneath the text. A visually-hidden checkbox provides real label/input
 * association — clicking the label toggles the control, and it stays keyboard
 * accessible — while the custom pill+knob keeps the CRYPTOLAB look.
 */
export function Toggle({ label, checked, onChange, disabled }: ToggleProps) {
  return (
    <label
      className={cn(
        'inline-flex shrink-0 select-none items-center gap-3 whitespace-nowrap',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      )}
    >
      {/* Visually hidden but focusable switch control (drives state + a11y). */}
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className="sr-only"
      />

      {/* Custom switch visual — appearance unchanged, state reflected from props. */}
      <span
        aria-hidden="true"
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-[rgb(var(--c-core))]' : 'bg-[rgba(148,163,184,0.25)]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </span>

      {/* Label — clickable (the input is wrapped by this label). */}
      <span className="font-mono text-[0.62rem] tracking-[0.14em] text-[var(--c-text-dim)]">
        {label}
      </span>
    </label>
  )
}
