import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  ArrowDown,
  FileOutput,
  Copy,
  Check,
  Info,
  MousePointerClick,
  Dices,
  Target,
  GraduationCap,
  Lightbulb,
  RefreshCw,
  Search,
  Shield,
  Zap,
  Calculator,
  KeyRound,
  Table2,
  AlertTriangle,
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
  VIG_ALPHABET,
  normalizeVigKey,
  vigenereEncrypt,
  vigenereDecrypt,
  getVigenereSteps,
  type VigenereStep,
} from '@/crypto/algorithms/vigenere'
import { cn } from '@/utils/cn'

const DEFAULT = 'ATTACKATDAWN'
const DEFAULT_KEY = 'LEMON'

type Phase = 'idle' | 'processing' | 'complete'

const CHAIN = ['PLAINTEXT', 'KEY ALIGN', 'SHIFT VALUE', 'MODULO 26', 'CIPHERTEXT']

/** Small reusable copy helper (clipboard + execCommand fallback). */
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

export function VigenereLab() {
  const core = useCoreState()
  const meta = getCipher('vigenere')

  const [plaintext, setPlaintext] = useState(DEFAULT)
  const [keyword, setKeyword] = useState(DEFAULT_KEY)
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt')
  const [phase, setPhase] = useState<Phase>('idle')
  const [steps, setSteps] = useState<VigenereStep[]>([])
  const [revealed, setRevealed] = useState(0)
  const [cursor, setCursor] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState('')
  const [stepMode, setStepMode] = useState(false)
  const [slow, setSlow] = useState(false)
  const [math, setMath] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const keyLen = normalizeVigKey(keyword).length
  const repeatPreview = useMemo(() => normalizeVigKey(keyword).repeat(2), [keyword])

  // Auto-play: reveal one character per tick while processing.
  useEffect(() => {
    if (stepMode || phase !== 'processing') return
    if (revealed >= steps.length) {
      setPhase('complete')
      core.setSuccess()
      return
    }
    const t = window.setTimeout(() => setRevealed((c) => c + 1), slow ? 800 : 230)
    return () => window.clearTimeout(t)
  }, [stepMode, phase, revealed, steps, slow, core])

  const reset = () => {
    setPlaintext(DEFAULT)
    setKeyword(DEFAULT_KEY)
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

  const run = () => {
    if (plaintext.length === 0) {
      setNotice('Enter some plaintext.')
      core.setError()
      return
    }
    if (keyLen === 0) {
      setNotice('Enter a keyword — letters only.')
      core.setError()
      return
    }
    const s = getVigenereSteps(plaintext, keyword, mode)
    if (!s.some((x) => x.status === 'transformed')) {
      setNotice('No alphabetic characters found — nothing to transform.')
      core.setError()
      return
    }
    setNotice(null)
    setSteps(s)
    setRevealed(0)
    setCursor(0)
    setSelected(null)
    setResult(mode === 'encrypt' ? vigenereEncrypt(plaintext, keyword) : vigenereDecrypt(plaintext, keyword))
    setPhase('processing')
    core.setProcessing()
    if (stepMode) {
      setRevealed(1)
      setCursor(0)
    }
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
    phase === 'complete' ? 'KEYSTREAM COMPLETE' : phase === 'processing' ? 'KEYSTREAM ALIGNING' : 'STANDBY'

  const copy = async () => {
    if (!result) return
    const ok = await copyText(result)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } else setNotice('Clipboard unavailable — select the text manually.')
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
            {plaintext.length} CHARS · {steps.filter((s) => s.status === 'transformed').length || 0} ALIGNED
          </p>
        </Panel>

        <Panel label="KEYWORD" title="Repeated cyclically over the letters" actions={<KeyRound size={15} className="text-[var(--c-text-faint)]" />}>
          <div className="flex gap-2">
            <input
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                setPhase('idle')
                setSelected(null)
              }}
              aria-label="Keyword"
              className="w-full rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2.5 font-mono text-sm text-[var(--c-text)] uppercase outline-none transition-colors focus:border-[rgb(var(--c-core))]"
              placeholder="e.g. LEMON"
            />
            <button
              type="button"
              onClick={() => {
                setKeyword(generateVigKey())
                setPhase('idle')
                setSelected(null)
              }}
              title="Generate a random alphabetic keyword"
              aria-label="Generate a random alphabetic keyword"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--c-border)] px-3 text-[0.6rem] font-semibold text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
            >
              <Dices size={14} />
              RANDOM KEY
            </button>
          </div>
          <p className="mono-label mt-2 !text-[0.55rem] text-[var(--c-text-faint)]">
            {keyLen ? (
              <>
                KEY LENGTH {keyLen} · REPEATS AS <span className="font-mono text-[rgb(var(--c-core))]">{repeatPreview}</span>
              </>
            ) : (
              'LETTERS ONLY — SPACES & PUNCTUATION ARE IGNORED'
            )}
          </p>
        </Panel>
      </div>

      {/* Alignment rule */}
      <div className="flex items-start gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
        <span>
          <span className="text-[var(--c-text)]">Non-alphabetic characters never consume a key letter.</span> The
          keyword skips over spaces and punctuation and only advances on letters, so it stays in step with the
          alphabet stream.
        </span>
      </div>

      {/* Mode + controls */}
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

      <NoticeOrNone notice={notice} />

      {/* Core + keystream streams */}
      <Panel
        label="VIGENÈRE CORE"
        title={statusLabel}
        actions={
          <span className="flex items-center gap-2 text-[0.6rem] text-[var(--c-text-faint)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--c-core))] shadow-[0_0_6px_rgba(94,234,212,0.8)]" />
            {stepMode ? 'STEP MODE' : 'AUTO'}
          </span>
        }
      >
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <CoreScene state={core.state} className="h-48 md:h-56" fallbackLabel="VIGENÈRE" />
          <div className="space-y-4">
            <KeystreamGrid
              steps={steps}
              activeIdx={activeIdx}
              selected={selected}
              revealed={revealed}
              stepMode={stepMode}
              onSelect={setSelected}
            />
            <p className="flex items-center gap-2 text-xs text-[var(--c-text-faint)]">
              <MousePointerClick size={14} className="text-[rgb(var(--c-core))]" />
              Click a character to highlight its full stack — plaintext, key, shift and ciphertext.
            </p>
          </div>
        </div>
      </Panel>

      {/* Character flow (animated transformation) */}
      <CharFlow step={inspected} index={inspectedIdx} mode={mode} total={steps.length} />

      {/* Tabula recta */}
      <TabulaRecta step={inspected} mode={mode} />

      {/* Step-by-step */}
      {stepMode && steps.length > 0 && (
        <Panel label="STEP BY STEP" title="Walk through one character at a time">
          <LabStepControls
            total={steps.length}
            revealedCount={revealed}
            cursor={cursor}
            caption={
              active && active.status === 'transformed'
                ? `${active.plain} + ${active.key} = ${active.cipher}`
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
        <Panel label="MATHEMATICS" title="The arithmetic for one character" actions={<Calculator size={16} className="text-[rgb(var(--c-core))]" />}>
          <MathFull step={inspected} mode={mode} />
        </Panel>
      )}

      {/* Number mapping */}
      <NumberMapping step={inspected} />

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
          <EmptyOutput mode={mode} />
        )}
        {result && phase === 'complete' && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--c-text-dim)]">
            <span className="font-mono text-[var(--c-text)]">{plaintext || ' '}</span>
            <ArrowRight size={13} className="text-[rgb(var(--c-core))]" />
            <span className="mono-label !text-[0.55rem]">KEY = {normalizeVigKey(keyword)}</span>
            <ArrowRight size={13} className="text-[rgb(var(--c-core))]" />
            <span className="font-mono text-[rgb(var(--c-core))]">{result}</span>
          </div>
        )}
      </Panel>

      {/* Why Vigenère is different */}
      <WhyDifferent />

      {/* Security */}
      <VigenereSecurity />

      {/* Learning */}
      <LearnVigenere />

      {/* Mini challenge */}
      <VigenereChallenge />

      {/* About */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <VigenereAbout />
        <SecurityPanel meta={meta} />
      </div>
      <EvolutionComparison />
    </div>
  )
}

