import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  ArrowDown,
  ArrowRight,
  Check,
  X,
  KeyRound,
  Blocks,
  Cpu,
  Shield,
  Target,
  Zap,
  GraduationCap,
  MousePointerClick,
  Lock,
  Unlock,
  Layers,
  BookOpen,
  FlaskConical,
  Gauge,
  FunctionSquare,
} from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Panel } from '@/components/ui/Panel'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/utils/cn'
import {
  desBlock,
  desKeySchedule,
  desEncryptBlockHex,
  textToHex,
  validateBlockHex,
  validateKeyHex,
  DES_TEST_VECTOR,
  DES_IP,
  DES_FP,
  DES_E,
  DES_SBOXES,
  type DesTrace,
  type DesKeySchedule,
} from '@/crypto/algorithms/des'

const SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]

/* ================================================================== */
/* DesLab — top-level state + layout                                   */
/* ================================================================== */

export function DesLab() {
  const reduced = useReducedMotion()
  const [inputMode, setInputMode] = useState<'text' | 'hex'>('hex')
  const [plainText, setPlainText] = useState('HELLO 12')
  const [blockHex, setBlockHex] = useState(DES_TEST_VECTOR.plain)
  const [keyHex, setKeyHex] = useState(DES_TEST_VECTOR.key)
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt')
  const [round, setRound] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal')
  const [mathOn, setMathOn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vectorRun, setVectorRun] = useState<'idle' | 'pass' | 'fail' | 'info'>('idle')

  // ---- input handling -------------------------------------------------
  const setInputText = (v: string) => {
    setPlainText(v)
    setInputMode('text')
    setError(null)
    if (v.length > 8) {
      setError('TEXT MODE IS SINGLE-BLOCK — exactly 8 bytes fit one DES block. This lab demonstrates the core 64-bit block; longer messages need a block-chaining mode not built here.')
      return
    }
    if (v.length === 8) setBlockHex(textToHex(v))
  }

  const setInputHex = (v: string) => {
    setBlockHex(v.toUpperCase())
    setInputMode('hex')
    setError(null)
  }

  const applyHex = () => {
    const v = validateBlockHex(blockHex)
    if (!v.valid) {
      setError(v.message ?? 'INVALID BLOCK')
      return
    }
    setError(null)
  }

  const setKey = (v: string) => {
    setKeyHex(v.toUpperCase())
    setError(null)
  }

  const reset = () => {
    setPlaying(false)
    setRound(0)
    setError(null)
    setVectorRun('idle')
    setMode('encrypt')
    setBlockHex(DES_TEST_VECTOR.plain)
    setKeyHex(DES_TEST_VECTOR.key)
    setInputMode('hex')
  }

  // ---- validation -----------------------------------------------------
  const blockValid = validateBlockHex(blockHex)
  const keyValid = validateKeyHex(keyHex)

  const runVector = () => {
    const out = desEncryptBlockHex(DES_TEST_VECTOR.plain, DES_TEST_VECTOR.key)
    setVectorRun(out.toUpperCase() === DES_TEST_VECTOR.expected ? 'pass' : 'fail')
  }

  // ---- single source of truth ----------------------------------------
  const trace = useMemo<DesTrace>(
    () => (blockValid.valid && keyValid.valid ? desBlock(blockHex, keyHex, mode) : desBlock('', '', 'encrypt')),
    [blockHex, keyHex, mode, blockValid.valid, keyValid.valid],
  )
  const schedule = useMemo<DesKeySchedule>(() => desKeySchedule(keyHex), [keyHex])

  // ---- round playback -------------------------------------------------
  const speedMs = speed === 'slow' ? 950 : speed === 'normal' ? 500 : 170
  useEffect(() => {
    if (!playing || reduced) {
      setPlaying(false)
      return
    }
    const id = setInterval(() => {
      setRound((r) => {
        if (r >= 15) {
          setPlaying(false)
          return 15
        }
        return r + 1
      })
    }, speedMs)
    return () => clearInterval(id)
  }, [playing, speedMs, reduced])

  const usable = blockValid.valid && keyValid.valid
  const r = Math.min(round, 15)

  return (
    <div className="space-y-6">
      <SectionHeading
        kicker="MODULE 03 // BLOCK CIPHER"
        title="DES Block Cipher Laboratory"
        sub="DES is not a magic encrypt button. Watch your 64-bit block travel through the initial permutation, sixteen Feistel rounds, the key schedule and the final permutation — using the real DES tables."
        actions={<Blocks size={18} className="text-[rgb(var(--c-core))]" />}
      />

      {/* Standard test vector */}
      <Panel label="FIPS-81 STANDARD TEST VECTOR" title="Prove the engine is real" actions={<FlaskConical size={16} className="text-[rgb(var(--c-core))]" />}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 font-mono text-[0.6rem] text-[var(--c-text-dim)]">
            <p><span className="text-[var(--c-text-faint)]">PLAINTEXT </span><span className="text-[var(--c-text)]">{DES_TEST_VECTOR.plain}</span></p>
            <p><span className="text-[var(--c-text-faint)]">KEY </span><span className="text-[var(--c-text)]">{DES_TEST_VECTOR.key}</span></p>
            <p><span className="text-[var(--c-text-faint)]">EXPECTED </span><span className="text-[rgb(var(--c-core))]">{DES_TEST_VECTOR.expected}</span></p>
          </div>
          <button
            type="button"
            onClick={runVector}
            className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--c-core))] px-4 py-2 text-xs font-medium text-[rgb(var(--c-core))] transition-colors hover:bg-[rgba(94,234,212,0.1)]"
          >
            <FlaskConical size={14} /> RUN STANDARD TEST VECTOR
          </button>
        </div>
        {vectorRun !== 'idle' && (
          <div
            className={cn(
              'mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium',
              vectorRun === 'pass'
                ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.1)] text-[rgb(var(--c-core))]'
                : 'border-[var(--c-danger)] bg-[rgba(248,113,113,0.1)] text-[var(--c-danger)]',
            )}
          >
            {vectorRun === 'pass' ? <Check size={14} /> : <X size={14} />}
            {vectorRun === 'pass' ? 'PASS ✓ — the engine reproduces the official DES result.' : 'FAIL ✕ — check the engine tables.'}
          </div>
        )}
      </Panel>

      {/* Block cipher concept */}
      <BlockConcept />

      {/* Input panel */}
      <Panel label="DES INPUT" title="One 64-bit block · one 64-bit key" actions={<Cpu size={16} className="text-[rgb(var(--c-core))]" />}>
        <div className="mb-4 flex flex-wrap gap-2">
          <ModeToggle active={inputMode === 'text'} onClick={() => setInputMode('text')} label="TEXT MODE" />
          <ModeToggle active={inputMode === 'hex'} onClick={() => setInputMode('hex')} label="HEX MODE" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Block input */}
          <div>
            <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">
              {inputMode === 'text' ? 'PLAINTEXT · 8 BYTES' : 'PLAINTEXT BLOCK · 16 HEX DIGITS = 64 BITS'}
            </p>
            {inputMode === 'text' ? (
              <textarea
                value={plainText}
                onChange={(e) => setInputText(e.target.value)}
                rows={2}
                aria-label="DES plaintext text input (8 bytes)"
                className="mt-1 w-full resize-none rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-3 font-mono text-sm text-[var(--c-text)] outline-none focus:border-[rgb(var(--c-core))]"
              />
            ) : (
              <input
                value={blockHex}
                onChange={(e) => setInputHex(e.target.value)}
                onBlur={applyHex}
                aria-label="DES plaintext block in hex (16 characters)"
                className="mt-1 w-full rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2.5 font-mono text-sm tracking-widest text-[rgb(var(--c-core))] outline-none focus:border-[rgb(var(--c-core))]"
              />
            )}
            {inputMode === 'text' && plainText.length !== 8 && (
              <p className="mt-1 text-[0.58rem] text-[var(--c-accent)]">
                {plainText.length < 8 ? `${8 - plainText.length} byte(s) to fill the block.` : 'Longer input is single-block only — see note below.'}
              </p>
            )}
            {inputMode === 'hex' && (
              <p className={cn('mt-1 text-[0.58rem]', blockValid.valid ? 'text-[var(--c-text-faint)]' : 'text-[var(--c-danger)]')}>
                {blockValid.valid ? `${blockHex.length} chars · 64 bits ✓` : (blockValid.message ?? '')}
              </p>
            )}
            <p className="mt-2 flex items-start gap-1.5 text-[0.58rem] leading-relaxed text-[var(--c-text-faint)]">
              <Info size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
              This laboratory demonstrates the core single-block DES operation. Longer messages are not silently truncated — TEXT MODE explains they need a block-chaining mode.
            </p>
          </div>

          {/* Key input */}
          <div>
            <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">KEY · 16 HEX DIGITS = 64 BITS</p>
            <input
              value={keyHex}
              onChange={(e) => setKey(e.target.value)}
              aria-label="DES key in hex (16 characters)"
              className="mt-1 w-full rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2.5 font-mono text-sm tracking-widest text-[var(--c-accent)] outline-none focus:border-[rgb(var(--c-core))]"
            />
            <div className="mt-2 space-y-0.5 font-mono text-[0.58rem] text-[var(--c-text-dim)]">
              <p><span className="text-[var(--c-text-faint)]">64-BIT SUPPLIED KEY</span> → <span className="text-[rgb(var(--c-core))]">56 EFFECTIVE KEY BITS</span></p>
              <p className="text-[var(--c-text-faint)]">8 of the 64 bits are parity bits, removed by PC-1.</p>
            </div>
            <p className={cn('mt-1 text-[0.58rem]', keyValid.valid ? 'text-[var(--c-text-faint)]' : 'text-[var(--c-danger)]')}>
              {keyValid.valid ? 'valid 64-bit key ✓' : (keyValid.message ?? '')}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-[var(--c-danger)] bg-[rgba(248,113,113,0.06)] px-3 py-2 text-[0.6rem] leading-relaxed text-[var(--c-danger)]">
            <X size={14} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {/* Controls */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!usable}
            onClick={() => setMode('encrypt')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition-colors disabled:opacity-40',
              mode === 'encrypt' ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.12)] text-[rgb(var(--c-core))]' : 'border-[var(--c-border)] text-[var(--c-text-dim)]',
            )}
          >
            <Lock size={13} /> ENCRYPT
          </button>
          <button
            type="button"
            disabled={!usable}
            onClick={() => setMode('decrypt')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition-colors disabled:opacity-40',
              mode === 'decrypt' ? 'border-[var(--c-accent)] bg-[rgba(245,197,66,0.12)] text-[var(--c-accent)]' : 'border-[var(--c-border)] text-[var(--c-text-dim)]',
            )}
          >
            <Unlock size={13} /> DECRYPT
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
          >
            <RotateCcw size={13} /> RESET
          </button>
          <label className="ml-auto flex items-center gap-2 text-[0.58rem] text-[var(--c-text-faint)]">
            SHOW MATHEMATICS
            <button
              type="button"
              role="switch"
              aria-checked={mathOn}
              onClick={() => setMathOn((v) => !v)}
              className={cn('relative h-5 w-9 rounded-full border transition-colors', mathOn ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.2)]' : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.3)]')}
            >
              <span className={cn('absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all', mathOn ? 'left-[18px] bg-[rgb(var(--c-core))]' : 'left-0.5 bg-[var(--c-text-faint)]')} />
            </button>
          </label>
        </div>

        {/* Result */}
        {usable && trace.valid && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
              <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">INPUT BLOCK (64 BITS)</p>
              <p className="mt-1 break-all font-mono text-xs text-[var(--c-text)]">{trace.blockBits}</p>
            </div>
            <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.05)] p-3">
              <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">{mode === 'encrypt' ? 'CIPHERTEXT' : 'RECOVERED PLAINTEXT'}</p>
              <p className="mt-1 break-all font-mono text-xs text-[rgb(var(--c-core))]">{trace.fpOut}</p>
              <p className="mt-1 font-mono text-[0.6rem] text-[var(--c-text-dim)]">HEX {trace.cipherHex}</p>
            </div>
          </div>
        )}
      </Panel>

      {/* Pipeline */}
      <Pipeline trace={trace} usable={usable} mode={mode} round={r} onRound={setRound} />

      {/* Round controller + animation */}
      <RoundController
        trace={trace}
        usable={usable}
        round={r}
        setRound={setRound}
        playing={playing}
        setPlaying={setPlaying}
        speed={speed}
        setSpeed={setSpeed}
        reduced={reduced}
        mathOn={mathOn}
      />

      {/* Key schedule lab */}
      <KeyScheduleLab schedule={schedule} usable={usable} round={r} />

      {/* F-function detail */}
      <FFunctionLab trace={trace} usable={usable} round={r} />

      {/* Permutation + bit tracing */}
      <PermutationLab trace={trace} usable={usable} />

      {/* Trace this bit */}
      <TraceThisBit trace={trace} usable={usable} />

      {/* S-box lab */}
      <SBoxLab trace={trace} usable={usable} round={r} />

      {/* Decryption explanation */}
      <DecryptionNote />

      {/* Security analysis */}
      <SecurityAnalysis />

      {/* DES vs modern */}
      <DesVsModern />

      {/* Why DES */}
      <WhyDes />

      {/* Learn DES */}
      <LearnDes />

      {/* Challenge */}
      <DesChallenge />
    </div>
  )
}

