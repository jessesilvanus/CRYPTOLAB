import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Grid3X3,
  ArrowRight,
  ArrowLeft,
  FileOutput,
  Copy,
  Check,
  Info,
  MousePointerClick,
  Dices,
  Shuffle,
  Target,
  GraduationCap,
  Lightbulb,
  RefreshCw,
  Search,
  Layers,
  Box,
  Cpu,
  Shield,
  Zap,
  ArrowLeftRight,
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
  buildPlayfairMatrix,
  prepareDigraphs,
  prepareDigraphStages,
  getPlayfairSteps,
  playfairEncrypt,
  playfairDecrypt,
  generatePlayfairKey,
  encryptDigraph,
  ruleExplain,
  type PlayfairDigraphStep,
  type PrepStages,
} from '@/crypto/algorithms/playfair'
import { cn } from '@/utils/cn'

const DEFAULT = 'HELLO JESSE'
const DEFAULT_KEY = 'MONARCHY'

type Phase = 'idle' | 'processing' | 'complete'

/** Fixed cell geometry so the SVG connector overlay aligns exactly with the grid. */
const CELL = 44
const GAP = 6
const STEP = CELL + GAP
const SIZE = 5 * CELL + 4 * GAP
const cx = (c: number) => c * STEP + CELL / 2
const cy = (r: number) => r * STEP + CELL / 2

const MACHINE_STAGES = ['PAIR DETECTED', 'MATRIX QUERY', 'RULE LOCKED', 'TRANSFORMATION', 'OUTPUT GENERATED']

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

/** Where each letter of the active pair lands after the rule (encrypt direction). */
function outputPositions(step: PlayfairDigraphStep): [[number, number], [number, number]] {
  const [[r1, c1], [r2, c2]] = step.positions
  if (step.rule === 'ROW') return [[r1, (c1 + 1) % 5], [r2, (c2 + 1) % 5]]
  if (step.rule === 'COLUMN') return [[(r1 + 1) % 5, c1], [(r2 + 1) % 5, c2]]
  return [[r1, c2], [r2, c1]]
}

function inverseRuleLabel(rule: PlayfairDigraphStep['rule']): string {
  if (rule === 'ROW') return 'SAME ROW → SHIFT LEFT'
  if (rule === 'COLUMN') return 'SAME COLUMN → SHIFT UP'
  return 'RECTANGLE RULE → SWAP COLUMNS'
}

