import type { CipherMetadata } from '@/crypto/types/CryptoTypes'

interface CipherModuleProps {
  meta: CipherMetadata
  index: number
  state?: 'idle' | 'active' | 'passed'
}

/**
 * A single pipeline stage — one cipher rendered as a laboratory component.
 * In Step 2 this becomes clickable/inspectable and shows data flowing through
 * it; here it establishes the visual language of a pipeline module.
 */
export function CipherModule({ meta, index, state = 'idle' }: CipherModuleProps) {
  const border =
    state === 'active'
      ? 'border-[rgb(var(--c-core))] shadow-[0_0_24px_rgba(94,234,212,0.25)]'
      : state === 'passed'
        ? 'border-[rgba(94,234,212,0.3)]'
        : 'border-[var(--c-border)]'

  return (
    <div
      role="group"
      aria-label={`${meta.name} stage`}
      className={`glass-panel relative flex min-w-[150px] flex-col items-center gap-2 px-4 py-5 text-center transition-colors ${border}`}
    >
      <span className="mono-label absolute left-2.5 top-2 text-[0.5rem] text-[var(--c-text-faint)]">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span
        className="h-2 w-2 rounded-full"
        style={{
          background: state === 'idle' ? 'var(--c-text-faint)' : 'rgb(var(--c-core))',
          boxShadow: state === 'active' ? '0 0 8px rgba(94,234,212,0.9)' : 'none',
        }}
      />
      <span className="mono-label !tracking-[0.12em] text-[0.62rem] font-medium text-[var(--c-text)]">
        {meta.name.toUpperCase()}
      </span>
      <span className="mono-label !text-[0.5rem] normal-case tracking-normal text-[var(--c-text-faint)]">
        {meta.family} {meta.requiresKey ? '· keyed' : '· keyless'}
      </span>
    </div>
  )
}
