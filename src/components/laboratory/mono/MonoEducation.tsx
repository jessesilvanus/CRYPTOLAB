import { Link2, AlertTriangle, ArrowRight } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'

/**
 * Monoalphabetic education — About, why-it-is-weak (repeated letters), and a
 * Caesar comparison. Pure educational content that reuses the catalog metadata.
 */
export function MonoEducation() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* About */}
      <Panel label="ABOUT" title="Monoalphabetic Substitution">
        <p className="text-sm leading-relaxed text-[var(--c-text-dim)]">
          A monoalphabetic substitution cipher uses one fixed substitution alphabet for the entire
          message. Each plaintext letter is replaced by one ciphertext letter.
        </p>
        <div className="mt-4 space-y-3 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3 text-xs leading-relaxed">
          <div className="flex items-start gap-2 text-[var(--c-text-dim)]">
            <Link2 size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
            <span>
              <span className="text-[var(--c-text)]">Caesar:</span> every letter is shifted by the same
              amount.
            </span>
          </div>
          <div className="flex items-start gap-2 text-[var(--c-text-dim)]">
            <Link2 size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
            <span>
              <span className="text-[var(--c-text)]">Monoalphabetic:</span> every letter can map to a
              different letter.
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[var(--c-text-faint)]">
          But once the mapping is chosen, A always maps to the same ciphertext letter — creating
          patterns that attackers can analyse.
        </p>
      </Panel>

      {/* Why it is weak — repeated letters */}
      <Panel
        label="WHY IS IT WEAK?"
        title="The statistical structure survives"
        actions={<AlertTriangle size={16} className="text-[var(--c-accent)]" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3 text-center">
              <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">PLAINTEXT</p>
              <p className="font-mono text-xl tracking-[0.2em] text-[var(--c-text)]">
                H<span className="text-[var(--c-accent)]">LL</span>O
              </p>
              <p className="mono-label mt-2 !text-[0.5rem] text-[var(--c-text-faint)]">
                REPEATED: L L
              </p>
            </div>
            <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3 text-center">
              <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">CIPHERTEXT</p>
              <p className="font-mono text-xl tracking-[0.2em] text-[rgb(var(--c-core))]">
                I<span className="text-[var(--c-accent)]">SS</span>G
              </p>
              <p className="mono-label mt-2 !text-[0.5rem] text-[var(--c-text-faint)]">
                STILL REPEATED: S S
              </p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-[var(--c-text-dim)]">
            The letters changed, but the repeated-letter structure did not. This is why frequency
            analysis can attack monoalphabetic substitution.
          </p>
        </div>
      </Panel>

      {/* Comparison with Caesar */}
      <Panel label="COMPARISON" title="Caesar vs Monoalphabetic" className="lg:col-span-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ComparisonCard
            title="CAESAR"
            rows={[
              ['Mechanism', 'Fixed numerical shift'],
              ['Key space', '26'],
              ['Security', 'VERY WEAK'],
            ]}
            accent="var(--c-danger)"
          />
          <ComparisonCard
            title="MONOALPHABETIC"
            rows={[
              ['Mechanism', 'Arbitrary substitution alphabet'],
              ['Key space', '26!'],
              ['Security', 'WEAK'],
            ]}
            accent="var(--c-accent)"
          />
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[var(--c-text-dim)]">
          <ArrowRight size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
          Monoalphabetic has a vastly larger theoretical key space than Caesar, but it remains
          vulnerable to statistical attacks.
        </p>
      </Panel>
    </div>
  )
}

function ComparisonCard({
  title,
  rows,
  accent,
}: {
  title: string
  rows: Array<[string, string]>
  accent: string
}) {
  return (
    <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-4">
      <p className="mono-label !text-[0.55rem] font-semibold" style={{ color: accent }}>
        {title}
      </p>
      <dl className="mt-2 space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 text-xs">
            <dt className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">{k}</dt>
            <dd className="font-mono text-right text-[var(--c-text)]">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
