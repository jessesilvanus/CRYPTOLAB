import type { ReactNode } from 'react'

interface SectionHeadingProps {
  /** Small mono kicker, e.g. "MODULE 01". */
  kicker?: string
  title: ReactNode
  sub?: ReactNode
  /** Optional trailing element aligned to the right of the heading. */
  actions?: ReactNode
}

/** Page-level heading: mono kicker + crisp title + optional supporting line. */
export function SectionHeading({ kicker, title, sub, actions }: SectionHeadingProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        {kicker && <span className="mono-label">{kicker}</span>}
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--c-text)] sm:text-3xl">
          {title}
        </h1>
        {sub && <p className="max-w-2xl text-sm leading-relaxed text-[var(--c-text-dim)]">{sub}</p>}
      </div>
      {actions && <div className="pt-1 shrink-0">{actions}</div>}
    </div>
  )
}
