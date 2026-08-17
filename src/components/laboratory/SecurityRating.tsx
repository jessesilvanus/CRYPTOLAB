import { ShieldAlert, ShieldCheck, Info } from 'lucide-react'
import type { SecurityProfile, SecurityLevel } from '@/crypto/types/CryptoTypes'
import { cn } from '@/utils/cn'

interface SecurityRatingProps {
  profile: SecurityProfile
  /** Cipher name shown in the header, e.g. "Caesar Cipher". */
  name?: string
}

/** Visual weight (0–6) + colour for each educational security level. */
const LEVEL_STYLE: Record<SecurityLevel, { weight: number; color: string; label: string }> = {
  VERY_WEAK: { weight: 1, color: '#f87171', label: 'VERY WEAK' },
  WEAK: { weight: 2, color: '#fb923c', label: 'WEAK' },
  MODERATE: { weight: 3, color: '#fbbf24', label: 'MODERATE' },
  STRONG: { weight: 4, color: '#a78bfa', label: 'STRONG' },
  VERY_STRONG: { weight: 5, color: '#34d399', label: 'VERY STRONG' },
  SPECIAL: { weight: 6, color: '#5eead4', label: 'SPECIAL / PERFECT SECRECY' },
}

/**
 * CRYPTOGRAPHIC SECURITY DIAGNOSTIC.
 *
 * Renders a structured SecurityProfile as a readable analysis, not a game
 * score. The classification is educational — not a formal security proof —
 * and that distinction is shown inline.
 */
export function SecurityRating({ profile, name }: SecurityRatingProps) {
  const lvl = LEVEL_STYLE[profile.securityLevel]
  const segments = Array.from({ length: 6 }, (_, i) => i < lvl.weight)

  return (
    <div className="space-y-4">
      {/* Header + level */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {name && <p className="mono-label !text-[0.55rem] text-[var(--c-text-faint)]">{name}</p>}
          <p className="mt-1 text-lg font-semibold tracking-tight" style={{ color: lvl.color }}>
            {lvl.label}
          </p>
        </div>
        <ShieldAlert size={22} style={{ color: lvl.color }} aria-hidden="true" />
      </div>

      {/* 6-segment gauge */}
      <div className="flex gap-1" role="img" aria-label={`Security level: ${lvl.label}`}>
        {segments.map((on, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ background: on ? lvl.color : 'rgba(148,163,184,0.18)' }}
          />
        ))}
      </div>

      {/* Metric rows */}
      <dl className="divide-y divide-[var(--c-border)] rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)]">
        <Metric label="KEY SPACE" value={profile.keySpace} />
        <Metric label="BRUTE FORCE" value={profile.bruteForce} />
        <Metric label="FREQUENCY ANALYSIS" value={profile.frequencyAnalysis} />
        <Metric label="MODERN SECURITY" value={profile.modernSecurity} />
      </dl>

      {/* Primary weaknesses */}
      <div>
        <p className="mono-label !text-[0.55rem] text-[var(--c-text-dim)]">PRIMARY WEAKNESSES</p>
        <ul className="mt-2 space-y-1.5">
          {profile.weaknesses.map((w, i) => (
            <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-[var(--c-text-dim)]">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: lvl.color }} />
              {w}
            </li>
          ))}
        </ul>
      </div>

      {/* Explanation */}
      <div className="rounded-md border border-[var(--c-border)] bg-[rgba(94,234,212,0.04)] p-3">
        <p className="flex items-center gap-2 text-[0.6rem] font-medium text-[rgb(var(--c-core))]">
          <ShieldCheck size={13} /> WHY?
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--c-text-dim)]">{profile.explanation}</p>
      </div>

      {/* Educational disclaimer */}
      <p className="flex items-start gap-2 text-[0.58rem] leading-relaxed text-[var(--c-text-faint)]">
        <Info size={12} className="mt-0.5 shrink-0" />
        Educational classification for learning — not a formal cryptographic security proof.
      </p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2">
      <dt className="mono-label !text-[0.52rem] text-[var(--c-text-faint)]">{label}</dt>
      <dd className={cn('font-mono text-xs text-right', value === 'NOT SECURE' || value === 'TRIVIAL' ? 'text-[var(--c-danger)]' : 'text-[var(--c-text)]')}>
        {value}
      </dd>
    </div>
  )
}
