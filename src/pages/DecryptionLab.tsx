import { useState } from 'react'
import { Unlock, KeyRound, RotateCcw } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Panel } from '@/components/ui/Panel'
import { EngineNotice } from '@/components/laboratory/EngineNotice'
import { Toggle } from '@/components/ui/Toggle'
import { PipelineViz } from '@/components/laboratory/PipelineViz'
import { CIPHER_REGISTRY } from '@/crypto/algorithms/registry'
import type { CipherId } from '@/crypto/types/CryptoTypes'

/**
 * DECRYPTION LAB (shell).
 * Reverse of encryption — reverse pipeline orientation, key emphasised.
 */
export function DecryptionLab() {
  const [ciphertext, setCiphertext] = useState('XQWW XQ YU LZW AFZYAWY')
  const [key, setKey] = useState('')
  const [cipher, setCipher] = useState<CipherId>('caesar')
  const [reveal, setReveal] = useState(false)

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="MODULE 02 // DECRYPTION"
        title="Decryption Laboratory"
        sub="Reverse the transformation and understand why the key matters. Without the right key, the reverse is meaningless."
      />

      <EngineNotice text="The reverse-transformation engine connects here in Step 2." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel label="CIPHERTEXT" className="lg:col-span-2">
          <textarea
            value={ciphertext}
            onChange={(e) => setCiphertext(e.target.value)}
            aria-label="Ciphertext input"
            rows={4}
            className="w-full resize-none rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-3 font-mono text-sm leading-relaxed text-[var(--c-text)] outline-none transition-colors focus:border-[rgb(var(--c-core))]"
          />
          <p className="mono-label mt-2 !text-[0.55rem] text-[var(--c-text-faint)]">
            NOTE · SAMPLE CIPHERTEXT FOR DEMONSTRATION ONLY — NOT PRODUCED BY THIS APP
          </p>
        </Panel>

        <Panel label="SECRET KEY">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--c-text-dim)]">
              <KeyRound size={15} className="text-[rgb(var(--c-core))]" />
              <span className="text-xs">A wrong key yields garbage — the key is the whole point.</span>
            </div>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              aria-label="Secret key"
              className="w-full rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2.5 font-mono text-sm text-[var(--c-text)] outline-none transition-colors focus:border-[rgb(var(--c-core))]"
              placeholder="e.g. LABKEY"
            />
            <div className="flex items-center gap-2 text-[var(--c-text-dim)]">
              <Unlock size={15} className="text-[var(--c-text-faint)]" />
              <span className="text-xs">Correct key → original plaintext reappears.</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel label="CIPHER" title="Select the transformation to reverse">
        <div className="flex flex-wrap gap-2">
          {CIPHER_REGISTRY.map((c) => (
            <button
              key={c.id}
              onClick={() => setCipher(c.id)}
              aria-pressed={cipher === c.id}
              className={
                cipher === c.id
                  ? 'rounded-full border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.1)] px-3.5 py-1.5 text-xs font-medium text-[var(--c-text)]'
                  : 'rounded-full border border-[var(--c-border)] px-3.5 py-1.5 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[var(--c-border-strong)] hover:text-[var(--c-text)]'
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      </Panel>

      {/* Reversed pipeline: ciphertext in, plaintext out */}
      <Panel label="REVERSE PIPELINE" title="Transformation path (reversed)">
        <PipelineViz
          stages={[cipher]}
          inputLabel="CIPHERTEXT"
          outputLabel="PLAINTEXT"
          activeStage={0}
        />
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--c-border)] bg-[rgba(0,0,0,0.15)] px-5 py-4">
        <div className="flex flex-wrap gap-6">
          <span className="mono-label self-center !text-[0.55rem] text-[var(--c-text-faint)]">VIEW</span>
          <Toggle label="REVEAL CHARACTERS" checked={reveal} onChange={setReveal} disabled />
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:text-[var(--c-text)]"
          aria-label="Reset"
        >
          <RotateCcw size={14} />
          RESET
        </button>
      </div>
    </div>
  )
}
