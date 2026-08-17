import { motion } from 'framer-motion'
import { LAB_MODULES } from '@/data/modules'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { LabModuleCard } from '@/components/laboratory/LabModuleCard'
import { EngineNotice } from '@/components/laboratory/EngineNotice'
import { staggerContainer } from '@/animations/variants'

/**
 * LABORATORY HOME.
 * The module launchpad — every lab is presented as an instrument/module.
 */
export function HomePage() {
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          kicker="LABORATORY // OVERVIEW"
          title="Select a module to begin."
          sub="Every module is a self-contained instrument. Pick one to enter it — the engines arrive in Step 2."
        />
        <div className="flex items-center gap-6">
          <div className="hidden text-right sm:block">
            <span className="mono-label block !text-[0.55rem] text-[var(--c-text-faint)]">ACTIVE MODULES</span>
            <span className="mono-label block text-[var(--c-text)]">{String(LAB_MODULES.length).padStart(2, '0')} / 07</span>
          </div>
        </div>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {LAB_MODULES.map((module, i) => (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
          >
            <LabModuleCard module={module} index={i + 1} />
          </motion.div>
        ))}
      </motion.div>

      <EngineNotice text="The interactive transformation engines are wired up in Step 2. You can explore every module shell and its architecture now." />
    </div>
  )
}
