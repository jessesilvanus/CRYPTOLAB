import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, ChevronDown } from 'lucide-react'
import { CoreScene } from '@/three/scene/CoreScene'
import { Button } from '@/components/ui/Button'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { blurIn, staggerContainer, fadeIn } from '@/animations/variants'

/**
 * CINEMATIC LANDING PAGE.
 *
 * Composition keeps the typography clear of the 3D core's orbital band:
 *  - Desktop: text sits in a left column; the core is offset to the right so
 *    its rings orbit to the side of (and behind) the type rather than through it.
 *  - Mobile: the core is pushed upward so its rings fall behind the dominant
 *    heading, leaving the subtitle and quote below on a legible scrim.
 * ENTER LAB still transitions into the laboratory environment.
 */
export function LandingPage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [hovered, setHovered] = useState(false)
  const [launching, setLaunching] = useState(false)

  const enterLab = () => {
    setLaunching(true)
    window.setTimeout(() => navigate('/home'), 420)
  }

  return (
    <div
      className="relative h-screen w-full overflow-hidden"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Full-bleed 3D core — offset so orbitals avoid the text band. */}
      <CoreScene
        state="idle"
        hovered={hovered}
        className="absolute inset-0"
        fallbackLabel="CRYPTOLAB"
        coreOffset={isDesktop ? [2.3, 0.1, 0] : [0, 1.15, 0]}
      />

      {/* Legibility scrims behind the text (keeps cinematic depth). */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            isDesktop
              ? 'linear-gradient(90deg, rgba(6,7,11,0.85) 0%, rgba(6,7,11,0.55) 34%, rgba(6,7,11,0) 62%)'
              : 'radial-gradient(90% 70% at 50% 26%, rgba(6,7,11,0.82) 30%, rgba(6,7,11,0) 75%)',
        }}
        aria-hidden="true"
      />

      {/* Text composition */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className={`pointer-events-none absolute inset-0 z-10 flex flex-col px-6 sm:px-10 ${
          isDesktop
            ? 'justify-center items-start text-left'
            : 'items-center justify-start pt-[16vh] text-center'
        }`}
      >
        <motion.p
          variants={blurIn}
          className={`mono-label mb-5 text-[var(--c-text-dim)] ${isDesktop ? '' : 'mt-4'}`}
        >
          INTERACTIVE RESEARCH LABORATORY · 7TH SEMESTER PROJECT
        </motion.p>

        <motion.h1
          variants={blurIn}
          className={`font-bold tracking-[0.18em] text-[var(--c-text)] ${
            isDesktop ? 'text-6xl md:text-7xl lg:text-8xl' : 'text-6xl sm:text-7xl'
          }`}
        >
          CRYPTO<span className="text-[rgb(var(--c-core))]">LAB</span>
        </motion.h1>

        <motion.h2
          variants={blurIn}
          className={`mt-6 max-w-xl text-sm font-medium leading-relaxed tracking-[0.16em] text-[var(--c-text-dim)] sm:text-base ${
            isDesktop ? '' : 'mx-auto'
          }`}
        >
          INTERACTIVE CRYPTOGRAPHY &amp;
          <br />
          SECURE COMMUNICATION LABORATORY
        </motion.h2>

        <motion.p
          variants={fadeIn}
          className={`mt-6 max-w-md text-base italic text-[var(--c-text)] ${
            isDesktop ? '' : 'mx-auto'
          }`}
        >
          “Don’t just encrypt the message.
          <br />
          Understand what happens to it.”
        </motion.p>

        <motion.div
          variants={fadeIn}
          className={`pointer-events-auto mt-10 ${isDesktop ? '' : 'mx-auto'}`}
        >
          <Button size="lg" onClick={enterLab} aria-label="Enter the laboratory">
            <LogIn size={18} />
            ENTER LAB
          </Button>
        </motion.div>

        <motion.div
          variants={fadeIn}
          className={`mt-16 flex flex-col items-center gap-2 text-[var(--c-text-faint)] ${
            isDesktop ? '' : 'mx-auto'
          }`}
        >
          <span className="mono-label !text-[0.55rem]">
            EXPLORE · INTERACT · DISCOVER · EXPERIMENT · UNDERSTAND
          </span>
          <ChevronDown size={16} className="animate-bounce" aria-hidden="true" />
        </motion.div>
      </motion.div>

      {/* Launch overlay */}
      <AnimatePresence>
        {launching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 grid place-items-center bg-[var(--c-bg)]"
          >
            <motion.span
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="mono-label text-[rgb(var(--c-core))]"
            >
              INITIALIZING LABORATORY…
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