function generateVigKey(): string {
  const letters = VIG_ALPHABET.split('')
  const n = 4 + Math.floor(Math.random() * 5)
  let out = ''
  for (let i = 0; i < n; i++) out += letters[Math.floor(Math.random() * 26)]
  return out
}

/* ------------------------------------------------------------------ */
/* Keystream streams                                                   */
/* ------------------------------------------------------------------ */

function KeystreamGrid({
  steps,
  activeIdx,
  selected,
  revealed,
  stepMode,
  onSelect,
}: {
  steps: VigenereStep[]
  activeIdx: number
  selected: number | null
  revealed: number
  stepMode: boolean
  onSelect: (i: number | null) => void
}) {
  if (steps.length === 0) {
    return (
      <p className="flex items-center gap-2 text-xs text-[var(--c-text-faint)]">
        <MousePointerClick size={14} className="text-[rgb(var(--c-core))]" />
        Run the transform to align the keyword under the message.
      </p>
    )
  }
  const rowClass = 'flex'
  const cellW = 34
  const cells = (label: string, render: (s: VigenereStep, i: number) => React.ReactNode) => (
    <div className={rowClass}>
      <span className="mono-label w-20 shrink-0 !text-[0.45rem] text-[var(--c-text-faint)]">{label}</span>
      <div className="flex">
        {steps.map((s, i) => {
          const active = i === activeIdx
          const sel = i === selected
          const done = i < revealed
          const isLive = sel || (active && !stepMode)
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(isLive ? null : i)}
              style={{ width: cellW }}
              className={cn(
                'shrink-0 py-0.5 text-center font-mono text-[0.7rem] transition-colors',
                isLive
                  ? 'bg-[rgba(94,234,212,0.14)] text-[rgb(var(--c-core))]'
                  : done
                    ? 'text-[var(--c-text)]'
                    : 'text-[var(--c-text-faint)]',
              )}
            >
              {render(s, i)}
            </button>
          )
        })}
      </div>
    </div>
  )
  return (
    <div className="overflow-x-auto rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-2 py-2">
      <div className="min-w-fit space-y-0.5">
        {cells('PLAINTEXT', (s) => display(s.plain))}
        {cells('KEY', (s) => (s.status === 'transformed' ? s.key : '·'))}
        {cells('SHIFT', (s) => (s.status === 'transformed' ? s.kVal : '·'))}
        {cells('CIPHERTEXT', (s) => (s.status === 'transformed' ? s.cipher : display(s.plain)))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Character flow (animated)                                           */
/* ------------------------------------------------------------------ */

function CharFlow({
  step,
  index,
  mode,
  total,
}: {
  step: VigenereStep | null
  index: number | null
  mode: 'encrypt' | 'decrypt'
  total: number
}) {
  const reduced = useReducedMotion()
  const [stage, setStage] = useState(0)

  useEffect(() => {
    setStage(0)
    if (reduced) {
      setStage(CHAIN.length)
      return
    }
    let cancelled = false
    const timers: number[] = []
    for (let i = 1; i <= CHAIN.length; i++) timers.push(window.setTimeout(() => !cancelled && setStage(i), i * 520))
    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [index, reduced])

  if (!step) {
    return (
      <Panel label="CHARACTER INSPECTOR" title="Click a character to inspect it">
        <p className="flex items-center gap-2 text-xs text-[var(--c-text-faint)]">
          <Search size={14} className="text-[rgb(var(--c-core))]" />
          {total === 0
            ? 'Run the transform, then click any character to walk through its shift.'
            : 'Click any character in the keystream above to inspect it.'}
        </p>
      </Panel>
    )
  }
  const op = mode === 'encrypt' ? '+' : '−'
  const chain: Array<{ label: string; body: React.ReactNode }> = [
    {
      label: `PLAINTEXT · ${display(step.plain)}`,
      body: step.status === 'transformed' ? (
        <p className="font-mono text-sm text-[var(--c-text)]">
          {step.plain} = <span className="text-[rgb(var(--c-core))]">{step.pVal}</span>
        </p>
      ) : (
        <p className="font-mono text-sm text-[var(--c-text-faint)]">not a letter — passes through</p>
      ),
    },
    {
      label: `KEY ALIGN · ${step.status === 'transformed' ? step.key : '—'}`,
      body: step.status === 'transformed' ? (
        <p className="font-mono text-sm text-[var(--c-text)]">
          {step.key} = <span className="text-[rgb(var(--c-core))]">{step.kVal}</span>
        </p>
      ) : (
        <p className="font-mono text-sm text-[var(--c-text-faint)]">no key consumed</p>
      ),
    },
    {
      label: `SHIFT VALUE`,
      body: step.status === 'transformed' ? (
        <p className="font-mono text-sm text-[var(--c-text)]">
          {step.pVal} {op} {step.kVal} = <span className="text-[rgb(var(--c-core))]">{step.intermediate}</span>
        </p>
      ) : null,
    },
    {
      label: `MODULO 26`,
      body: step.status === 'transformed' ? (
        <p className="font-mono text-sm text-[var(--c-text)]">
          {step.intermediate} mod 26 = <span className="text-[rgb(var(--c-core))]">{step.cipherVal}</span>
        </p>
      ) : null,
    },
    {
      label: `CIPHERTEXT`,
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
      label="CHARACTER INSPECTOR"
      title={`CHARACTER ${index == null ? '—' : index + 1}/${total}`}
      actions={
        <span className="flex items-center gap-2">
          <span className="flex gap-1.5">
            {CHAIN.map((_, i) => (
              <span
                key={i}
                className={cn('h-1.5 w-4 rounded-full', i < stage ? 'bg-[rgb(var(--c-core))]' : 'bg-[rgba(148,163,184,0.2)]')}
              />
            ))}
          </span>
          <span className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">{mode === 'encrypt' ? 'C = P + K' : 'P = C − K'}</span>
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
          Key letter <span className="font-mono text-[rgb(var(--c-core))]">{step.key}</span> controls the shift here —
          because the keyword repeats, the shift changes with every position. That is the whole idea of Vigenère.
        </p>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Tabula recta                                                        */
/* ------------------------------------------------------------------ */

function TabulaRecta({ step, mode }: { step: VigenereStep | null; mode: 'encrypt' | 'decrypt' }) {
  const [show, setShow] = useState(false)
  const t = step && step.status === 'transformed' ? step : null
  const rowV = t ? (mode === 'encrypt' ? t.pVal : t.cipherVal) : null
  const colV = t ? t.kVal : null
  const cell = t ? (mode === 'encrypt' ? t.cipherVal : ((t.pVal % 26) + 26) % 26) : null
  const finder = (ch: string) => VIG_ALPHABET.indexOf(ch)

  return (
    <Panel
      label="TABULA RECTA"
      title="The Vigenère lookup square"
      actions={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] px-3 py-1.5 text-[0.6rem] text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
        >
          <Table2 size={13} />
          {show ? 'HIDE' : 'SHOW TABLE'}
        </button>
      }
    >
      {t && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.05)] px-3 py-2 font-mono text-sm text-[var(--c-text)]">
          {mode === 'encrypt' ? (
            <>
              PLAINTEXT <span className="text-[rgb(var(--c-core))]">{t.plain}</span> (row {rowV}) + KEY{' '}
              <span className="text-[var(--c-accent)]">{t.key}</span> (column {colV}) →{' '}
              <span className="text-[rgb(var(--c-core))]">{VIG_ALPHABET[cell!]}</span>
            </>
          ) : (
            <>
              CIPHERTEXT <span className="text-[rgb(var(--c-core))]">{t.plain}</span> (row {rowV}) + KEY{' '}
              <span className="text-[var(--c-accent)]">{t.key}</span> (column {colV}) →{' '}
              <span className="text-[rgb(var(--c-core))]">{VIG_ALPHABET[cell!]}</span>
            </>
          )}
        </div>
      )}
      {!show ? (
        <p className="flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
          <Info size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
          The tabula recta is the classic lookup instrument: pick the plaintext row, the key column, and the ciphertext
          sits at their intersection. Each row is the alphabet shifted by that row number. Select a character above,
          then press <span className="text-[var(--c-text)]">SHOW TABLE</span> to see the three values connect.
        </p>
      ) : (
        <div className="overflow-auto rounded-md border border-[var(--c-border)]">
          <table className="border-separate border-spacing-0 text-center font-mono text-[0.62rem]">
            <thead>
              <tr>
                <th className="sticky left-0 bg-[rgba(0,0,0,0.55)] p-0.5 text-[var(--c-text-faint)]" />
                {VIG_ALPHABET.split('').map((ch, c) => (
                  <th
                    key={ch}
                    className={cn('p-0.5 w-6', c === colV ? 'bg-[rgba(251,191,36,0.25)] text-[var(--c-accent)]' : 'text-[var(--c-text-faint)]')}
                  >
                    {ch}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VIG_ALPHABET.split('').map((_, r) => (
                <tr key={r}>
                  <th className={cn('sticky left-0 p-0.5', r === rowV ? 'bg-[rgba(94,234,212,0.25)] text-[rgb(var(--c-core))]' : 'bg-[rgba(0,0,0,0.55)] text-[var(--c-text-faint)]')}>
                    {VIG_ALPHABET[r]}
                  </th>
                  {VIG_ALPHABET.split('').map((_, c) => {
                    const ch = VIG_ALPHABET[(r + c) % 26]
                    const hit = r === rowV && c === colV && t
                    const rowHit = r === rowV
                    const colHit = c === colV
                    return (
                      <td
                        key={c}
                        className={cn(
                          'p-0.5 w-6',
                          hit
                            ? 'bg-[rgb(var(--c-core))] text-[#04110f] font-bold'
                            : rowHit || colHit
                              ? 'bg-[rgba(94,234,212,0.08)] text-[var(--c-text)]'
                              : 'text-[var(--c-text-dim)]',
                        )}
                      >
                        {ch}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">
        Row {finder('A')} is the plain alphabet; every row below is shifted one step. The intersection of the plaintext
        row and the key column is the ciphertext (and vice-versa for decryption).
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Math full                                                           */
/* ------------------------------------------------------------------ */

function MathFull({ step, mode }: { step: VigenereStep; mode: 'encrypt' | 'decrypt' }) {
  const op = mode === 'encrypt' ? '+' : '−'
  const formula = mode === 'encrypt' ? 'C = (P + K) mod 26' : 'P = (C − K + 26) mod 26'
  return (
    <div className="space-y-2 font-mono text-sm text-[var(--c-text)]">
      <p>
        {formula}
      </p>
      <p>
        {step.plain} = <span className="text-[rgb(var(--c-core))]">{step.pVal}</span> · KEY {step.key} ={' '}
        <span className="text-[rgb(var(--c-core))]">{step.kVal}</span>
      </p>
      <p>
        ({step.pVal} {op} {step.kVal}) mod 26
      </p>
      <p>
        = {step.intermediate} mod 26 = <span className="text-[rgb(var(--c-core))]">{step.cipherVal}</span>
      </p>
      <p>
        {step.cipherVal} = <span className="text-lg text-[rgb(var(--c-core))]">{step.cipher}</span>
      </p>
      <p className="flex items-start gap-2 border-t border-[var(--c-border)] pt-2 text-[0.62rem] text-[var(--c-text-dim)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
        The shift at each position comes from the key letter aligned above it — that is why the shift keeps changing.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Number mapping                                                      */
/* ------------------------------------------------------------------ */

function NumberMapping({ step }: { step: VigenereStep | null }) {
  const p = step && step.status === 'transformed' ? step.pVal : null
  const k = step && step.status === 'transformed' ? step.kVal : null
  return (
    <Panel label="LETTER → NUMBER MAPPING" title="A = 0 … Z = 25">
      <div className="flex flex-wrap gap-1">
        {VIG_ALPHABET.split('').map((ch, i) => {
          const onP = i === p
          const onK = i === k
          return (
            <div
              key={ch}
              className={cn(
                'flex flex-col items-center rounded-md border px-1.5 py-1',
                onP && 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.14)] text-[rgb(var(--c-core))]',
                onK && 'border-[var(--c-accent)] bg-[rgba(251,191,36,0.12)] text-[var(--c-accent)]',
                !onP && !onK && 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] text-[var(--c-text-dim)]',
              )}
            >
              <span className={cn('font-mono text-xs', onP || onK ? '' : 'text-[var(--c-text)]')}>{ch}</span>
              <span className="text-[0.5rem] text-[var(--c-text-faint)]">{String(i).padStart(2, '0')}</span>
            </div>
          )
        })}
      </div>
      {step && step.status === 'transformed' && (
        <p className="mt-3 flex items-center gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2 font-mono text-sm text-[var(--c-text)]">
          <span className="text-[rgb(var(--c-core))]">{step.plain} = {step.pVal}</span>
          <span className="text-[var(--c-text-faint)]">and</span>
          <span className="text-[var(--c-accent)]">KEY {step.key} = {step.kVal}</span>
        </p>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Why different                                                       */
/* ------------------------------------------------------------------ */

function WhyDifferent() {
  return (
    <Panel label="WHY VIGENÈRE IS DIFFERENT" title="One fixed shift vs a repeating keystream" actions={<Zap size={15} className="text-[var(--c-accent)]" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[var(--c-accent)]">CAESAR · ONE FIXED SHIFT</p>
          <p className="mt-2 font-mono text-sm tracking-wider text-[var(--c-text)]">
            H E L L O
          </p>
          <p className="font-mono text-sm tracking-wider text-[var(--c-text-faint)]">↓ ↓ ↓ ↓ ↓</p>
          <p className="font-mono text-sm tracking-wider text-[rgb(var(--c-core))]">
            K H O O R
          </p>
          <p className="mt-2 text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">
            Every letter shifts by the same amount. The pattern repeats instantly — easy to break.
          </p>
        </div>
        <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.05)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">VIGENÈRE · REPEATING KEYSTREAM</p>
          <p className="mt-2 font-mono text-sm tracking-wider text-[var(--c-text)]">
            H E L L O
          </p>
          <p className="font-mono text-sm tracking-wider text-[var(--c-accent)]">L E M O N</p>
          <p className="font-mono text-sm tracking-wider text-[rgb(var(--c-core))]">
            S I X Z Z
          </p>
          <p className="mt-2 text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">
            Each position uses a different shift (11, 4, 12, 14, 13) driven by the keyword. The same letter can become
            different letters.
          </p>
        </div>
      </div>
      <p className="mt-3 flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <Lightbulb size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
        The shift is not a fixed property of the cipher — it is a moving property of the key. Change one key letter and
        every position it reaches changes.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Security                                                            */
/* ------------------------------------------------------------------ */

const VIG_SEC: Array<{ name: string; stars: number; note: string; warn: boolean }> = [
  { name: 'HISTORICAL STRENGTH', stars: 3, note: 'The “indecipherable cipher” for centuries — shifts vary per letter.', warn: false },
  { name: 'MODERN SECURITY', stars: 1, note: 'Fully broken when the key repeats — never use for real communication.', warn: true },
  { name: 'FREQUENCY FLATTENING', stars: 2, note: 'Hides single-letter frequencies better than Caesar or substitution.', warn: false },
  { name: 'KEY-REPEAT VULNERABILITY', stars: 1, note: 'A repeating keyword reintroduces periodic structure.', warn: true },
  { name: 'RESISTANCE TO KASISKI', stars: 1, note: 'Kasiski examination estimates the key length quickly.', warn: true },
]

function VigenereSecurity() {
  return (
    <Panel label="SECURITY ANALYSIS" title="Historically strong, not modern" actions={<Shield size={15} className="text-[var(--c-accent)]" />}>
      <div className="space-y-2">
        {VIG_SEC.map((r) => (
          <div key={r.name} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2">
            <div className="min-w-0">
              <p className="mono-label !text-[0.55rem] font-semibold text-[var(--c-text)]">{r.name}</p>
              <p className="text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">{r.note}</p>
            </div>
            <StarBar n={r.stars} />
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-md border border-[rgba(251,191,36,0.35)] bg-[rgba(251,191,36,0.05)] p-3">
        <p className="mono-label flex items-center gap-1.5 !text-[0.5rem] text-[var(--c-accent)]">
          <AlertTriangle size={13} /> WHY REPEATING KEYS ARE WEAK
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {['REPEATING KEY', 'REPEATING SHIFTS', 'STATISTICAL PATTERNS', 'POTENTIAL CRYPTANALYSIS'].map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-2 py-1 font-mono text-[0.55rem] font-semibold text-[var(--c-text)]">
                {s}
              </span>
              {i < 3 && <ArrowRight size={11} className="text-[var(--c-text-faint)]" />}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
          Because the keyword repeats (LEMON LEMON …), positions separated by the key length use the same shift. That
          periodic structure lets an attacker estimate the key length (Kasiski examination), then solve each position as
          an independent Caesar column by frequency analysis.
        </p>
      </div>

      <p className="mt-3 flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
        These are educational comparisons, not formal cryptographic metrics. Vigenère matters for what it taught us —
        not for secure communication today.
      </p>
    </Panel>
  )
}

function StarBar({ n }: { n: number }) {
  return (
    <span className="font-mono text-[0.6rem] tracking-tight text-[var(--c-accent)]" aria-label={`${n} out of 5`}>
      {'★'.repeat(n)}
      <span className="text-[var(--c-text-faint)]">{'★'.repeat(5 - n)}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Learning                                                            */
/* ------------------------------------------------------------------ */

const VIG_LEARN: Array<{ n: string; title: string; body: string }> = [
  { n: '01', title: 'What is Vigenère?', body: 'A polyalphabetic cipher: the shift changes with every character instead of staying fixed.' },
  { n: '02', title: 'Why multiple shifts?', body: 'One fixed shift (Caesar) keeps letter frequencies intact. Many shifts flatten them, hiding the message better.' },
  { n: '03', title: 'The keyword', body: 'Your secret word is the key. Each of its letters supplies one shift value for the message.' },
  { n: '04', title: 'Building the keystream', body: 'Repeat the keyword over the plaintext, skipping spaces and punctuation, until every letter has a key letter above it.' },
  { n: '05', title: 'A=0 mapping', body: 'A=0, B=1, … Z=25. Each letter and key letter becomes a number we can add or subtract.' },
  { n: '06', title: 'Encryption formula', body: 'C = (P + K) mod 26 — add the plaintext and key values, then wrap into 0–25.' },
  { n: '07', title: 'Decryption formula', body: 'P = (C − K + 26) mod 26 — subtract the key value and wrap back into a letter.' },
  { n: '08', title: 'Tabula recta', body: 'A 26×26 lookup square: plaintext row + key column → ciphertext at the intersection.' },
  { n: '09', title: 'Why repeating keys are vulnerable', body: 'Repetition creates periodicity. Kasiski examination finds the key length, then each column falls to frequency analysis.' },
  { n: '10', title: 'Try it yourself', body: 'Use ATTACKATDAWN with LEMON. Watch the key repeat, change the key, and see every shift and letter follow.' },
]

function LearnVigenere() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <Panel label="LEARN VIGENÈRE" title="Ten steps to the keystream" actions={<GraduationCap size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="space-y-1.5">
        {VIG_LEARN.map((s, i) => (
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

interface VigChallenge {
  plain: string
  key: string
  correct: string
  options: string[]
}

function makeVigChallenge(): VigChallenge {
  const letters = VIG_ALPHABET.split('')
  const plain = letters[Math.floor(Math.random() * 26)]
  const key = letters[Math.floor(Math.random() * 26)]
  const p = VIG_ALPHABET.indexOf(plain)
  const k = VIG_ALPHABET.indexOf(key)
  const correct = VIG_ALPHABET[(p + k) % 26]
  const opts = new Set<string>([correct])
  const alts = [VIG_ALPHABET[(p + k + 1) % 26], VIG_ALPHABET[(p + k + 5) % 26], key, VIG_ALPHABET[(p - k + 26) % 26]]
  for (const a of alts) {
    if (opts.size < 4) opts.add(a)
  }
  return { plain, key, correct, options: [...opts].sort(() => Math.random() - 0.5) }
}

function VigenereChallenge() {
  const [ch, setCh] = useState<VigChallenge>(() => makeVigChallenge())
  const [picked, setPicked] = useState<string | null>(null)
  const answered = picked !== null
  const correct = answered && picked === ch.correct
  const p = VIG_ALPHABET.indexOf(ch.plain)
  const k = VIG_ALPHABET.indexOf(ch.key)

  const newQ = () => {
    setCh(makeVigChallenge())
    setPicked(null)
  }

  return (
    <Panel label="VIGENÈRE CHALLENGE" title="Predict the ciphertext" actions={<Target size={15} className="text-[rgb(var(--c-core))]" />}>
      <p className="text-sm text-[var(--c-text)]">
        Encrypt <span className="font-mono text-lg text-[rgb(var(--c-core))]">{ch.plain}</span> with key letter{' '}
        <span className="font-mono text-lg text-[var(--c-accent)]">{ch.key}</span>:
      </p>
      <p className="mt-2 font-mono text-[0.7rem] text-[var(--c-text-dim)]">
        {ch.plain} = {p} · {ch.key} = {k} · ({p} + {k}) mod 26
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ch.options.map((o) => {
          const isPick = o === picked
          const isCorrect = o === ch.correct
          return (
            <button
              key={o}
              type="button"
              disabled={answered}
              onClick={() => setPicked(o)}
              className={cn(
                'rounded-md border px-3 py-2.5 font-mono text-sm transition-all',
                !answered && 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] text-[var(--c-text)] hover:border-[rgb(var(--c-core))]',
                answered && isCorrect && 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.12)] text-[rgb(var(--c-core))]',
                answered && isPick && !isCorrect && 'border-[var(--c-danger)] bg-[rgba(248,113,113,0.12)] text-[var(--c-danger)]',
                answered && !isPick && !isCorrect && 'border-[var(--c-border)] bg-[rgba(0,0,0,0.15)] text-[var(--c-text-faint)]',
              )}
            >
              {o}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[0.62rem] text-[var(--c-text-dim)]">
          {answered ? (
            correct ? (
              <span className="flex items-center gap-1.5 font-semibold text-[rgb(var(--c-core))]">
                <Check size={13} /> CORRECT — ({p} + {k}) mod 26 = {(p + k) % 26} = {ch.correct}.
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold text-[var(--c-danger)]">
                <Info size={13} /> NOT QUITE — ({p} + {k}) mod 26 = {(p + k) % 26} = {ch.correct}.
              </span>
            )
          ) : (
            'Pick your answer for instant feedback.'
          )}
        </p>
        <button
          type="button"
          onClick={newQ}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] px-3 py-1.5 text-[0.6rem] text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
        >
          <RefreshCw size={12} /> NEW QUESTION
        </button>
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Evolution comparison                                                */
/* ------------------------------------------------------------------ */

function EvolutionComparison() {
  const rows = [
    { name: 'CAESAR', desc: 'One fixed shift', note: 'Very weak', tone: 'text-[var(--c-danger)]' },
    { name: 'MONOALPHABETIC', desc: 'One fixed substitution', note: 'Very weak', tone: 'text-[var(--c-danger)]' },
    { name: 'VIGENÈRE', desc: 'Repeating shifts', note: 'Historically stronger', tone: 'text-[var(--c-accent)]' },
    { name: 'MODERN CRYPTOGRAPHY', desc: 'Modern algorithms', note: 'Much stronger', tone: 'text-[rgb(var(--c-core))]' },
  ]
  return (
    <Panel label="HOW IT COMPARES" title="The evolution of classical ciphers">
      <div className="grid gap-3 sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.name} className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
            <p className="mono-label !text-[0.5rem] font-semibold text-[var(--c-text)]">{r.name}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--c-text-dim)]">{r.desc}</p>
            <p className={cn('mt-2 font-semibold text-[0.62rem]', r.tone)}>{r.note}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <ArrowRight size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
        Vigenère is a genuine step forward — the shift moves — yet it still repeats, which is why it could not survive
        modern cryptanalysis.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function NoticeOrNone({ notice }: { notice: string | null }) {
  if (!notice) return null
  return <Notice message={notice} tone="error" />
}

function EmptyOutput({ mode }: { mode: 'encrypt' | 'decrypt' }) {
  return (
    <div className="grid place-items-center rounded-md border border-dashed border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <FileOutput size={18} className="text-[var(--c-text-faint)]" />
        <p className="text-xs text-[var(--c-text-faint)]">
          Run the transform to produce the {mode === 'encrypt' ? 'ciphertext' : 'plaintext'}.
        </p>
      </div>
    </div>
  )
}

function VigenereAbout() {
  return (
    <Panel label="ABOUT" title="Vigenère Cipher">
      <p className="text-sm leading-relaxed text-[var(--c-text-dim)]">
        The Vigenère cipher is a <span className="text-[var(--c-text)]">polyalphabetic</span> cipher: instead of a
        single fixed shift, the shift <span className="text-[var(--c-text)]">changes with each character</span>,
        controlled by a repeating keyword. It was long considered unbreakable and was known as{' '}
        <span className="text-[var(--c-text)]">"le chiffre indéchiffrable"</span>.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-[var(--c-text-faint)]">
        Spaces and punctuation pass through unchanged and do not consume a key letter.
      </p>
    </Panel>
  )
}
