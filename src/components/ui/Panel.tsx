import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface PanelProps extends HTMLMotionProps<'section'> {
  /** Optional mono label shown in the panel header. */
  label?: string
  /** Optional title shown next to the label. */
  title?: string
  actions?: ReactNode
  children: ReactNode
}

/**
 * A glass laboratory panel — the core surface used across every module.
 * Header carries a mono label; body holds the module's content.
 */
export function Panel({ label, title, actions, className, children, ...rest }: PanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn('glass-panel overflow-hidden', className)}
      {...rest}
    >
      {(label || title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--c-border)] px-5 py-3">
          <div className="flex items-baseline gap-3 min-w-0">
            {label && <span className="mono-label shrink-0">{label}</span>}
            {title && <h3 className="truncate text-sm font-medium text-[var(--c-text)]">{title}</h3>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </motion.section>
  )
}
