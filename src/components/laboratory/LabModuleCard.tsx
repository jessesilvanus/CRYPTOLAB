import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import type { NavItem } from '@/data/modules'

interface LabModuleCardProps {
  module: NavItem
  index: number
}

/**
 * A laboratory instrument/module card used on the lab home.
 * Reads like a rack unit on an instrument: index, control label, description
 * and a small "status" footer — not a generic marketing card.
 */
export function LabModuleCard({ module, index }: LabModuleCardProps) {
  const Icon = module.icon
  return (
    <Link to={module.path} className="group block h-full">
      <motion.article
        whileHover="hover"
        initial="rest"
        animate="rest"
        className="glass-panel relative flex h-full min-h-[190px] flex-col p-5 transition-colors group-hover:border-[rgba(94,234,212,0.4)]"
      >
        {/* Corner index */}
        <span className="mono-label absolute right-4 top-4 text-[0.6rem] text-[var(--c-text-faint)]">
          MOD·{String(index).padStart(2, '0')}
        </span>

        <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg border border-[var(--c-border)] bg-[rgba(94,234,212,0.05)] text-[rgb(var(--c-core))] transition-all duration-300 group-hover:shadow-[0_0_18px_rgba(94,234,212,0.25)]">
          <Icon size={20} strokeWidth={1.8} />
        </div>

        <h3 className="mono-label !tracking-[0.18em] text-[0.7rem] font-semibold text-[var(--c-text)]">
          {module.label}
        </h3>

        <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--c-text-dim)]">
          {module.description}
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-[var(--c-border)] pt-3">
          <span className="mono-label !text-[0.55rem] text-[var(--c-text-faint)]">
            {module.tagline}
          </span>
          <ArrowUpRight
            size={16}
            className="text-[var(--c-text-faint)] transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[rgb(var(--c-core))]"
          />
        </div>
      </motion.article>
    </Link>
  )
}
