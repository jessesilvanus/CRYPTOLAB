import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Wraps routed pages in a soft fade/slide so navigation feels like moving
 * between laboratory modules rather than hard page swaps.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
