import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Check,
  X,
  Copy,
  KeyRound,
  Blocks,
  Shield,
  GraduationCap,
  Lock,
  Unlock,
  Layers,
  BookOpen,
  FlaskConical,
  Gauge,
  FunctionSquare,
  ArrowDown,
  ArrowRight,
  Binary,
  Zap,
  Target,
} from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Panel } from '@/components/ui/Panel'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/utils/cn'
import {
  aesBlock,
  aesKeyTrace,
  aesEncryptBlock,
  textToHex,
  bytesToHex,
  validate128Hex,
  AES_SBOX,
  AES_RCON,
  gfMul,
  stateToBytes,
  AES_TEST_VECTOR,
  type AesTrace,
} from '@/crypto/algorithms/aes'

/** AES MixColumns constant matrix (GF(2^8)). */
const MC_MATRIX = [
  [0x02, 0x03, 0x01, 0x01],
  [0x01, 0x02, 0x03, 0x01],
  [0x01, 0x01, 0x02, 0x03],
  [0x03, 0x01, 0x01, 0x02],
]
/** Inverse MixColumns constant matrix. */
const INV_MC_MATRIX = [
  [0x0e, 0x0b, 0x0d, 0x09],
  [0x09, 0x0e, 0x0b, 0x0d],
  [0x0d, 0x09, 0x0e, 0x0b],
  [0x0b, 0x0d, 0x09, 0x0e],
]

/* ================================================================== */
/* AesLab — top-level state + layout                                    */
/* ================================================================== */

export function AesLab() {
  const reduced = useReducedMotion()
  const [inputMode, setInputMode] = useState<'text' | 'hex'>('hex')
  const [plainText, setPlainText] = useState('HELLO WORLD!')
  const [blockHex, setBlockHex] = useState(AES_TEST_VECTOR.plain)
  const [keyHex, setKeyHex] = useState(AES_TEST_VECTOR.key)
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt')
  const [round, setRound] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal')
  const [stepByStep, setStepByStep] = useState(false)
  const [mathOn, setMathOn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vectorRun, setVectorRun] = useState<'idle' | 'pass' | 'fail'>('idle')
  const [copied, setCopied] = useState(false)

  // ---- input handling -------------------------------------------------
  const setInputText = (v: string) => {
    setPlainText(v)
    setInputMode('text')
    setError(null)
    if (v.length > 16) {
      setError('TEXT MODE IS SINGLE-BLOCK — exactly 16 bytes fit one AES block. This lab demonstrates the core 128-bit block; longer messages need a block-chaining mode not built here.')
      return
    }
    if (v.length === 16) setBlockHex(textToHex(v))
  }

  const setInputHex = (v: string) => {
    setBlockHex(v.toUpperCase())
    setInputMode('hex')
    setError(null)
  }

  const applyHex = () => {
    const v = validate128Hex(blockHex, 'PLAINTEXT')
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
    setCopied(false)
    setMode('encrypt')
    setBlockHex(AES_TEST_VECTOR.plain)
    setKeyHex(AES_TEST_VECTOR.key)
    setInputMode('hex')
  }

  // ---- validation -----------------------------------------------------
  const blockValid = validate128Hex(blockHex, 'PLAINTEXT')
  const keyValid = validate128Hex(keyHex, 'KEY')

  const runVector = () => {
    const out = aesEncryptBlock(AES_TEST_VECTOR.plain, AES_TEST_VECTOR.key)
    setVectorRun(out.toUpperCase() === AES_TEST_VECTOR.expected ? 'pass' : 'fail')
  }

  const copyResult = () => {
    const text = trace.valid ? trace.cipherHex : ''
    if (!text) return
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  // ---- single source of truth ----------------------------------------
  const trace = useMemo<AesTrace>(
    () =>
      blockValid.valid && keyValid.valid
        ? aesBlock(blockHex, keyHex, mode)
        : aesBlock('', '', 'encrypt'),
    [blockHex, keyHex, mode, blockValid.valid, keyValid.valid],
  )
  const schedule = useMemo(() => aesKeyTrace(keyHex), [keyHex])

  // ---- round playback -------------------------------------------------
  const speedMs = speed === 'slow' ? 950 : speed === 'normal' ? 500 : 170
  useEffect(() => {
    if (!playing || reduced || stepByStep) {
      setPlaying(false)
      return
    }
    const id = setInterval(() => {
      setRound((r) => {
        if (r >= 10) {
          setPlaying(false)
          return 10
        }
        return r + 1
      })
    }, speedMs)
    return () => clearInterval(id)
  }, [playing, speedMs, reduced, stepByStep])

  const usable = blockValid.valid && keyValid.valid
  const r = Math.min(round, 10)

  return (
    <div className="space-y-6">
      <SectionHeading
        kicker="MODULE 03 // BLOCK CIPHER"
        title="AES Block Cipher Laboratory"
        sub="AES is the modern standard — not a magic encrypt button. Watch your 128-bit block move through SubBytes, ShiftRows, MixColumns and AddRoundKey across ten rounds of the real AES-128 engine."
        actions={<Binary size={18} className="text-[rgb(var(--c-core))]" />}
      />

      {/* FIPS-197 standard test vector */}
      <Panel label="FIPS-197 STANDARD TEST VECTOR" title="Prove the engine is real" actions={<FlaskConical size={16} className="text-[rgb(var(--c-core))]" />}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 font-mono text-[0.6rem] text-[var(--c-text-dim)]">
            <p><span className="text-[var(--c-text-faint)]">PLAINTEXT </span><span className="text-[var(--c-text)]">{AES_TEST_VECTOR.plain}</span></p>
            <p><span className="text-[var(--c-text-faint)]">KEY </span><span className="text-[var(--c-text)]">{AES_TEST_VECTOR.key}</span></p>
            <p><span className="text-[var(--c-text-faint)]">EXPECTED </span><span className="text-[rgb(var(--c-core))]">{AES_TEST_VECTOR.expected}</span></p>
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
            {vectorRun === 'pass' ? 'PASS ✓ — the engine reproduces the official FIPS-197 AES-128 result.' : 'FAIL ✕ — check the engine tables.'}
          </div>
        )}
      </Panel>

      {/* Block cipher concept */}
      <BlockConcept />

      {/* Input panel */}
      <Panel label="AES INPUT" title="One 128-bit block · one 128-bit key" actions={<KeyRound size={16} className="text-[rgb(var(--c-core))]" />}>
        <div className="mb-4 flex flex-wrap gap-2">
          <ModeToggle active={inputMode === 'text'} onClick={() => setInputMode('text')} label="TEXT MODE" />
          <ModeToggle active={inputMode === 'hex'} onClick={() => setInputMode('hex')} label="HEX MODE" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Block input */}
          <div>
            <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">
              {inputMode === 'text' ? 'PLAINTEXT · 16 BYTES' : 'PLAINTEXT BLOCK · 32 HEX DIGITS = 128 BITS'}
            </p>
            {inputMode === 'text' ? (
              <textarea
                value={plainText}
                onChange={(e) => setInputText(e.target.value)}
                rows={2}
                aria-label="AES plaintext text input (16 bytes)"
                className="mt-1 w-full resize-none rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-3 font-mono text-sm text-[var(--c-text)] outline-none focus:border-[rgb(var(--c-core))]"
              />
            ) : (
              <input
                value={blockHex}
                onChange={(e) => setInputHex(e.target.value)}
                onBlur={applyHex}
                aria-label="AES plaintext block in hex (32 characters)"
                className="mt-1 w-full rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2.5 font-mono text-sm tracking-widest text-[rgb(var(--c-core))] outline-none focus:border-[rgb(var(--c-core))]"
              />
            )}
            {inputMode === 'text' && plainText.length !== 16 && (
              <p className="mt-1 text-[0.58rem] text-[var(--c-accent)]">
                {plainText.length < 16 ? `${16 - plainText.length} byte(s) to fill the block.` : 'Longer input is single-block only — see note below.'}
              </p>
            )}
            {inputMode === 'hex' && (
              <p className={cn('mt-1 text-[0.58rem]', blockValid.valid ? 'text-[var(--c-text-faint)]' : 'text-[var(--c-danger)]')}>
                {blockValid.valid ? `${blockHex.length} chars · 128 bits ✓` : (blockValid.message ?? '')}
              </p>
            )}
            <p className="mt-2 flex items-start gap-1.5 text-[0.58rem] leading-relaxed text-[var(--c-text-faint)]">
              <Info size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
              This laboratory demonstrates the core single-block AES-128 operation. Longer messages are not silently truncated — TEXT MODE explains they need a block-chaining mode.
            </p>
          </div>

          {/* Key input */}
          <div>
            <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">KEY · 32 HEX DIGITS = 128 BITS</p>
            <input
              value={keyHex}
              onChange={(e) => setKey(e.target.value)}
              aria-label="AES key in hex (32 characters)"
              className="mt-1 w-full rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2.5 font-mono text-sm tracking-widest text-[var(--c-accent)] outline-none focus:border-[rgb(var(--c-core))]"
            />
            <p className={cn('mt-1 text-[0.58rem]', keyValid.valid ? 'text-[var(--c-text-faint)]' : 'text-[var(--c-danger)]')}>
              {keyValid.valid ? 'valid 128-bit key ✓' : (keyValid.message ?? '')}
            </p>
            <div className="mt-2 space-y-0.5 font-mono text-[0.58rem] text-[var(--c-text-dim)]">
              <p><span className="text-[var(--c-text-faint)]">128-BIT KEY</span> → <span className="text-[rgb(var(--c-core))]">2^128 possible keys</span></p>
              <p className="text-[var(--c-text-faint)]">All 128 bits are used — no parity bits, unlike DES.</p>
            </div>
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
          <button
            type="button"
            onClick={copyResult}
            disabled={!usable || !trace.valid}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))] disabled:opacity-40"
          >
            <Copy size={13} /> {copied ? 'COPIED ✓' : 'COPY RESULT'}
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
              <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">INPUT BLOCK (128 BITS · 16 BYTES)</p>
              <p className="mt-1 break-all font-mono text-xs text-[var(--c-text)]">{blockHex}</p>
            </div>
            <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.05)] p-3">
              <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">{mode === 'encrypt' ? 'CIPHERTEXT' : 'RECOVERED PLAINTEXT'}</p>
              <p className="mt-1 break-all font-mono text-xs text-[rgb(var(--c-core))]">{trace.cipherHex}</p>
            </div>
          </div>
        )}
      </Panel>

      {/* State matrix visualizer */}
      <StateMatrixLab
        trace={trace}
        usable={usable}
        mode={mode}
        round={r}
        mathOn={mathOn}
      />

      {/* Pipeline */}
      <AesPipeline trace={trace} usable={usable} round={r} onRound={setRound} mode={mode} />

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
        stepByStep={stepByStep}
        setStepByStep={setStepByStep}
        reduced={reduced}
        mathOn={mathOn}
      />

      {/* Round inspector */}
      <RoundInspector trace={trace} usable={usable} round={r} mode={mode} />

      {/* SubBytes lab */}
      <SubBytesLab trace={trace} usable={usable} round={r} />

      {/* ShiftRows visualizer */}
      <ShiftRowsLab trace={trace} usable={usable} round={r} />

      {/* MixColumns lab */}
      <MixColumnsLab trace={trace} usable={usable} round={r} mode={mode} />

      {/* AddRoundKey lab */}
      <AddRoundKeyLab trace={trace} usable={usable} round={r} />

      {/* Key schedule lab + Rcon */}
      <KeyScheduleLab schedule={schedule} usable={usable} round={r} />

      {/* Decryption explanation */}
      <DecryptionNote />

      {/* Security analysis */}
      <SecurityAnalysis />

      {/* DES vs AES comparison */}
      <DesVsAes />

      {/* How AES works */}
      <HowAesWorks />

      {/* Extended topics */}
      <ExtendedTopics />

      {/* Learn AES */}
      <LearnAes />

      {/* Challenge */}
      <AesChallenge />
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

