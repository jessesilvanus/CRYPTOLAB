import { useEffect, useState, type ReactNode } from 'react'
import {
  FileOutput,
  Copy,
  Check,
  Info,
  KeyRound,
  AlertTriangle,
  Binary,
  MousePointerClick,
  Search,
  Dices,
  Target,
  GraduationCap,
  Lightbulb,
  RefreshCw,
  Shield,
  Zap,
  ArrowRight,
  ArrowDown,
  Send,
  Package,
  Lock,
  Unlock,
  Network,
  Scale,
  Repeat2,
  BadgeCheck,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { Toggle } from '@/components/ui/Toggle'
import { Notice } from '@/components/laboratory/Notice'
import { CoreScene } from '@/three/scene/CoreScene'
import { useCoreState } from '@/hooks/useCoreState'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { getCipher } from '@/crypto/algorithms/registry'
import { LabControls } from '@/components/laboratory/shared/LabControls'
import { LabStepControls } from '@/components/laboratory/shared/LabStepControls'
import { SecurityPanel } from '@/components/laboratory/shared/SecurityPanel'
import {
  generateSecureOtpKey,
  hasSecureRandomness,
  otpDataLength,
  getOtpSteps,
  otpEncrypt,
  otpDecrypt,
  otpReuseLeak,
  normalizeOtpKey,
  toBinary,
  type OtpStep,
} from '@/crypto/algorithms/otp'
import { cn } from '@/utils/cn'

const DEFAULT = 'HELLO JESSE'

type Phase = 'idle' | 'processing' | 'complete'

const OTP_FLOW = ['PLAINTEXT', 'KEY', 'MODULAR ADDITION', 'MOD 26', 'CIPHERTEXT']

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
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
}

const display = (ch: string) => (ch === ' ' ? '␣' : ch)
const alphaOnly = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '')

