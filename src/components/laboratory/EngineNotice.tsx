import { FlaskConical } from 'lucide-react'

/**
 * Honest status banner shown wherever a module depends on the Step-2 crypto
 * engine. We never pretend placeholder output is real cryptography.
 */
export function EngineNotice({ text }: { text?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[var(--c-border)] bg-[rgba(94,234,212,0.04)] p-4">
      <FlaskConical size={18} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" aria-hidden="true" />
      <div className="text-xs leading-relaxed text-[var(--c-text-dim)]">
        <span className="mono-label block !text-[0.55rem] text-[rgb(var(--c-core))]">ENGINE · STEP 2</span>
        {text ?? 'The interactive engine for this module arrives in Step 2. The laboratory shell is ready to connect.'}
      </div>
    </div>
  )
}
