import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowRight } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { SecurityRating } from '@/components/laboratory/SecurityRating'
import type { CipherMetadata } from '@/crypto/types/CryptoTypes'

/** Reusable SECURITY ANALYSIS panel for any cipher. */
export function SecurityPanel({ meta }: { meta?: CipherMetadata }) {
  return (
    <Panel
      label="SECURITY ANALYSIS"
      title="Security diagnostic"
      actions={<ShieldAlert size={16} className="text-[var(--c-accent)]" />}
    >
      {meta && <SecurityRating profile={meta.security} name={meta.name.toUpperCase()} />}
      <Link
        to="/attack"
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
      >
        EXPLORE IN ATTACK LAB
        <ArrowRight size={13} />
      </Link>
    </Panel>
  )
}