/** Live reduced-motion read (non-hook) for sub-components that animate. */
function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Render a 16-byte flat state (grid index row*4+col) as a 4×4 matrix. */
function StateMatrix({
  bytes,
  title,
  accent,
  selected,
  onSelect,
}: {
  bytes: number[]
  title?: string
  accent?: boolean
  selected?: number
  onSelect?: (i: number) => void
}) {
  const rows = [0, 1, 2, 3]
  return (
    <div>
      {title && <p className={cn('mono-label mb-1 !text-[0.5rem]', accent ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-faint)]')}>{title}</p>}
      <div className="inline-block rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-1.5">
        {rows.map((row) => (
          <div key={row} className="flex">
            {[0, 1, 2, 3].map((col) => {
              const idx = row * 4 + col
              const byte = bytes[idx]
              const isSel = selected === idx
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!onSelect}
                  onClick={() => onSelect?.(idx)}
                  title={`[${row},${col}]`}
                  className={cn(
                    'grid h-7 w-7 place-items-center border font-mono text-[0.55rem] transition-colors sm:h-8 sm:w-8 sm:text-[0.6rem]',
                    col === 0 ? 'rounded-l border-l' : 'border-l-0',
                    col === 3 ? 'rounded-r border-r' : '',
                    row === 0 ? 'border-t' : 'border-t-0',
                    isSel
                      ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.35)] text-[#04110f] shadow-[0_0_10px_rgba(94,234,212,0.5)]'
                      : accent
                        ? 'border-[var(--c-border)] bg-[rgba(94,234,212,0.06)] text-[rgb(var(--c-core))]'
                        : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.3)] text-[var(--c-text-dim)] hover:bg-[rgba(255,255,255,0.05)]',
                  )}
                >
                  {typeof byte === 'number' ? byte.toString(16).toUpperCase().padStart(2, '0') : '—'}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Concise hex line for a flat 16-byte array (column-major read-out). */
function stateHex(bytes: number[]): string {
  return bytesToHex(stateToBytes(bytes))
}

function Rating({ label, tone, note }: { label: string; tone: string; note: string }) {
  return (
    <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3 text-center">
      <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">{label}</p>
      <p className={cn('mt-1 font-mono text-lg tracking-widest', tone)}>{note}</p>
    </div>
  )
}

/* ================================================================== */
/* Block concept                                                        */
/* ================================================================== */

function BlockConcept() {
  return (
    <Panel label="AES STRUCTURE" title="A substitution-permutation network (SPN)" actions={<Blocks size={16} className="text-[var(--c-accent)]" />}>
      <div className="grid gap-3 text-center sm:grid-cols-3">
        <ConceptStep title="128-BIT BLOCK" note="16 bytes · 4×4 state" icon={<Blocks size={16} />} />
        <ConceptStep title="128-BIT KEY" note="10 round keys derived" icon={<KeyRound size={16} />} />
        <ConceptStep title="10 ROUNDS" note="SubBytes · ShiftRows · MixColumns · AddRoundKey" icon={<Zap size={16} />} />
      </div>
      <p className="mt-3 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        AES-128 is a <span className="text-[var(--c-text)]">block cipher</span>: it encrypts exactly <span className="text-[rgb(var(--c-core))]">128 bits</span> at a time. Unlike DES's Feistel network, AES is a <span className="text-[rgb(var(--c-core))]">substitution-permutation network</span> (SPN): each round substitutes bytes, shifts rows, mixes columns, and XORs a round key. This lab focuses on the core single-block transformation.
      </p>
    </Panel>
  )
}

function ConceptStep({ title, note, icon }: { title: string; note: string; icon: ReactNode }) {
  return (
    <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-4">
      <div className="mx-auto grid h-8 w-8 place-items-center rounded-lg border border-[var(--c-border)] text-[rgb(var(--c-core))]">{icon}</div>
      <p className="mt-2 text-[0.6rem] font-semibold text-[var(--c-text)]">{title}</p>
      <p className="text-[0.55rem] text-[var(--c-text-faint)]">{note}</p>
    </div>
  )
}

/* ================================================================== */
/* State matrix visualizer                                              */
/* ================================================================== */

function StateMatrixLab({
  trace,
  usable,
  mode,
  round,
  mathOn,
}: {
  trace: AesTrace
  usable: boolean
  mode: 'encrypt' | 'decrypt'
  round: number
  mathOn: boolean
}) {
  const [sel, setSel] = useState<number | null>(null)
  const isInitial = round === 0
  const rd = isInitial ? null : trace.rounds[round - 1]
  const current = isInitial
    ? mode === 'encrypt'
      ? trace.initialStateAfterArk0
      : trace.initialState
    : rd?.output ?? []
  const stageLabel = isInitial
    ? mode === 'encrypt'
      ? 'AFTER INITIAL ADDROUNDKEY (RK0)'
      : 'CIPHERTEXT INPUT STATE'
    : `ROUND ${round} OUTPUT`

  return (
    <Panel label="STATE MATRIX VISUALIZER" title="The 4×4 byte state, column by column" actions={<Grid3x3 size={16} className="text-[rgb(var(--c-core))]" />}>
      {!usable ? (
        <p className="text-[0.6rem] text-[var(--c-text-faint)]">Enter a valid 128-bit block and key to see the live state.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <StateMatrix bytes={current} title={stageLabel} accent onSelect={setSel} selected={sel ?? undefined} />
            <p className="mt-1 font-mono text-[0.55rem] text-[var(--c-text-faint)]">HEX (column-major) · {stateHex(current)}</p>
          </div>
          <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
            <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">BYTE INSPECTION</p>
            {sel === null ? (
              <p className="mt-1 text-[0.6rem] text-[var(--c-text-faint)]">Click any byte in the grid to inspect it.</p>
            ) : (
              <div className="mt-1 font-mono text-[0.6rem] text-[var(--c-text-dim)]">
                <p>INDEX <span className="text-[rgb(var(--c-core))]">{sel}</span> → row <span className="text-[rgb(var(--c-core))]">{Math.floor(sel / 4)}</span>, column <span className="text-[rgb(var(--c-core))]">{sel % 4}</span></p>
                <p>BYTE <span className="text-[rgb(var(--c-core))]">{current[sel].toString(16).toUpperCase().padStart(2, '0')}</span> = decimal <span className="text-[rgb(var(--c-core))]">{current[sel]}</span></p>
                {mathOn && (
                  <>
                    <p className="mt-1 text-[var(--c-text-faint)]">Next round, this byte feeds SubBytes:</p>
                    <p>SB(<span className="text-[var(--c-text)]">{current[sel].toString(16).toUpperCase().padStart(2, '0')}</span>) → <span className="text-[rgb(var(--c-core))]">{AES_SBOX[current[sel]].toString(16).toUpperCase().padStart(2, '0')}</span></p>
                  </>
                )}
              </div>
            )}
            <p className="mt-2 text-[0.55rem] leading-relaxed text-[var(--c-text-faint)]">
              The 16 input bytes are loaded into the 4×4 state <span className="text-[var(--c-text)]">column by column</span> — byte 0 top of column 0, byte 4 top of column 1, and so on.
            </p>
          </div>
        </div>
      )}
    </Panel>
  )
}

/* ================================================================== */
/* Pipeline                                                             */
/* ================================================================== */

function AesPipeline({ trace, usable, round, onRound, mode }: { trace: AesTrace; usable: boolean; round: number; onRound: (n: number) => void; mode: 'encrypt' | 'decrypt' }) {
  const [active, setActive] = useState<'ark0' | 'rounds' | 'final' | null>('ark0')
  return (
    <Panel label="AES PIPELINE" title="Click any stage to inspect it" actions={<Zap size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="flex flex-col items-stretch gap-1.5">
        <StageBtn label="128-BIT PLAINTEXT" value={usable ? trace.blockHex : '—'} mono onOpen={() => setActive(null)} active={active === null} />
        <PipeBtn label="INITIAL ADDROUNDKEY (ARK0)" onOpen={() => setActive('ark0')} active={active === 'ark0'} />
        <div className="flex items-center justify-center gap-2 text-[0.55rem] text-[var(--c-text-faint)]">
          <span className="rounded-md border border-[var(--c-border)] px-2 py-1 font-mono">{usable ? stateHex(trace.initialState) : 'STATE'}</span>
          <span>⊕ RK0</span>
        </div>
        <PipeBtn label="10 AES ROUNDS (SUB · SHIFT · MIX · ARK)" onOpen={() => setActive('rounds')} active={active === 'rounds'} />
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
          {Array.from({ length: 10 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setActive('rounds'); onRound(i + 1) }}
              className={cn(
                'rounded-md border px-1 py-1.5 text-center text-[0.55rem] transition-colors',
                active === 'rounds' && round === i + 1
                  ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.15)] text-[rgb(var(--c-core))] shadow-[0_0_12px_rgba(94,234,212,0.4)]'
                  : 'border-[var(--c-border)] text-[var(--c-text-dim)] hover:border-[rgb(var(--c-core))]',
              )}
            >
              R{i + 1}
            </button>
          ))}
        </div>
        <PipeBtn label="FINAL OUTPUT" onOpen={() => setActive('final')} active={active === 'final'} />
        <StageBtn label={mode === 'encrypt' ? 'CIPHERTEXT 128-BIT' : 'RECOVERED PLAINTEXT 128-BIT'} value={usable ? trace.cipherHex : '—'} mono accent onOpen={() => setActive('final')} active={active === 'final'} />
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
            {active === 'ark0' && (
              <>
                <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">INITIAL ADDROUNDKEY</p>
                <p className="mt-1">Before round 1, the plaintext state is XORed with round key 0 (the supplied key). This is the <span className="text-[var(--c-text)]">initial round</span> that every AES-128 block starts with.</p>
                {usable && <p className="mt-2 break-all font-mono text-xs text-[var(--c-text)]">STATE ⊕ RK0 = {stateHex(trace.initialStateAfterArk0)}</p>}
              </>
            )}
            {active === 'rounds' && (
              <>
                <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">THE 10 AES ROUNDS</p>
                <p className="mt-1">Rounds 1–9 run SubBytes → ShiftRows → MixColumns → AddRoundKey. Round 10 omits MixColumns, ending with SubBytes → ShiftRows → AddRoundKey. Each round uses a distinct round key.</p>
              </>
            )}
            {active === 'final' && (
              <>
                <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">FINAL OUTPUT</p>
                <p className="mt-1">After round 10 the state is read out column by column to produce the 128-bit ciphertext (or recovered plaintext in decrypt mode).</p>
                {usable && <p className="mt-2 break-all font-mono text-xs text-[rgb(var(--c-core))]">{trace.cipherHex}</p>}
              </>
            )}
            {active === null && (
              <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">SELECT A STAGE TO SEE ITS DATA</p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="mt-2 text-[0.58rem] text-[var(--c-text-faint)]">
        {mode === 'decrypt' ? 'In DECRYPT the pipeline runs the inverse transforms with the round keys applied in reverse (RK10 → RK0).' : 'Encryption order shown. Decryption applies the inverse transforms in reverse key order.'}
      </p>
    </Panel>
  )
}

function StageBtn({ label, value, mono, accent, onOpen, active }: { label: string; value: string; mono?: boolean; accent?: boolean; onOpen?: () => void; active?: boolean }) {
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

function PipeBtn({ label, onOpen, active }: { label: string; onOpen: () => void; active: boolean }) {
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
  stepByStep,
  setStepByStep,
  reduced,
  mathOn,
}: {
  trace: AesTrace
  usable: boolean
  round: number
  setRound: (n: number) => void
  playing: boolean
  setPlaying: (v: boolean | ((prev: boolean) => boolean)) => void
  speed: 'slow' | 'normal' | 'fast'
  setSpeed: (s: 'slow' | 'normal' | 'fast') => void
  stepByStep: boolean
  setStepByStep: (v: boolean) => void
  reduced: boolean
  mathOn: boolean
}) {
  const isInitial = round === 0
  const rd = isInitial ? null : trace.rounds[round - 1]
  return (
    <Panel label="ROUND CONTROLLER" title="Step through the ten rounds" actions={<Gauge size={16} className="text-[rgb(var(--c-core))]" />}>
      {/* Round tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => { setRound(0); setPlaying(false) }}
          className={cn(
            'shrink-0 rounded-md border px-2.5 py-1.5 text-[0.55rem] transition-colors',
            isInitial
              ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.15)] text-[rgb(var(--c-core))] shadow-[0_0_10px_rgba(94,234,212,0.4)]'
              : 'border-[var(--c-border)] text-[var(--c-text-dim)] hover:border-[rgb(var(--c-core))]',
          )}
        >
          INIT
        </button>
        {Array.from({ length: 10 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setRound(i + 1); setPlaying(false) }}
            className={cn(
              'shrink-0 rounded-md border px-2.5 py-1.5 text-[0.55rem] transition-colors',
              round === i + 1
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
          disabled={!usable || reduced || stepByStep}
          aria-label={playing ? 'Pause' : 'Play all'}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(var(--c-core))] px-5 py-2 text-xs font-semibold text-[#04110f] shadow-[0_0_18px_rgba(94,234,212,0.35)] transition-transform hover:scale-[1.02] disabled:opacity-40"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'PAUSE' : 'PLAY ALL'}
        </button>
        <button
          type="button"
          onClick={() => { setRound(Math.min(10, round + 1)); setPlaying(false) }}
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

      {/* speed + step-by-step — separate row so it never crowds the control group */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-end">
        <label className="flex items-center gap-2 text-[0.55rem] text-[var(--c-text-faint)]">
          STEP BY STEP
          <button
            type="button"
            role="switch"
            aria-checked={stepByStep}
            onClick={() => { setStepByStep(!stepByStep); setPlaying(false) }}
            className={cn('relative h-5 w-9 rounded-full border transition-colors', stepByStep ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.2)]' : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.3)]')}
          >
            <span className={cn('absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all', stepByStep ? 'left-[18px] bg-[rgb(var(--c-core))]' : 'left-0.5 bg-[var(--c-text-faint)]')} />
          </button>
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
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
              {s === 'slow' ? 'SLOW MOTION' : s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {reduced && <p className="mt-1 text-[0.55rem] text-[var(--c-text-faint)]">Reduced-motion is on — use PREV / NEXT to step manually.</p>}
      {stepByStep && <p className="mt-1 text-[0.55rem] text-[var(--c-text-faint)]">Step-by-step mode — use PREV / NEXT to walk each round.</p>}

      {/* Active round overview */}
      {usable && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">ACTIVE STAGE</span>
            <motion.span
              key={isInitial ? 'init' : rd?.n}
              initial={reduced ? false : { scale: 1.2 }}
              animate={{ scale: 1 }}
              className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.15)] px-2 py-0.5 font-mono text-[0.6rem] font-semibold text-[rgb(var(--c-core))] shadow-[0_0_10px_rgba(94,234,212,0.4)]"
            >
              {isInitial ? 'INITIAL' : `ROUND ${rd?.n}`}
            </motion.span>
            {mathOn && !isInitial && <span className="font-mono text-[0.55rem] text-[var(--c-text-faint)]">RK{rd?.n}</span>}
          </div>

          {isInitial ? (
            <div className="rounded-lg border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-3">
              <p className="text-[0.6rem] text-[var(--c-text-dim)]">
                This is the <span className="text-[var(--c-text)]">initial round</span> — the state after the plaintext is XORed with round key 0 (RK0, the supplied key). No SubBytes / ShiftRows / MixColumns have run yet.
              </p>
              <p className="mt-2 font-mono text-[0.6rem] text-[rgb(var(--c-core))]">STATE ⊕ RK0 = {stateHex(trace.initialStateAfterArk0)}</p>
            </div>
          ) : (
            rd && <RoundFlow rd={rd} mathOn={mathOn} />
          )}
        </div>
      )}
    </Panel>
  )
}

/** Compact SubBytes→ShiftRows→MixColumns→AddRoundKey flow for a round. */
function RoundFlow({ rd, mathOn }: { rd: AesTrace['rounds'][0]; mathOn: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-3">
      <div className="grid gap-2 sm:grid-cols-5">
        <FlowBox label={`INPUT R${rd.n}`} bytes={rd.input} />
        <FlowArrow label="SubBytes" />
        <FlowBox label="SHIFTROWS" bytes={rd.shiftRows} />
        {rd.hasMixColumns ? (
          <>
            <FlowArrow label="MixColumns" />
            <FlowBox label="ADDROUNDKEY" bytes={rd.output} accent />
          </>
        ) : (
          <>
            <FlowArrow label="no MixColumns" muted />
            <FlowBox label="ADDROUNDKEY" bytes={rd.output} accent />
          </>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 font-mono text-[0.5rem] text-[var(--c-text-faint)]">
        <span>IN {stateHex(rd.input)}</span>
        <span>→</span>
        <span className="text-[rgb(var(--c-core))]">OUT {stateHex(rd.output)}</span>
      </div>
      {mathOn && (
        <p className="mt-2 text-center font-mono text-[0.55rem] text-[var(--c-text-dim)]">
          STATE{rd.n} = AddRoundKey( {rd.hasMixColumns ? 'MixColumns' : 'ShiftRows'}(ShiftRows(SubBytes(STATE{rd.n - 1})), RK{rd.n}) )
        </p>
      )}
    </div>
  )
}

function FlowBox({ label, bytes, accent }: { label: string; bytes: number[]; accent?: boolean }) {
  return (
    <div className={cn('rounded-md border p-1.5 text-center', accent ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)]' : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.3)]')}>
      <p className={cn('mono-label !text-[0.45rem]', accent ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-faint)]')}>{label}</p>
      <p className={cn('mt-0.5 truncate font-mono text-[0.5rem]', accent ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-dim)]')}>{bytes ? bytesToHex(bytes) : '—'}</p>
    </div>
  )
}

function FlowArrow({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-[0.45rem] text-[var(--c-text-faint)]">
      <ArrowRight size={12} className={cn(muted ? 'text-[var(--c-text-faint)]' : 'text-[rgb(var(--c-core))]')} />
      <span className={cn('mono-label', muted ? 'text-[var(--c-text-faint)]' : 'text-[var(--c-text-faint)]')}>{label}</span>
    </div>
  )
}

/* ================================================================== */
/* Round inspector                                                      */
/* ================================================================== */

function RoundInspector({ trace, usable, round, mode }: { trace: AesTrace; usable: boolean; round: number; mode: 'encrypt' | 'decrypt' }) {
  const isInitial = round === 0
  const rd = isInitial ? null : trace.rounds[round - 1]
  return (
    <Panel label="ROUND INSPECTOR" title="Every internal state of the active round" actions={<Target size={16} className="text-[rgb(var(--c-core))]" />}>
      {!usable ? (
        <p className="text-[0.6rem] text-[var(--c-text-faint)]">Enter a valid block and key to inspect round internals.</p>
      ) : isInitial || !rd ? (
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">INITIAL ROUND</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <StateMatrix bytes={trace.initialState} title="PLAINTEXT INPUT" />
            <StateMatrix bytes={trace.initialStateAfterArk0} title="AFTER ARK0" accent />
          </div>
          <p className="mt-2 font-mono text-[0.55rem] text-[var(--c-text-faint)]">STATE ⊕ RK0 = {stateHex(trace.initialStateAfterArk0)}</p>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">ROUND</span>
            <span className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.15)] px-2 py-0.5 font-mono text-[0.6rem] font-semibold text-[rgb(var(--c-core))]">{rd.n}</span>
            <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">{mode === 'encrypt' ? 'ENCRYPT' : 'DECRYPT'}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StateMatrix bytes={rd.input} title={`INPUT R${rd.n}`} />
            <StateMatrix bytes={rd.subBytes} title="SUBBYTES" />
            <StateMatrix bytes={rd.shiftRows} title="SHIFTROWS" />
            <StateMatrix bytes={rd.roundKey} title={`ROUND KEY RK${rd.n}`} />
            {rd.hasMixColumns ? (
              <StateMatrix bytes={rd.mixColumns} title="MIXCOLUMNS" />
            ) : (
              <div className="rounded-md border border-dashed border-[var(--c-border)] p-3">
                <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">MIXCOLUMNS</p>
                <p className="mt-1 text-[0.55rem] text-[var(--c-accent)]">SKIPPED — round {rd.n} is the final round, which omits MixColumns by design.</p>
              </div>
            )}
            <StateMatrix bytes={rd.output} title="OUTPUT (= ADDROUNDKEY)" accent />
          </div>
        </div>
      )}
    </Panel>
  )
}