/* ================================================================== */
/* Small shared helpers                                                 */
/* ================================================================== */

function Info({ size, className }: { size?: number; className?: string }) {
  return <svg width={size ?? 16} height={size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
}

function ModeToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-1.5 text-[0.6rem] font-medium transition-colors',
        active ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.12)] text-[rgb(var(--c-core))]' : 'border-[var(--c-border)] text-[var(--c-text-dim)] hover:text-[var(--c-text)]',
      )}
    >
      {label}
    </button>
  )
}

/** Strip grouping spaces from a binary string. */
function b(s: string): string {
  return s.replace(/[^01]/g, '')
}

/** Render a binary string as clickable grouped chips. */
function BitRow({
  bits,
  group,
  selected,
  onSelect,
  accent,
}: {
  bits: string
  group: number
  selected?: number[]
  onSelect?: (i: number) => void
  accent?: boolean
}) {
  const clean = bits.split(' ').join('')
  const pos = clean.split('')
  return (
    <div className="flex flex-wrap gap-y-1">
      {pos.map((bit, i) => {
        const sel = selected?.includes(i + 1)
        return (
          <button
            key={i}
            type="button"
            disabled={!onSelect}
            onClick={() => onSelect?.(i + 1)}
            title={`position ${i + 1}`}
            className={cn(
              'grid h-6 w-6 place-items-center border font-mono text-[0.6rem]',
              i % group === 0 ? 'rounded-l border-l' : 'border-l-0',
              (i + 1) % group === 0 ? 'rounded-r border-r' : '',
              sel
                ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.35)] text-[#04110f] shadow-[0_0_10px_rgba(94,234,212,0.5)]'
                : accent
                  ? 'border-[var(--c-border)] bg-[rgba(94,234,212,0.06)] text-[rgb(var(--c-core))]'
                  : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.3)] text-[var(--c-text-dim)] hover:bg-[rgba(255,255,255,0.05)]',
            )}
          >
            {bit}
          </button>
        )
      })}
    </div>
  )
}

