import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Grid3X3,
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
  Layers,
  Box,
  Cpu,
  Shield,
  Calculator,
  Plus,
  Minus,
  Equal,
  KeyRound,
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
  parseHillKey,
  toMatrix,
  validateHillKey,
  hillEncrypt,
  hillDecrypt,
  getHillSteps,
  mod,
  generateHillKey,
  HILL_ALPHABET,
  type HillBlockStep,
  type HillMatrix,
  type HillKeyValidation,
} from '@/crypto/algorithms/hill'
import { cn } from '@/utils/cn'

const DEFAULT = 'HELP'
const DEFAULT_KEY = '3 3 2 5'

type Phase = 'idle' | 'processing' | 'complete'

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

const STAGES = ['KEY MATRIX', 'VECTOR INJECTION', 'MULTIPLICATION', 'MODULO 26 GATE', 'LETTER OUTPUT']
const MAX_STAGE = STAGES.length

export function HillLab() {
  const core = useCoreState()
  const meta = getCipher('hill')

  const [plaintext, setPlaintext] = useState(DEFAULT)
  const [key, setKey] = useState(DEFAULT_KEY)
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt')
  const [phase, setPhase] = useState<Phase>('idle')
  const [steps, setSteps] = useState<HillBlockStep[]>([])
  const [revealed, setRevealed] = useState(0)
  const [cursor, setCursor] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState('')
  const [stepMode, setStepMode] = useState(false)
  const [slow, setSlow] = useState(false)
  const [math, setMath] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pipeStage, setPipeStage] = useState<HillPipeStage>('plain')

  const nums = useMemo(() => parseHillKey(key), [key])
  const matrix = useMemo(() => (nums.length === 4 ? toMatrix(nums) : null), [nums])
  const validation = useMemo(() => validateHillKey(key), [key])
  const clean = useMemo(() => plaintext.toUpperCase().replace(/[^A-Z]/g, ''), [plaintext])
  const padded = useMemo(() => (clean.length ? clean + (clean.length % 2 ? 'X' : '') : ''), [clean])
  const blockPairs = useMemo(() => {
    const out: Array<[string, string]> = []
    for (let i = 0; i < padded.length; i += 2) out.push([padded[i], padded[i + 1]])
    return out
  }, [padded])

  // Auto-play: reveal one block per tick while processing.
  useEffect(() => {
    if (stepMode || phase !== 'processing') return
    if (revealed >= steps.length) {
      setPhase('complete')
      core.setSuccess()
      return
    }
    const t = window.setTimeout(() => setRevealed((c) => c + 1), slow ? 1100 : 340)
    return () => window.clearTimeout(t)
  }, [stepMode, phase, revealed, steps, slow, core])

  const reset = () => {
    setPlaintext(DEFAULT)
    setKey(DEFAULT_KEY)
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
    setPipeStage('plain')
    core.setIdle()
  }

  const run = () => {
    if (clean.length === 0) {
      setNotice('Enter some plaintext — letters only. Spaces, digits and punctuation are removed.')
      core.setError()
      return
    }
    if (!validation.valid) {
      setNotice(validation.message)
      core.setError()
      return
    }
    const s = getHillSteps(plaintext, key)
    if (s.length === 0) {
      setNotice('No alphabetic characters found — nothing to transform.')
      core.setError()
      return
    }
    setNotice(null)
    setSteps(s)
    setRevealed(0)
    setCursor(0)
    setSelected(null)
    setResult(mode === 'encrypt' ? hillEncrypt(plaintext, key) : hillDecrypt(plaintext, key))
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
    phase === 'complete' ? 'TRANSFORMATION COMPLETE' : phase === 'processing' ? 'BLOCK PROCESSING' : 'STANDBY'

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
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.55rem] text-[var(--c-text-faint)]">
            <span className="mono-label">{clean.length} DATA CHARS</span>
            <span className="mono-label">{blockPairs.length} BLOCKS</span>
            {blockPairs.length > 0 && (
              <span className="mono-label font-mono text-[rgb(var(--c-core))]">
                {blockPairs.map((b) => b.join('')).join(' ')}
              </span>
            )}
          </div>
        </Panel>

        <Panel label="KEY MATRIX" title="2×2 Hill key" actions={<KeyRound size={15} className="text-[var(--c-text-faint)]" />}>
          <MatrixEditor keyStr={key} onKeyChange={setKey} onGenerate={() => setKey(generateHillKey())} onReset={() => setKey(DEFAULT_KEY)} />
          <p className="mono-label mt-2 flex items-center gap-1.5 !text-[0.5rem] text-[var(--c-text-faint)]">
            <Grid3X3 size={12} /> 2×2 HILL CIPHER · 3×3 ADVANCED ARRIVES LATER
          </p>
        </Panel>
      </div>

      {/* Determinant / validity (always visible so the key story is live) */}
      <DeterminantPanel validation={validation} matrix={matrix} />

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

      {/* The main matrix multiplication visualizer */}
      <Panel
        label="HILL MATRIX LAB"
        title={statusLabel}
        actions={
          <span className="flex items-center gap-2 text-[0.6rem] text-[var(--c-text-faint)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--c-core))] shadow-[0_0_6px_rgba(94,234,212,0.8)]" />
            {stepMode ? 'STEP MODE' : 'AUTO'}
          </span>
        }
      >
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <CoreScene state={core.state} className="h-48 md:h-56" fallbackLabel="HILL" />
          <div className="space-y-4">
            {active ? (
              <MultVisualizer key={active.index} step={active} mode={mode} />
            ) : (
              <p className="flex items-center gap-2 text-xs text-[var(--c-text-faint)]">
                <MousePointerClick size={14} className="text-[rgb(var(--c-core))]" />
                Run the transform to send each block through the matrix machine.
              </p>
            )}
            <BlockTrace
              steps={steps}
              activeIdx={activeIdx}
              revealed={revealed}
              stepMode={stepMode}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
        </div>
      </Panel>

      {/* Letter → number mapping */}
      <NumberMapping values={inspected?.values ?? null} block={inspected?.block ?? null} />

      {/* Block builder */}
      <BlockBuilder clean={clean} padded={padded} blockPairs={blockPairs} />

      {/* Interactive pipeline */}
      <HillPipeline stage={pipeStage} onStage={setPipeStage} blockPairs={blockPairs} validation={validation} result={result} />

      {/* Block inspector */}
      <BlockInspector step={inspected} index={inspectedIdx} total={steps.length} validation={validation} />

      {/* Why matrices */}
      <WhyMatrix />

      {/* Step-by-step */}
      {stepMode && steps.length > 0 && (
        <Panel label="STEP BY STEP" title="Walk through one block at a time">
          <LabStepControls
            total={steps.length}
            revealedCount={revealed}
            cursor={cursor}
            caption={active ? `BLOCK ${active.block.join('')} → ${active.outChars.join('')}` : null}
            onProcess={process}
            onNext={next}
          />
        </Panel>
      )}

      {/* Mathematics */}
      {math && active && (
        <Panel label="MATHEMATICS" title="C = K × P (mod 26), in full" actions={<Calculator size={16} className="text-[rgb(var(--c-core))]" />}>
          <MathFull step={active} mode={mode} />
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
          <EmptyOutput mode={mode} />
        )}
        {result && phase === 'complete' && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--c-text-dim)]">
            <span className="font-mono text-[var(--c-text)]">{blockPairs.map((b) => b.join('')).join(' ')}</span>
            <ArrowRight size={13} className="text-[rgb(var(--c-core))]" />
            <span className="font-mono text-[rgb(var(--c-core))]">{result}</span>
          </div>
        )}
      </Panel>

      {/* Security */}
      <HillSecurity />

      {/* Learning center */}
      <HillLearning />

      {/* Mini challenge */}
      <HillChallenge />

      {/* About */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <HillAbout />
        <SecurityPanel meta={meta} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Matrix editor                                                       */
/* ------------------------------------------------------------------ */

function MatrixEditor({
  keyStr,
  onKeyChange,
  onGenerate,
  onReset,
}: {
  keyStr: string
  onKeyChange: (k: string) => void
  onGenerate: () => void
  onReset: () => void
}) {
  const [cells, setCells] = useState<string[]>(() => {
    const n = parseHillKey(keyStr)
    return n.length === 4 ? n.map(String) : ['3', '3', '2', '5']
  })

  // Adopt externally-driven key changes (GENERATE / RESET) that don't match the cells.
  useEffect(() => {
    const n = parseHillKey(keyStr)
    if (n.length === 4 && n.map(String).join(' ') !== cells.join(' ')) setCells(n.map(String))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyStr])

  const commit = (next: string[]) => {
    setCells(next)
    onKeyChange(next.map((x) => x.trim()).join(' '))
  }
  const setCell = (i: number, v: string) => {
    const next = [...cells]
    next[i] = v.replace(/[^0-9-]/g, '')
    commit(next)
  }
  const bump = (i: number, d: number) => {
    const cur = parseInt(cells[i], 10)
    const base = Number.isFinite(cur) ? cur : 0
    const nv = Math.min(25, Math.max(0, base + d))
    const next = [...cells]
    next[i] = String(nv)
    commit(next)
  }
  const pos: Array<[number, number]> = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ]

  return (
    <div>
      <div className="inline-grid grid-cols-2 gap-1.5 rounded-lg border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-2.5">
        {pos.map(([r, c], i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="mono-label !text-[0.4rem] text-[var(--c-text-faint)]">
              K{r + 1},{c + 1}
            </span>
            <input
              value={cells[i]}
              onChange={(e) => setCell(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  bump(i, 1)
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  bump(i, -1)
                }
              }}
              inputMode="numeric"
              aria-label={`Key matrix row ${r + 1} column ${c + 1}`}
              className="h-11 w-11 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.3)] text-center font-mono text-lg text-[var(--c-text)] outline-none transition-colors focus:border-[rgb(var(--c-core))]"
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => bump(i, -1)}
                aria-label={`Decrease ${c + 1}`}
                className="grid h-5 w-5 place-items-center rounded border border-[var(--c-border)] text-[var(--c-text-faint)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
              >
                <Minus size={11} />
              </button>
              <button
                type="button"
                onClick={() => bump(i, 1)}
                aria-label={`Increase ${c + 1}`}
                className="grid h-5 w-5 place-items-center rounded border border-[var(--c-border)] text-[var(--c-text-faint)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
              >
                <Plus size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onGenerate}
          className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--c-core))] px-3 py-1.5 text-[0.6rem] font-semibold text-[rgb(var(--c-core))] transition-colors hover:bg-[rgba(94,234,212,0.08)]"
        >
          <Dices size={13} /> GENERATE VALID MATRIX
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] px-3 py-1.5 text-[0.6rem] text-[var(--c-text-dim)] transition-colors hover:border-[var(--c-border-strong)] hover:text-[var(--c-text)]"
        >
          <RefreshCw size={12} /> DEFAULT
        </button>
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[0.58rem] leading-relaxed text-[var(--c-text-faint)]">
        <Info size={12} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
        Edit any cell — the determinant, validity and ciphertext update live. Arrow keys step a value.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Determinant / validity                                              */
