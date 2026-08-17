import { motion } from 'framer-motion'
import { GraduationCap, Lightbulb, Eye, Sigma, FlaskConical, Swords } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { EngineNotice } from '@/components/laboratory/EngineNotice'
import { staggerContainer } from '@/animations/variants'

const LEVELS = [
  {
    level: 1,
    id: 'concept',
    label: 'CONCEPT',
    icon: Lightbulb,
    desc: 'A simple, plain-language explanation of what the transformation does.',
  },
  {
    level: 2,
    id: 'visualization',
    label: 'VISUALIZATION',
    icon: Eye,
    desc: 'Watch the transformation happen — characters move and change before your eyes.',
  },
  {
    level: 3,
    id: 'technical',
    label: 'TECHNICAL',
    icon: Sigma,
    desc: 'The mathematical / algorithmic operation behind the scenes.',
  },
  {
    level: 4,
    id: 'experiment',
    label: 'EXPERIMENT',
    icon: FlaskConical,
    desc: 'Change plaintext and key, and observe how the result responds.',
  },
  {
    level: 5,
    id: 'challenge',
    label: 'CHALLENGE',
    icon: Swords,
    desc: 'Attempt to solve or break the system yourself.',
  },
]

/**
 * LEARNING CENTER.
 * The progressive-learning model that every cipher study view will follow —
 * CRYPTOLAB is an interactive learning platform, not just a utility.
 */
export function LearnPage() {
  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="MODULE 07 // LEARNING"
        title="Learning Center"
        sub="Every transformation in CRYPTOLAB is taught through five progressive levels. Move from intuition to mastery by doing."
      />

      <EngineNotice text="Per-cipher interactive study views implement these levels in Step 2." />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative ml-2 space-y-4 border-l border-[var(--c-border)] pl-8"
      >
        {LEVELS.map((lv, i) => {
          const Icon = lv.icon
          return (
            <motion.div
              key={lv.id}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <span
                className="absolute -left-[41px] top-1.5 grid h-8 w-8 place-items-center rounded-full border border-[var(--c-border)] bg-[var(--c-bg-elev)] text-[rgb(var(--c-core))]"
                aria-hidden="true"
              >
                <Icon size={15} />
              </span>
              <div className="glass-panel p-5">
                <div className="flex items-baseline gap-3">
                  <span className="mono-label text-[var(--c-text-faint)]">LEVEL {lv.level}</span>
                  <span className="mono-label text-[0.7rem] font-semibold text-[var(--c-text)]">
                    {lv.label}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--c-text-dim)]">{lv.desc}</p>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      <div className="flex items-center gap-3 rounded-lg border border-[var(--c-border)] bg-[rgba(0,0,0,0.15)] px-5 py-4 text-xs text-[var(--c-text-dim)]">
        <GraduationCap size={16} className="shrink-0 text-[rgb(var(--c-core))]" aria-hidden="true" />
        <span>The goal: students become curious about how cryptography actually works — not just run a tool.</span>
      </div>
    </div>
  )
}