export function OtpLab() {
  const core = useCoreState()
  const meta = getCipher('otp')

  const [plaintext, setPlaintext] = useState(DEFAULT)
  const [key, setKey] = useState(() => generateSecureOtpKey(otpDataLength(DEFAULT)))
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt')
  const [phase, setPhase] = useState<Phase>('idle')
  const [steps, setSteps] = useState<OtpStep[]>([])
  const [revealed, setRevealed] = useState(0)
  const [cursor, setCursor] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState('')
  const [stepMode, setStepMode] = useState(false)
  const [slow, setSlow] = useState(false)
  const [math, setMath] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const dataLen = otpDataLength(plaintext)
  const keyLen = normalizeOtpKey(key).length
  const keyMismatch = dataLen !== keyLen

  useEffect(() => {
    if (stepMode || phase !== 'processing') return
    if (revealed >= steps.length) {
      setPhase('complete')
      core.setSuccess()
      return
    }
    const t = window.setTimeout(() => setRevealed((c) => c + 1), slow ? 750 : 220)
    return () => window.clearTimeout(t)
  }, [stepMode, phase, revealed, steps, slow, core])

  const reset = () => {
    setPlaintext(DEFAULT)
    setKey(generateSecureOtpKey(otpDataLength(DEFAULT)))
    setMode('encrypt')
    setPhase('idle')
    setSteps([])
    setRevealed(0)
    setCursor(0)
    setSelected(null)
    setResult('')
    setStepMode(false)
    setSlow(false)
    setMath(false)
    setNotice(null)
    setCopied(false)
    core.setIdle()
  }

  const genKey = () => {
    setKey(generateSecureOtpKey(dataLen))
    setPhase('idle')
  }

  const run = () => {
    if (plaintext.length === 0) {
      setNotice('Enter some plaintext.')
      core.setError()
      return
    }
    if (keyLen === 0) {
      setNotice('The key needs at least one letter.')
      core.setError()
      return
    }
    if (keyMismatch) {
      setNotice(
        `INVALID OTP KEY — this message needs ${dataLen} data letters, but the key has ${keyLen}. An OTP key must be at least as long as the message; it is never repeated.`,
      )
      core.setError()
      return
    }
    const s = getOtpSteps(plaintext, key, mode)
    if (!s.some((x) => x.status === 'transformed')) {
      setNotice('No alphabetic characters found.')
      core.setError()
      return
    }
    setNotice(null)
    setSteps(s)
    setRevealed(0)
    setCursor(0)
    setSelected(null)
    setResult(mode === 'encrypt' ? otpEncrypt(plaintext, key) : otpDecrypt(plaintext, key))
    setPhase('processing')
    core.setProcessing()
  }

  const process = () => {
    if (cursor >= steps.length) return
    setRevealed((c) => Math.max(c, cursor + 1))
  }
  const next = () => {
    const n = cursor + 1
    setCursor(n)
    if (n >= steps.length) {
      setPhase('complete')
      core.setSuccess()
    }
  }

  const activeIdx = steps.length ? (stepMode ? cursor : Math.max(0, revealed - 1)) : -1
  const active = steps.length && activeIdx >= 0 ? steps[activeIdx] : null
  const inspected = selected != null ? steps[selected] ?? null : active
  const inspectedIdx = selected != null ? selected : activeIdx
  const statusLabel =
    phase === 'complete' ? 'TRANSFORMATION COMPLETE' : phase === 'processing' ? 'PAD APPLYING' : 'STANDBY'

  const copy = async () => {
    if (!result) return
    const ok = await copyText(result)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } else setNotice('Clipboard unavailable.')
  }

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel label={mode === 'encrypt' ? 'PLAINTEXT' : 'CIPHERTEXT'}>
          <textarea
            value={plaintext}
            onChange={(e) => {
              setPlaintext(e.target.value)
              setPhase('idle')
              setSelected(null)
            }}
            aria-label="Message input"
            rows={4}
            className="w-full resize-none rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-3 font-mono text-sm leading-relaxed text-[var(--c-text)] outline-none transition-colors focus:border-[rgb(var(--c-core))]"
            placeholder="Type the message…"
          />
          <p className="mono-label mt-2 !text-[0.55rem] text-[var(--c-text-faint)]">
            {plaintext.length} CHARS · {dataLen} DATA LETTERS · REQUIRED KEY LENGTH {dataLen}
          </p>
        </Panel>

        <Panel
          label="RANDOM OTP KEY"
          title="Truly random · length = message"
          actions={
            hasSecureRandomness() ? (
              <span className="flex items-center gap-1.5 text-[0.55rem] text-[rgb(var(--c-core))]">
                <BadgeCheck size={13} /> SECURE RANDOMNESS SOURCE
              </span>
            ) : (
              <KeyRound size={16} className="text-[rgb(var(--c-core))]" />
            )
          }
        >
          <textarea
            value={key}
            onChange={(e) => {
              setKey(e.target.value)
              setPhase('idle')
              setSelected(null)
            }}
            aria-label="OTP key"
            rows={4}
            className="w-full resize-none rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-3 font-mono text-sm leading-relaxed text-[rgb(var(--c-core))] uppercase outline-none transition-colors focus:border-[rgb(var(--c-core))]"
            placeholder="Truly random key, same length as the message…"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={genKey}
              className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--c-core))] px-4 py-2 text-[0.62rem] font-medium text-[rgb(var(--c-core))] transition-colors hover:bg-[rgba(94,234,212,0.1)]"
            >
              <Dices size={13} /> GENERATE RANDOM OTP KEY
            </button>
            <span
              className={cn(
                'mono-label text-[0.55rem]',
                keyMismatch ? 'text-[var(--c-danger)]' : 'text-[var(--c-text-faint)]',
              )}
            >
              {keyLen} / {dataLen} LETTERS{keyMismatch ? ' — MISMATCH' : ' ✓'}
            </span>
          </div>
        </Panel>
      </div>

      <KeyLengthPanel dataLen={dataLen} keyLen={keyLen} mismatch={keyMismatch} />
      <KeyReuseWarning />

      <div className="flex flex-wrap items-center gap-3">
        <Toggle
          label={mode === 'encrypt' ? 'ENCRYPT' : 'DECRYPT'}
          checked={mode === 'decrypt'}
          onChange={(v) => setMode(v ? 'decrypt' : 'encrypt')}
        />
      </div>
      <LabControls
        onEncrypt={run}
        onReset={reset}
        encryptLabel={mode === 'encrypt' ? 'ENCRYPT' : 'DECRYPT'}
        step={stepMode}
        slow={slow}
        math={math}
        onStep={setStepMode}
        onSlow={setSlow}
        onMath={setMath}
      />

      {notice && <Notice message={notice} tone="error" />}

      {/* Core + aligned pad */}
      <Panel
        label="ONE-TIME PAD CORE"
        title={statusLabel}
        actions={
          <span className="flex items-center gap-2 text-[0.6rem] text-[var(--c-text-faint)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--c-core))] shadow-[0_0_6px_rgba(94,234,212,0.8)]" />
            {stepMode ? 'STEP MODE' : 'AUTO'}
          </span>
        }
      >
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <CoreScene state={core.state} className="h-48 md:h-56" fallbackLabel="OTP" />
          <div className="space-y-3">
            <PadAlignment
              steps={steps}
              revealed={revealed}
              activeIdx={activeIdx}
              selected={selected}
              onSelect={setSelected}
            />
            <p className="flex items-center gap-2 text-xs text-[var(--c-text-faint)]">
              <MousePointerClick size={14} className="text-[rgb(var(--c-core))]" />
              One plaintext character + one unique key character = one ciphertext character. Click one to inspect it.
            </p>
          </div>
        </div>
      </Panel>

      {/* Character transformation flow */}
      <CharacterFlow step={inspected} index={inspectedIdx} mode={mode} total={steps.length} />

      {/* Step-by-step */}
      {stepMode && steps.length > 0 && (
        <Panel label="STEP BY STEP" title="Walk through each character">
          <LabStepControls
            total={steps.length}
            revealedCount={revealed}
            cursor={cursor}
            caption={
              active && active.status === 'transformed'
                ? `${active.plain} + ${active.key} = ${active.cipher} (one-time use)`
                : active
                  ? `${display(active.plain)} → unchanged (not a letter)`
                  : null
            }
            onProcess={process}
            onNext={next}
          />
        </Panel>
      )}

      {/* Mathematics */}
      {math && inspected && inspected.status === 'transformed' && (
        <Panel
          label="MATHEMATICS"
          title="Addition + binary, one character at a time"
          actions={<Binary size={16} className="text-[rgb(var(--c-core))]" />}
        >
          <OtMath step={inspected} mode={mode} />
        </Panel>
      )}

      {/* Output */}
      <Panel
        label={mode === 'encrypt' ? 'CIPHERTEXT' : 'PLAINTEXT'}
        title="Output"
        actions={
          result ? (
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] px-3 py-1.5 text-[0.62rem] text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-[rgb(var(--c-core))]" /> COPIED
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
        {result ? (
          <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-4 font-mono text-sm leading-relaxed text-[rgb(var(--c-core))] break-words">
            {result}
          </div>
        ) : (
          <EmptyOutput />
        )}
        {result && phase === 'complete' && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--c-text-dim)]">
            <span className="font-mono text-[var(--c-text)]">{plaintext || ' '}</span>
            <ArrowRight size={13} className="text-[rgb(var(--c-core))]" />
            <span className="mono-label !text-[0.55rem]">RANDOM OTP KEY</span>
            <ArrowRight size={13} className="text-[rgb(var(--c-core))]" />
            <span className="font-mono text-[rgb(var(--c-core))]">{result}</span>
          </div>
        )}
      </Panel>

      {/* Perfect secrecy */}
      <PerfectSecrecyDemo />
      <SecurityConditions />
      <KeyReuseDemo />
      <OtpVsVigenere />
      <SecurityRating />
      <SecuritySimulator />
      <KeyDistribution />
      <IsThisRandom />
      <LearnOtp />

      {/* Mini challenge */}
      <OtpChallenge />

      {/* About */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <OtpAbout />
        <SecurityPanel meta={meta} />
      </div>
      <TheoreticalVsPractical />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Key length education                                                */
/* ------------------------------------------------------------------ */

function KeyLengthPanel({ dataLen, keyLen, mismatch }: { dataLen: number; keyLen: number; mismatch: boolean }) {
  if (!mismatch) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.05)] px-4 py-3">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
        <div>
          <p className="mono-label !text-[0.6rem] font-semibold text-[rgb(var(--c-core))]">
            KEY LENGTH MATCHES THE MESSAGE
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--c-text-dim)]">
            {keyLen} letters of key for {dataLen} data letters — every key letter is used exactly once.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.07)] px-4 py-3">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--c-danger)]" />
      <div>
        <p className="mono-label !text-[0.6rem] font-semibold text-[var(--c-danger)]">INVALID OTP KEY</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--c-text-dim)]">
          An OTP key must be <span className="text-[var(--c-text)]">at least as long as the plaintext</span> and is{' '}
          <span className="text-[var(--c-text)]">never repeated</span> like a Vigenère keyword. You have {keyLen}{' '}
          letters of key for {dataLen} letters of message — a key that short would cycle and lose the one-time property.
        </p>
      </div>
    </div>
  )
}