/* ================================================================== */
/* SubBytes lab                                                         */
/* ================================================================== */

function SubBytesLab({ trace, usable, round }: { trace: AesTrace; usable: boolean; round: number }) {
  const [lookup, setLookup] = useState('53')
  const byteVal = parseInt(lookup, 16)
  const lookupValid = /^[0-9A-Fa-f]{1,2}$/.test(lookup) && byteVal >= 0 && byteVal <= 255
  const rd = trace.rounds[round - 1]
  return (
    <Panel label="SUBBYTES LAB" title="The nonlinear S-box substitution" actions={<FunctionSquare size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Manual lookup */}
        <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.04)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">S-BOX LOOKUP</p>
          <p className="mt-1 text-[0.6rem] text-[var(--c-text-dim)]">Type a byte (00–FF) to see its substitution:</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              aria-label="Byte to look up in the S-box"
              className="w-20 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2 font-mono text-sm text-[rgb(var(--c-core))] outline-none focus:border-[rgb(var(--c-core))]"
            />
            <span className="text-[var(--c-text-dim)]">→</span>
            <span className={cn('font-mono text-sm', lookupValid ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-danger)]')}>
              {lookupValid ? AES_SBOX[byteVal].toString(16).toUpperCase().padStart(2, '0') : '—'}
            </span>
          </div>
          <p className="mt-2 font-mono text-[0.6rem] text-[var(--c-text-dim)]">
            Example: <span className="text-[var(--c-text)]">53</span> → <span className="text-[rgb(var(--c-core))]">ED</span> (the canonical FIPS-197 worked example).
          </p>
          <p className="mt-2 text-[0.55rem] leading-relaxed text-[var(--c-text-faint)]">
            Each state byte is replaced by its S-box value. The S-box is the <span className="text-[var(--c-text)]">only nonlinear step</span> in AES — it is a fixed table derived from the multiplicative inverse in GF(2^8) plus an affine transform.
          </p>
        </div>

        {/* Full S-box table with live highlight */}
        <div className="overflow-x-auto rounded-md border border-[var(--c-border)]">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="bg-[rgba(94,234,212,0.05)]">
                <th className="mono-label px-1 py-1 !text-[0.45rem] text-[var(--c-text-faint)]">S-BOX</th>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'A', 'B', 'C', 'D', 'E', 'F'].map((h, c) => (
                  <th key={c} className={cn('px-1 py-1 font-mono text-[0.45rem]', lookupValid && byteVal % 16 === c ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-faint)]')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf].map((row) => (
                <tr key={row}>
                  <td className={cn('px-1 py-0.5 font-mono text-[0.45rem]', lookupValid && Math.floor(byteVal / 16) === row ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-faint)]')}>{row.toString(16).toUpperCase()}</td>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf].map((col) => {
                    const v = row * 16 + col
                    const isSel = lookupValid && v === byteVal
                    return (
                      <td
                        key={col}
                        className={cn(
                          'px-1 py-0.5 font-mono text-[0.45rem]',
                          isSel
                            ? 'bg-[rgba(94,234,212,0.3)] text-[#04110f] shadow-[inset_0_0_8px_rgba(94,234,212,0.6)]'
                            : 'text-[var(--c-text-dim)]',
                        )}
                      >
                        {AES_SBOX[v].toString(16).toUpperCase().padStart(2, '0')}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live round substitution */}
      {usable && rd && (
        <div className="mt-3 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">LIVE · ROUND {rd.n} SUBBYTES</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <StateMatrix bytes={rd.input} title={`INPUT R${rd.n}`} />
            <div className="flex items-center justify-center">
              <ArrowRight size={16} className="text-[rgb(var(--c-core))]" />
            </div>
            <StateMatrix bytes={rd.subBytes} title="AFTER SUBBYTES" accent />
          </div>
          <p className="mt-2 font-mono text-[0.55rem] text-[var(--c-text-faint)]">INPUT → OUTPUT · {stateHex(rd.input)} → {stateHex(rd.subBytes)}</p>
        </div>
      )}
    </Panel>
  )
}