/* ================================================================== */
/* Block concept                                                        */
/* ================================================================== */

function BlockConcept() {
  return (
    <Panel label="BLOCK CIPHER CONCEPT" title="A block cipher processes fixed-size chunks" actions={<Blocks size={16} className="text-[var(--c-accent)]" />}>
      <div className="grid gap-3 text-center sm:grid-cols-3">
        <Step title="PLAINTEXT MESSAGE" note="any length" icon={<Layers size={16} />} />
        <Step title="DIVIDED INTO BLOCKS" note="fixed-size chunks" icon={<Zap size={16} />} />
        <Step title="DES PROCESSES A 64-BIT BLOCK" note="one block per key use" icon={<Cpu size={16} />} />
      </div>
      <p className="mt-3 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        DES is a <span className="text-[var(--c-text)]">block cipher</span>: it encrypts exactly <span className="text-[rgb(var(--c-core))]">64 bits</span> at a time.
        This lab focuses on the core single-block transformation. Producing a complete multi-block message stream (a block-chaining mode such as ECB / CBC) is deliberately out of scope here.
      </p>
    </Panel>
  )
}

function Step({ title, note, icon }: { title: string; note: string; icon: ReactNode }) {
  return (
    <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-4">
      <div className="mx-auto grid h-8 w-8 place-items-center rounded-lg border border-[var(--c-border)] text-[rgb(var(--c-core))]">{icon}</div>
      <p className="mt-2 text-[0.6rem] font-semibold text-[var(--c-text)]">{title}</p>
      <p className="text-[0.55rem] text-[var(--c-text-faint)]">{note}</p>
    </div>
  )
}

/* ================================================================== */
/* Pipeline                                                             */
/* ================================================================== */

function Pipeline({ trace, usable, mode, round, onRound }: { trace: DesTrace; usable: boolean; mode: 'encrypt' | 'decrypt'; round: number; onRound: (n: number) => void }) {
  const [active, setActive] = useState<'ip' | 'rounds' | 'final' | null>('ip')
  return (
    <Panel label="DES PIPELINE" title="Click any stage to inspect it" actions={<Cpu size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="flex flex-col items-stretch gap-1.5">
        <Stage label="64-BIT PLAINTEXT" value={usable ? trace.blockBits : '—'} mono onOpen={() => setActive(null)} active={active === null} />
        <PipeLink label="INITIAL PERMUTATION" onOpen={() => setActive('ip')} active={active === 'ip'} />
        <div className="flex items-center justify-center gap-3 text-[0.55rem] text-[var(--c-text-faint)]">
          <span className="rounded-md border border-[var(--c-border)] px-2 py-1 font-mono">{usable ? trace.l0 : 'L0'}</span>
          <span>|</span>
          <span className="rounded-md border border-[var(--c-border)] px-2 py-1 font-mono">{usable ? trace.r0 : 'R0'}</span>
        </div>
        <PipeLink label="16 FEISTEL ROUNDS" onOpen={() => setActive('rounds')} active={active === 'rounds'} />
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          {Array.from({ length: 16 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setActive('rounds'); onRound(i) }}
              className={cn(
                'rounded-md border px-1 py-1.5 text-center text-[0.55rem] transition-colors',
                active === 'rounds' && i === round
                  ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.15)] text-[rgb(var(--c-core))] shadow-[0_0_12px_rgba(94,234,212,0.4)]'
                  : 'border-[var(--c-border)] text-[var(--c-text-dim)] hover:border-[rgb(var(--c-core))]',
              )}
            >
              R{i + 1}
            </button>
          ))}
        </div>
        <PipeLink label="SWAP (R16 | L16)" onOpen={() => setActive('final')} active={false} />
        <Stage label="CIPHERTEXT 64-BIT" value={usable ? trace.fpOut : '—'} mono accent onOpen={() => setActive('final')} active={active === 'final'} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active ?? 'none'}
          initial={!reducedMotion() ? { opacity: 0, height: 0 } : false}
          animate={{ opacity: 1, height: 'auto' }}
          exit={!reducedMotion() ? { opacity: 0, height: 0 } : undefined}
          className="overflow-hidden"
        >
          <div className="mt-3 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
            {active === 'ip' && (
              <>
                <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">INITIAL PERMUTATION</p>
                <p className="mt-1">The 64 plaintext bits are rearranged by the fixed IP table, splitting the block into the left half L0 and right half R0 for the Feistel rounds.</p>
                {usable && (
                  <p className="mt-2 break-all font-mono text-xs text-[var(--c-text)]">{trace.ipOut}</p>
                )}
              </>
            )}
            {active === 'rounds' && (
              <>
                <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">FEISTEL ROUNDS</p>
                <p className="mt-1">Each round runs the F-function on the right half, XORs the result with the left half, and swaps. Every round uses a different 48-bit round key from the key schedule.</p>
              </>
            )}
            {active === 'final' && (
              <>
                <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">SWAP + FINAL PERMUTATION</p>
                <p className="mt-1">After round 16 the halves are swapped to R16 | L16, then the inverse permutation (FP) produces the final 64-bit block.</p>
                {usable && <p className="mt-2 break-all font-mono text-xs text-[var(--c-text)]">{trace.finalSwap}</p>}
              </>
            )}
            {active === null && (
              <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">SELECT A STAGE TO SEE ITS DATA</p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="mt-2 text-[0.58rem] text-[var(--c-text-faint)]">
        {mode === 'decrypt' ? 'In DECRYPT the same pipeline runs but the round keys are applied in reverse order (K16 → K1).' : 'Encryption order shown. Decryption uses the reverse key order.'}
      </p>
    </Panel>
  )
}

/** Live reduced-motion read (non-hook) for sub-components that animate. */
function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Stage({ label, value, mono, accent, onOpen, active }: { label: string; value: string; mono?: boolean; accent?: boolean; onOpen?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'rounded-md border px-3 py-2 text-left transition-colors',
        active ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.08)]' : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] hover:border-[rgb(var(--c-core))]',
        accent && 'border-[rgb(var(--c-core))]',
      )}
    >
      <span className={cn('mono-label !text-[0.5rem]', accent ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-faint)]')}>{label}</span>
      {value && <span className={cn('ml-2 break-all font-mono text-[0.6rem]', mono ? 'text-[var(--c-text)]' : 'text-[var(--c-text-dim)]')}>{value}</span>}
    </button>
  )
}

function PipeLink({ label, onOpen, active }: { label: string; onOpen: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex items-center justify-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-[0.55rem] transition-colors',
        active ? 'border-[rgb(var(--c-core))] text-[rgb(var(--c-core))]' : 'border-[var(--c-border)] text-[var(--c-text-dim)] hover:text-[rgb(var(--c-core))]',
      )}
    >
      <ArrowDown size={11} /> {label}
    </button>
  )
}

/* ================================================================== */
/* Round controller + animation                                         */
/* ================================================================== */

