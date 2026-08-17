import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Blocks, Sigma, Layers, Boxes, Eye, ArrowUpRight } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { EngineNotice } from '@/components/laboratory/EngineNotice'
import { SyllabusBadge } from '@/components/laboratory/SyllabusBadge'
import {
  CIPHERS_VTU_CORE,
  CIPHERS_EXTENDED,
  CIPHERS_BLOCK,
  CIPHERS_DATA_HIDING,
} from '@/crypto/algorithms/registry'
import type { CipherMetadata } from '@/crypto/types/CryptoTypes'
import { staggerContainer } from '@/animations/variants'
import { cn } from '@/utils/cn'

const LEVEL_COLOR: Record<string, string> = {
  VERY_WEAK: '#f87171',
  WEAK: '#fb923c',
  MODERATE: '#fbbf24',
  STRONG: '#a78bfa',
  VERY_STRONG: '#34d399',
  SPECIAL: '#5eead4',
}

/**
 * CIPHER LAB — syllabus-aligned catalog.
 * Organises every technique into VTU CORE, EXTENDED, BLOCK CIPHER and DATA
 * HIDING. Only Caesar is ACTIVE; the rest are roadmap entries (no fake
 * functionality). A VTU badge communicates project scope, not certification.
 */
export function CipherLab() {
  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="MODULE 03 // CIPHERS"
        title="Cipher Laboratory"
        sub="A syllabus-aligned catalog of classical techniques, block ciphers and data hiding. Explore each technique's mechanics and its security classification."
        actions={<SyllabusBadge />}
      />

      <EngineNotice text="Caesar and the classical ciphers are interactive, and DES now has its own block-cipher laboratory. Open DES from the BLOCK CIPHERS section below." />

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <Section label="VTU CORE" icon={Layers} hint="MODULE 1 · PRIMARY ACADEMIC PATH" items={CIPHERS_VTU_CORE} />
        <Section label="EXTENDED LAB" icon={Sigma} hint="BEYOND SYLLABUS · EXPLORATION" items={CIPHERS_EXTENDED} />
        <Section label="BLOCK CIPHERS" icon={Blocks} hint="MODULE 1 · FUTURE LAB" items={CIPHERS_BLOCK} />
        <Section label="DATA HIDING" icon={Eye} hint="MODULE 1 · SEPARATE TECHNIQUE" items={CIPHERS_DATA_HIDING} />
      </motion.div>

      <div className="flex items-center gap-3 rounded-lg border border-[var(--c-border)] bg-[rgba(0,0,0,0.15)] px-5 py-4 text-xs text-[var(--c-text-dim)]">
        <Boxes size={16} className="shrink-0 text-[rgb(var(--c-core))]" aria-hidden="true" />
        <span>
          Security levels are educational classifications — not formal proofs. Each cipher will be
          explored interactively through concept, visualization, technical, experiment and challenge levels.
        </span>
      </div>
    </div>
  )
}

function Section({
  label,
  hint,
  icon: Icon,
  items,
}: {
  label: string
  hint: string
  icon: typeof Layers
  items: CipherMetadata[]
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--c-border)] bg-[rgba(94,234,212,0.05)] text-[rgb(var(--c-core))]">
          <Icon size={15} />
        </span>
        <span className="mono-label text-[0.65rem] font-semibold text-[var(--c-text)]">{label}</span>
        <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">{hint}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.04 * i }}
          >
            <CipherCard meta={c} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function CipherCard({ meta }: { meta: CipherMetadata }) {
  const color = LEVEL_COLOR[meta.security.securityLevel] ?? '#94a3b8'
  const cardClass = cn(
    'glass-panel p-4 transition-colors',
    meta.status === 'ACTIVE' && 'border-[rgba(94,234,212,0.4)]',
    meta.path && 'hover:border-[rgb(var(--c-core))]',
  )
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--c-text)]">{meta.name}</p>
          <p className="mono-label mt-1 !text-[0.48rem] text-[var(--c-text-faint)]">
            {meta.category.toUpperCase()} · {meta.keyType.toUpperCase()}
          </p>
        </div>
        <Status meta={meta} />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[var(--c-text-dim)]">{meta.description}</p>

      {meta.path && (
        <p className="mt-3 inline-flex items-center gap-1 text-[0.58rem] font-medium text-[rgb(var(--c-core))]">
          OPEN BLOCK CIPHER LAB <ArrowUpRight size={12} />
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <span className="mono-label !text-[0.48rem] text-[var(--c-text-faint)]">SECURITY</span>
        <span className="font-mono text-[0.6rem] font-semibold" style={{ color }}>
          {meta.security.securityLevel.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="mt-1 flex gap-1">
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className="h-1 flex-1 rounded-full"
            style={{
              background: i < (LEVEL_COLOR[meta.security.securityLevel] ? weightOf(meta) : 1) ? color : 'rgba(148,163,184,0.18)',
            }}
          />
        ))}
      </div>
    </>
  )
  return meta.path ? (
    <Link to={meta.path} className={cn(cardClass, 'block')}>
      {inner}
    </Link>
  ) : (
    <div className={cardClass}>{inner}</div>
  )
}

function weightOf(meta: CipherMetadata): number {
  switch (meta.security.securityLevel) {
    case 'VERY_WEAK':
      return 1
    case 'WEAK':
      return 2
    case 'MODERATE':
      return 3
    case 'STRONG':
      return 4
    case 'VERY_STRONG':
      return 5
    case 'SPECIAL':
      return 6
  }
}

function Status({ meta }: { meta: CipherMetadata }) {
  if (meta.status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(94,234,212,0.12)] px-2 py-0.5 text-[0.5rem] font-medium text-[rgb(var(--c-core))]">
        <span className="h-1 w-1 rounded-full bg-[rgb(var(--c-core))]" /> ACTIVE
      </span>
    )
  }
  return (
    <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">
      {meta.status === 'LOCKED' ? 'LOCKED' : 'COMING NEXT'}
    </span>
  )
}