export function PlayfairLab() {
  const core = useCoreState()
  const meta = getCipher('playfair')

  const [plaintext, setPlaintext] = useState(DEFAULT)
  const [keyword, setKeyword] = useState(DEFAULT_KEY)
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt')
  const [phase, setPhase] = useState<Phase>('idle')
  const [steps, setSteps] = useState<PlayfairDigraphStep[]>([])
  const [revealed, setRevealed] = useState(0)
  const [cursor, setCursor] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState('')
  const [stepMode, setStepMode] = useState(false)
  const [slow, setSlow] = useState(false)
  const [math, setMath] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pipeStage, setPipeStage] = useState<PipelineStage>('plain')

  const matrix = useMemo(() => buildPlayfairMatrix(keyword), [keyword])
  const digraphs = useMemo(() => prepareDigraphs(plaintext), [plaintext])
  const prep = useMemo<PrepStages>(() => prepareDigraphStages(plaintext), [plaintext])

  // Auto-play: reveal one digraph per tick while processing.
  useEffect(() => {
    if (stepMode || phase !== 'processing') return
    if (revealed >= steps.length) {
      setPhase('complete')
      core.setSuccess()
      return
    }
    const t = window.setTimeout(() => setRevealed((c) => c + 1), slow ? 950 : 280)
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
    setPipeStage('plain')
    core.setIdle()
  }

  const run = () => {
    const clean = plaintext.replace(/[^A-Za-z]/g, '')
    if (clean.length === 0) {
      setNotice('Enter some plaintext — letters only. Spaces, digits and punctuation are removed.')
      core.setError()
      return
    }
    const s = getPlayfairSteps(plaintext, keyword)
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
    setResult(mode === 'encrypt' ? playfairEncrypt(plaintext, keyword) : playfairDecrypt(plaintext, keyword))
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
    phase === 'complete' ? 'TRANSFORMATION COMPLETE' : phase === 'processing' ? 'PAIR PROCESSING' : 'STANDBY'
  const stageLit = active ? (phase === 'complete' ? MACHINE_STAGES.length : 3) : 0

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
            {plaintext.length} CHARS · {digraphs.length} DIGRAPHS ·{' '}
            <span className="font-mono text-[rgb(var(--c-core))]">{digraphs.join(' ')}</span>
          </p>
        </Panel>

        <Panel label="KEYWORD" title="5×5 key square input">
          <div className="flex gap-2">
            <input
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                setPhase('idle')
                setSelected(null)
              }}
              aria-label="Keyword"
              maxLength={40}
              className="w-full rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2.5 font-mono text-sm text-[var(--c-text)] uppercase outline-none transition-colors focus:border-[rgb(var(--c-core))]"
              placeholder="Keyword e.g. MONARCHY"
            />
            <button
              type="button"
              onClick={() => {
                setKeyword(generatePlayfairKey())
                setPhase('idle')
                setSelected(null)
              }}
              title="Generate a random keyword"
              aria-label="Generate a random keyword"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--c-border)] px-3 text-[0.6rem] font-semibold text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
            >
              <Dices size={14} />
              RANDOM KEY
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.55rem] text-[var(--c-text-faint)]">
            <span className="mono-label">I AND J SHARE A CELL · THE SQUARE HAS NO J</span>
            <span className="mono-label font-mono text-[rgb(var(--c-core))]">
              {buildPlayfairMatrix(keyword).map((r) => r.join(' ')).join('  /  ')}
            </span>
          </div>
        </Panel>
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

      {/* Core + live matrix */}
      <Panel
        label="PLAYFAIR CORE"
        title={statusLabel}
        actions={
          <span className="flex items-center gap-2 text-[0.6rem] text-[var(--c-text-faint)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--c-core))] shadow-[0_0_6px_rgba(94,234,212,0.8)]" />
            {stepMode ? 'STEP MODE' : 'AUTO'}
          </span>
        }
      >
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <CoreScene state={core.state} className="h-48 md:h-56" fallbackLabel="PLAYFAIR" />
          <div className="space-y-4">
            <MachineStatus lit={stageLit} active={active} mode={mode} />
            <MatrixGrid matrix={matrix} active={active} mode={mode} />
            <DigraphTrace
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

      {/* Plaintext preparation pipeline */}
      <PrepPipeline prep={prep} mode={mode} />

      {/* Interactive digraph pipeline */}
      <DigraphPipeline
        stage={pipeStage}
        onStage={setPipeStage}
        prep={prep}
        active={active}
        matrix={matrix}
        result={result}
        mode={mode}
      />

      {/* Digraph inspector */}
      <DigraphInspector step={inspected} index={inspectedIdx} total={steps.length} mode={mode} />

      {/* The three rules */}
      <ThreeRules />

      {/* Step-by-step */}
      {stepMode && steps.length > 0 && (
        <Panel label="STEP BY STEP" title="Walk through one digraph at a time">
          <LabStepControls
            total={steps.length}
            revealedCount={revealed}
            cursor={cursor}
            caption={active ? active.detail : null}
            onProcess={process}
            onNext={next}
          />
        </Panel>
      )}

      {/* Mathematics */}
      {math && active && (
        <Panel label="MATHEMATICS" title="The move, in coordinates">
          <PairMath step={active} mode={mode} />
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
            <span className="font-mono text-[var(--c-text)]">{digraphs.join(' ')}</span>
            <ArrowRight size={13} className="text-[rgb(var(--c-core))]" />
            <span className="font-mono text-[rgb(var(--c-core))]">{result}</span>
          </div>
        )}
      </Panel>

      {/* Why Playfair */}
      <PlayfairWhy />

      {/* Security — star categories */}
      <PlayfairSecurity />

      {/* Learning mode */}
      <LearningMode plaintext={plaintext} />

      {/* Mini challenge */}
      <PlayfairChallenge />

      {/* Educational */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PlayfairAbout />
        <SecurityPanel meta={meta} />
      </div>
      <PlayfairWeakness />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Machine status readout                                              */
/* ------------------------------------------------------------------ */

function MachineStatus({
  lit,
  active,
  mode,
}: {
  lit: number
  active: PlayfairDigraphStep | null
  mode: 'encrypt' | 'decrypt'
}) {
  const rule = active ? (mode === 'encrypt' ? active.rule : inverseRuleLabel(active.rule)) : null
  return (
    <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {MACHINE_STAGES.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[0.5rem] font-semibold tracking-wide transition-all',
                i < lit
                  ? 'bg-[rgba(94,234,212,0.12)] text-[rgb(var(--c-core))] shadow-[0_0_8px_rgba(94,234,212,0.25)]'
                  : 'text-[var(--c-text-faint)]',
              )}
            >
              {s}
            </span>
            {i < MACHINE_STAGES.length - 1 && <ArrowRight size={10} className="text-[var(--c-text-faint)]" />}
          </div>
        ))}
      </div>
      <p className="mt-1.5 font-mono text-[0.62rem] text-[var(--c-text-dim)]">
        {rule ? (
          <>
            <span className="text-[rgb(var(--c-core))]">RULE LOCKED:</span> {rule}
          </>
        ) : (
          'Run the transform — the machine will report each stage for the active pair.'
        )}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Interactive 5×5 matrix with SVG connectors + particles              */
/* ------------------------------------------------------------------ */