/* ================================================================== */
/* ShiftRows visualizer                                                 */
/* ================================================================== */

function ShiftRowsLab({ trace, usable, round }: { trace: AesTrace; usable: boolean; round: number }) {
  const rd = trace.rounds[round - 1]
  return (
    <Panel label="SHIFTROWS VISUALIZER" title="Rows shift left by their row index" actions={<Layers size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="grid gap-1.5 sm:grid-cols-4">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-2 text-center">
            <p className="mono-label !text-[0.45rem] text-[var(--c-text-faint)]">ROW {row} · SHIFT {row}</p>
            <p className="mt-1 text-[0.55rem] text-[var(--c-text-dim)]">
              {row === 0 ? 'no shift' : `circular left by ${row}`}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[0.58rem] leading-relaxed text-[var(--c-text-faint)]">
        In <span className="text-[var(--c-text)]">ShiftRows</span>, row 0 is untouched, row 1 shifts left by 1, row 2 by 2, and row 3 by 3. This moves bytes across columns so MixColumns can diffuse them.
      </p>

      {usable && rd ? (
        <div className="mt-3 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">LIVE · ROUND {rd.n} SHIFTROWS</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <StateMatrix bytes={rd.subBytes} title="AFTER SUBBYTES" />
            <div className="flex items-center justify-center">
              <ArrowRight size={16} className="text-[rgb(var(--c-core))]" />
            </div>
            <StateMatrix bytes={rd.shiftRows} title="AFTER SHIFTROWS" accent />
          </div>
          <p className="mt-2 font-mono text-[0.55rem] text-[var(--c-text-faint)]">SUBBYTES → SHIFTROWS · {stateHex(rd.subBytes)} → {stateHex(rd.shiftRows)}</p>
        </div>
      ) : (
        <p className="mt-3 text-[0.6rem] text-[var(--c-text-faint)]">Select a round in the controller to see the live ShiftRows of that round.</p>
      )}
    </Panel>
  )
}

/* ================================================================== */
/* MixColumns lab                                                       */
/* ================================================================== */

function MixColumnsLab({ trace, usable, round, mode }: { trace: AesTrace; usable: boolean; round: number; mode: 'encrypt' | 'decrypt' }) {
  const [a, setA] = useState('D4')
  const [b, setB] = useState('02')
  const [sel, setSel] = useState(0)
  const av = parseInt(a, 16)
  const bv = parseInt(b, 16)
  const avValid = /^[0-9A-Fa-f]{1,2}$/.test(a) && av <= 255
  const bvValid = /^[0-9A-Fa-f]{1,2}$/.test(b) && bv <= 255
  const matrix = mode === 'decrypt' ? INV_MC_MATRIX : MC_MATRIX
  const rd = trace.rounds[round - 1]
  const inBytes = rd?.mixColumns && rd.hasMixColumns
  return (
    <Panel label="MIXCOLUMNS LAB" title="GF(2^8) matrix multiplication" actions={<Grid3x3 size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Matrix + gfMul calculator */}
        <div className="space-y-3">
          <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
            <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">{mode === 'decrypt' ? 'INVERSE MIXCOLUMNS MATRIX' : 'MIXCOLUMNS MATRIX'}</p>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {matrix.flat().map((v, i) => (
                <div key={i} className="rounded border border-[var(--c-border)] bg-[rgba(0,0,0,0.3)] py-1.5 text-center font-mono text-[0.6rem] text-[var(--c-text-dim)]">
                  {v.toString(16).toUpperCase().padStart(2, '0')}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[0.55rem] leading-relaxed text-[var(--c-text-faint)]">
              Each output byte is the GF(2^8) dot product of a matrix row with an input column, using the AES modulus x^8+x^4+x^3+x+1.
            </p>
          </div>

          <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.04)] p-3">
            <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">GF(2^8) MULTIPLY</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[0.6rem]">
              <input
                value={a}
                onChange={(e) => setA(e.target.value)}
                aria-label="First byte for GF multiply"
                className="w-16 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-2 py-1.5 text-center text-[rgb(var(--c-core))] outline-none focus:border-[rgb(var(--c-core))]"
              />
              <span className="text-[var(--c-text-dim)]">⊗</span>
              <input
                value={b}
                onChange={(e) => setB(e.target.value)}
                aria-label="Second byte for GF multiply"
                className="w-16 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-2 py-1.5 text-center text-[rgb(var(--c-core))] outline-none focus:border-[rgb(var(--c-core))]"
              />
              <span className="text-[var(--c-text-dim)]">=</span>
              <span className={cn('text-sm font-semibold', avValid && bvValid ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-danger)]')}>
                {avValid && bvValid ? gfMul(av, bv).toString(16).toUpperCase().padStart(2, '0') : '—'}
              </span>
            </div>
            <p className="mt-2 font-mono text-[0.55rem] text-[var(--c-text-faint)]">Example: {avValid ? `${a.toUpperCase()} ⊗ 02` : 'xx ⊗ 02'} = {avValid ? gfMul(av, 2).toString(16).toUpperCase().padStart(2, '0') : '—'}</p>
          </div>
        </div>

        {/* Live column demo */}
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">LIVE · INSPECT AN OUTPUT BYTE</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[0, 1, 2, 3].map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setSel(col)}
                className={cn('rounded-md border px-2.5 py-1 font-mono text-[0.55rem] transition-colors', col === sel ? 'border-[rgb(var(--c-core))] text-[rgb(var(--c-core))]' : 'border-[var(--c-border)] text-[var(--c-text-dim)]')}
              >
                COL {col}
              </button>
            ))}
          </div>

          {usable && rd && inBytes ? (
            <div className="mt-3 space-y-1.5 font-mono text-[0.55rem] text-[var(--c-text-dim)]">
              {[0, 1, 2, 3].map((row) => {
                const srcIdx = row * 4 + sel
                const srcByte = rd.shiftRows[srcIdx]
                const term = gfMul(matrix[row][sel], srcByte)
                return (
                  <p key={row}>
                    <span className="text-[var(--c-text-faint)]">{matrix[row][sel].toString(16).toUpperCase().padStart(2, '0')} ⊗ </span>
                    <span className="text-[var(--c-text)]">{srcByte.toString(16).toUpperCase().padStart(2, '0')}</span>
                    <span className="text-[var(--c-text-faint)]"> = </span>
                    <span className="text-[rgb(var(--c-core))]">{term.toString(16).toUpperCase().padStart(2, '0')}</span>
                    {row > 0 && <span className="text-[var(--c-text-faint)]">  (⊕)</span>}
                  </p>
                )
              })}
              <p className="pt-1 text-[var(--c-text-faint)]">XOR all four terms →</p>
              <p className="text-[rgb(var(--c-core))]">
                OUT[{sel}] = {rd.mixColumns[sel].toString(16).toUpperCase().padStart(2, '0')}
              </p>
              {!rd.hasMixColumns && (
                <p className="mt-1 text-[var(--c-accent)]">Round {rd.n} is the final round — MixColumns is skipped there, so this column is not transformed.</p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-[0.6rem] text-[var(--c-text-faint)]">Select an encryption round 1–9 to see the live MixColumns arithmetic.</p>
          )}
        </div>
      </div>
    </Panel>
  )
}