function RoundController({
  trace,
  usable,
  round,
  setRound,
  playing,
  setPlaying,
  speed,
  setSpeed,
  reduced,
  mathOn,
}: {
  trace: DesTrace
  usable: boolean
  round: number
  setRound: (n: number) => void
  playing: boolean
  setPlaying: (v: boolean | ((prev: boolean) => boolean)) => void
  speed: 'slow' | 'normal' | 'fast'
  setSpeed: (s: 'slow' | 'normal' | 'fast') => void
  reduced: boolean
  mathOn: boolean
}) {
  const rd = trace.rounds[round]
  return (
    <Panel
      label="ROUND CONTROLLER"
      title="Step through the Feistel rounds"
      actions={<Gauge size={16} className="text-[rgb(var(--c-core))]" />}
    >
      {/* Round tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {Array.from({ length: 16 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setRound(i); setPlaying(false) }}
            className={cn(
              'shrink-0 rounded-md border px-2.5 py-1.5 text-[0.55rem] transition-colors',
              i === round
                ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.15)] text-[rgb(var(--c-core))] shadow-[0_0_10px_rgba(94,234,212,0.4)]'
                : 'border-[var(--c-border)] text-[var(--c-text-dim)] hover:border-[rgb(var(--c-core))]',
            )}
          >
            R{i + 1}
          </button>
        ))}
      </div>

      {/* Controls — one clean centered group */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => { setRound(Math.max(0, round - 1)); setPlaying(false) }}
          aria-label="Previous round"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
        >
          <SkipBack size={14} /> PREV
        </button>
        <button
          type="button"
          onClick={() => setPlaying((v) => !v)}
          disabled={!usable || reduced}
          aria-label={playing ? 'Pause' : 'Play all'}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(var(--c-core))] px-5 py-2 text-xs font-semibold text-[#04110f] shadow-[0_0_18px_rgba(94,234,212,0.35)] transition-transform hover:scale-[1.02] disabled:opacity-40"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'PAUSE' : 'PLAY ALL'}
        </button>
        <button
          type="button"
          onClick={() => { setRound(Math.min(15, round + 1)); setPlaying(false) }}
          aria-label="Next round"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
        >
          <SkipForward size={14} /> NEXT
        </button>
        <button
          type="button"
          onClick={() => { setRound(0); setPlaying(false) }}
          aria-label="Reset rounds"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
        >
          <RotateCcw size={14} /> RESET
        </button>
      </div>

      {/* speed — separate row so it never crowds the control group */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:justify-end">
        <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">SPEED</span>
        {(['slow', 'normal', 'fast'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[0.55rem] transition-colors',
              speed === s ? 'border-[rgb(var(--c-core))] text-[rgb(var(--c-core))]' : 'border-[var(--c-border)] text-[var(--c-text-faint)]',
            )}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {reduced && <p className="mt-1 text-[0.55rem] text-[var(--c-text-faint)]">Reduced-motion is on — use PREV / NEXT to step manually.</p>}

      {/* Feistel network for the active round */}
      {usable && rd && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">ACTIVE ROUND</span>
            <motion.span
              key={rd.n}
              initial={reduced ? false : { scale: 1.2 }}
              animate={{ scale: 1 }}
              className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.15)] px-2 py-0.5 font-mono text-[0.6rem] font-semibold text-[rgb(var(--c-core))] shadow-[0_0_10px_rgba(94,234,212,0.4)]"
            >
              ROUND {rd.n}
            </motion.span>
            {mathOn && <span className="font-mono text-[0.55rem] text-[var(--c-text-faint)]">K{rd.n}</span>}
          </div>

          <FeistelNetwork rd={rd} />

          {/* math mode */}
          {mathOn && (
            <div className="mt-3 space-y-1 rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.04)] p-3 font-mono text-[0.6rem] text-[var(--c-text-dim)]">
              <p className="text-[var(--c-text)]">L<sub>{rd.n}</sub> = R<sub>{rd.n - 1}</sub> = {rd.lNew}</p>
              <p className="text-[var(--c-text)]">R<sub>{rd.n}</sub> = L<sub>{rd.n - 1}</sub> ⊕ F(R<sub>{rd.n - 1}</sub>, K<sub>{rd.n}</sub>) = {rd.rNew}</p>
              <p className="mt-1 text-[var(--c-text-faint)]">F expansion → XOR with K<sub>{rd.n}</sub> → S-boxes → P-permutation:</p>
              <p>E(R) = {rd.f.expanded}</p>
              <p>E(R) ⊕ K = {rd.f.xorOut}</p>
              <p>S-boxes → {rd.f.sOut}</p>
              <p>P → F(R,K) = <span className="text-[rgb(var(--c-core))]">{rd.f.f}</span></p>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

function FeistelNetwork({ rd }: { rd: DesTrace['rounds'][0] }) {
  return (
    <div className="rounded-lg border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        {/* Left half */}
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.3)] p-2 text-center">
          <p className="mono-label !text-[0.48rem] text-[var(--c-text-faint)]">L{rd.n - 1}</p>
          <p className="mt-1 break-all font-mono text-[0.55rem] text-[var(--c-text)]">{rd.lPrev}</p>
        </div>

        {/* F-function column */}
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.1)] px-3 py-2 text-center">
            <p className="mono-label !text-[0.48rem] text-[rgb(var(--c-core))]">F FUNCTION</p>
            <p className="mt-0.5 text-[0.5rem] text-[var(--c-text-faint)]">E · ⊕K · S-BOX · P</p>
          </div>
          <p className="font-mono text-[0.5rem] text-[var(--c-text-dim)]">R{rd.n - 1}: {rd.rPrev}</p>
        </div>

        {/* Right half */}
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.3)] p-2 text-center">
          <p className="mono-label !text-[0.48rem] text-[var(--c-text-faint)]">R{rd.n - 1}</p>
          <p className="mt-1 break-all font-mono text-[0.55rem] text-[var(--c-text)]">{rd.rPrev}</p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        <span className="text-[0.55rem] text-[var(--c-text-faint)]">L{rd.n - 1} ⊕ F(R{rd.n - 1}, K{rd.n})</span>
        <span className="rounded-full border border-[rgb(var(--c-core))] px-2 py-0.5 font-mono text-[0.55rem] text-[rgb(var(--c-core))]">XOR</span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)] p-2 text-center">
          <p className="mono-label !text-[0.48rem] text-[rgb(var(--c-core))]">L{rd.n} = R{rd.n - 1}</p>
          <p className="mt-1 break-all font-mono text-[0.55rem] text-[rgb(var(--c-core))]">{rd.lNew}</p>
        </div>
        <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)] p-2 text-center">
          <p className="mono-label !text-[0.48rem] text-[rgb(var(--c-core))]">R{rd.n} = L{rd.n - 1} ⊕ F</p>
          <p className="mt-1 break-all font-mono text-[0.55rem] text-[rgb(var(--c-core))]">{rd.rNew}</p>
        </div>
      </div>
      <p className="mt-2 text-center text-[0.55rem] text-[var(--c-text-faint)]">L1 = R0 · R1 = L0 XOR F(R0, K1)</p>
    </div>
  )
}

/* ================================================================== */
/* Key schedule lab                                                     */
/* ================================================================== */

