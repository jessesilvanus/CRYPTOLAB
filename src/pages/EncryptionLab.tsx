import { useEffect, useState } from 'react'
import {
  Lock,
  Cpu,
  FileOutput,
  Copy,
  Check,
  RotateCcw,
  ArrowRight,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Panel } from '@/components/ui/Panel'
import { Toggle } from '@/components/ui/Toggle'
import { EngineNotice } from '@/components/laboratory/EngineNotice'
import { Notice } from '@/components/laboratory/Notice'
import { CoreScene } from '@/three/scene/CoreScene'
import { useCoreState } from '@/hooks/useCoreState'
import { getCipherAlgorithm } from '@/crypto/algorithms'
import { getCipher } from '@/crypto/algorithms/registry'
import { validateMonoKey, MONO_DEFAULT_KEY } from '@/crypto/algorithms/monoalphabetic'
import type { CipherId } from '@/crypto/types/CryptoTypes'
import type { CipherKey, TransformationStep } from '@/crypto/types/CipherAlgorithm'
import { CipherSelector } from '@/components/laboratory/CipherSelector'
import { SecurityPanel } from '@/components/laboratory/shared/SecurityPanel'
import { CaesarShiftInput } from '@/components/laboratory/caesar/CaesarShiftInput'
import { CharacterTransformation } from '@/components/laboratory/caesar/CharacterTransformation'
import { CharacterInspector } from '@/components/laboratory/caesar/CharacterInspector'
import { MathView } from '@/components/laboratory/caesar/MathView'
import { CaesarAlphabet } from '@/components/laboratory/caesar/CaesarAlphabet'
import { StepControls } from '@/components/laboratory/caesar/StepControls'
import { MonoKeyInput } from '@/components/laboratory/mono/MonoKeyInput'
import { MonoAlphabet } from '@/components/laboratory/mono/MonoAlphabet'
import { FrequencyPreview } from '@/components/laboratory/mono/FrequencyPreview'
import { MonoEducation } from '@/components/laboratory/mono/MonoEducation'
import { PlayfairLab } from '@/components/laboratory/playfair/PlayfairLab'
import { HillLab } from '@/components/laboratory/hill/HillLab'
import { VigenereLab } from '@/components/laboratory/vigenere/VigenereLab'
import { OtpLab } from '@/components/laboratory/otp/OtpLab'

const DEFAULT_PLAINTEXT = 'HELLO JESSE'

/** Ciphers that render their own dedicated laboratory instead of the generic flow. */
const DEDICATED: CipherId[] = ['playfair', 'hill', 'vigenere', 'otp']

function DedicatedCipherLab({ cipher }: { cipher: CipherId }) {
  switch (cipher) {
    case 'playfair':
      return <PlayfairLab />
    case 'hill':
      return <HillLab />
    case 'vigenere':
      return <VigenereLab />
    case 'otp':
      return <OtpLab />
    default:
      return null
  }
}

/** Default key for each implemented cipher. */
function defaultKeyFor(cipher: CipherId): CipherKey {
  if (cipher === 'caesar') return 3
  if (cipher === 'monoalphabetic') return MONO_DEFAULT_KEY
  return ''
}

type Phase = 'idle' | 'ready' | 'input-detected' | 'processing' | 'complete'

const STATUS_LABEL: Record<Phase, string> = {
  idle: 'STANDBY',
  ready: 'READY',
  'input-detected': 'INPUT DETECTED',
  processing: 'TRANSFORMING',
  complete: 'TRANSFORMATION COMPLETE',
}

/**
 * ENCRYPTION LAB — cipher-driven (Caesar 2A, Monoalphabetic 2C).
 *
 * Full educational workflow: plaintext → key → ENCRYPT → the 3D core processes
 * each character → ciphertext. Shared machinery (character grid, step-by-step,
 * slow motion, mathematics, inspector, output, copy, reset, 3D core) is reused
 * by every cipher; only the key input and alphabet view dispatch per cipher.
 */