/* ================================================================== */
/* AddRoundKey lab                                                      */
/* ================================================================== */

function AddRoundKeyLab({ trace, usable, round }: { trace: AesTrace; usable: boolean; round: number }) {
  const isInitial = round === 0
  const rd = isInitial ? null : trace.rounds[round - 1]
  const key = isInitial ? scheduleKey(trace, 0) : (rd?.roundKey ?? [])
  const state = isInitial ? trace.initialState : rd?.input ?? []
  const out = isInitial ? trace.initialStateAfterArk0 : rd?.output ?? []
  return (
    <Panel label="ADDROUNDKEY LAB" title="The state is XORed with the round key" actions={<KeyRound size={16} className="text-[rgb(var(--c-core))]" />}>
      {!usable ? (
        <p className="text-[0.6rem] text-[var(--c-text-faint)]">Enter a valid block and key to see the AddRoundKey arithmetic.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
            <StateMatrix bytes={state} title={isInitial ? 'PLAINTEXT STATE' : `INPUT R${rd?.n}`} />
            <div className="text-center">
              <p className="font-mono text-sm text-[rgb(var(--c-core))]">⊕</p>
              <p className="mono-label mt-1 !text-[0.45rem] text-[var(--c-text-faint)]">XOR</p>
            </div>
            <StateMatrix bytes={key} title={isInitial ? 'ROUND KEY RK0' : `ROUND KEY RK${rd?.n}`} />
            <div className="flex items-center justify-center">
              <ArrowRight size={16} className="text-[rgb(var(--c-core))]" />
            </div>
            <StateMatrix bytes={out} title="RESULT" accent />
          </div>
          <p className="mt-2 text-center font-mono text-[0.55rem] text-[var(--c-text-faint)]">
            {stateHex(state)} ⊕ {stateHex(key)} = <span className="text-[rgb(var(--c-core))]">{stateHex(out)}</span>
          </p>
          <p className="mt-1 text-center text-[0.55rem] text-[var(--c-text-faint)]">XOR is bitwise: 0⊕0=0 · 0⊕1=1 · 1⊕0=1 · 1⊕1=0.</p>
        </>
      )}
    </Panel>
  )
}