function MatrixGrid({
  matrix,
  active,
  mode,
}: {
  matrix: string[][]
  active: PlayfairDigraphStep | null
  mode: 'encrypt' | 'decrypt'
}) {
  const reduced = useReducedMotion()
  const hl = active ? new Set<number>(active.positions.flat()) : new Set<number>()
  const cellIndex = (r: number, c: number) => r * 5 + c

  const out = active ? outputPositions(active) : null
  const segments: Array<[number, number, number, number]> = []
  let rectOutline: Array<[number, number, number, number]> = []
  if (active && out) {
    active.positions.forEach(([r, c], i) => segments.push([cx(c), cy(r), cx(out[i][1]), cy(out[i][0])]))
    if (active.rule === 'RECTANGLE') {
      const [[r1, c1], [r2, c2]] = active.positions
      rectOutline = [
        [cx(c1), cy(r1), cx(c2), cy(r1)],
        [cx(c2), cy(r1), cx(c2), cy(r2)],
        [cx(c2), cy(r2), cx(c1), cy(r2)],
        [cx(c1), cy(r2), cx(c1), cy(r1)],
      ]
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative inline-block">
        <div className="grid grid-cols-5 gap-[6px]" role="grid" aria-label="Playfair 5×5 key matrix">
          {matrix.map((row, r) =>
            row.map((ch, c) => {
              const idx = cellIndex(r, c)
              const on = hl.has(idx)
              return (
                <div
                  key={`${r}-${c}`}
                  role="gridcell"
                  title={`${ch} · row ${r + 1}, column ${c + 1}`}
                  style={{ width: CELL, height: CELL }}
                  className={cn(
                    'grid place-items-center rounded-md border font-mono text-sm transition-all',
                    on
                      ? 'z-10 border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.2)] text-[rgb(var(--c-core))] shadow-[0_0_16px_rgba(94,234,212,0.45)]'
                      : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] text-[var(--c-text)]',
                  )}
                >
                  {ch}
                </div>
              )
            }),
          )}
        </div>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          {rectOutline.map((s, i) => (
            <line
              key={`rect-${i}`}
              x1={s[0]}
              y1={s[1]}
              x2={s[2]}
              y2={s[3]}
              stroke="var(--c-accent)"
              strokeOpacity={0.4}
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
          ))}
          {segments.map((s, i) => (
            <g key={`seg-${i}`}>
              <line
                x1={s[0]}
                y1={s[1]}
                x2={s[2]}
                y2={s[3]}
                stroke="var(--c-core)"
                strokeOpacity={0.45}
                strokeWidth={2}
                strokeLinecap="round"
              />
              {reduced ? (
                <circle cx={s[2]} cy={s[3]} r={3} fill="var(--c-core)" />
              ) : (
                <motion.circle
                  r={3.2}
                  fill="rgb(var(--c-core))"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(94,234,212,0.9))' }}
                  animate={{ cx: [s[0], s[2]], cy: [s[1], s[3]] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 0.15 * i }}
                />
              )}
            </g>
          ))}
        </svg>
      </div>
      {active ? (
        <p className="flex items-center gap-2 rounded-full border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)] px-3 py-1 text-[0.62rem] font-medium text-[rgb(var(--c-core))]">
          <Grid3X3 size={12} />
          {mode === 'encrypt' ? active.rule : inverseRuleLabel(active.rule)} · {active.input.join('')} →{' '}
          {active.output.join('')}
        </p>
      ) : (
        <p className="text-[0.62rem] text-[var(--c-text-faint)]">
          Run the transform — the active pair glows and the rule draws the move.
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Plaintext preparation pipeline                                      */
/* ------------------------------------------------------------------ */

function PrepPipeline({ prep, mode }: { prep: PrepStages; mode: 'encrypt' | 'decrypt' }) {
  const source = mode === 'encrypt' ? 'PLAINTEXT' : 'CIPHERTEXT'
  return (
    <Panel label="PLAINTEXT PREPARATION" title="Original → normalize → handle J → split pairs">
      <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-stretch">
        <div className="space-y-2">
          <PrepStep icon={<Box size={13} />} label={source} value={prep.normalized ? source : undefined}>
            {prep.normalized || '—'}
          </PrepStep>
          <PrepStep icon={<Shuffle size={13} />} label="NORMALIZE" value={prep.normalized}>
            Uppercase, strip spaces & punctuation.
          </PrepStep>
          <PrepStep icon={<RefreshCw size={13} />} label="HANDLE J" value={prep.jHandled}>
            J is written as I (they share a cell).
          </PrepStep>
        </div>
        <div>
          <p className="mono-label mb-2 !text-[0.5rem] text-[var(--c-text-faint)]">SPLIT INTO DIGRAPHS</p>
          <div className="flex flex-wrap gap-1.5">
            {prep.digraphs.map((d, i) => (
              <div
                key={i}
                title={d.reason}
                className={cn(
                  'inline-flex flex-col items-center gap-0.5 rounded-md border px-2.5 py-1.5 font-mono text-xs',
                  d.kind === 'valid' && 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)]',
                  d.kind === 'repeated' && 'border-[rgba(251,191,36,0.5)] bg-[rgba(251,191,36,0.08)]',
                  d.kind === 'padding' && 'border-[rgba(167,139,250,0.5)] bg-[rgba(167,139,250,0.08)]',
                )}
              >
                <span className="text-[var(--c-text)]">{d.pair}</span>
                <span
                  className={cn(
                    'text-[0.45rem] font-semibold tracking-wide',
                    d.kind === 'repeated' && 'text-[var(--c-accent)]',
                    d.kind === 'padding' && 'text-[#a78bfa]',
                    d.kind === 'valid' && 'text-[var(--c-text-faint)]',
                  )}
                >
                  {d.kind.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
            <Info size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
            Repeated letters are split with an X (<span className="text-[var(--c-accent)]">amber</span>); an odd tail
            is padded with a final X (<span className="text-[#a78bfa]">violet</span>).
          </p>
        </div>
      </div>
    </Panel>
  )
}

function PrepStep({
  icon,
  label,
  value,
  children,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2">
      <p className="mono-label flex items-center gap-1.5 !text-[0.5rem] text-[var(--c-text-faint)]">
        {icon}
        {label}
      </p>
      {value && <p className="mt-1 font-mono text-sm text-[rgb(var(--c-core))] break-all">{value}</p>}
      <p className="mt-0.5 text-[0.6rem] text-[var(--c-text-faint)]">{children}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Interactive digraph pipeline (clickable machine modules)            */
/* ------------------------------------------------------------------ */

type PipelineStage = 'plain' | 'normalize' | 'build' | 'matrix' | 'rule' | 'cipher'

const PIPELINE: Array<{ id: PipelineStage; label: string; icon: React.ReactNode }> = [
  { id: 'plain', label: 'PLAINTEXT', icon: <Box size={13} /> },
  { id: 'normalize', label: 'NORMALIZER', icon: <Shuffle size={13} /> },
  { id: 'build', label: 'DIGRAPH BUILDER', icon: <Layers size={13} /> },
  { id: 'matrix', label: 'MATRIX', icon: <Grid3X3 size={13} /> },
  { id: 'rule', label: 'RULE', icon: <Zap size={13} /> },
  { id: 'cipher', label: 'CIPHERTEXT', icon: <Cpu size={13} /> },
]

function DigraphPipeline({
  stage,
  onStage,
  prep,
  active,
  matrix,
  result,
  mode,
}: {
  stage: PipelineStage
  onStage: (s: PipelineStage) => void
  prep: PrepStages
  active: PlayfairDigraphStep | null
  matrix: string[][]
  result: string
  mode: 'encrypt' | 'decrypt'
}) {
  const captions: Record<PipelineStage, string> = {
    plain: mode === 'encrypt' ? `Raw input: “${prep.normalized || '—'}”` : `Ciphertext enters the machine.`,
    normalize: `Uppercased, spaces & punctuation stripped → ${prep.normalized || '—'}`,
    build: `Split into pairs → ${prep.digraphs.map((d) => d.pair).join(' ') || '—'}`,
    matrix: `Each letter is found in the 5×5 square → ${matrix.map((r) => r.join('')).join(' ')}`,
    rule:
      active?.rule === 'RECTANGLE'
        ? 'Rectangle rule — swap columns across the rectangle corners.'
        : active?.rule
          ? `${active.rule} — the letters line up, so they shift.`
          : 'The rule for the active pair appears here.',
    cipher: `Output ${result ? `→ ${result}` : '—'}`,
  }
  const stageIdx = PIPELINE.findIndex((p) => p.id === stage)
  return (
    <Panel label="DIGRAPH PIPELINE" title="Tap any module to inspect it">
      <div className="flex flex-wrap items-center gap-1.5">
        {PIPELINE.map((p, i) => (
          <div key={p.id} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onStage(p.id)}
              aria-pressed={stage === p.id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-2 font-mono text-[0.6rem] font-semibold transition-all',
                i <= stageIdx
                  ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.08)] text-[rgb(var(--c-core))]'
                  : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] text-[var(--c-text-dim)]',
                stage === p.id && 'shadow-[0_0_12px_rgba(94,234,212,0.35)]',
              )}
            >
              {p.icon}
              {p.label}
            </button>
            {i < PIPELINE.length - 1 && <ArrowRight size={12} className="text-[var(--c-text-faint)]" />}
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
/* Digraph inspector                                                   */
/* ------------------------------------------------------------------ */

function DigraphInspector({
  step,
  index,
  total,
  mode,
}: {
  step: PlayfairDigraphStep | null
  index: number | null
  total: number
  mode: 'encrypt' | 'decrypt'
}) {
  if (!step) {
    return (
      <Panel label="DIGRAPH INSPECTOR" title="Click a pair to inspect it">
        <p className="flex items-center gap-2 text-xs text-[var(--c-text-faint)]">
          <Search size={14} className="text-[rgb(var(--c-core))]" />
          {total === 0
            ? 'Run the transform, then click any pair to open it in the inspector.'
            : 'Click any pair above (or the active one) to inspect its full journey.'}
        </p>
      </Panel>
    )
  }
  const [a, b] = step.input
  const [[r1, c1], [r2, c2]] = step.positions
  const [oa, ob] = step.output
  const why = ruleExplain(step.rule, a, b, oa, ob)
  return (
    <Panel
      label="DIGRAPH INSPECTOR"
      title={`PAIR ${index == null ? '—' : index + 1}/${total}`}
      actions={<span className="mono-label !text-[0.55rem] text-[rgb(var(--c-core))]">{step.rule}</span>}
    >
      <div className="grid gap-3 sm:grid-cols-5">
        <InspectBox label="INPUT PAIR">
          <p className="font-mono text-xl text-[var(--c-text)]">
            {a} {b}
          </p>
        </InspectBox>
        <InspectBox label="POSITION">
          <p className="font-mono text-xs text-[var(--c-text-dim)]">
            ({r1 + 1},{c1 + 1}) & ({r2 + 1},{c2 + 1})
          </p>
        </InspectBox>
        <InspectBox label="RULE">
          <p className="font-mono text-xs text-[rgb(var(--c-core))]">
            {mode === 'encrypt' ? step.rule : inverseRuleLabel(step.rule)}
          </p>
        </InspectBox>
        <InspectBox label="TRANSFORMATION">
          <p className="flex items-center gap-1 font-mono text-sm text-[var(--c-text)]">
            {a}
            <ArrowRight size={12} className="text-[rgb(var(--c-core))]" />
            {oa} &nbsp;{b}
            <ArrowRight size={12} className="text-[rgb(var(--c-core))]" />
            {ob}
          </p>
        </InspectBox>
        <InspectBox label="OUTPUT" accent>
          <p className="font-mono text-xl text-[rgb(var(--c-core))]">
            {oa} {ob}
          </p>
        </InspectBox>
      </div>
      <p className="mt-3 flex items-start gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <Lightbulb size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
        {why}
      </p>
    </Panel>
  )
}

function InspectBox({
  label,
  children,
  accent,
}: {
  label: string
  children: React.ReactNode
  accent?: boolean
}) {
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
/* The three rules                                                     */
/* ------------------------------------------------------------------ */

function ThreeRules() {
  const rows = [
    {
      rule: 'ROW',
      icon: <ArrowRight size={14} />,
      when: 'Two letters share the same row.',
      move: 'Shift each letter one step right (wrap at the edge).',
      example: 'HE → CF',
    },
    {
      rule: 'COLUMN',
      icon: <ArrowRight size={14} className="-rotate-90" />,
      when: 'Two letters share the same column.',
      move: 'Shift each letter one step down (wrap at the bottom).',
      example: 'SI → RQ',
    },
    {
      rule: 'RECTANGLE',
      icon: <Grid3X3 size={14} />,
      when: 'Two letters are in different rows and columns.',
      move: 'Swap columns — each letter takes the other’s column in its own row.',
      example: 'ES → SI',
    },
  ]
  return (
    <Panel label="THE THREE RULES" title="Every digraph obeys exactly one rule">
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.rule} className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.08)] text-[rgb(var(--c-core))]">
                {r.icon}
              </span>
              <span className="mono-label font-semibold text-[rgb(var(--c-core))]">{r.rule}</span>
            </div>
            <p className="mt-2 text-xs text-[var(--c-text)]">{r.when}</p>
            <p className="mt-1 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">{r.move}</p>
            <p className="mt-2 border-t border-[var(--c-border)] pt-2 font-mono text-sm text-[rgb(var(--c-core))]">
              {r.example}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Coordinate mathematics                                              */
/* ------------------------------------------------------------------ */

function PairMath({ step, mode }: { step: PlayfairDigraphStep; mode: 'encrypt' | 'decrypt' }) {
  const [a, b] = step.input
  const [[r1, c1], [r2, c2]] = step.positions
  const [oa, ob] = step.output
  const out = outputPositions(step)
  const rule = mode === 'encrypt' ? step.rule : step.rule
  const sign = mode === 'encrypt' ? '+1' : '−1'
  const move =
    rule === 'ROW'
      ? `column ${sign} (mod 5)`
      : rule === 'COLUMN'
        ? `row ${sign} (mod 5)`
        : 'swap columns (same row, other’s column)'
  const lines: Array<{ from: string; at: string; to: string; out: string; letter: string }> = [
    {
      from: a,
      at: `(${r1 + 1}, ${c1 + 1})`,
      to: `(${out[0][0] + 1}, ${out[0][1] + 1})`,
      out: oa,
      letter: oa,
    },
    {
      from: b,
      at: `(${r2 + 1}, ${c2 + 1})`,
      to: `(${out[1][0] + 1}, ${out[1][1] + 1})`,
      out: ob,
      letter: ob,
    },
  ]
  return (
    <div className="space-y-3">
      <p className="mono-label !text-[0.55rem] text-[var(--c-text-dim)]">
        {rule} — {move}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="text-left text-[var(--c-text-faint)]">
              <th className="border-b border-[var(--c-border)] py-1.5 pr-3 font-medium">INPUT</th>
              <th className="border-b border-[var(--c-border)] py-1.5 pr-3 font-medium">POSITION</th>
              <th className="border-b border-[var(--c-border)] py-1.5 pr-3 font-medium">RULE MOVE</th>
              <th className="border-b border-[var(--c-border)] py-1.5 pr-3 font-medium">NEW POSITION</th>
              <th className="border-b border-[var(--c-border)] py-1.5 font-medium">OUTPUT</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="text-[var(--c-text)]">
                <td className="py-1.5 pr-3">{l.from}</td>
                <td className="py-1.5 pr-3 text-[var(--c-text-dim)]">{l.at}</td>
                <td className="py-1.5 pr-3 text-[rgb(var(--c-core))]">{move}</td>
                <td className="py-1.5 pr-3 text-[var(--c-text-dim)]">{l.to}</td>
                <td className="py-1.5 text-[rgb(var(--c-core))]">{l.out}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
        Coordinates are 1-indexed for readability. “(mod 5)” means wrap around: column 5 → 1, row 5 → 1. On
        decryption the shift is reversed. Output letters read straight from the square at the new positions.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Why Playfair                                                        */
/* ------------------------------------------------------------------ */

function PlayfairWhy() {
  return (
    <Panel label="WHY PLAYFAIR?" title="Letter → Letter vs Pair → Pair">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[var(--c-accent)]">MONOALPHABETIC (CAESAR / SUBSTITUTION)</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--c-text-dim)]">
            Each letter is replaced independently. Because the same letter always maps the same way, letter
            frequencies leak straight through — ‘E’ is always the same cipher letter.
          </p>
        </div>
        <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.05)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">PLAYFAIR (PAIR → PAIR)</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--c-text-dim)]">
            Letters are handled two at a time, and the same letter can map to different letters depending on its
            partner and its position in the square. That hides single-letter frequencies — but digraph
            (pair-of-letters) patterns still survive.
          </p>
        </div>
      </div>
      <p className="mt-3 flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
        Playfair is a step up from a monoalphabetic cipher precisely because it breaks the fixed one-to-one letter
        mapping — yet its 5×5 structure and pair-rule behaviour keep it far from modern security.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Security — star categories                                          */
/* ------------------------------------------------------------------ */

const SECURITY_ROWS: Array<{ name: string; stars: number; note: string; warn: boolean }> = [
  { name: 'HISTORICAL STRENGTH', stars: 5, note: 'First practical digraph cipher; British military in WWI.', warn: false },
  { name: 'MODERN SECURITY', stars: 1, note: 'Fully broken — never use for real communication.', warn: true },
  { name: 'KEY SPACE', stars: 2, note: '~25! keyword arrangements, but the 5×5 structure limits it.', warn: true },
  { name: 'CRYPTOANALYSIS', stars: 2, note: 'Falls to digraph-frequency and known-plaintext analysis.', warn: true },
  { name: 'PATTERN LEAKAGE', stars: 2, note: 'Digraph structure survives; identical pairs encrypt identically.', warn: true },
  { name: 'KNOWN ATTACKS', stars: 1, note: 'Easy for any modern analyst to break.', warn: true },
]

function StarBar({ n }: { n: number }) {
  return (
    <span className="font-mono text-[0.6rem] tracking-tight text-[var(--c-accent)]" aria-label={`${n} out of 5`}>
      {'★'.repeat(n)}
      <span className="text-[var(--c-text-faint)]">{'★'.repeat(5 - n)}</span>
    </span>
  )
}

function PlayfairSecurity() {
  return (
    <Panel label="SECURITY ANALYSIS" title="Where Playfair stands, category by category" actions={<Shield size={15} className="text-[var(--c-accent)]" />}>
      <div className="space-y-2">
        {SECURITY_ROWS.map((r) => (
          <div
            key={r.name}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2"
          >
            <div className="min-w-0">
              <p className="mono-label !text-[0.55rem] font-semibold text-[var(--c-text)]">{r.name}</p>
              <p className="text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">{r.note}</p>
            </div>
            <StarBar n={r.stars} />
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
        More stars = more of that quality. For security-style categories (modern security, cryptoanalysis, pattern
        leakage, known attacks) more stars means <span className="text-[var(--c-text)]">worse</span> — a teaching
        simulator, not a modern cipher.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Learning mode                                                       */
/* ------------------------------------------------------------------ */

const LEARN: Array<{ n: string; title: string; body: string }> = [
  { n: '01', title: 'What is Playfair?', body: 'A digraph substitution cipher: it encrypts pairs of letters, not single ones, using a 5×5 square built from a keyword.' },
  { n: '02', title: 'The 5×5 square', body: 'The square holds 25 letters. You read it by row and column, and every letter has an (r, c) coordinate — that coordinate is what drives the rules.' },
  { n: '03', title: 'I and J share a cell', body: 'There are 26 letters but only 25 cells, so I and J are folded together (J is written as I). Any J in your input becomes an I.' },
  { n: '04', title: 'The keyword fills the square', body: 'Write the keyword first, dropping repeats and keeping the first occurrence, then fill the remaining alphabet. The keyword is your secret key.' },
  { n: '05', title: 'Preparing the plaintext', body: 'Uppercase everything, drop spaces and punctuation, split repeated letters with an X, and pad an odd tail with a final X.' },
  { n: '06', title: 'The three rules', body: 'Same row → shift right. Same column → shift down. Different row and column → swap columns (the rectangle rule).' },
  { n: '07', title: 'Encrypting a digraph', body: 'Look up both letters, apply the one rule that applies, and write the two new letters. Repeat for every pair.' },
  { n: '08', title: 'Decryption reverses it', body: 'Shift left instead of right, up instead of down, and the rectangle swap is its own inverse. Remove the filler X at the end.' },
  { n: '09', title: 'Why it beats monoalphabetic', body: 'A letter’s ciphertext depends on its partner and position, so the same letter can map to many cipher letters — hiding simple frequencies.' },
  { n: '10', title: 'Try it yourself', body: 'Use the lab: pick any keyword, run the transform, step through the digraphs, and read the WHY text for each pair. Playfair clicks fastest by doing.' },
]

function LearningMode({ plaintext }: { plaintext: string }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <Panel
      label="LEARNING MODE"
      title="Ten steps to mastering Playfair"
      actions={<GraduationCap size={16} className="text-[rgb(var(--c-core))]" />}
    >
      <div className="space-y-1.5">
        {LEARN.map((s, i) => (
          <div key={s.n} className="overflow-hidden rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)]">
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[rgba(94,234,212,0.04)]"
            >
              <span className="mono-label !text-[0.5rem] font-semibold text-[rgb(var(--c-core))]">{s.n}</span>
              <span className="flex-1 text-xs font-medium text-[var(--c-text)]">{s.title}</span>
              <ArrowLeftRight size={12} className={cn('text-[var(--c-text-faint)] transition-transform', open === i && 'rotate-180')} />
            </button>
            {open === i && (
              <div className="border-t border-[var(--c-border)] px-3 py-2.5">
                <p className="text-[0.68rem] leading-relaxed text-[var(--c-text-dim)]">{s.body}</p>
                {i === 9 && plaintext && (
                  <p className="mt-2 font-mono text-[0.62rem] text-[rgb(var(--c-core))]">
                    Your plaintext: {plaintext}
                  </p>
                )}
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

interface Challenge {
  matrix: string[][]
  pair: string
  options: string[]
  correct: string
}

const CHALLENGE_WORDS = ['BALLOON', 'PENCIL', 'CRYPT', 'MONEY', 'COFFEE', 'HELLO', 'WATER', 'PLANET', 'JACKET', 'QUIET']

function makeChallenge(): Challenge {
  const word = CHALLENGE_WORDS[Math.floor(Math.random() * CHALLENGE_WORDS.length)]
  const kw = generatePlayfairKey()
  const m = buildPlayfairMatrix(kw)
  const pairs = prepareDigraphs(word)
  const pair = pairs[Math.floor(Math.random() * pairs.length)]
  const [oa, ob] = encryptDigraph(m, pair[0], pair[1])
  const correct = oa + ob
  const opts = new Set<string>([correct])
  const alts = [pair[1] + pair[0], pair[0] + pair[0], ob + oa, pair[1] + ob]
  for (const a of alts) {
    if (opts.size < 4) opts.add(a)
  }
  const arr = [...opts].sort(() => Math.random() - 0.5)
  return { matrix: m, pair, options: arr, correct }
}

function MiniMatrix({ matrix, pair }: { matrix: string[][]; pair: string }) {
  const reduced = useReducedMotion()
  const pos: Array<[number, number]> = []
  for (const ch of pair.split('')) {
    for (let r = 0; r < 5; r++) {
      const c = matrix[r].indexOf(ch)
      if (c >= 0) pos.push([r, c])
    }
  }
  const hl = new Set(pos.flat())
  return (
    <div className="relative inline-block">
      <div className="grid grid-cols-5 gap-[6px]" role="grid" aria-label="Challenge matrix">
        {matrix.map((row, r) =>
          row.map((ch, c) => {
            const on = hl.has(r * 5 + c)
            return (
              <div
                key={`${r}-${c}`}
                style={{ width: CELL - 8, height: CELL - 8 }}
                className={cn(
                  'grid place-items-center rounded-md border font-mono text-xs transition-all',
                  on
                    ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.2)] text-[rgb(var(--c-core))]'
                    : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] text-[var(--c-text-dim)]',
                )}
              >
                {ch}
              </div>
            )
          }),
        )}
      </div>
      {!reduced && (
        <motion.div
          className="pointer-events-none absolute -inset-1 rounded-xl border border-[rgb(var(--c-core))]"
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  )
}

function PlayfairChallenge() {
  const [ch, setCh] = useState<Challenge>(() => makeChallenge())
  const [picked, setPicked] = useState<string | null>(null)
  const answered = picked !== null
  const correct = answered && picked === ch.correct

  const newPair = () => {
    setCh(makeChallenge())
    setPicked(null)
  }

  return (
    <Panel label="MINI CHALLENGE" title="Predict the ciphertext pair" actions={<Target size={15} className="text-[rgb(var(--c-core))]" />}>
      <div className="grid items-start gap-4 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-2">
          <MiniMatrix matrix={ch.matrix} pair={ch.pair} />
          <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">KEYWORD MATRIX</p>
        </div>
        <div>
          <p className="text-sm text-[var(--c-text)]">
            Encrypt the digraph <span className="font-mono text-lg text-[rgb(var(--c-core))]">{ch.pair}</span> — which
            pair comes out?
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
                    <Check size={13} /> CORRECT — well spotted!
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-semibold text-[var(--c-danger)]">
                    <Info size={13} /> NOT QUITE — the right answer is {ch.correct}.
                  </span>
                )
              ) : (
                'Click your answer — you’ll get instant feedback.'
              )}
            </p>
            <button
              type="button"
              onClick={newPair}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] px-3 py-1.5 text-[0.6rem] text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
            >
              <RefreshCw size={12} />
              NEW PAIR
            </button>
          </div>
        </div>
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

function DigraphTrace({
  steps,
  activeIdx,
  revealed,
  stepMode,
  selected,
  onSelect,
}: {
  steps: PlayfairDigraphStep[]
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
        Run the transform to send each digraph through the square.
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
            title="Click to inspect this pair"
            className={cn(
              'inline-flex min-w-[52px] flex-col items-center gap-0.5 rounded-md border px-2 py-1.5 font-mono text-xs transition-all',
              isSel && 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.12)]',
              !isSel && isActive && 'animate-pulse border-[var(--c-accent)] bg-[rgba(251,191,36,0.1)] shadow-[0_0_12px_rgba(251,191,36,0.35)]',
              !isSel && !isActive && (isDone ? 'border-[var(--c-border)]' : 'border-[rgba(148,163,184,0.1)]'),
            )}
          >
            <span className="text-[var(--c-text)]">{s.pair}</span>
            <span className={cn('text-[10px] leading-none', isDone ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-faint)]')}>
              {isDone ? (stepMode || isSel ? s.output.join('') : '') : '··'}
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

function PlayfairAbout() {
  return (
    <Panel label="ABOUT" title="Playfair Cipher">
      <p className="text-sm leading-relaxed text-[var(--c-text-dim)]">
        The Playfair cipher encrypts <span className="text-[var(--c-text)]">pairs of letters</span> (digraphs) using a
        5×5 square built from a keyword. It was the first practical digraph cipher and was used by the British
        military in the early 20th century.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-[var(--c-text-faint)]">
        <span className="text-[var(--c-text)]">I/J handling:</span> the square holds 25 letters, so I and J share a
        single cell (J is written as I). Repeated letters in a pair are split with an X, and an odd message is padded
        with a final X.
      </p>
    </Panel>
  )
}

function PlayfairWeakness() {
  return (
    <Panel label="WHY IS IT WEAK?" title="Better than Caesar, still breakable">
      <p className="flex items-start gap-2 text-xs leading-relaxed text-[var(--c-text-dim)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
        Encrypting digraphs hides single-letter frequencies, but the digraph structure survives — so digraph-frequency
        analysis and known-plaintext attacks still break it. It is educational, not modern security.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-sm">
        <span className="text-[var(--c-text)]">HE</span>
        <ArrowRight size={13} className="text-[rgb(var(--c-core))]" />
        <span className="text-[rgb(var(--c-core))]">CF</span>
        <ArrowLeft size={13} className="text-[var(--c-text-faint)]" />
        <span className="text-[var(--c-text)]">SU</span>
        <ArrowRight size={13} className="text-[rgb(var(--c-core))]" />
        <span className="text-[rgb(var(--c-core))]">PM</span>
      </div>
    </Panel>
  )
}