function KeyReuseWarning() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.07)] px-4 py-3">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--c-danger)]" />
      <div>
        <p className="mono-label !text-[0.6rem] font-semibold text-[var(--c-danger)]">
          KEY REUSE DESTROYS OTP SECURITY
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--c-text-dim)]">
          A fresh, random key of the same length is required for every message — never reuse, never repeat.
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Aligned pad (clickable)                                             */
/* ------------------------------------------------------------------ */

function PadAlignment({
  steps,
  revealed,
  activeIdx,
  selected,
  onSelect,
}: {
  steps: OtpStep[]
  revealed: number
  activeIdx: number
  selected: number | null
  onSelect: (i: number | null) => void
}) {
  if (steps.length === 0) {
    return <p className="text-xs text-[var(--c-text-faint)]">Run the transform to align the key under the message.</p>
  }
  return (
    <div className="space-y-1 overflow-x-auto pb-1">
      <OtpRow label="KEY" steps={steps} field="key" revealed={revealed} activeIdx={activeIdx} selected={selected} onSelect={onSelect} color="text-[rgb(var(--c-core))]" />
      <OtpRow label="PT" steps={steps} field="plain" revealed={revealed} activeIdx={activeIdx} selected={selected} onSelect={onSelect} color="text-[var(--c-text)]" />
      <OtpRow label="CT" steps={steps} field="cipher" revealed={revealed} activeIdx={activeIdx} selected={selected} onSelect={onSelect} color="text-[var(--c-text)]" />
    </div>
  )
}

function OtpRow({
  label,
  steps,
  field,
  revealed,
  activeIdx,
  selected,
  onSelect,
  color,
}: {
  label: string
  steps: OtpStep[]
  field: 'key' | 'plain' | 'cipher'
  revealed: number
  activeIdx: number
  selected: number | null
  onSelect: (i: number | null) => void
  color: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="mono-label w-7 shrink-0 text-right !text-[0.5rem] text-[var(--c-text-faint)]">{label}</span>
      <div className="flex flex-wrap gap-1">
        {steps.map((s, i) => {
          const isActive = i === activeIdx
          const isSel = i === selected
          const shown = field === 'cipher' ? i < revealed && s.status === 'transformed' : s.status === 'transformed'
          const val = field === 'key' ? s.key : field === 'plain' ? s.plain : s.cipher
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(isSel ? null : i)}
              className={cn(
                'grid h-8 min-w-8 place-items-center rounded border px-1 font-mono text-sm transition-colors',
                isSel
                  ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.16)]'
                  : isActive && 'animate-pulse border-[var(--c-accent)] bg-[rgba(251,191,36,0.1)]',
                !isSel && !isActive && 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)]',
                shown ? color : 'opacity-30',
              )}
            >
              {s.status === 'transformed' ? display(val) : display(s.plain)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Animated character flow                                             */
/* ------------------------------------------------------------------ */

function CharacterFlow({
  step,
  index,
  mode,
  total,
}: {
  step: OtpStep | null
  index: number | null
  mode: 'encrypt' | 'decrypt'
  total: number
}) {
  const reduced = useReducedMotion()
  const [stage, setStage] = useState(0)

  useEffect(() => {
    setStage(0)
    if (reduced) {
      setStage(OTP_FLOW.length)
      return
    }
    let cancelled = false
    const timers: number[] = []
    for (let i = 1; i <= OTP_FLOW.length; i++) timers.push(window.setTimeout(() => !cancelled && setStage(i), i * 500))
    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [index, reduced])

  if (!step) {
    return (
      <Panel label="OTP KEY INSPECTOR" title="Click a character to inspect it">
        <p className="flex items-center gap-2 text-xs text-[var(--c-text-faint)]">
          <SearchIcon />
          {total === 0
            ? 'Run the transform, then click any character to walk through its one-time arithmetic.'
            : 'Click any character above to inspect its one-time arithmetic.'}
        </p>
      </Panel>
    )
  }
  const op = mode === 'encrypt' ? '+' : '−'
  const chain: Array<{ label: string; body: ReactNode }> = [
    {
      label: mode === 'encrypt' ? 'PLAINTEXT' : 'CIPHERTEXT',
      body: step.status === 'transformed' ? (
        <p className="font-mono text-sm text-[var(--c-text)]">
          {step.plain} = <span className="text-[rgb(var(--c-core))]">{step.pVal}</span>
        </p>
      ) : (
        <p className="font-mono text-sm text-[var(--c-text-faint)]">not a letter — passes through</p>
      ),
    },
    {
      label: 'KEY',
      body: step.status === 'transformed' ? (
        <p className="font-mono text-sm text-[var(--c-text)]">
          {step.key} = <span className="text-[rgb(var(--c-core))]">{step.kVal}</span>
        </p>
      ) : (
        <p className="font-mono text-sm text-[var(--c-text-faint)]">no key consumed</p>
      ),
    },
    {
      label: 'MODULAR ADDITION',
      body: step.status === 'transformed' ? (
        <p className="font-mono text-sm text-[var(--c-text)]">
          {step.pVal} {op} {step.kVal} = <span className="text-[rgb(var(--c-core))]">{step.intermediate}</span>
        </p>
      ) : null,
    },
    {
      label: 'MOD 26',
      body: step.status === 'transformed' ? (
        <p className="font-mono text-sm text-[var(--c-text)]">
          {step.intermediate} mod 26 = <span className="text-[rgb(var(--c-core))]">{step.cipherVal}</span>
        </p>
      ) : null,
    },
    {
      label: mode === 'encrypt' ? 'CIPHERTEXT' : 'PLAINTEXT',
      body: step.status === 'transformed' ? (
        <p className="font-mono text-sm text-[var(--c-text)]">
          {step.cipherVal} → <span className="text-lg text-[rgb(var(--c-core))]">{step.cipher}</span>
        </p>
      ) : (
        <p className="font-mono text-sm text-[var(--c-text)]">
          → <span className="text-lg text-[var(--c-text)]">{display(step.plain)}</span>
        </p>
      ),
    },
  ]

  return (
    <Panel
      label="OTP TRANSFORMATION ENGINE"
      title={`CHARACTER ${index == null ? '—' : index + 1}/${total}`}
      actions={
        <span className="flex items-center gap-2">
          <span className="flex gap-1.5">
            {OTP_FLOW.map((_, i) => (
              <span
                key={i}
                className={cn('h-1.5 w-4 rounded-full', i < stage ? 'bg-[rgb(var(--c-core))]' : 'bg-[rgba(148,163,184,0.2)]')}
              />
            ))}
          </span>
          <span className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">
            {mode === 'encrypt' ? 'C = P + K' : 'P = C − K'}
          </span>
        </span>
      }
    >
      <div className="grid gap-2 sm:grid-cols-5">
        {chain.map((c, i) => (
          <div
            key={i}
            className={cn(
              'rounded-md border px-3 py-2.5',
              i <= stage ? 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)]' : 'border-[rgba(148,163,184,0.1)] opacity-40',
            )}
          >
            <p className="mono-label !text-[0.45rem] text-[var(--c-text-faint)]">{c.label}</p>
            <div className="mt-1">{c.body}</div>
          </div>
        ))}
      </div>
      {step.status === 'transformed' && (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(94,234,212,0.04)] px-3 py-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
          <Lightbulb size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
          Key letter <span className="font-mono text-[rgb(var(--c-core))]">{step.key}</span> is used{' '}
          <span className="text-[var(--c-text)]">exactly once</span> for this character and nowhere else in the message —
          that one-time, same-length, random key is what produces perfect secrecy.
        </p>
      )}
    </Panel>
  )
}