/** Get a round key (0..10) for the AddRoundKey lab. */
function scheduleKey(trace: AesTrace, n: number): number[] {
  if (!trace.valid) return []
  const kt = aesKeyTrace(trace.keyHex)
  return kt.roundKeys[n] ?? []
}

/* ================================================================== */
/* Key schedule lab + Rcon                                              */
/* ================================================================== */

function KeyScheduleLab({ schedule, usable, round }: { schedule: ReturnType<typeof aesKeyTrace>; usable: boolean; round: number }) {
  const [sel, setSel] = useState(-1)
  const active = sel >= 0 ? sel : round
  const rk = schedule.roundKeys[active] ?? []
  const words = schedule.words
  const gWord = words[active * 4]
  const rcon = AES_RCON[active]
  return (
    <Panel label="AES KEY SCHEDULE LAB" title="How 10 round keys are derived from the 128-bit key" actions={<KeyRound size={16} className="text-[var(--c-accent)]" />}>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* The g() step */}
        <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.04)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">ROTWORD · SUBWORD · RCON → WORD W[{active * 4}]</p>
          <div className="mt-2 space-y-1 font-mono text-[0.55rem] text-[var(--c-text-dim)]">
            {active > 0 ? (
              <>
                <p className="text-[var(--c-text-faint)]">Previous word W[{active * 4 - 1}]</p>
                <p className="break-all text-[var(--c-text)]">{words[active * 4 - 1] ? bytesToHex(words[active * 4 - 1]) : '—'}</p>
                <p className="mt-1 text-[var(--c-text-faint)]">↓ RotWord (rotate left by one byte)</p>
                <p className="break-all text-[var(--c-text)]">{rotWordHex(words[active * 4 - 1])}</p>
                <p className="mt-1 text-[var(--c-text-faint)]">↓ SubWord (apply S-box to each byte)</p>
                <p className="break-all text-[rgb(var(--c-core))]">{subWordHex(words[active * 4 - 1])}</p>
                <p className="mt-1 text-[var(--c-text-faint)]">⊕ Rcon[{active}] = <span className="text-[var(--c-accent)]">{rcon.toString(16).toUpperCase().padStart(2, '0')}</span></p>
                <p className="break-all text-[rgb(var(--c-core))]">{gWord ? bytesToHex(gWord) : '—'}</p>
                <p className="mt-1 text-[var(--c-text-faint)]">Then XOR with W[{active * 4 - 4}] to finish the word.</p>
              </>
            ) : (
              <p className="text-[var(--c-text-dim)]">RK0 is the supplied key itself — no derivation yet.</p>
            )}
          </div>
        </div>

        {/* Round key strip */}
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">ROUND KEY RK{active} · 128 BITS</p>
          <StateMatrix bytes={rk} title={`RK${active}`} accent />
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="mono-label shrink-0 !text-[0.45rem] text-[var(--c-text-faint)]">RK0…RK10</span>
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSel(i)}
                title={`RK${i}`}
                className={cn(
                  'shrink-0 rounded-md border px-2 py-1 font-mono text-[0.5rem] transition-colors',
                  i === active
                    ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.2)] text-[rgb(var(--c-core))] shadow-[0_0_10px_rgba(94,234,212,0.4)]'
                    : 'border-[var(--c-border)] text-[var(--c-text-dim)] hover:border-[rgb(var(--c-core))]',
                )}
              >
                RK{i}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[0.55rem] text-[var(--c-text-faint)]">
            <span className="text-[rgb(var(--c-core))]">Cyan</span> = selected round key. Round key 0 is the supplied 128-bit key; each subsequent key is derived by the expansion.
          </p>
        </div>
      </div>

      {/* Rcon visualizer */}
      <div className="mt-3 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
        <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">RCON CONSTANTS</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {AES_RCON.map((rc, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSel(i)}
              className={cn(
                'rounded-md border px-2 py-1 font-mono text-[0.55rem] transition-colors',
                i === active
                  ? 'border-[var(--c-accent)] bg-[rgba(245,197,66,0.15)] text-[var(--c-accent)]'
                  : 'border-[var(--c-border)] text-[var(--c-text-dim)]',
              )}
            >
              {i === 0 ? '—' : rc.toString(16).toUpperCase().padStart(2, '0')}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[0.55rem] leading-relaxed text-[var(--c-text-faint)]">
          Rcon (round constant) is XORed into the first byte of the word each time a new 4-word group starts. It breaks symmetry so the round keys stay distinct across rounds.
        </p>
      </div>

      {!usable && <p className="mt-2 text-[0.6rem] text-[var(--c-text-faint)]">Enter a valid key to see the live expansion.</p>}
    </Panel>
  )
}