/* ------------------------------------------------------------------ */

function DeterminantPanel({
  validation,
  matrix,
}: {
  validation: HillKeyValidation
  matrix: HillMatrix | null
}) {
  const reduced = useReducedMotion()
  const [[a, b], [c, d]] = matrix ?? [
    [0, 0],
    [0, 0],
  ]
  const detRaw = a * d - b * c
  const det = validation.det
  const g = validation.gcdVal
  const valid = validation.valid
  const showStat = matrix != null && validation.det != null

  return (
    <Panel
      label="KEY VALIDATION"
      title={valid ? 'VALID KEY MATRIX' : 'CHECKING INVERTIBILITY'}
      actions={
        valid ? (
          <span className="flex items-center gap-1.5 rounded-full border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.08)] px-2.5 py-1 text-[0.55rem] font-semibold text-[rgb(var(--c-core))]">
            <Check size={12} /> VALID
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-[var(--c-danger)] bg-[rgba(248,113,113,0.08)] px-2.5 py-1 text-[0.55rem] font-semibold text-[var(--c-danger)]">
            <Info size={12} /> INVALID
          </span>
        )
      }
    >
      <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-center">
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-1 font-mono">
            <div className="flex">
              <span className="px-2 py-1.5 text-[var(--c-text)]">{a}</span>
              <span className="px-2 py-1.5 text-[var(--c-text)]">{b}</span>
            </div>
            <div className="flex border-t border-[var(--c-border)]">
              <span className="px-2 py-1.5 text-[var(--c-text)]">{c}</span>
              <span className="px-2 py-1.5 text-[var(--c-text)]">{d}</span>
            </div>
          </div>
          <span className="mono-label !text-[0.45rem] text-[var(--c-text-faint)]">det = ad − bc</span>
        </div>

        <div className="space-y-2 font-mono text-[0.7rem] leading-relaxed text-[var(--c-text)]">
          <p>
            det(K) = ({a}×{d}) − ({b}×{c}) = <span className="text-[rgb(var(--c-core))]">{a * d}</span> −{' '}
            <span className="text-[var(--c-accent)]">{b * c}</span> = <span className="text-[var(--c-text)]">{detRaw}</span>
          </p>
          <p>
            {detRaw} mod 26 = <span className="text-[rgb(var(--c-core))]">{showStat ? det : '—'}</span>
          </p>
          <p>
            gcd({showStat ? det : '?'}, 26) ={' '}
            <span className={cn('font-semibold', valid ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-danger)]')}>
              {showStat ? g : '—'}
            </span>
          </p>
          <p className="flex flex-wrap items-center gap-2">
            STATUS:
            {valid ? (
              <span className="flex items-center gap-1.5 font-semibold text-[rgb(var(--c-core))]">
                <Check size={14} /> INVERTIBLE — DECRYPTION POSSIBLE (K⁻¹ = {validation.invDet})
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold text-[var(--c-danger)]">
                <Info size={14} /> gcd ≠ 1 → NO MODULAR INVERSE — CANNOT DECRYPT
              </span>
            )}
          </p>
        </div>
      </div>
      {!reduced && valid && showStat && (
        <motion.div
          className="mt-3 rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.05)] px-3 py-2 text-[0.62rem] text-[var(--c-text-dim)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          A 2×2 Hill matrix decrypts only when gcd(det(K), 26) = 1. Because the gcd is {g}, an inverse
          exists — the transform can be undone. If the gcd were greater than 1, two different plaintext blocks could
          map to the same ciphertext, so decryption would be ambiguous.
        </motion.div>
      )}
      {!reduced && !valid && showStat && (
        <div className="mt-3 rounded-md border border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.05)] px-3 py-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
          <p className="flex items-start gap-2">
            <Shield size={13} className="mt-0.5 shrink-0 text-[var(--c-danger)]" />
            gcd({det}, 26) = {g} ≠ 1, so this matrix has <span className="text-[var(--c-danger)]">no modular inverse</span>.
            {g === 2 ? ' Even numbers share a factor of 2 with 26.' : g === 13 ? ' 13 shares a factor of 13 with 26.' : ' It shares a factor with 26.'}{' '}
            Adjust any value to make gcd = 1 and the key becomes usable.
          </p>
        </div>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Number mapping                                                      */
/* ------------------------------------------------------------------ */

function NumberMapping({ values, block }: { values: [number, number] | null; block: [string, string] | null }) {
  const activeSet = values ? new Set<number>(values) : new Set<number>()
  return (
    <Panel label="LETTER → NUMBER MAPPING" title="A = 0 … Z = 25">
      <div className="flex flex-wrap gap-1">
        {HILL_ALPHABET.split('').map((ch, i) => {
          const on = activeSet.has(i)
          return (
            <div
              key={ch}
              className={cn(
                'flex flex-col items-center rounded-md border px-1.5 py-1',
                on
                  ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.14)] text-[rgb(var(--c-core))]'
                  : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] text-[var(--c-text-dim)]',
              )}
            >
              <span className={cn('font-mono text-xs', on ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text)]')}>{ch}</span>
              <span className="text-[0.5rem] text-[var(--c-text-faint)]">{String(i).padStart(2, '0')}</span>
            </div>
          )
        })}
      </div>
      {block && values && (
        <p className="mt-3 flex items-center gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2 font-mono text-sm text-[var(--c-text)]">
          {block[0]} = <span className="text-[rgb(var(--c-core))]">{values[0]}</span>
          <span className="text-[var(--c-text-faint)]">&nbsp;&nbsp;</span>
          {block[1]} = <span className="text-[rgb(var(--c-core))]">{values[1]}</span>
          <ArrowRight size={14} className="mx-1 text-[rgb(var(--c-core))]" />
          P = [<span className="text-[rgb(var(--c-core))]">{values[0]}</span>,{' '}
          <span className="text-[rgb(var(--c-core))]">{values[1]}</span>]ᵀ
        </p>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Block builder                                                       */
/* ------------------------------------------------------------------ */

function BlockBuilder({
  clean,
  padded,
  blockPairs,
}: {
  clean: string
  padded: string
  blockPairs: Array<[string, string]>
}) {
  return (
    <Panel label="PLAINTEXT BLOCK BUILDER" title="Letters are grouped two at a time">
      <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
        {blockPairs.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-2.5 py-1.5 text-[var(--c-text)]">
              {b[0]}
              {b[1]}
            </span>
            {i < blockPairs.length - 1 && <span className="text-[var(--c-text-faint)]">|</span>}
          </div>
        ))}
        {blockPairs.length === 0 && <span className="text-[var(--c-text-faint)]">—</span>}
      </div>
      {padded !== clean && (
        <p className="mt-2 flex items-start gap-2 rounded-md border border-[rgba(167,139,250,0.4)] bg-[rgba(167,139,250,0.06)] px-3 py-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
          <Info size={13} className="mt-0.5 shrink-0 text-[#a78bfa]" />
          {clean} is odd-length, so a trailing <span className="font-mono text-[#a78bfa]">X</span> pads it to{' '}
          <span className="font-mono text-[#a78bfa]">{padded}</span>. Each block becomes a column vector of two numbers.
        </p>
      )}
      <p className="mt-2 text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">
        {blockPairs[0] && (
          <>
            Block {blockPairs[0][0]}
            {blockPairs[0][1]} → P = [{blockPairs[0][0].charCodeAt(0) - 65},{' '}
            {blockPairs[0][1].charCodeAt(0) - 65}]ᵀ
          </>
        )}
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Main multiplication visualizer                                      */
/* ------------------------------------------------------------------ */

function MultVisualizer({ step, mode }: { step: HillBlockStep; mode: 'encrypt' | 'decrypt' }) {
  const reduced = useReducedMotion()
  const [stage, setStage] = useState(0)

  useEffect(() => {
    setStage(0)
    if (reduced) {
      setStage(MAX_STAGE)
      return
    }
    let cancelled = false
    const timers: number[] = []
    for (let i = 1; i <= MAX_STAGE; i++) timers.push(window.setTimeout(() => !cancelled && setStage(i), i * 750))
    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [step.index, reduced])

  const [p1, p2] = step.values
  const [[a, b], [c, d]] = step.key
  const op = mode === 'encrypt' ? '×' : '⁻¹×'
  const row1 = [a * p1, b * p2]
  const row2 = [c * p1, d * p2]
  const [s1, s2] = step.products
  const [m1, m2] = step.cipher
  const [o1, o2] = step.outChars

  return (
    <div className="space-y-3">
      {/* machine status */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STAGES.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[0.5rem] font-semibold tracking-wide transition-all',
                i <= stage
                  ? 'bg-[rgba(94,234,212,0.12)] text-[rgb(var(--c-core))] shadow-[0_0_8px_rgba(94,234,212,0.25)]'
                  : 'text-[var(--c-text-faint)]',
              )}
            >
              {s}
            </span>
            {i < STAGES.length - 1 && <ArrowRight size={10} className="text-[var(--c-text-faint)]" />}
          </div>
        ))}
      </div>

      {/* key matrix × vector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-1 font-mono text-sm">
          <div className="flex">
            <span className={cn('px-2 py-1', stage >= 1 ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text)]')}>{a}</span>
            <span className={cn('px-2 py-1', stage >= 1 ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text)]')}>{b}</span>
          </div>
          <div className="flex border-t border-[var(--c-border)]">
            <span className={cn('px-2 py-1', stage >= 1 ? 'text-[#a78bfa]' : 'text-[var(--c-text)]')}>{c}</span>
            <span className={cn('px-2 py-1', stage >= 1 ? 'text-[#a78bfa]' : 'text-[var(--c-text)]')}>{d}</span>
          </div>
        </div>
        <span className="font-mono text-lg text-[rgb(var(--c-core))]"> {op} </span>
        <div className="flex flex-col rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)] p-1 font-mono text-sm">
          <span className={cn('px-2 py-1', stage >= 1 ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text)]')}>{p1}</span>
          <span className={cn('px-2 py-1 border-t border-[rgba(94,234,212,0.3)]', stage >= 1 ? 'text-[#a78bfa]' : 'text-[var(--c-text)]')}>{p2}</span>
        </div>
      </div>

      {/* dot products */}
      {stage >= 1 && (
        <Fade>
          <div className="space-y-1.5 font-mono text-[0.72rem] leading-relaxed text-[var(--c-text)]">
            <p className="text-[rgb(var(--c-core))]">
              C1 = {a}×{p1} + {b}×{p2} = {row1[0]} + {row1[1]} = <b>{s1}</b>
            </p>
            <p className="text-[#a78bfa]">
              C2 = {c}×{p1} + {d}×{p2} = {row2[0]} + {row2[1]} = <b>{s2}</b>
            </p>
          </div>
        </Fade>
      )}

      {/* modulo gate */}
      {stage >= 2 && (
        <Fade delay={0.05}>
          <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-2.5 font-mono text-[0.72rem] leading-relaxed text-[var(--c-text)]">
            <p className="mono-label !text-[0.45rem] text-[var(--c-text-faint)]">MODULO 26 GATE</p>
            <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1">
              <ModLine n={s1} />
              <ModLine n={s2} />
            </div>
          </div>
        </Fade>
      )}

      {/* letter output */}
      {stage >= 3 && (
        <Fade delay={0.05}>
          <div className="flex items-center gap-3 font-mono text-sm">
            <span className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.08)] px-2.5 py-1.5 text-[rgb(var(--c-core))]">
              {m1} → {o1}
            </span>
            <span className="rounded-md border border-[#a78bfa] bg-[rgba(167,139,250,0.08)] px-2.5 py-1.5 text-[#a78bfa]">
              {m2} → {o2}
            </span>
            <ArrowRight size={14} className="text-[rgb(var(--c-core))]" />
            <span className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.12)] px-3 py-1.5 font-semibold text-[rgb(var(--c-core))]">
              {o1}
              {o2}
            </span>
          </div>
        </Fade>
      )}
    </div>
  )
}