function KeyScheduleLab({ schedule, usable, round }: { schedule: DesKeySchedule; usable: boolean; round: number }) {
  const [selKey, setSelKey] = useState<number>(-1)
  const activeRound = selKey >= 0 ? selKey : round
  const ks = schedule.rounds[activeRound]
  return (
    <Panel label="DES KEY SCHEDULE LAB" title="Where do the 16 round keys come from?" actions={<KeyRound size={16} className="text-[var(--c-accent)]" />}>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* PC-1 */}
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">PC-1 · PARITY REMOVAL</p>
          <div className="mt-2 space-y-1 font-mono text-[0.55rem] text-[var(--c-text-dim)]">
            <p className="text-[var(--c-text-faint)]">64-BIT KEY</p>
            {usable && <p className="break-all text-[var(--c-text)]">{schedule.keyBits}</p>}
            <p className="mt-1 text-[var(--c-text-faint)]">↓ PC-1 drops the 8 parity bits →</p>
            <p className="text-[var(--c-text-faint)]">56-BIT KEY (C0 + D0)</p>
            {usable && <p className="break-all text-[rgb(var(--c-core))]">{schedule.pc1Out}</p>}
          </div>
          <p className="mt-2 text-[0.55rem] leading-relaxed text-[var(--c-text-faint)]">
            The 8 parity bits are positions 8, 16, 24, 32, 40, 48, 56, 64 — the least-significant bit of each key byte. Removing them leaves 56 effective bits.
          </p>
        </div>

        {/* Rotation + PC-2 for selected round */}
        <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.04)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">ROTATION + PC-2 → K{activeRound + 1}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center font-mono text-[0.55rem]">
            <div className="rounded border border-[var(--c-border)] p-2">
              <p className="text-[var(--c-text-faint)]">C{activeRound}</p>
              <p className="mt-1 break-all text-[var(--c-text)]">{usable ? ks.c : '—'}</p>
            </div>
            <div className="rounded border border-[var(--c-border)] p-2">
              <p className="text-[var(--c-text-faint)]">D{activeRound}</p>
              <p className="mt-1 break-all text-[var(--c-text)]">{usable ? ks.d : '—'}</p>
            </div>
          </div>
          <p className="mt-2 text-center text-[0.55rem] text-[var(--c-text-faint)]">
            shift = <span className="text-[rgb(var(--c-core))]">{usable ? ks.shift : '—'} bit(s)</span> · rounds {usable ? `${ks.n} uses ${SHIFTS[ks.n - 1] === 1 ? 'one' : 'two'}-bit shift` : ''}
          </p>
          <p className="mt-1 text-center font-mono text-[0.55rem] text-[var(--c-text-faint)]">↓ PC-2 (56 → 48)</p>
          <p className="mt-1 break-all text-center font-mono text-[0.6rem] text-[rgb(var(--c-core))]">{usable ? ks.k : '—'}</p>
        </div>
      </div>

      {/* Round keys strip */}
      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
        <span className="mono-label shrink-0 !text-[0.5rem] text-[var(--c-text-faint)]">K1…K16</span>
        {schedule.rounds.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelKey(i)}
            title={`K${i + 1}`}
            className={cn(
              'shrink-0 rounded-md border px-2 py-1 font-mono text-[0.5rem] transition-colors',
              i === activeRound
                ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.2)] text-[rgb(var(--c-core))] shadow-[0_0_10px_rgba(94,234,212,0.4)]'
                : i === round
                  ? 'border-[var(--c-accent)] text-[var(--c-accent)]'
                  : 'border-[var(--c-border)] text-[var(--c-text-dim)] hover:border-[rgb(var(--c-core))]',
            )}
          >
            K{i + 1}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[0.55rem] text-[var(--c-text-faint)]">
        <span className="text-[rgb(var(--c-core))]">Cyan</span> = selected round key · <span className="text-[var(--c-accent)]">gold</span> = the key used by the active Feistel round (R{round + 1} → K{round + 1}).
      </p>
      <p className="mt-1 text-[0.55rem] text-[var(--c-text-faint)]">
        Clicking a round in the ROUND CONTROLLER highlights its K here — the key schedule and the Feistel rounds are connected through that link.
      </p>
    </Panel>
  )
}

/* ================================================================== */
/* F-function detail                                                    */
/* ================================================================== */