function rotWordHex(w: number[] | undefined): string {
  if (!w) return '—'
  const r = [w[1], w[2], w[3], w[0]]
  return bytesToHex(r)
}

function subWordHex(w: number[] | undefined): string {
  if (!w) return '—'
  return bytesToHex(w.map((b) => AES_SBOX[b]))
}

/* ================================================================== */
/* Decryption note                                                      */
/* ================================================================== */

function DecryptionNote() {
  return (
    <Panel label="DECRYPTION" title="Inverse transforms, reverse key order" actions={<Unlock size={16} className="text-[var(--c-accent)]" />}>
      <p className="text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        AES decryption runs the <span className="text-[var(--c-text)]">inverse</span> of each encryption transform, in reverse order with the round keys applied <span className="text-[var(--c-text)]">RK10 → RK0</span>:
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">ENCRYPT</p>
          <p className="mt-1 font-mono text-[0.55rem] text-[var(--c-text-dim)]">SubBytes → ShiftRows → MixColumns → AddRoundKey</p>
        </div>
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[var(--c-accent)]">DECRYPT (INVERSE)</p>
          <p className="mt-1 font-mono text-[0.55rem] text-[var(--c-text-dim)]">InvShiftRows → InvSubBytes → AddRoundKey → InvMixColumns</p>
        </div>
      </div>
      <p className="mt-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <span className="text-[var(--c-text)]">InvSubBytes</span> uses the inverse S-box, and <span className="text-[var(--c-text)]">InvMixColumns</span> multiplies by the inverse matrix
        <span className="font-mono text-[rgb(var(--c-core))]"> (14, 11, 13, 9)</span>. Because each transform has a proper inverse and the keys are reversed, decrypting the ciphertext reproduces the original block.
      </p>
    </Panel>
  )
}

/* ================================================================== */
/* Security analysis                                                    */
/* ================================================================== */