function ModLine({ n }: { n: number }) {
  const q = Math.floor(n / 26)
  const r = mod(n, 26)
  return (
    <span className="text-[var(--c-text)]">
      {n} <span className="text-[var(--c-text-faint)]">− 26×{q} =</span>{' '}
      <span className="text-[rgb(var(--c-core))]">{r}</span>{' '}
      <span className="text-[var(--c-text-faint)]">mod 26</span>
    </span>
  )
}

function Fade({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Full mathematics                                                    */
/* ------------------------------------------------------------------ */

function MathFull({ step, mode }: { step: HillBlockStep; mode: 'encrypt' | 'decrypt' }) {
  const [p1, p2] = step.values
  const [[a, b], [c, d]] = step.key
  const op = mode === 'encrypt' ? 'K·P' : 'K⁻¹·C'
  return (
    <div className="space-y-3 font-mono text-sm leading-relaxed text-[var(--c-text)]">
      <p>
        C = K × P <span className="text-[var(--c-text-dim)]">mod 26</span> ({op})
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Mat two col={[[String(a), String(c)], [String(b), String(d)]]} />
        <span className="text-[rgb(var(--c-core))]">×</span>
        <Mat col={[String(p1), String(p2)]} />
        <span className="text-[rgb(var(--c-core))]">=</span>
        <Mat col={[`${a}·${p1}+${b}·${p2}`, `${c}·${p1}+${d}·${p2}`]} />
        <span className="text-[rgb(var(--c-core))]">mod 26 =</span>
        <Mat col={[String(step.cipher[0]), String(step.cipher[1])]} />
      </div>
      <p className="text-[0.68rem] text-[var(--c-text-dim)]">
        Row 1: ({a}·{p1} + {b}·{p2}) = {a * p1} + {b * p2} = {step.products[0]} → {step.products[0]} mod 26 ={' '}
        {step.cipher[0]} = <span className="text-[rgb(var(--c-core))]">{step.outChars[0]}</span>. &nbsp;Row 2: ({c}·{p1}{' '}
        + {d}·{p2}) = {c * p1} + {d * p2} = {step.products[1]} → {step.products[1]} mod 26 = {step.cipher[1]} ={' '}
        <span className="text-[#a78bfa]">{step.outChars[1]}</span>.
      </p>
    </div>
  )
}

function Mat({
  col,
  two,
}: {
  col: Array<string | string[]>
  two?: boolean
}) {
  return (
    <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-1.5">
      <div className={two ? 'grid grid-cols-2 gap-x-3' : 'flex flex-col items-center'}>
        {col.flat().map((v, i) => (
          <span key={i} className="whitespace-nowrap text-[var(--c-text)]">
            {v}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pipeline                                                            */
/* ------------------------------------------------------------------ */

type HillPipeStage = 'plain' | 'normalize' | 'block' | 'map' | 'multiply' | 'mod' | 'cipher'

const PIPELINE: Array<{ id: HillPipeStage; label: string; icon: React.ReactNode }> = [
  { id: 'plain', label: 'PLAINTEXT', icon: <Box size={13} /> },
  { id: 'normalize', label: 'NORMALIZE', icon: <Layers size={13} /> },
  { id: 'block', label: 'BLOCK', icon: <Grid3X3 size={13} /> },
  { id: 'map', label: 'NUMBER MAP', icon: <Calculator size={13} /> },
  { id: 'multiply', label: 'K × P', icon: <Equal size={13} /> },
  { id: 'mod', label: 'MOD 26', icon: <RefreshCw size={13} /> },
  { id: 'cipher', label: 'CIPHERTEXT', icon: <Cpu size={13} /> },
]

function HillPipeline({
  stage,
  onStage,
  blockPairs,
  validation,
  result,
}: {
  stage: HillPipeStage
  onStage: (s: HillPipeStage) => void
  blockPairs: Array<[string, string]>
  validation: HillKeyValidation
  result: string
}) {
  const captions: Record<HillPipeStage, string> = {
    plain: 'Raw message enters the machine.',
    normalize: 'Uppercase, strip non-letters.',
    block: `Grouped into 2-letter blocks: ${blockPairs.map((b) => b.join('')).join(' | ') || '—'}`,
    map: `Each letter → number: ${blockPairs[0] ? `${blockPairs[0][0]}=${blockPairs[0][0].charCodeAt(0) - 65}, ${blockPairs[0][1]}=${blockPairs[0][1].charCodeAt(0) - 65}` : '—'}`,
    multiply: `Key × vector: ${validation.valid ? 'C = K × P' : 'key must be invertible first'}`,
    mod: 'Wrap each sum into 0–25 (mod 26).',
    cipher: `Output${result ? `: ${result}` : ''}`,
  }
  const idx = PIPELINE.findIndex((p) => p.id === stage)
  return (
    <Panel label="ENCRYPTION PIPELINE" title="The full journey, tap any stage">
      <div className="flex flex-wrap items-center gap-1.5">
        {PIPELINE.map((p, i) => (
          <div key={p.id} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onStage(p.id)}
              aria-pressed={stage === p.id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-2 font-mono text-[0.58rem] font-semibold transition-all',
                i <= idx
                  ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.08)] text-[rgb(var(--c-core))]'
                  : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] text-[var(--c-text-dim)]',
                stage === p.id && 'shadow-[0_0_12px_rgba(94,234,212,0.35)]',
              )}
            >
              {p.icon}
              {p.label}
            </button>
            {i < PIPELINE.length - 1 && <ArrowRight size={11} className="text-[var(--c-text-faint)]" />}
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        {captions[stage]}
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Block inspector                                                     */
/* ------------------------------------------------------------------ */

function BlockInspector({
  step,
  index,
  total,
  validation,
}: {
  step: HillBlockStep | null
  index: number | null
  total: number
  validation: HillKeyValidation
}) {
  if (!step) {
    return (
      <Panel label="BLOCK INSPECTOR" title="Click a block to inspect it">
        <p className="flex items-center gap-2 text-xs text-[var(--c-text-faint)]">
          <Search size={14} className="text-[rgb(var(--c-core))]" />
          {total === 0
            ? 'Run the transform, then click any block to open it in the inspector.'
            : 'Click any block above (or the active one) to inspect its full journey.'}
        </p>
      </Panel>
    )
  }
  const [b1, b2] = step.block
  const [p1, p2] = step.values
  const [[a, b], [c, d]] = step.key
  const [m1, m2] = step.cipher
  return (
    <Panel label="BLOCK INSPECTOR" title={`BLOCK ${index == null ? '—' : index + 1}/${total}`} actions={<span className="mono-label !text-[0.55rem] text-[rgb(var(--c-core))]">{b1}{b2}</span>}>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <InspectBox label="BLOCK">
          <p className="font-mono text-xl text-[var(--c-text)]">
            {b1}
            {b2}
          </p>
        </InspectBox>
        <InspectBox label="VALUES">
          <p className="font-mono text-xs text-[var(--c-text-dim)]">
            {b1}={p1} {b2}={p2}
          </p>
        </InspectBox>
        <InspectBox label="VECTOR">
          <p className="font-mono text-sm text-[var(--c-text)]">
            [{p1},{p2}]ᵀ
          </p>
        </InspectBox>
        <InspectBox label="KEY">
          <p className="font-mono text-xs text-[var(--c-text-dim)]">
            [{a} {b} / {c} {d}]
          </p>
        </InspectBox>
        <InspectBox label="RESULT">
          <p className="font-mono text-sm text-[var(--c-text)]">
            [{m1},{m2}]ᵀ
          </p>
        </InspectBox>
        <InspectBox label="OUTPUT" accent>
          <p className="font-mono text-xl text-[rgb(var(--c-core))]">
            {step.outChars[0]}
            {step.outChars[1]}
          </p>
        </InspectBox>
      </div>
      <p className="mt-3 flex items-start gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <Lightbulb size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
        {b1}
        {b2} is the column vector [{p1}, {p2}]ᵀ. Multiplying by {validation.valid ? 'K' : 'the key'} gives raw sums{' '}
        {step.products[0]} and {step.products[1]}, which mod 26 become {m1} and {m2} — the letters {step.outChars[0]} and{' '}
        {step.outChars[1]}.
      </p>
    </Panel>
  )
}

function InspectBox({ label, children, accent }: { label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2 text-center',
        accent ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)]' : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)]',
      )}
    >
      <p className="mono-label !text-[0.45rem] text-[var(--c-text-faint)]">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Why matrices                                                        */
/* ------------------------------------------------------------------ */

function WhyMatrix() {
  const steps = [
    'LETTERS',
    'NUMBERS',
    'VECTOR',
    'MATRIX MULT',
    'MOD 26',
    'NEW LETTERS',
  ]
  return (
    <Panel label="WHY MATRICES?" title="Groups of letters become vectors" actions={<Lightbulb size={16} className="text-[var(--c-accent)]" />}>
      <p className="text-sm leading-relaxed text-[var(--c-text-dim)]">
        Instead of replacing each letter independently, Hill Cipher treats <span className="text-[var(--c-text)]">groups
        of letters as numerical vectors</span> and multiplies them by a key matrix. That one operation mixes every
        letter of the block together — so the ciphertext of a letter depends on its neighbours.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-2.5 py-1.5 font-mono text-[0.6rem] font-semibold text-[rgb(var(--c-core))]">
              {s}
            </span>
            {i < steps.length - 1 && <ArrowDown size={12} className="text-[var(--c-text-faint)]" />}
          </div>
        ))}
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Security                                                            */
/* ------------------------------------------------------------------ */

const HILL_SEC: Array<{ name: string; stars: number; note: string; warn: boolean }> = [
  { name: 'CLASSICAL STRENGTH', stars: 2, note: 'Better than simple substitution; blocks hide single-letter frequencies.', warn: false },
  { name: 'MODERN SECURITY', stars: 1, note: 'Linear structure is easily broken today.', warn: true },
  { name: 'BLOCK ENCRYPTION', stars: 3, note: 'Works on vectors — a real conceptual step forward.', warn: false },
  { name: 'LINEAR ALGEBRA', stars: 4, note: 'Its whole foundation — that is also its weakness.', warn: false },
  { name: 'KNOWN-PLAINTEXT RESISTANCE', stars: 1, note: 'A few known pairs can recover the key.', warn: true },
]

function HillSecurity() {
  return (
    <Panel label="SECURITY ANALYSIS" title="Hill Cipher — historical, not modern" actions={<Shield size={15} className="text-[var(--c-accent)]" />}>
      <div className="space-y-2">
        {HILL_SEC.map((r) => (
          <div key={r.name} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2">
            <div className="min-w-0">
              <p className="mono-label !text-[0.55rem] font-semibold text-[var(--c-text)]">{r.name}</p>
              <p className="text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">{r.note}</p>
            </div>
            <StarBar n={r.stars} />
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <FeatRow label="BLOCK ENCRYPTION" ok />
        <FeatRow label="LINEAR ALGEBRA" ok />
        <FeatRow label="MODERN SECURITY" ok={false} />
        <FeatRow label="KNOWN-PLAINTEXT VULNERABILITY" high />
      </div>
      <p className="mt-3 flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
        These are educational comparisons, not formal cryptographic metrics. Hill is historically important and
        teaches linear algebra beautifully — it is not suitable for modern secure communication.
      </p>
    </Panel>
  )
}

function FeatRow({ label, ok, high }: { label: string; ok?: boolean; high?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2">
      <span className="mono-label !text-[0.52rem] text-[var(--c-text)]">{label}</span>
      {high ? (
        <span className="rounded-full border border-[var(--c-danger)] bg-[rgba(248,113,113,0.08)] px-2 py-0.5 text-[0.5rem] font-semibold text-[var(--c-danger)]">HIGH</span>
      ) : ok ? (
        <span className="rounded-full border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.08)] px-2 py-0.5 text-[0.5rem] font-semibold text-[rgb(var(--c-core))]">✓</span>
      ) : (
        <span className="rounded-full border border-[var(--c-text-faint)] bg-[rgba(148,163,184,0.08)] px-2 py-0.5 text-[0.5rem] font-semibold text-[var(--c-text-faint)]">✕</span>
      )}
    </div>
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
/* Learning                                                           */
/* ------------------------------------------------------------------ */

const HILL_LEARN: Array<{ n: string; title: string; body: string }> = [
  { n: '01', title: 'What is Hill Cipher?', body: 'A block cipher that turns groups of letters into numbers and multiplies them by a key matrix (mod 26).' },
  { n: '02', title: 'Why matrices?', body: 'A matrix lets every letter in a block influence every output letter — breaking the one-to-one letter mapping of substitution ciphers.' },
  { n: '03', title: 'A=0 mapping', body: 'A=0, B=1, … Z=25. Each letter becomes a number so we can do arithmetic on it.' },
  { n: '04', title: 'Block formation', body: 'Letters are grouped into pairs (for a 2×2 key) and each pair becomes a column vector, e.g. HE → [7,4]ᵀ.' },
  { n: '05', title: 'Matrix multiplication', body: 'C = K × P: each output value is a dot product — row of K times the vector P, summed.' },
  { n: '06', title: 'Modulo 26', body: 'The sums are reduced into 0–25 (wrap around). That keeps results valid letters.' },
  { n: '07', title: 'Determinant', body: 'det(K) = ad − bc decides whether decryption is possible at all.' },
  { n: '08', title: 'Valid key matrix', body: 'A key is usable only when gcd(det(K), 26) = 1 — then a modular inverse exists to decrypt.' },
  { n: '09', title: 'Encryption walkthrough', body: 'Try the default HELP → HIAT: watch each block go through vector → multiply → mod 26 → letters.' },
  { n: '10', title: 'Security weaknesses', body: 'Hill is linear: a few known plaintext/ciphertext pairs can recover the key. Not modern security.' },
  { n: '11', title: 'Try it yourself', body: 'Edit the matrix cells and watch the determinant, validity and ciphertext change live. Change ONE number and see everything move.' },
]

function HillLearning() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <Panel label="LEARNING CENTER" title="Eleven steps to mastering Hill" actions={<GraduationCap size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="space-y-1.5">
        {HILL_LEARN.map((s, i) => (
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

interface HillChallengeState {
  key: HillMatrix
  keyStr: string
  values: [number, number]
  correct: number
  options: number[]
  c2: number
}

function makeHillChallenge(): HillChallengeState {
  const keyStr = generateHillKey()
  const m = toMatrix(parseHillKey(keyStr))
  const v1 = Math.floor(Math.random() * 26)
  const v2 = Math.floor(Math.random() * 26)
  const raw1 = m[0][0] * v1 + m[0][1] * v2
  const raw2 = m[1][0] * v1 + m[1][1] * v2
  const correct = raw1
  const opts = new Set<number>([correct])
  const alts = [raw2, Math.max(0, correct - 1), correct + 1, correct + 26]
  for (const a of alts) {
    if (opts.size < 4) opts.add(a)
  }
  return { key: m, keyStr, values: [v1, v2], correct, options: [...opts].sort(() => Math.random() - 0.5), c2: raw2 }
}

function HillChallenge() {
  const [ch, setCh] = useState<HillChallengeState>(() => makeHillChallenge())
  const [picked, setPicked] = useState<number | null>(null)
  const answered = picked !== null
  const correct = answered && picked === ch.correct
  const [[a, b], [c, d]] = ch.key

  const newQ = () => {
    setCh(makeHillChallenge())
    setPicked(null)
  }

  return (
    <Panel label="HILL MATRIX CHALLENGE" title="Predict the first raw value" actions={<Target size={15} className="text-[rgb(var(--c-core))]" />}>
      <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
        <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">K =</span>
        <Mat two col={[[String(a), String(c)], [String(b), String(d)]]} />
        <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">P =</span>
        <Mat col={[String(ch.values[0]), String(ch.values[1])]} />
      </div>
      <p className="mt-3 text-sm text-[var(--c-text)]">
        What is the <span className="text-[var(--c-accent)]">first value before modulo</span> (row 1 of K·P)?
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
                <Check size={13} /> CORRECT — {a}×{ch.values[0]} + {b}×{ch.values[1]} = {ch.correct}.
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold text-[var(--c-danger)]">
                <Info size={13} /> NOT QUITE — row 1 gives {a}×{ch.values[0]} + {b}×{ch.values[1]} = {ch.correct}.
              </span>
            )
          ) : (
            'Answer before reducing — this is the raw dot product.'
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
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function NoticeOrNone({ notice }: { notice: string | null }) {
  if (!notice) return null
  return <Notice message={notice} tone="error" />
}

function BlockTrace({
  steps,
  activeIdx,
  revealed,
  stepMode,
  selected,
  onSelect,
}: {
  steps: HillBlockStep[]
  activeIdx: number
  revealed: number
  stepMode: boolean
  selected: number | null
  onSelect: (i: number | null) => void
}) {
  if (steps.length === 0) {
    return (
      <p className="flex items-center gap-2 text-xs text-[var(--c-text-faint)]">
        <MousePointerClick size={14} className="text-[rgb(var(--c-core))]" />
        Run the transform to send each block through the matrix machine.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {steps.map((s, i) => {
        const isActive = i === activeIdx
        const isDone = i < revealed
        const isSel = i === selected
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(isSel ? null : i)}
            aria-pressed={isSel || isActive}
            title="Click to inspect this block"
            className={cn(
              'inline-flex min-w-[56px] flex-col items-center gap-0.5 rounded-md border px-2 py-1.5 font-mono text-xs transition-all',
              isSel && 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.12)]',
              !isSel && isActive && 'animate-pulse border-[var(--c-accent)] bg-[rgba(251,191,36,0.1)] shadow-[0_0_12px_rgba(251,191,36,0.35)]',
              !isSel && !isActive && (isDone ? 'border-[var(--c-border)]' : 'border-[rgba(148,163,184,0.1)]'),
            )}
          >
            <span className="text-[var(--c-text)]">{s.block.join('')}</span>
            <span className={cn('text-[10px] leading-none', isDone ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-faint)]')}>
              {isDone ? (stepMode || isSel ? s.outChars.join('') : '') : '··'}
            </span>
          </button>
        )
      })}
    </div>
  )
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

function HillAbout() {
  return (
    <Panel label="ABOUT" title="Hill Cipher">
      <p className="text-sm leading-relaxed text-[var(--c-text-dim)]">
        The Hill cipher treats <span className="text-[var(--c-text)]">blocks of letters as vectors</span> and
        multiplies them by a key matrix (mod 26). It was one of the first ciphers to bring linear algebra to
        cryptography.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-[var(--c-text-faint)]">
        Decryption uses the modular inverse of the key matrix, which exists only when gcd(det(K), 26) = 1. Odd-length
        messages are padded with a trailing X.
      </p>
    </Panel>
  )
}
