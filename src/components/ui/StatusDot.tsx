import { cn } from '@/utils/cn'

type Tone = 'online' | 'ready' | 'standby' | 'offline'

const tones: Record<Tone, string> = {
  online: 'bg-[rgb(var(--c-core))] shadow-[0_0_8px_rgba(94,234,212,0.8)]',
  ready: 'bg-[#a78bfa] shadow-[0_0_8px_rgba(167,139,250,0.8)]',
  standby: 'bg-[#fbbf24] shadow-[0_0_8px_rgba(251,191,36,0.8)]',
  offline: 'bg-[var(--c-text-faint)]',
}

/**
 * A small status indicator (dot + label). Colour is always paired with a
 * text label so the information is not colour-dependent.
 */
export function StatusDot({ tone = 'online', label }: { tone?: Tone; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn('h-1.5 w-1.5 rounded-full', tones[tone])}
        aria-hidden="true"
      />
      <span className="mono-label !normal-case !tracking-wide text-[0.6rem]">{label}</span>
    </span>
  )
}
