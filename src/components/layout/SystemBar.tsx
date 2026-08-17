import { Menu } from 'lucide-react'
import { StatusDot } from '../ui/StatusDot'

interface SystemBarProps {
  onToggleNav: () => void
  variant?: 'lab' | 'landing'
}

/**
 * Top application bar.
 * Carries the brand on the left and live application *state* indicators on
 * the right. These are interface states only — not a real security monitor.
 */
export function SystemBar({ onToggleNav, variant = 'lab' }: SystemBarProps) {
  return (
    <header className="relative z-50 flex h-16 shrink-0 items-center justify-between border-b border-[var(--c-border)] bg-[rgba(8,10,16,0.6)] px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        {variant === 'lab' && (
          <button
            onClick={onToggleNav}
            aria-label="Toggle navigation"
            className="grid h-9 w-9 place-items-center rounded-md text-[var(--c-text-dim)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--c-text)] lg:hidden"
          >
            <Menu size={20} />
          </button>
        )}
        <span className="font-semibold tracking-[0.2em] text-[var(--c-text)]">
          CRYPTO<span className="text-[rgb(var(--c-core))]">LAB</span>
        </span>
        <span className="hidden items-center gap-2 rounded-full border border-[var(--c-border)] px-3 py-1 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--c-core))] shadow-[0_0_6px_rgba(94,234,212,0.8)]" />
          <span className="mono-label !text-[0.55rem]">SIGNAL LOCKED</span>
        </span>
      </div>

      <div className="hidden items-center gap-6 md:flex">
        <StatusDot tone="online" label="SYSTEM · ONLINE" />
        <StatusDot tone="ready" label="CRYPTO ENGINE · READY" />
        <StatusDot tone="standby" label="NETWORK · STANDBY" />
        <StatusDot tone="online" label="VISUAL ENGINE · ONLINE" />
      </div>

      <div className="md:hidden">
        <StatusDot tone="online" label="SYSTEM · ONLINE" />
      </div>
    </header>
  )
}