function FFunctionLab({ trace, usable, round }: { trace: DesTrace; usable: boolean; round: number }) {
  const [stage, setStage] = useState<'expansion' | 'xor' | 'sbox' | 'p'>('expansion')
  const rd = trace.rounds[round]
  const f = rd?.f
  return (
    <Panel label="THE F-FUNCTION" title="R (32) → expansion → XOR → S-boxes → P → F(R,K)" actions={<FunctionSquare size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="flex flex-wrap gap-2">
        {([
          ['expansion', 'EXPANSION'],
          ['xor', 'ROUND KEY XOR'],
          ['sbox', 'S-BOXES'],
          ['p', 'P-PERMUTATION'],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setStage(k)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[0.58rem] font-medium transition-colors',
              stage === k ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.12)] text-[rgb(var(--c-core))]' : 'border-[var(--c-border)] text-[var(--c-text-dim)]',
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {usable && f ? (
        <div className="mt-3 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-3 font-mono text-[0.55rem]">
          {stage === 'expansion' && (
            <>
              <p className="text-[var(--c-text-faint)]">R (32 BITS)</p>
              <p className="mt-1 break-all text-[var(--c-text)]">{f.r}</p>
              <p className="mt-1 text-[var(--c-text-faint)]">↓ EXPANSION (E) 32 → 48</p>
              <p className="mt-1 break-all text-[rgb(var(--c-core))]">{f.expanded}</p>
              <p className="mt-1 text-[var(--c-text-faint)]">Repeated edge bits grow 32 bits into 48 so it can XOR with the 48-bit round key.</p>
            </>
          )}
          {stage === 'xor' && (
            <>
              <p className="text-[var(--c-text-faint)]">E(R) (48)</p>
              <p className="mt-1 break-all text-[var(--c-text)]">{f.expanded}</p>
              <p className="mt-1 text-[var(--c-text-faint)]">XOR</p>
              <p className="mt-1 text-[var(--c-text-faint)]">K{rd.n} (48)</p>
              <p className="mt-1 break-all text-[var(--c-accent)]">{f.k}</p>
              <p className="mt-1 text-[var(--c-text-faint)]">↓ =</p>
              <p className="mt-1 break-all text-[rgb(var(--c-core))]">{f.xorOut}</p>
              <p className="mt-1 text-[var(--c-text-faint)]">0⊕0=0 · 0⊕1=1 · 1⊕0=1 · 1⊕1=0</p>
            </>
          )}
          {stage === 'sbox' && (
            <>
              <p className="text-[var(--c-text-faint)]">SPLIT INTO 8 GROUPS × 6 BITS</p>
              <p className="mt-1 break-all text-[var(--c-text)]">{f.xorOut}</p>
              <p className="mt-1 text-[var(--c-text-faint)]">↓ S1…S8 → 8 × 4 BITS</p>
              <p className="mt-1 break-all text-[rgb(var(--c-core))]">{f.sOut}</p>
            </>
          )}
          {stage === 'p' && (
            <>
              <p className="text-[var(--c-text-faint)]">S-BOX OUTPUT (32)</p>
              <p className="mt-1 break-all text-[var(--c-text)]">{f.sOut}</p>
              <p className="mt-1 text-[var(--c-text-faint)]">↓ P-PERMUTATION (32 → 32)</p>
              <p className="mt-1 break-all text-[rgb(var(--c-core))]">{f.f}</p>
              <p className="mt-1 text-[var(--c-text-faint)]">= F(R{rd.n - 1}, K{rd.n})</p>
            </>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[0.6rem] text-[var(--c-text-faint)]">Enter a valid 64-bit block and key to see the live F-function values.</p>
      )}
    </Panel>
  )
}

/* ================================================================== */
/* Permutation + bit tracing                                            */
/* ================================================================== */

function PermutationLab({ trace, usable }: { trace: DesTrace; usable: boolean }) {
  const [permTab, setPermTab] = useState<'ip' | 'fp'>('ip')
  const [selIn, setSelIn] = useState<number | null>(null)
  const table = permTab === 'ip' ? DES_IP : DES_FP
  const inputBits = permTab === 'ip' ? b(trace.blockBits) : b(trace.finalSwap)
  const outputBits = permTab === 'ip' ? b(trace.ipOut) : b(trace.fpOut)

  // For a chosen input bit, find all output positions that drew from it.
  const highlight: number[] = []
  if (selIn !== null) {
    table.forEach((src, outIdx) => {
      if (src === selIn) highlight.push(outIdx + 1)
    })
  }

  return (
    <Panel label="PERMUTATION VISUALIZER" title="A permutation rearranges bits — trace one" actions={<Target size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setPermTab('ip'); setSelIn(null) }} className={cn('rounded-full border px-3 py-1.5 text-[0.58rem]', permTab === 'ip' ? 'border-[rgb(var(--c-core))] text-[rgb(var(--c-core))]' : 'border-[var(--c-border)] text-[var(--c-text-dim)]')}>
          INITIAL PERMUTATION (IP)
        </button>
        <button type="button" onClick={() => { setPermTab('fp'); setSelIn(null) }} className={cn('rounded-full border px-3 py-1.5 text-[0.58rem]', permTab === 'fp' ? 'border-[rgb(var(--c-core))] text-[rgb(var(--c-core))]' : 'border-[var(--c-border)] text-[var(--c-text-dim)]')}>
          FINAL PERMUTATION (FP)
        </button>
      </div>

      {!usable ? (
        <p className="mt-3 text-[0.6rem] text-[var(--c-text-faint)]">Provide a valid block to explore the permutation.</p>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">INPUT — click a bit</p>
            <BitRow bits={inputBits} group={8} selected={[selIn ?? -1]} onSelect={(i) => setSelIn(i === selIn ? null : i)} />
          </div>
          <div className="flex items-center gap-2 text-[0.55rem] text-[var(--c-text-faint)]">
            <ArrowDown size={12} /> {permTab === 'ip' ? 'IP TABLE' : 'FP TABLE'} · a permutation never changes bit values, only their positions.
          </div>
          <div>
            <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">OUTPUT</p>
            <BitRow bits={outputBits} group={8} selected={highlight} accent />
          </div>
          {selIn !== null && (
            <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)] px-3 py-2 font-mono text-[0.6rem] text-[rgb(var(--c-core))]">
              {highlight.length === 1
                ? `INPUT BIT ${selIn} → OUTPUT BIT ${highlight[0]}`
                : `INPUT BIT ${selIn} → OUTPUT BITS ${highlight.join(', ')}`}
              {permTab === 'ip' && (selIn <= 32 ? ` → lands in L0 (position ${selIn} of the left half)` : ` → lands in R0 (position ${selIn - 32} of the right half)`)}
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

/* ================================================================== */
/* Trace this bit                                                       */
/* ================================================================== */

function TraceThisBit({ trace, usable }: { trace: DesTrace; usable: boolean }) {
  const [selIn, setSelIn] = useState<number | null>(null)
  const inputBits = b(trace.blockBits)
  let path: ReactNode = null
  if (usable && selIn !== null) {
    // Where does input bit selIn land after IP?
    let ipPos: number | null = null
    DES_IP.forEach((src, outIdx) => {
      if (src === selIn) ipPos = outIdx + 1
    })
    const inLeft = ipPos !== null && ipPos <= 32
    const halfPos = ipPos !== null ? (inLeft ? ipPos : ipPos - 32) : null
    // E-expansion coverage for the right half (if applicable).
    const expFrom = DES_E.filter((src) => src === halfPos).length
    path = (
      <div className="mt-3 space-y-1.5 font-mono text-[0.6rem] text-[var(--c-text-dim)]">
        <p className="text-[var(--c-text)]">INPUT BIT <span className="text-[rgb(var(--c-core))]">{selIn}</span></p>
        <p>↓ IP → <span className="text-[var(--c-text)]">position {ipPos}</span>{inLeft ? ' → into L0' : ' → into R0'}</p>
        {inLeft ? (
          <p>L0 halves are XORed with F output — the value is mixed but its position in the block shifts each round.</p>
        ) : (
          <p>
            ↓ E-expansion: R0 position {halfPos} feeds <span className="text-[rgb(var(--c-core))]">{expFrom}</span> expanded position(s) {DES_E.map((s, i) => (s === halfPos ? i + 1 : null)).filter(Boolean).join(', ')}
          </p>
        )}
        <p className="text-[var(--c-accent)]">⚠ S-BOXES ARE NONLINEAR</p>
        <p>
          After an input bit enters an S-box, its output depends on <span className="text-[var(--c-text)]">all six</span> bits of that group — there is no longer a one-to-one "this output bit came from that input bit" relationship. Direct bit tracing stops at the S-box stage.
        </p>
        <p>After P-permutation, the F result is XORed with the opposite half, and across 16 rounds + final swap + FP the bit is thoroughly diffused (avalanche).</p>
      </div>
    )
  }
  return (
    <Panel label="TRACE THIS BIT" title="Follow one bit through the pipeline" actions={<MousePointerClick size={16} className="text-[rgb(var(--c-core))]" />}>
      {!usable ? (
        <p className="text-[0.6rem] text-[var(--c-text-faint)]">Enter a valid block to trace a bit.</p>
      ) : (
        <>
          <p className="mb-2 text-[0.58rem] text-[var(--c-text-faint)]">Click an input bit (1–64).</p>
          <BitRow bits={inputBits} group={8} selected={[selIn ?? -1]} onSelect={(i) => setSelIn(i === selIn ? null : i)} />
          {path}
        </>
      )}
    </Panel>
  )
}

/* ================================================================== */
/* S-box lab                                                            */
/* ================================================================== */

function SBoxLab({ trace, usable, round }: { trace: DesTrace; usable: boolean; round: number }) {
  const [sel, setSel] = useState<number>(0)
  const f = trace.rounds[round]?.f
  const box = DES_SBOXES[sel]
  return (
    <Panel label="S-BOX LABORATORY" title="The nonlinear heart of the F-function" actions={<Grid3x3 size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="flex flex-wrap gap-2">
        {f && f.boxIdx.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSel(i)}
            className={cn(
              'rounded-md border px-3 py-1.5 font-mono text-[0.58rem] transition-colors',
              i === sel ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.15)] text-[rgb(var(--c-core))]' : 'border-[var(--c-border)] text-[var(--c-text-dim)]',
            )}
          >
            S{i + 1}
          </button>
        ))}
      </div>

      {usable && f ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {/* Selected group worked example */}
          <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.04)] p-3 font-mono text-[0.6rem]">
            <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">S{sel + 1} · 6-BIT INPUT</p>
            <p className="mt-1 break-all text-[var(--c-text)]">{f.groups6[sel]}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div className="rounded border border-[var(--c-border)] p-2">
                <p className="text-[var(--c-text-faint)]">ROW (first + last bits)</p>
                <p className="mt-1 text-[rgb(var(--c-core))]">{f.groups6[sel][0]}{f.groups6[sel][5]} = {f.rows[sel]}</p>
              </div>
              <div className="rounded border border-[var(--c-border)] p-2">
                <p className="text-[var(--c-text-faint)]">COLUMN (middle 4 bits)</p>
                <p className="mt-1 text-[rgb(var(--c-core))]">{f.groups6[sel].slice(1, 5)} = {f.cols[sel]}</p>
              </div>
            </div>
            <p className="mt-2 text-[var(--c-text-faint)]">S{sel + 1}[{f.rows[sel]}][{f.cols[sel]}] = {DES_SBOXES[sel][f.rows[sel] * 16 + f.cols[sel]]}</p>
            <p className="mt-1 text-[var(--c-text-faint)]">→ 4-BIT OUTPUT</p>
            <p className="mt-1 text-[rgb(var(--c-core))]">{f.groups4[sel]} (decimal {parseInt(f.groups4[sel], 2)})</p>
          </div>

          {/* The S-box table */}
          <div className="overflow-x-auto rounded-md border border-[var(--c-border)]">
            <table className="w-full border-collapse text-center">
              <thead>
                <tr className="bg-[rgba(94,234,212,0.05)]">
                  <th className="mono-label px-1 py-1 !text-[0.48rem] text-[var(--c-text-faint)]">S{sel + 1}</th>
                  {Array.from({ length: 16 }, (_, c) => (
                    <th key={c} className={cn('px-1 py-1 font-mono text-[0.5rem]', c === f.cols[sel] ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-faint)]')}>{c.toString(16).toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3].map((row) => (
                  <tr key={row}>
                    <td className={cn('px-1 py-1 font-mono text-[0.5rem]', row === f.rows[sel] ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-faint)]')}>{row}</td>
                    {Array.from({ length: 16 }, (_, c) => (
                      <td
                        key={c}
                        className={cn(
                          'px-1 py-1 font-mono text-[0.5rem]',
                          row === f.rows[sel] && c === f.cols[sel]
                            ? 'bg-[rgba(94,234,212,0.3)] text-[#04110f] shadow-[inset_0_0_8px_rgba(94,234,212,0.6)]'
                            : 'text-[var(--c-text-dim)]',
                        )}
                      >
                        {box[row * 16 + c]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[0.6rem] text-[var(--c-text-faint)]">Enter a valid block to see the real S-box lookups.</p>
      )}
    </Panel>
  )
}

function Grid3x3({ size, className }: { size?: number; className?: string }) {
  return <svg width={size ?? 16} height={size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></svg>
}

/* ================================================================== */
/* Decryption note                                                      */
/* ================================================================== */

function DecryptionNote() {
  return (
    <Panel label="DECRYPTION" title="Same structure, reverse key order" actions={<Unlock size={16} className="text-[var(--c-accent)]" />}>
      <p className="text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        DES decryption does <span className="text-[var(--c-text)]">not</span> use a separate algorithm. It runs the identical Feistel network but feeds the round keys in reverse order:
      </p>
      <p className="mt-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2 text-center font-mono text-[0.6rem] text-[var(--c-text-dim)]">
        K16 → K15 → K14 → … → K2 → K1
      </p>
      <p className="mt-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        Because a Feistel round is its own inverse when the keys are reversed, decrypting the ciphertext reproduces the original block — demonstrated by the test vector and the round-trip checks.
      </p>
    </Panel>
  )
}

/* ================================================================== */
/* Security + comparisons + why DES                                     */
/* ================================================================== */

function SecurityAnalysis() {
  return (
    <Panel label="DES SECURITY ANALYSIS" title="Historically vital, weak by modern standards" actions={<Shield size={16} className="text-[var(--c-accent)]" />}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Rating label="HISTORICAL IMPORTANCE" tone="text-[rgb(var(--c-core))]" note="★★★★★" />
        <Rating label="MODERN SECURITY" tone="text-[var(--c-danger)]" note="★☆☆☆☆" />
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3 text-center">
          <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">KEY SIZE</p>
          <p className="mt-1 text-[0.6rem] font-semibold text-[var(--c-accent)]">WEAK BY MODERN STANDARDS</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <li><span className="text-[var(--c-text)]">• 56-bit effective key</span> — its key size is considered too small against modern brute-force attacks.</li>
        <li><span className="text-[var(--c-text)]">• Feistel structure</span> — 16 rounds of a balanced Feistel network.</li>
        <li><span className="text-[var(--c-text)]">• S-boxes</span> — 8 fixed substitution tables provide the nonlinearity that makes it a cipher, not a permutation.</li>
        <li><span className="text-[var(--c-text)]">• Not secure today</span> — DES is historically important but is not suitable for protecting modern sensitive data.</li>
      </ul>
    </Panel>
  )
}

function Rating({ label, tone, note }: { label: string; tone: string; note: string }) {
  return (
    <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3 text-center">
      <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">{label}</p>
      <p className={cn('mt-1 font-mono text-lg tracking-widest', tone)}>{note}</p>
    </div>
  )
}

function DesVsModern() {
  const rows = [
    ['Effective key', '56 bits', '128 / 192 / 256 bits'],
    ['Block size', '64 bits', '128 bits'],
    ['Rounds', '16 Feistel rounds', '10–14 rounds (SubBytes/ShiftRows/etc.)'],
    ['Status', 'Historical standard', 'Modern standard'],
    ['Recommended today', 'No', 'Yes'],
  ]
  return (
    <Panel label="DES VS MODERN CRYPTOGRAPHY" title="AES is the next frontier" actions={<Zap size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="overflow-x-auto rounded-md border border-[var(--c-border)]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[rgba(94,234,212,0.05)]">
              <th className="mono-label px-3 py-2 !text-[0.5rem] text-[var(--c-text-faint)]">PROPERTY</th>
              <th className="mono-label px-3 py-2 !text-[0.5rem] text-[var(--c-text)]">DES</th>
              <th className="mono-label px-3 py-2 !text-[0.5rem] text-[#c4b5fd]">AES</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([prop, des, aes]) => (
              <tr key={prop} className="border-t border-[var(--c-border)]">
                <td className="px-3 py-2 text-[0.6rem] text-[var(--c-text-faint)]">{prop}</td>
                <td className="px-3 py-2 text-[0.6rem] text-[var(--c-text)]">{des}</td>
                <td className="px-3 py-2 text-[0.6rem] text-[#c4b5fd]">{aes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex items-start gap-2 rounded-md border border-[rgba(167,139,250,0.4)] bg-[rgba(167,139,250,0.06)] px-3 py-2 text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[#c4b5fd]" />
        AES is shown here only as the NEXT FRONTIER — it is <span className="text-[#c4b5fd]">not implemented</span> in this laboratory yet.
      </p>
    </Panel>
  )
}

function WhyDes() {
  return (
    <Panel label="WHY DES MATTERS" title="Importance, then limitation" actions={<BookOpen size={16} className="text-[var(--c-accent)]" />}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.04)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">WHY WAS DES IMPORTANT?</p>
          <ul className="mt-2 space-y-1.5 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
            <li>• Standardized symmetric encryption across industries.</li>
            <li>• Introduced a widely studied block-cipher structure.</li>
            <li>• A canonical educational example of Feistel networks.</li>
            <li>• Influenced cryptographic engineering and later standards (3DES, AES).</li>
          </ul>
        </div>
        <div className="rounded-md border border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.04)] p-3">
          <p className="mono-label !text-[0.5rem] text-[var(--c-danger)]">WHY IS DES NO LONGER SUFFICIENT?</p>
          <ul className="mt-2 space-y-1.5 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
            <li>• 56-bit key space is small.</li>
            <li>• Brute-force recovery is feasible with modern hardware.</li>
            <li>• Superseded by stronger standards (3DES, then AES).</li>
          </ul>
        </div>
      </div>
    </Panel>
  )
}

/* ================================================================== */
/* LEARN DES                                                            */
/* ================================================================== */

const LEARN_SECTIONS: Array<{ n: string; title: string; body: string }> = [
  { n: '01', title: 'What is a block cipher?', body: 'A block cipher encrypts a fixed-size group of bits (a block) with a key. DES processes 64-bit blocks.' },
  { n: '02', title: '64-bit blocks', body: 'One plaintext block = 64 bits = 8 bytes = 16 hex digits. A longer message is split into blocks and chained (out of scope here).' },
  { n: '03', title: 'DES key structure', body: 'You supply a 64-bit key, but 8 bits are parity bits. PC-1 removes them, leaving 56 effective key bits.' },
  { n: '04', title: 'Initial Permutation', body: 'IP rearranges the 64 input bits by a fixed table. It does not change values — only positions — then splits the block into L0 and R0.' },
  { n: '05', title: 'Feistel Network', body: 'Each round leaves the right half unchanged and updates the left half: L1 = R0, R1 = L0 XOR F(R0, K1).' },
  { n: '06', title: 'The F-function', body: 'F(R,K) is the workhorse: expand R to 48 bits, XOR with the round key, pass through S-boxes to 32 bits, then P-permute.' },
  { n: '07', title: 'Expansion', body: 'The E-table copies and stretches 32-bit R into 48 bits (edge bits repeat) so it matches the 48-bit round key.' },
  { n: '08', title: 'XOR', body: 'The 48-bit expanded R and the 48-bit round key are combined with XOR (⊕): 0⊕0=0, 0⊕1=1, 1⊕0=1, 1⊕1=0.' },
  { n: '09', title: 'S-boxes', body: '8 boxes shrink 48 → 32 bits. Each box takes 6 bits, uses outer bits as row and inner 4 as column, and outputs 4 bits. This is the nonlinear step.' },
  { n: '10', title: 'P-permutation', body: 'The 32 S-box outputs are rearranged again so that each S-box output spreads across the whole 32-bit half.' },
  { n: '11', title: 'Key Schedule', body: 'The 56-bit key is split into C and D, rotated (1 or 2 bits per round), and PC-2 selects 48 bits for each round key K1…K16.' },
  { n: '12', title: '16 Rounds', body: 'The Feistel round repeats 16 times, each with its own K. Sixteen rounds create enough diffusion for the cipher to be strong.' },
  { n: '13', title: 'Final Permutation', body: 'After round 16 the halves swap (R16 | L16) and FP — the inverse of IP — produces the final 64-bit ciphertext.' },
  { n: '14', title: 'Decryption', body: 'Run the same network with the round keys reversed (K16…K1). No separate decrypt algorithm is needed.' },
  { n: '15', title: 'Security limitations', body: 'A 56-bit key is brute-forceable today. DES is a great learning tool but is not for modern sensitive data.' },
]

function LearnDes() {
  const [open, setOpen] = useState<number>(0)
  return (
    <Panel label="LEARN DES" title="Fifteen interactive sections" actions={<BookOpen size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {LEARN_SECTIONS.map((s, i) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setOpen(i)}
            aria-expanded={open === i}
            className={cn(
              'rounded-md border px-3 py-2 text-left transition-colors',
              open === i ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)]' : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] hover:border-[rgb(var(--c-core))]',
            )}
          >
            <span className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">{s.n}</span>
            <span className="ml-2 text-[0.6rem] font-medium text-[var(--c-text)]">{s.title}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={open}
          initial={!useReducedMotion() ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={!useReducedMotion() ? { opacity: 0, y: -6 } : undefined}
          className="mt-3 rounded-md border border-[rgb(var(--c-core))] bg-[rgba(0,0,0,0.25)] px-4 py-3"
        >
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">{LEARN_SECTIONS[open].n} · {LEARN_SECTIONS[open].title.toUpperCase()}</p>
          <p className="mt-1 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">{LEARN_SECTIONS[open].body}</p>
        </motion.div>
      </AnimatePresence>
    </Panel>
  )
}

/* ================================================================== */
/* Challenge                                                            */
/* ================================================================== */

const DES_CHALLENGES: Array<{ q: string; options: string[]; a: string; explain: string }> = [
  { q: 'What happens to the 32-bit R during the Expansion step?', options: ['32 → 48 bits', '32 → 64 bits', '32 → 16 bits', 'It is unchanged'], a: '32 → 48 bits', explain: 'The E-expansion repeats edge bits to grow 32 bits into 48 so they can XOR with the 48-bit round key.' },
  { q: 'How many Feistel rounds does DES perform?', options: ['8', '16', '32', '64'], a: '16', explain: 'DES runs 16 Feistel rounds, each using a distinct 48-bit round key.' },
  { q: 'How many effective key bits does DES have?', options: ['64', '128', '56', '48'], a: '56', explain: 'You supply 64 bits, but 8 are parity bits removed by PC-1, leaving 56 effective key bits.' },
  { q: 'What component provides nonlinear substitution?', options: ['The IP table', 'The E-expansion', 'The S-boxes', 'The P-permutation'], a: 'The S-boxes', explain: 'The 8 S-boxes map 6 input bits to 4 output bits nonlinearly — this is what turns a permutation into a cipher.' },
  { q: 'In decryption, what order are the round keys applied?', options: ['K1 → K16', 'K16 → K1', 'They are not used', 'Alternating'], a: 'K16 → K1', explain: 'Decryption runs the same Feistel network with the keys reversed (K16, K15, …, K1).' },
]

function DesChallenge() {
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const q = DES_CHALLENGES[qi]
  const choose = (o: string) => {
    if (picked !== null) return
    setPicked(o)
    if (o === q.a) setScore((s) => s + 1)
  }
  const next = () => {
    if (qi + 1 >= DES_CHALLENGES.length) { setDone(true); return }
    setQi(qi + 1); setPicked(null)
  }
  const restart = () => { setQi(0); setPicked(null); setScore(0); setDone(false) }

  return (
    <Panel label="DES CHALLENGE" title="Check your understanding" actions={<GraduationCap size={16} className="text-[rgb(var(--c-core))]" />}>
      {done ? (
        <div className="text-center">
          <p className="text-sm text-[var(--c-text)]">You scored {score} / {DES_CHALLENGES.length}.</p>
          <button
            type="button"
            onClick={restart}
            className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
          >
            <RotateCcw size={14} /> RETRY
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--c-text)]">{q.q}</p>
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {q.options.map((o) => {
              const isPick = o === picked
              const isAns = o === q.a
              return (
                <button
                  key={o}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => choose(o)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-left text-xs transition-colors',
                    picked === null && 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] text-[var(--c-text)] hover:border-[rgb(var(--c-core))]',
                    picked !== null && isAns && 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.12)] text-[rgb(var(--c-core))]',
                    picked !== null && isPick && !isAns && 'border-[var(--c-danger)] bg-[rgba(248,113,113,0.12)] text-[var(--c-danger)]',
                    picked !== null && !isPick && !isAns && 'border-[var(--c-border)] text-[var(--c-text-faint)]',
                  )}
                >
                  {o}
                </button>
              )
            })}
          </div>
          {picked !== null && (
            <>
              <p className={cn('mt-3 text-xs', picked === q.a ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-danger)]')}>
                {picked === q.a ? 'CORRECT ✓' : `NOT QUITE — ${q.a}.`}
              </p>
              <p className="mt-1 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">{q.explain}</p>
              <button
                type="button"
                onClick={next}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--c-core))] px-4 py-2 text-xs font-medium text-[rgb(var(--c-core))] transition-colors hover:bg-[rgba(94,234,212,0.1)]"
              >
                {qi + 1 >= DES_CHALLENGES.length ? 'FINISH' : 'NEXT QUESTION'} <ArrowRight size={14} />
              </button>
            </>
          )}
        </>
      )}
    </Panel>
  )
}
