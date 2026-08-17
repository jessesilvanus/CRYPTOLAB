import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const base =
  'relative inline-flex select-none items-center justify-center gap-2 ' +
  'rounded-full font-medium tracking-wide transition-colors ' +
  'disabled:pointer-events-none disabled:opacity-50'

const variants: Record<Variant, string> = {
  // The lab's main "activate system" action — luminous but restrained.
  primary:
    'text-[#04110f] bg-gradient-to-r from-[#7cf0dc] to-[#4fd1bd] ' +
    'shadow-[0_0_28px_rgba(94,234,212,0.35),inset_0_0_0_1px_rgba(255,255,255,0.25)]',
  outline:
    'text-[var(--c-text)] border border-[var(--c-border-strong)] ' +
    'bg-[rgba(255,255,255,0.02)] hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]',
  ghost: 'text-[var(--c-text-dim)] hover:text-[var(--c-text)] hover:bg-[rgba(255,255,255,0.04)]',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-xs',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-8 text-base',
}

/**
 * Laboratory control button. `primary` reads as "activate the system".
 */
export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