export function EncryptionLab() {
  const core = useCoreState()

  const [plaintext, setPlaintext] = useState(DEFAULT_PLAINTEXT)
  const [key, setKey] = useState<CipherKey>(defaultKeyFor('caesar'))
  const [cipher, setCipher] = useState<CipherId>('caesar')
  const [phase, setPhase] = useState<Phase>('idle')
  const [steps, setSteps] = useState<TransformationStep[]>([])
  const [revealedCount, setRevealedCount] = useState(0)
  const [cursor, setCursor] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [ciphertext, setCiphertext] = useState('')
  const [mode, setMode] = useState<'auto' | 'step'>('auto')
  const [slowMotion, setSlowMotion] = useState(false)
  const [showMath, setShowMath] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const algorithm = getCipherAlgorithm(cipher)
  const isActive = Boolean(algorithm)
  const meta = getCipher(cipher)
  const isCaesar = cipher === 'caesar'
  const isMono = cipher === 'monoalphabetic'
  const isDedicated = DEDICATED.includes(cipher)
  const keyType = algorithm?.keyType ?? 'none'
  const shift = typeof key === 'number' ? key : 0
  const keyString = typeof key === 'string' ? key : ''

  // ---- Auto-play: reveal one character per tick while processing ----
  useEffect(() => {
    if (mode !== 'auto' || phase !== 'processing') return
    if (revealedCount >= steps.length) {
      setPhase('complete')
      core.setSuccess()
      return
    }
    const t = window.setTimeout(() => setRevealedCount((c) => c + 1), slowMotion ? 820 : 220)
    return () => window.clearTimeout(t)
  }, [mode, phase, revealedCount, steps, slowMotion, core])

  // Reset run state whenever the inputs that define the transformation change.
  const invalidateRun = () => {
    setPhase('idle')
    setSteps([])
    setRevealedCount(0)
    setCursor(0)
    setCiphertext('')
    setNotice(null)
    core.setIdle()
  }

  const runEncryption = () => {
    if (!algorithm) return
    if (plaintext.length === 0) {
      setNotice('Enter some plaintext to encrypt.')
      core.setError()
      return
    }
    if (keyType === 'string') {
      const validation = validateMonoKey(keyString)
      if (!validation.valid) {
        setNotice(validation.message)
        core.setError()
        return
      }
    }

    const s = algorithm.getSteps(plaintext, key, 'encrypt')
    if (!s.some((st) => st.status === 'transformed')) {
      setNotice('No alphabetic characters found — nothing to transform.')
      setSteps(s)
      setRevealedCount(s.length)
      setCiphertext(algorithm.encrypt(plaintext, key))
      setPhase('complete')
      core.setSuccess()
      return
    }

    setNotice(null)
    setSteps(s)
    setRevealedCount(0)
    setCursor(0)
    setSelectedIndex(null)
    setCiphertext(algorithm.encrypt(plaintext, key))
    setPhase('input-detected')
    core.setProcessing()
    // Enter the processing phase shortly after (feels like the core engaging).
    window.setTimeout(() => setPhase((p) => (p === 'input-detected' ? 'processing' : p)), 420)
  }

  const handleProcess = () => {
    if (cursor >= steps.length) return
    setRevealedCount((c) => Math.min(steps.length, c + 1))
  }

  const handleNext = () => {
    const next = cursor + 1
    setCursor(next)
    if (next >= steps.length) {
      setPhase('complete')
      core.setSuccess()
    }
  }

  const reset = () => {
    setPlaintext(DEFAULT_PLAINTEXT)
    setKey(defaultKeyFor(cipher))
    setPhase('idle')
    setSteps([])
    setRevealedCount(0)
    setCursor(0)
    setSelectedIndex(null)
    setCiphertext('')
    setMode('auto')
    setSlowMotion(false)
    setShowMath(false)
    setNotice(null)
    setCopied(false)
    core.setIdle()
  }

  const copy = async () => {
    if (!ciphertext) return
    const fallback = () => {
      const ta = document.createElement('textarea')
      ta.value = ciphertext
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      let ok = false
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
      document.body.removeChild(ta)
      return ok
    }
    let ok = false
    try {
      await navigator.clipboard.writeText(ciphertext)
      ok = true
    } catch {
      ok = fallback()
    }
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } else {
      setNotice('Clipboard unavailable — select the text manually.')
    }
  }

  const selectedStep = selectedIndex != null ? steps[selectedIndex] ?? null : null
  const mathStep = selectedStep ?? (revealedCount > 0 ? steps[revealedCount - 1] : null)
  const highlightValue = selectedStep?.originalValue ?? null

  const activeIndex = mode === 'auto' && phase === 'processing' ? revealedCount : -1
  const statusLabel = STATUS_LABEL[phase]

  return (
    <div className="space-y-6">
      <SectionHeading
        kicker="MODULE 01 // ENCRYPTION"
        title="Encryption Laboratory"
        sub="Transform plaintext into ciphertext and observe every stage. Caesar and Monoalphabetic Substitution are fully operational."
      />

      {/* Cipher selector — VTU CORE / EXTENDED */}
      <Panel label="CIPHER" title="Select the transformation" actions={<Cpu size={16} className="text-[var(--c-text-faint)]" />}>
        <CipherSelector
          value={cipher}
          onChange={(id) => {
            setCipher(id)
            setKey(defaultKeyFor(id))
            invalidateRun()
          }}
        />
        <p className="mono-label mt-3 !text-[0.55rem] text-[var(--c-text-faint)]">
          {isActive ? `${meta?.name.toUpperCase()} · VTU CORE · ACTIVE` : 'ENGINE PENDING · THIS CIPHER ARRIVES IN A LATER STEP'}
        </p>
      </Panel>

      {!isActive ? (
        <EngineNotice text="Only the VTU CORE classical ciphers are implemented in this step. The remaining entries arrive in a later step." />
      ) : isDedicated ? (
        <DedicatedCipherLab cipher={cipher} />
      ) : (
        <>
          {/* Inputs */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Panel label="PLAINTEXT">
              <textarea
                value={plaintext}
                onChange={(e) => {
                  setPlaintext(e.target.value)
                  invalidateRun()
                }}
                aria-label="Plaintext input"
                rows={5}
                className="w-full resize-none rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-3 font-mono text-sm leading-relaxed text-[var(--c-text)] outline-none transition-colors focus:border-[rgb(var(--c-core))]"
                placeholder="Type the message to encrypt…"
              />
              <p className="mono-label mt-2 !text-[0.55rem] text-[var(--c-text-faint)]">
                {plaintext.length} CHARS · {plaintext.replace(/\s/g, '').length} DATA CHARS
              </p>
            </Panel>

            <Panel label="KEY" title={meta?.name ?? 'Key'}>
              {keyType === 'shift' ? (
                <CaesarShiftInput value={shift} onChange={(n) => { setKey(n); invalidateRun() }} />
              ) : keyType === 'string' ? (
                <MonoKeyInput value={keyString} onChange={(k) => { setKey(k); invalidateRun() }} />
              ) : (
                <p className="text-sm text-[var(--c-text-dim)]">This cipher requires no key.</p>
              )}
            </Panel>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runEncryption}
              disabled={!isActive}
              className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--c-core))] px-6 py-2.5 text-xs font-semibold text-[#04110f] shadow-[0_0_22px_rgba(94,234,212,0.35)] transition-transform hover:scale-[1.02] disabled:opacity-40"
            >
              <Lock size={14} />
              ENCRYPT
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-5 py-2.5 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[var(--c-border-strong)] hover:text-[var(--c-text)]"
            >
              <RotateCcw size={14} />
              RESET
            </button>
            <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-3">
              <Toggle label="STEP BY STEP" checked={mode === 'step'} onChange={(v) => setMode(v ? 'step' : 'auto')} />
              <Toggle label="SLOW MOTION" checked={slowMotion} onChange={setSlowMotion} />
              <Toggle label="SHOW MATHEMATICS" checked={showMath} onChange={setShowMath} />
            </div>
          </div>

          <AnimatePresence>{notice && <Notice message={notice} tone="error" />}</AnimatePresence>

          {/* Status + 3D core */}
          <Panel
            label="CIPHER CORE"
            title={statusLabel}
            actions={
              <span className="flex items-center gap-2 text-[0.6rem] text-[var(--c-text-faint)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--c-core))] shadow-[0_0_6px_rgba(94,234,212,0.8)]" />
                {mode === 'step' ? 'STEP MODE' : 'AUTO'}
              </span>
            }
          >
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <CoreScene state={core.state} className="h-52 md:h-64" fallbackLabel={meta?.id.toUpperCase() ?? 'CORE'} />
              <div className="space-y-3">
                <CharacterTransformation
                  steps={steps}
                  revealedCount={revealedCount}
                  activeIndex={activeIndex}
                  selectedIndex={selectedIndex}
                  onSelect={setSelectedIndex}
                />
                {steps.length === 0 && (
                  <p className="text-center text-xs text-[var(--c-text-faint)]">
                    Press ENCRYPT to send the characters through the core.
                  </p>
                )}
              </div>
            </div>
          </Panel>

          {/* Step-by-step controls */}
          {mode === 'step' && steps.length > 0 && (
            <Panel label="STEP BY STEP" title="Manual walkthrough">
              <StepControls
                steps={steps}
                cursor={cursor}
                revealedCount={revealedCount}
                onProcess={handleProcess}
                onNext={handleNext}
              />
            </Panel>
          )}

          {/* Inspector + alphabet */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Panel label="CHARACTER TRANSFORMATION" title="Inspector">
              <CharacterInspector step={selectedStep} variant={isMono ? 'substitution' : 'shift'} />
            </Panel>
            <Panel label="ALPHABET" title={`${meta?.name ?? 'Cipher'} mapping`}>
              {isCaesar ? (
                <CaesarAlphabet shift={shift} highlightValue={highlightValue} />
              ) : isMono ? (
                <MonoAlphabet keyString={keyString} highlightIndex={highlightValue} />
              ) : null}
            </Panel>
          </div>

          {/* Frequency analysis preview (monoalphabetic) */}
          {isMono && (
            <Panel label="FREQUENCY ANALYSIS" title="Why frequency analysis works">
              <FrequencyPreview text={ciphertext || plaintext} />
            </Panel>
          )}

          <AnimatePresence>
            {showMath && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <Panel label="MATHEMATICS" title="The transformation, step by step">
                  <MathView step={mathStep} />
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ciphertext output */}
          <Panel
            label="CIPHERTEXT"
            title="Output"
            actions={
              ciphertext ? (
                <button
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] px-3 py-1.5 text-[0.62rem] text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
                >
                  {copied ? (
                    <>
                      <Check size={12} className="text-[rgb(var(--c-core))]" /> COPIED TO CLIPBOARD
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> COPY
                    </>
                  )}
                </button>
              ) : undefined
            }
          >
            {ciphertext ? (
              <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-4 font-mono text-sm leading-relaxed text-[rgb(var(--c-core))] break-words">
                {ciphertext}
              </div>
            ) : (
              <div className="grid place-items-center rounded-md border border-dashed border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-8">
                <div className="flex flex-col items-center gap-2 text-center">
                  <FileOutput size={18} className="text-[var(--c-text-faint)]" />
                  <p className="text-xs text-[var(--c-text-faint)]">
                    Press <span className="text-[var(--c-text)]">ENCRYPT</span> to produce the ciphertext.
                  </p>
                </div>
              </div>
            )}

            {/* Input → output comparison */}
            {ciphertext && phase === 'complete' && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--c-text-dim)]">
                <span className="font-mono text-[var(--c-text)]">{plaintext || ' '}</span>
                <ArrowRight size={13} className="text-[rgb(var(--c-core))]" />
                <span className="mono-label !text-[0.55rem]">
                  {isCaesar ? `KEY = ${shift}` : 'SUBSTITUTION KEY'}
                </span>
                <ArrowRight size={13} className="text-[rgb(var(--c-core))]" />
                <span className="font-mono text-[rgb(var(--c-core))]">{ciphertext}</span>
              </div>
            )}
          </Panel>
        </>
      )}

      {/* Educational panels (dedicated ciphers render their own) */}
      {!isDedicated &&
        (isMono ? (
          <MonoEducation />
        ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel label="ABOUT" title={meta?.name ?? 'Cipher'}>
            <p className="text-sm leading-relaxed text-[var(--c-text-dim)]">{meta?.description}</p>
            <div className="mt-4 space-y-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3 font-mono text-sm">
              <p className="text-[var(--c-text)]">
                Encryption: <span className="text-[rgb(var(--c-core))]">C = (P + K) mod 26</span>
              </p>
              <p className="text-[var(--c-text)]">
                Decryption: <span className="text-[rgb(var(--c-core))]">P = (C − K) mod 26</span>
              </p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--c-text-faint)]">
              The cipher is named after Julius Caesar, who is traditionally associated with using a
              shift cipher for military communication.
            </p>
          </Panel>

          <SecurityPanel meta={meta} />
        </div>
      ))}
    </div>
  )
}
