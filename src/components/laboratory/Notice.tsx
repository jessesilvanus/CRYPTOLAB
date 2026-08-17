import { motion } from 'framer-motion'
import { Info } from 'lucide-react'

interface NoticeProps {
  message: string
  tone?: 'info' | 'error'
}

/** Inline application notice — no browser alert(). */
export function Notice({ message, tone = 'info' }: NoticeProps) {
  const color = tone === 'error' ? 'var(--c-danger)' : 'rgb(var(--c-core))'
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      role="status"
      className="flex items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-xs"
      style={{ borderColor: `${color}55`, color, background: `${color}0d` }}
    >
      <Info size={14} className="shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </motion.div>
  )
}