function SecurityAnalysis() {
  return (
    <Panel label="AES SECURITY ANALYSIS" title="Secure by today's standards — used correctly" actions={<Shield size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Rating label="KEY SPACE" tone="text-[rgb(var(--c-core))]" note="2^128" />
        <Rating label="BRUTE FORCE" tone="text-[rgb(var(--c-core))]" note="INFEASIBLE" />
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3 text-center">
          <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">STRENGTH</p>
          <p className="mt-1 text-[0.6rem] font-semibold text-[rgb(var(--c-core))]">STRONG</p>
        </div>
      </div>

      {/* Strength bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">SECURITY LEVEL</span>
          <span className="font-mono text-[0.55rem] text-[rgb(var(--c-core))]">STRONG</span>
        </div>
        <div className="mt-1 flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < 4 ? 'rgb(var(--c-core))' : 'rgba(148,163,184,0.2)' }} />
          ))}
        </div>
      </div>

      <ul className="mt-3 space-y-1.5 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <li><span className="text-[var(--c-text)]">• 128-bit key → 2^128 keys</span> — exhaustive search over 2^128 keys is astronomically infeasible with known technology.</li>
        <li><span className="text-[var(--c-text)]">• SPN structure</span> — ten rounds of substitution-permutation give strong diffusion and confusion.</li>
        <li><span className="text-[var(--c-text)]">• Modern standard</span> — AES is the widely adopted symmetric cipher (used in TLS, disk encryption, and more).</li>
        <li><span className="text-[var(--c-text)]">• Use matters</span> — strength assumes correct use: strong key management and a proven mode of operation.</li>
      </ul>
    </Panel>
  )
}

/* ================================================================== */
/* DES vs AES comparison                                                */
/* ================================================================== */

function DesVsAes() {
  const rows = [
    ['Key size', '56 effective bits', '128 bits'],
    ['Block size', '64 bits', '128 bits'],
    ['Rounds', '16 Feistel rounds', '10 SPN rounds'],
    ['Structure', 'Feistel network', 'Substitution-permutation'],
    ['Final round', 'Same as others', 'Omits MixColumns'],
    ['Status', 'Historical standard', 'Modern standard'],
    ['Recommended today', 'No', 'Yes'],
  ]
  return (
    <Panel label="DES VS AES" title="From Feistel to the modern standard" actions={<Zap size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="overflow-x-auto rounded-md border border-[var(--c-border)]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[rgba(94,234,212,0.05)]">
              <th className="mono-label px-3 py-2 !text-[0.5rem] text-[var(--c-text-faint)]">PROPERTY</th>
              <th className="mono-label px-3 py-2 !text-[0.5rem] text-[var(--c-text)]">DES</th>
              <th className="mono-label px-3 py-2 !text-[0.5rem] text-[rgb(var(--c-core))]">AES</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([prop, des, aes]) => (
              <tr key={prop} className="border-t border-[var(--c-border)]">
                <td className="px-3 py-2 text-[0.6rem] text-[var(--c-text-faint)]">{prop}</td>
                <td className="px-3 py-2 text-[0.6rem] text-[var(--c-text)]">{des}</td>
                <td className="px-3 py-2 text-[0.6rem] text-[rgb(var(--c-core))]">{aes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
        Both are block ciphers, but AES replaces DES's Feistel rounds with an SPN, doubles the block size, and uses a far larger key — closing the brute-force weakness of DES.
      </p>
    </Panel>
  )
}

/* ================================================================== */
/* How AES works                                                        */
/* ================================================================== */

function HowAesWorks() {
  return (
    <Panel label="HOW AES WORKS" title="SPN vs Feistel — the big idea" actions={<BookOpen size={16} className="text-[var(--c-accent)]" />}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.04)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">SUBSTITUTION-PERMUTATION NETWORK (AES)</p>
          <ul className="mt-2 space-y-1.5 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
            <li>• <span className="text-[var(--c-text)]">Substitute</span> — SubBytes replaces each byte nonlinearly.</li>
            <li>• <span className="text-[var(--c-text)]">Permute</span> — ShiftRows and MixColumns spread bytes across the whole block.</li>
            <li>• <span className="text-[var(--c-text)]">Key</span> — AddRoundKey mixes in a round key each round.</li>
            <li>• Both <span className="text-[var(--c-text)]">confusion</span> (SubBytes) and <span className="text-[var(--c-text)]">diffusion</span> (Shift/Mix) are applied to the whole block every round.</li>
          </ul>
        </div>
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">FEISTEL NETWORK (DES)</p>
          <ul className="mt-2 space-y-1.5 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
            <li>• Splits the block into <span className="text-[var(--c-text)]">two halves</span> each round.</li>
            <li>• Only half is transformed per round; the other half is copied.</li>
            <li>• The F-function provides confusion; swapping provides diffusion.</li>
            <li>• Needs more rounds because it transforms half a block at a time.</li>
          </ul>
        </div>
      </div>
    </Panel>
  )
}

/* ================================================================== */
/* Extended topics                                                      */
/* ================================================================== */

function ExtendedTopics() {
  const topics = [
    { t: 'AES-192 / AES-256', d: 'Larger keys (192 / 256 bits) with 12 / 14 rounds. Same algorithm, more rounds for the bigger key.', implemented: false },
    { t: 'ECB / CBC modes', d: 'Modes of operation that chain multiple blocks so messages longer than one 128-bit block can be encrypted safely.', implemented: false },
    { t: 'CTR / GCM', d: 'Stream-like and authenticated modes used in modern protocols (TLS, SSH). GCM also verifies integrity.', implemented: false },
  ]
  return (
    <Panel label="EXTENDED TOPICS" title="Related AES topics (not built here)" actions={<BookOpen size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="grid gap-3 sm:grid-cols-3">
        {topics.map((tp) => (
          <div key={tp.t} className="rounded-md border border-dashed border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
            <div className="flex items-center justify-between">
              <p className="text-[0.62rem] font-semibold text-[var(--c-text)]">{tp.t}</p>
              <span className="mono-label !text-[0.45rem] text-[var(--c-text-faint)]">EXTENDED TOPIC</span>
            </div>
            <p className="mt-1.5 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">{tp.d}</p>
            <p className="mono-label mt-2 !text-[0.45rem] text-[var(--c-accent)]">NOT IMPLEMENTED IN THIS LAB</p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

/* ================================================================== */
/* LEARN AES                                                            */
/* ================================================================== */

const LEARN_SECTIONS: Array<{ n: string; title: string; body: string }> = [
  { n: '01', title: 'What is AES?', body: 'AES is the modern symmetric block cipher standard. AES-128 encrypts 128-bit blocks with a 128-bit key.' },
  { n: '02', title: '128-bit blocks', body: 'One plaintext block = 128 bits = 16 bytes = 32 hex digits, arranged into a 4×4 state matrix column by column.' },
  { n: '03', title: 'The state matrix', body: 'The 16 input bytes fill a 4×4 grid. Column 0 holds bytes 0–3, column 1 bytes 4–7, and so on.' },
  { n: '04', title: 'SPN structure', body: 'AES is a substitution-permutation network: each round substitutes bytes, permutes them, and XORs a round key.' },
  { n: '05', title: 'SubBytes', body: 'Every byte is replaced by its S-box value — the nonlinear step derived from GF(2^8) inversion plus an affine transform.' },
  { n: '06', title: 'ShiftRows', body: 'Row 0 is unchanged; rows 1, 2, 3 shift left by 1, 2, 3 bytes respectively. This moves bytes across columns.' },
  { n: '07', title: 'MixColumns', body: 'Each column is multiplied by a fixed matrix in GF(2^8). This diffuses each column so a byte change affects the whole column.' },
  { n: '08', title: 'AddRoundKey', body: 'The state is XORed with the round key — bitwise: 0⊕0=0, 0⊕1=1, 1⊕0=1, 1⊕1=0.' },
  { n: '09', title: 'The key schedule', body: 'The 128-bit key expands into 11 round keys (RK0…RK10) using RotWord, SubWord, and Rcon constants.' },
  { n: '10', title: 'Ten rounds', body: 'Rounds 1–9 run all four transforms; round 10 omits MixColumns. Ten rounds give strong diffusion and confusion.' },
  { n: '11', title: 'Why 128-bit key', body: 'A 2^128 key space is astronomically large — brute force is infeasible with known technology.' },
  { n: '12', title: 'Decryption', body: 'Decrypt with the inverse transforms (InvSubBytes, InvShiftRows, InvMixColumns) and the round keys in reverse order.' },
  { n: '13', title: 'Modes of operation', body: 'A single AES block is only 128 bits. Chaining modes (CBC, CTR, GCM) encrypt longer messages and are how AES is really used.' },
  { n: '14', title: 'Correct use', body: 'Strength depends on using AES correctly: strong keys, no reuse, and a proven mode of operation.' },
]

function LearnAes() {
  const [open, setOpen] = useState(0)
  return (
    <Panel label="LEARN AES" title="Fourteen interactive sections" actions={<BookOpen size={16} className="text-[rgb(var(--c-core))]" />}>
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

const AES_CHALLENGES: Array<{ q: string; options: string[]; a: string; explain: string }> = [
  { q: 'What is the AES-128 block size?', options: ['64 bits', '128 bits', '256 bits', '32 bits'], a: '128 bits', explain: 'AES-128 encrypts a 128-bit (16-byte) block arranged as a 4×4 state matrix.' },
  { q: 'How many rounds does AES-128 use?', options: ['10', '12', '14', '16'], a: '10', explain: 'AES-128 uses 10 rounds. AES-192 uses 12 and AES-256 uses 14.' },
  { q: 'Which transform does round 10 omit?', options: ['SubBytes', 'ShiftRows', 'MixColumns', 'AddRoundKey'], a: 'MixColumns', explain: 'The final round (round 10) omits MixColumns, ending with SubBytes → ShiftRows → AddRoundKey.' },
  { q: 'What is the only nonlinear step in AES?', options: ['SubBytes', 'ShiftRows', 'MixColumns', 'AddRoundKey'], a: 'SubBytes', explain: 'The S-box substitution in SubBytes is the only nonlinear operation — it is what makes AES a cipher rather than a linear transform.' },
  { q: 'What key space does AES-128 provide?', options: ['2^56', '2^64', '2^128', '2^256'], a: '2^128', explain: 'A 128-bit key gives 2^128 possible keys — brute force is infeasible.' },
]

function AesChallenge() {
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const q = AES_CHALLENGES[qi]
  const choose = (o: string) => {
    if (picked !== null) return
    setPicked(o)
    if (o === q.a) setScore((s) => s + 1)
  }
  const next = () => {
    if (qi + 1 >= AES_CHALLENGES.length) { setDone(true); return }
    setQi(qi + 1); setPicked(null)
  }
  const restart = () => { setQi(0); setPicked(null); setScore(0); setDone(false) }

  return (
    <Panel label="AES CHALLENGE" title="Check your understanding" actions={<GraduationCap size={16} className="text-[rgb(var(--c-core))]" />}>
      {done ? (
        <div className="text-center">
          <p className="text-sm text-[var(--c-text)]">You scored {score} / {AES_CHALLENGES.length}.</p>
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
                {qi + 1 >= AES_CHALLENGES.length ? 'FINISH' : 'NEXT QUESTION'} <ArrowRight size={14} />
              </button>
            </>
          )}
        </>
      )}
    </Panel>
  )
}

/* ================================================================== */
/* Local icon helper                                                    */
/* ================================================================== */

function Grid3x3({ size, className }: { size?: number; className?: string }) {
  return <svg width={size ?? 16} height={size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></svg>
}