function SearchIcon() {
  return <Search size={14} className="text-[rgb(var(--c-core))]" />
}

/* ------------------------------------------------------------------ */
/* Math + binary                                                       */
/* ------------------------------------------------------------------ */

function OtMath({ step, mode }: { step: OtpStep; mode: 'encrypt' | 'decrypt' }) {
  const op = mode === 'encrypt' ? '+' : '−'
  const plainBin = toBinary(step.plain)[0]
  const keyBin = toBinary(step.key)[0]
  const cipherBin = toBinary(step.cipher)[0]
  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="space-y-1 text-[var(--c-text)]">
        <p>PLAINTEXT {step.plain} = {step.pVal}</p>
        <p>KEY {step.key} = {step.kVal}</p>
        <p>{step.pVal} {op} {step.kVal} = {step.intermediate}</p>
        <p>
          {step.intermediate} mod 26 = {step.cipherVal} ={' '}
          <span className="text-[rgb(var(--c-core))]">{step.cipher}</span>
        </p>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-3">
        <Bin label="PLAINTEXT" value={step.plain} bits={plainBin} />
        <Bin label="KEY" value={step.key} bits={keyBin} />
        <Bin label="CIPHERTEXT" value={step.cipher} bits={cipherBin} />
      </div>
      <p className="flex items-start gap-2 text-[0.62rem] text-[var(--c-text-faint)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
        In a binary OTP the same idea uses XOR: C = P ⊕ K. Either way, the key letter is used exactly once.
      </p>
    </div>
  )
}

function Bin({ label, value, bits }: { label: string; value: string; bits: string }) {
  return (
    <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-2 text-center">
      <p className="mono-label !text-[0.5rem]">{label} · {display(value)}</p>
      <p className="mt-1 break-all tracking-[0.15em] text-[rgb(var(--c-core))]">{bits}</p>
    </div>
  )
}

function EmptyOutput() {
  return (
    <div className="grid place-items-center rounded-md border border-dashed border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <FileOutput size={18} className="text-[var(--c-text-faint)]" />
        <p className="text-xs text-[var(--c-text-faint)]">Run the transform to produce the output.</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Perfect secrecy demo                                                */
/* ------------------------------------------------------------------ */

function PerfectSecrecyDemo() {
  const [p1, setP1] = useState('HELLO')
  const [p2, setP2] = useState('WORLD')
  const [demo, setDemo] = useState(() => makeDemo('HELLO', 'WORLD'))

  function makeDemo(a: string, b: string) {
    const A = alphaOnly(a)
    const B = alphaOnly(b)
    const n = Math.min(A.length, B.length)
    const k1 = generateSecureOtpKey(n)
    let ct = ''
    let k2 = ''
    for (let i = 0; i < n; i++) {
      const c = (A.charCodeAt(i) - 65 + k1.charCodeAt(i) - 65) % 26
      ct += String.fromCharCode(65 + c)
      const kk = ((c - (B.charCodeAt(i) - 65) + 26) % 26)
      k2 += String.fromCharCode(65 + kk)
    }
    return { A, B, k1, k2, ct }
  }

  const regen = () => setDemo(makeDemo(p1, p2))

  return (
    <Panel
      label="PERFECT SECRECY LAB"
      title="One ciphertext, many possible plaintexts"
      actions={<Scale size={16} className="text-[rgb(var(--c-core))]" />}
    >
      <p className="text-xs leading-relaxed text-[var(--c-text-dim)]">
        With a <span className="text-[var(--c-text)]">random, same-length, single-use</span> key, the same ciphertext
        can be produced from <span className="text-[var(--c-text)]">different plaintexts under different keys</span>.
        Seeing the ciphertext alone tells you nothing about which plaintext is correct — that is perfect secrecy.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <MsgInput label="PLAINTEXT A" value={p1} onChange={setP1} />
        <MsgInput label="PLAINTEXT B" value={p2} onChange={setP2} />
      </div>
      <button
        onClick={regen}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] px-3 py-1.5 text-[0.6rem] text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
      >
        <RefreshCw size={12} /> NEW RANDOM KEYS
      </button>

      <div className="mt-4 grid gap-2 font-mono text-xs sm:grid-cols-2">
        <DemoRow title="PLAINTEXT A" ct={demo.ct} p={demo.A} k={demo.k1} tone="text-[var(--c-text)]" keyTone="text-[rgb(var(--c-core))]" />
        <DemoRow title="PLAINTEXT B" ct={demo.ct} p={demo.B} k={demo.k2} tone="text-[var(--c-accent)]" keyTone="text-[var(--c-accent)]" />
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.04)] px-3 py-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <ShieldCheck size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
        Both produce the identical ciphertext <span className="font-mono text-[rgb(var(--c-core))]">{demo.ct}</span>. An
        attacker cannot tell which plaintext is real — the ciphertext carries no information about the plaintext.
      </p>
    </Panel>
  )
}

function MsgInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2 font-mono text-sm uppercase text-[var(--c-text)] outline-none focus:border-[rgb(var(--c-core))]"
      />
    </div>
  )
}

function DemoRow({
  title,
  p,
  k,
  ct,
  tone,
  keyTone,
}: {
  title: string
  p: string
  k: string
  ct: string
  tone: string
  keyTone: string
}) {
  return (
    <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
      <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">{title}</p>
      <p className="mt-1.5 text-[var(--c-text)]">{p}</p>
      <p className={cn('mt-0.5', keyTone)}>{k}</p>
      <p className="mt-0.5 text-[var(--c-text-faint)]">↓</p>
      <p className={cn('mt-0.5 text-[rgb(var(--c-core))]', tone)}>{ct}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Security conditions checklist                                       */
/* ------------------------------------------------------------------ */

const OTP_CONDITIONS = [
  'Key is truly random',
  'Key is at least as long as the plaintext',
  'Key is kept secret',
  'Key is used only once',
  'Key is never reused',
  'Key is securely distributed',
  'Key is securely destroyed after use',
]
const CONDITION_WHY = [
  'A predictable key lets an attacker guess or compute it.',
  'If the key is shorter than the message, it must repeat — and repetition leaks structure.',
  'If the key is leaked, the ciphertext can be read.',
  'Using a key on more than one message lets an attacker cancel the key.',
  'Reuse across messages is the classic fatal flaw of OTP.',
  'Delivering the key itself securely is the hardest practical problem.',
  'Leftover pads can be stolen and used to recover past or future traffic.',
]

function SecurityConditions() {
  const [checked, setChecked] = useState<boolean[]>(() => OTP_CONDITIONS.map(() => true))
  const all = checked.every(Boolean)
  const toggle = (i: number) => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))
  return (
    <Panel
      label="OTP SECURITY CONDITIONS"
      title="What a true one-time pad requires"
      actions={all ? <ShieldCheck size={16} className="text-[rgb(var(--c-core))]" /> : <ShieldAlert size={16} className="text-[var(--c-danger)]" />}
    >
      <div className={cn('mb-3 rounded-md border px-3 py-2 text-[0.62rem] font-semibold', all ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)] text-[rgb(var(--c-core))]' : 'border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.06)] text-[var(--c-danger)]')}>
        {all ? 'ALL CONDITIONS SATISFIED · PERFECT SECRECY' : 'A CONDITION IS VIOLATED · SECURITY DEGRADES'}
      </div>
      <div className="space-y-1.5">
        {OTP_CONDITIONS.map((cond, i) => (
          <button
            key={cond}
            type="button"
            onClick={() => toggle(i)}
            className="flex w-full items-start gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2 text-left transition-colors hover:bg-[rgba(94,234,212,0.04)]"
          >
            <span
              className={cn(
                'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border font-mono text-[0.6rem]',
                checked[i] ? 'border-[rgb(var(--c-core))] bg-[rgb(var(--c-core))] text-[#04110f]' : 'border-[var(--c-border)] text-transparent',
              )}
            >
              ✓
            </span>
            <span className="min-w-0">
              <span className={cn('text-xs font-medium', checked[i] ? 'text-[var(--c-text)]' : 'text-[var(--c-text-dim)]')}>{cond}</span>
              <span className="block text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">{CONDITION_WHY[i]}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <Lightbulb size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
        Click each condition to see why it matters. Toggle any of them off to watch the security claim collapse.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Key reuse attack demo                                               */
/* ------------------------------------------------------------------ */

function KeyReuseDemo() {
  const [m1, setM1] = useState('ATTACK')
  const [m2, setM2] = useState('DEFEND')
  const [rkey, setRkey] = useState('TIGERX')
  const leak = otpReuseLeak(m1, m2, rkey)
  return (
    <Panel
      label="NEVER REUSE THE PAD"
      title="Why reusing the key leaks information"
      actions={<Repeat2 size={16} className="text-[var(--c-danger)]" />}
    >
      <p className="mb-3 text-xs leading-relaxed text-[var(--c-text-dim)]">
        Encrypt two messages with the <span className="text-[var(--c-text)]">same key</span>. Because C = P ⊕ K, an
        attacker who has both ciphertexts can do:
      </p>
      <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3 font-mono text-xs">
        <p className="text-[var(--c-text)]">C1 ⊕ C2 = (P1 ⊕ K) ⊕ (P2 ⊕ K)</p>
        <p className="my-1 text-[var(--c-text-faint)]">the two K copies cancel:</p>
        <p className="text-[var(--c-text)]">C1 ⊕ C2 = P1 ⊕ P2</p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <DemoBox label="MESSAGE A" value={m1} onChange={setM1} />
        <DemoBox label="MESSAGE B" value={m2} onChange={setM2} />
        <DemoBox label="REUSED KEY" value={rkey} onChange={setRkey} accent />
      </div>

      {/* KEY CANCELS visual chain */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3 font-mono text-xs">
        <span className="rounded border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-2 py-1 text-[var(--c-text)]">C1</span>
        <span className="text-[var(--c-accent)]">⊕</span>
        <span className="rounded border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-2 py-1 text-[var(--c-text)]">C2</span>
        <ArrowRight size={12} className="text-[var(--c-text-faint)]" />
        <span className="rounded border border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.08)] px-2 py-1 text-[var(--c-danger)]">KEY CANCELS</span>
        <ArrowRight size={12} className="text-[var(--c-text-faint)]" />
        <span className="rounded border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-2 py-1 text-[var(--c-text)]">P1 ⊕ P2</span>
      </div>

      <div className="mt-2 rounded-md border border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.07)] p-3 font-mono text-xs">
        <p className="mono-label !text-[0.55rem] text-[var(--c-danger)]">P1 ⊕ P2 (the key is gone — attacker wins)</p>
        <p className="mt-1 break-words text-[rgb(var(--c-core))]">{leak}</p>
      </div>
    </Panel>
  )
}

function DemoBox({ label, value, onChange, accent }: { label: string; value: string; onChange: (v: string) => void; accent?: boolean }) {
  return (
    <div>
      <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'mt-1 w-full rounded-md border bg-[rgba(0,0,0,0.25)] px-3 py-2 font-mono text-sm uppercase outline-none transition-colors',
          accent
            ? 'border-[rgba(94,234,212,0.4)] text-[rgb(var(--c-core))] focus:border-[rgb(var(--c-core))]'
            : 'border-[var(--c-border)] text-[var(--c-text)] focus:border-[rgb(var(--c-core))]',
        )}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* OTP vs Vigenère                                                     */
/* ------------------------------------------------------------------ */

function OtpVsVigenere() {
  return (
    <Panel label="OTP vs VIGENÈRE" title="Two superficially similar, fundamentally different ciphers" actions={<Zap size={15} className="text-[var(--c-accent)]" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[var(--c-accent)]">VIGENÈRE</p>
          <p className="mt-2 font-mono text-sm tracking-wider text-[var(--c-text)]">LEMONLEMONLE…</p>
          <p className="mt-1 font-mono text-xs text-[var(--c-text-faint)]">key repeats cyclically</p>
          <div className="mt-2 flex items-center gap-2 text-[0.6rem]">
            <ArrowDown size={12} className="text-[var(--c-text-faint)]" />
            <span className="text-[var(--c-accent)]">PATTERNS CAN EMERGE</span>
          </div>
        </div>
        <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.05)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">ONE-TIME PAD</p>
          <p className="mt-2 font-mono text-sm tracking-wider text-[var(--c-text)]">XMCKLVYQAZ…</p>
          <p className="mt-1 font-mono text-xs text-[var(--c-text-faint)]">key never repeats, random, same length</p>
          <div className="mt-2 flex items-center gap-2 text-[0.6rem]">
            <ArrowDown size={12} className="text-[var(--c-text-faint)]" />
            <span className="text-[rgb(var(--c-core))]">UNDER CORRECT CONDITIONS · PERFECT SECRECY</span>
          </div>
        </div>
      </div>
      <p className="mt-3 flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
        Vigenère uses a repeating keyword that reintroduces structure. OTP replaces it with fresh randomness every time —
        the shift never repeats, which is exactly why OTP is special.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Conditional security rating                                         */
/* ------------------------------------------------------------------ */

function SecurityRating() {
  return (
    <Panel label="SECURITY RATING" title="Theoretical vs practical — not a simple score" actions={<Shield size={16} className="text-[var(--c-accent)]" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.05)] p-4">
          <p className="mono-label !text-[0.55rem] text-[rgb(var(--c-core))]">THEORETICAL SECURITY</p>
          <p className="mt-2 font-mono text-xl tracking-tight text-[var(--c-accent)]">★★★★★</p>
          <p className="mt-1 font-mono !text-[0.55rem] font-semibold text-[rgb(var(--c-core))]">PERFECT SECRECY</p>
          <p className="mt-2 text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">
            When the strict requirements are met, the ciphertext reveals nothing about the plaintext.
          </p>
        </div>
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-4">
          <p className="mono-label !text-[0.55rem] text-[var(--c-accent)]">PRACTICAL DEPLOYMENT</p>
          <p className="mt-2 font-mono text-xl tracking-tight text-[var(--c-accent)]">★★☆☆☆</p>
          <p className="mt-1 font-mono !text-[0.55rem] font-semibold text-[var(--c-accent)]">DIFFICULT KEY MANAGEMENT</p>
          <p className="mt-2 text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">
            Generating, distributing, protecting, and destroying keys as long as the messages is hard at scale.
          </p>
        </div>
      </div>
      <p className="mt-3 flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
        OTP is theoretically capable of perfect secrecy, but in practice the key-management burden makes it unsuitable
        for normal modern communication.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Security failure simulator                                          */
/* ------------------------------------------------------------------ */

const SIM_ITEMS = [
  { key: 'Random key', fail: 'SECURITY PROPERTY NO LONGER GUARANTEED' },
  { key: 'Key length = message length', fail: 'KEY WOULD REPEAT · STRUCTURE LEAKS' },
  { key: 'Key used once', fail: 'SECURITY COMPROMISED' },
  { key: 'Key kept secret', fail: 'CIPHERTEXT CAN BE READ' },
] as const

function SecuritySimulator() {
  const [flags, setFlags] = useState<boolean[]>([true, true, true, true])
  const toggle = (i: number) => setFlags((f) => f.map((v, j) => (j === i ? !v : v)))
  const all = flags.every(Boolean)
  const failing = SIM_ITEMS.filter((_, i) => !flags[i])
  return (
    <Panel
      label="BREAK THE OTP"
      title="Security failure simulator — experiment safely"
      actions={<Target size={15} className="text-[rgb(var(--c-core))]" />}
    >
      <div className="space-y-1.5">
        {SIM_ITEMS.map((it, i) => (
          <button
            key={it.key}
            type="button"
            onClick={() => toggle(i)}
            className="flex w-full items-center gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2 text-left transition-colors hover:bg-[rgba(94,234,212,0.04)]"
          >
            <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded border text-[0.6rem]', flags[i] ? 'border-[rgb(var(--c-core))] bg-[rgb(var(--c-core))] text-[#04110f]' : 'border-[var(--c-border)]')}>
              {flags[i] ? '✓' : ''}
            </span>
            <span className="flex-1 text-xs font-medium text-[var(--c-text)]">{it.key}</span>
            {!flags[i] && <span className="mono-label !text-[0.5rem] text-[var(--c-danger)]">OFF</span>}
          </button>
        ))}
      </div>
      <div
        className={cn(
          'mt-3 rounded-md border px-3 py-2 text-[0.62rem] font-semibold',
          all
            ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)] text-[rgb(var(--c-core))]'
            : 'border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.06)] text-[var(--c-danger)]',
        )}
      >
        {all ? 'SECURITY STATUS · PERFECT SECRECY CONDITIONS SATISFIED' : failing.map((f) => f.fail).join(' · ')}
      </div>
      <p className="mt-2 text-[0.62rem] leading-relaxed text-[var(--c-text-faint)]">
        Toggle the conditions off to see how each one alone destroys the OTP guarantee.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Key distribution                                                    */
/* ------------------------------------------------------------------ */

const DIST_STEPS = [
  { label: 'SENDER', icon: Send },
  { label: 'SECRET PAD', icon: Package, secret: true },
  { label: 'ENCRYPTION', icon: Lock },
  { label: 'CIPHERTEXT', icon: FileOutput },
  { label: 'INSECURE CHANNEL', icon: Network, warn: true },
  { label: 'DECRYPTION', icon: Unlock },
  { label: 'RECEIVER', icon: Package },
]

function KeyDistribution() {
  return (
    <Panel label="KEY MANAGEMENT" title="How a pad travels between two parties" actions={<Network size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="flex flex-wrap items-center gap-2">
        {DIST_STEPS.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex min-w-24 flex-col items-center gap-1 rounded-md border px-3 py-2',
                  s.secret && 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.08)]',
                  s.warn && 'border-[rgba(251,191,36,0.4)] bg-[rgba(251,191,36,0.05)]',
                  !s.secret && !s.warn && 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)]',
                )}
              >
                <Icon size={14} className={cn(s.secret ? 'text-[rgb(var(--c-core))]' : s.warn ? 'text-[var(--c-accent)]' : 'text-[var(--c-text-dim)]')} />
                <span className="mono-label !text-[0.45rem] text-center text-[var(--c-text-dim)]">{s.label}</span>
              </div>
              {i < DIST_STEPS.length - 1 && <ArrowRight size={13} className="shrink-0 text-[var(--c-text-faint)]" />}
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-[rgba(251,191,36,0.4)] bg-[rgba(251,191,36,0.05)] px-4 py-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
        <div>
          <p className="mono-label !text-[0.6rem] font-semibold text-[var(--c-accent)]">KEY DISTRIBUTION PROBLEM</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--c-text-dim)]">
            The sender and receiver must <span className="text-[var(--c-text)]">already possess the same secret pad</span> before
            any encrypted message can be sent. Delivering a pad as long as every message — securely — is why OTP is
            impractical at large scale.
          </p>
        </div>
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Is this really random?                                              */
/* ------------------------------------------------------------------ */

function IsThisRandom() {
  const secure = hasSecureRandomness()
  const [sample, setSample] = useState(() => generateSecureOtpKey(40))
  return (
    <Panel
      label="IS THIS REALLY RANDOM?"
      title="Appearance is not proof of randomness"
      actions={
        secure ? (
          <span className="flex items-center gap-1.5 text-[0.55rem] text-[rgb(var(--c-core))]">
            <BadgeCheck size={13} /> SECURE RANDOMNESS SOURCE
          </span>
        ) : (
          <Info size={15} className="text-[var(--c-text-faint)]" />
        )
      }
    >
      <p className="font-mono text-lg tracking-[0.2em] break-all text-[rgb(var(--c-core))]">{sample}</p>
      <button
        onClick={() => setSample(generateSecureOtpKey(40))}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] px-3 py-1.5 text-[0.6rem] text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
      >
        <Dices size={12} /> RESAMPLE
      </button>
      <p className="mt-3 flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
        This looks random, but that <span className="text-[var(--c-text)]">visual impression alone cannot prove
        randomness</span>. A secure OTP key must be generated from a suitable randomness source. Where a browser
        cryptographic API is available, the lab uses{' '}
        <span className="text-[var(--c-text)]">crypto.getRandomValues</span> for key generation.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Learning mode                                                       */
/* ------------------------------------------------------------------ */

const OTP_LEARN = [
  { n: '01', title: 'What is OTP?', body: 'A cipher whose key is truly random, as long as the message, and used only once.' },
  { n: '02', title: 'Key vs password', body: 'A password is reusable and short. An OTP key is random, message-length, and single-use.' },
  { n: '03', title: 'Random key generation', body: 'Keys must come from a secure randomness source — appearance alone cannot prove randomness.' },
  { n: '04', title: 'A=0 mapping', body: 'A=0, B=1, … Z=25. Letters become numbers we can add and wrap with mod 26.' },
  { n: '05', title: 'Encryption', body: 'C = (P + K) mod 26 — add the plaintext and key values, then wrap.' },
  { n: '06', title: 'Decryption', body: 'P = (C − K + 26) mod 26 — subtract the key and wrap back into a letter.' },
  { n: '07', title: 'Key length', body: 'The key must be at least as long as the plaintext, or it would have to repeat.' },
  { n: '08', title: 'One-time usage', body: 'Every message needs a brand-new key. Reuse is fatal.' },
  { n: '09', title: 'Perfect secrecy', body: 'With a correct key, the ciphertext reveals nothing about the plaintext.' },
  { n: '10', title: 'Key reuse attack', body: 'C1 ⊕ C2 = P1 ⊕ P2 — a reused key cancels out and leaks the plaintexts.' },
  { n: '11', title: 'Key distribution', body: 'Delivering same-length secret keys between parties is the hard part.' },
  { n: '12', title: 'OTP vs Vigenère', body: 'Vigenère repeats a keyword; OTP uses fresh random key material every time.' },
]

function LearnOtp() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <Panel label="LEARN ONE-TIME PAD" title="Twelve steps to perfect secrecy" actions={<GraduationCap size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="space-y-1.5">
        {OTP_LEARN.map((s, i) => (
          <div key={s.n} className="overflow-hidden rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)]">
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[rgba(94,234,212,0.04)]"
            >
              <span className="mono-label !text-[0.5rem] font-semibold text-[rgb(var(--c-core))]">{s.n}</span>
              <span className="flex-1 text-xs font-medium text-[var(--c-text)]">{s.title}</span>
              <ArrowDown size={12} className={cn('text-[var(--c-text-faint)] transition-transform', open === i && 'rotate-180')} />
            </button>
            {open === i && (
              <div className="border-t border-[var(--c-border)] px-3 py-2.5">
                <p className="text-[0.68rem] leading-relaxed text-[var(--c-text-dim)]">{s.body}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Mini challenge                                                      */
/* ------------------------------------------------------------------ */

function OtpChallenge() {
  const [c1, setC1] = useState<Challenge1>(() => makeC1())
  const [picked1, setPicked1] = useState<string | null>(null)
  const [picked2, setPicked2] = useState<string | null>(null)

  function newC1() {
    setC1(makeC1())
    setPicked1(null)
  }

  const p = c1.pV
  const k = c1.kV
  const correct1 = picked1 !== null && picked1 === c1.correct

  const q2 = [
    { t: 'A', label: 'Key is repeated' },
    { t: 'B', label: 'Key is as long as the message and used only once' },
    { t: 'C', label: 'No key is required' },
    { t: 'D', label: 'Same shift is used everywhere' },
  ]
  const correct2 = picked2 === 'B'

  return (
    <Panel label="OTP CHALLENGE" title="Check what you have learned" actions={<Target size={15} className="text-[rgb(var(--c-core))]" />}>
      <div className="space-y-5">
        <div>
          <p className="mono-label !text-[0.55rem] text-[var(--c-text-faint)]">CHALLENGE 1 · COMPUTE THE CIPHERTEXT</p>
          <p className="mt-1 text-sm text-[var(--c-text)]">
            PLAINTEXT <span className="font-mono text-lg text-[rgb(var(--c-core))]">{c1.plain}</span> · KEY{' '}
            <span className="font-mono text-lg text-[var(--c-accent)]">{c1.key}</span>
          </p>
          <p className="mt-1 font-mono text-[0.7rem] text-[var(--c-text-dim)]">
            {c1.plain} = {p} · {c1.key} = {k} · ({p} + {k}) mod 26
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {c1.options.map((o) => {
              const isPick = o === picked1
              const isCorrect = o === c1.correct
              return (
                <button
                  key={o}
                  type="button"
                  disabled={picked1 !== null}
                  onClick={() => setPicked1(o)}
                  className={cn(
                    'rounded-md border px-3 py-2 font-mono text-sm transition-all',
                    picked1 === null && 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] text-[var(--c-text)] hover:border-[rgb(var(--c-core))]',
                    picked1 !== null && isCorrect && 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.12)] text-[rgb(var(--c-core))]',
                    picked1 !== null && isPick && !isCorrect && 'border-[var(--c-danger)] bg-[rgba(248,113,113,0.12)] text-[var(--c-danger)]',
                    picked1 !== null && !isPick && !isCorrect && 'border-[var(--c-border)] bg-[rgba(0,0,0,0.15)] text-[var(--c-text-faint)]',
                  )}
                >
                  {o}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[0.62rem] text-[var(--c-text-dim)]">
              {picked1 === null
                ? 'Pick the correct ciphertext.'
                : correct1
                  ? `CORRECT — (${p} + ${k}) mod 26 = ${(p + k) % 26} = ${c1.correct}.`
                  : `NOT QUITE — (${p} + ${k}) mod 26 = ${(p + k) % 26} = ${c1.correct}.`}
            </p>
            <button
              type="button"
              onClick={newC1}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] px-3 py-1 text-[0.6rem] text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
            >
              <RefreshCw size={12} /> NEW
            </button>
          </div>
        </div>

        <div>
          <p className="mono-label !text-[0.55rem] text-[var(--c-text-faint)]">CHALLENGE 2 · THE KEY IDEA</p>
          <p className="mt-1 text-sm text-[var(--c-text)]">Which rule makes OTP different from Vigenère?</p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {q2.map((o) => {
              const isPick = picked2 === o.t
              const isCorrect = o.t === 'B'
              return (
                <button
                  key={o.t}
                  type="button"
                  disabled={picked2 !== null}
                  onClick={() => setPicked2(o.t)}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-all',
                    picked2 === null && 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] text-[var(--c-text)] hover:border-[rgb(var(--c-core))]',
                    picked2 !== null && isCorrect && 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.12)] text-[rgb(var(--c-core))]',
                    picked2 !== null && isPick && !isCorrect && 'border-[var(--c-danger)] bg-[rgba(248,113,113,0.12)] text-[var(--c-danger)]',
                    picked2 !== null && !isPick && !isCorrect && 'border-[var(--c-border)] bg-[rgba(0,0,0,0.15)] text-[var(--c-text-faint)]',
                  )}
                >
                  <span className="font-mono font-semibold">{o.t}</span>
                  <span>{o.label}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[0.62rem] text-[var(--c-text-dim)]">
            {picked2 === null
              ? 'Pick your answer.'
              : correct2
                ? 'CORRECT — the key is as long as the message and used only once, so it never repeats.'
                : 'NOT QUITE — the defining property is a random key as long as the message, used only once (answer B).'}
          </p>
        </div>
      </div>
    </Panel>
  )
}

interface Challenge1 {
  plain: string
  key: string
  pV: number
  kV: number
  correct: string
  options: string[]
}

function makeC1(): Challenge1 {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const plain = letters[Math.floor(Math.random() * 26)]
  const key = letters[Math.floor(Math.random() * 26)]
  const p = letters.indexOf(plain)
  const k = letters.indexOf(key)
  const correct = letters[(p + k) % 26]
  const opts = new Set<string>([correct])
  for (const a of [letters[(p + k + 1) % 26], letters[(p + k + 5) % 26], letters[(p - k + 26) % 26]]) {
    if (opts.size < 4) opts.add(a)
  }
  return { plain, key, pV: p, kV: k, correct, options: [...opts].sort(() => Math.random() - 0.5) }
}

/* ------------------------------------------------------------------ */
/* About / theory                                                      */
/* ------------------------------------------------------------------ */

function OtpAbout() {
  return (
    <Panel label="ABOUT" title="One-Time Pad">
      <p className="text-sm leading-relaxed text-[var(--c-text-dim)]">
        The One-Time Pad is a Vigenère-like cipher whose key is{' '}
        <span className="text-[var(--c-text)]">truly random, exactly as long as the message, and used only
        once</span>. Under those conditions it achieves <span className="text-[rgb(var(--c-core))]">theoretical
        perfect secrecy</span>: the ciphertext reveals nothing about the plaintext.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-[var(--c-text-faint)]">
        Its weakness is practical, not mathematical — generating, securely distributing, and never reusing such
        keys is extremely hard.
      </p>
    </Panel>
  )
}

function TheoreticalVsPractical() {
  return (
    <Panel label="THEORY vs PRACTICE" title="Why perfect secrecy is not the same as practical security">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.05)] p-4">
          <p className="mono-label !text-[0.55rem] text-[rgb(var(--c-core))]">THEORETICALLY</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--c-text-dim)]">
            With a truly random, same-length, single-use key, every plaintext is equally likely given the
            ciphertext — this is perfect secrecy.
          </p>
        </div>
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-4">
          <p className="mono-label !text-[0.55rem] text-[var(--c-accent)]">PRACTICALLY</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--c-text-dim)]">
            Generating true randomness, distributing keys securely, and guaranteeing each key is used only once
            make OTP impractical for normal modern communication.
          </p>
        </div>
      </div>
    </Panel>
  )
}
