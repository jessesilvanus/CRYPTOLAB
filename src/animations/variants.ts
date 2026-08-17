import type { Variants } from 'framer-motion'

/**
 * Shared Framer Motion variants — a small vocabulary of entrances and
 * transitions so the whole app moves consistently and purposefully.
 * (In Step 2 these also back the algorithm step-by-step sequences.)
 */

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
}

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
}

export const blurIn: Variants = {
  hidden: { opacity: 0, filter: 'blur(8px)', y: 10 },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  },
}

/** Staggered container: children use `visible` with a delay via `custom`. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

/** Motion for a single laboratory "panel" sliding in from the right. */
export const panelSlide: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}
