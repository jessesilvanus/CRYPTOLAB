import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowDown,
  ArrowRight,
  Check,
  Compass,
  Dices,
  GraduationCap,
  History,
  Info,
  KeyRound,
  Layers,
  Lightbulb,
  MousePointerClick,
  Play,
  RefreshCw,
  Route,
  Scale,
  Shield,
  ShieldAlert,
  SkipForward,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Panel } from '@/components/ui/Panel'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { EVOLUTION_CIPHERS, EVOLUTION_QUESTIONS, type EvolutionCipher } from '@/data/evolution'
import { cn } from '@/utils/cn'
import { caesarEncrypt } from '@/crypto/algorithms/caesar'
import { monoEncrypt, MONO_DEFAULT_KEY } from '@/crypto/algorithms/monoalphabetic'
import { playfairEncrypt } from '@/crypto/algorithms/playfair'
import { hillEncrypt } from '@/crypto/algorithms/hill'
import { vigenereEncrypt } from '@/crypto/algorithms/vigenere'
import { otpEncrypt, generateSecureOtpKey, otpDataLength } from '@/crypto/algorithms/otp'

const DEFAULT_PLAIN = 'HELLO WORLD'

interface Keys {
  caesar: number
  mono: string
  playfair: string
  hill: string
  vigenere: string
  otp: string
}

export function EvolutionLab() {
  const reduced = useReducedMotion()
  const [plain, setPlain] = useState(DEFAULT_PLAIN)
  const dataLen = otpDataLength(plain)
  const [keys, setKeys] = useState<Keys>(() => ({
    caesar: 3,
    mono: MONO_DEFAULT_KEY,
    playfair: 'MONARCHY',
    hill: '3 3 2 5',
    vigenere: 'LEMON',
    otp: generateSecureOtpKey(otpDataLength(DEFAULT_PLAIN)),
  }))
  const [timeline, setTimeline] = useState<number | null>(0)
  const [attackOpen, setAttackOpen] = useState<number | null>(null)

  // Keep the OTP pad in step with the message length.
  useEffect(() => {
    setKeys((k) => (otpDataLength(k.otp) === dataLen ? k : { ...k, otp: generateSecureOtpKey(dataLen) }))
  }, [dataLen])

  const results = useMemo(() => encryptAll(plain, keys), [plain, keys])

  return (
    <div className="space-y-6">
      <SectionHeading
        kicker="MODULE 01 // EVOLUTION"
        title="Cipher Evolution Lab"
        sub="Travel through the classical ciphers already inside CRYPTOLAB. Every technique tried to solve a weakness in an earlier idea — follow that chain."
        actions={<Compass size={18} className="text-[rgb(var(--c-core))]" />}
      />

      {/* Journey progress */}
      <JourneyProgress />

      {/* Interactive timeline */}
      <Panel
        label="EVOLUTION CHAMBER"
        title="Select a node to inspect it"
        actions={<Route size={16} className="text-[rgb(var(--c-core))]" />}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Timeline selected={timeline} onSelect={setTimeline} reduced={reduced} />
          <TimelineDetail
            cipher={timeline != null ? EVOLUTION_CIPHERS[timeline] : null}
            reduced={reduced}
            onShowNext={() => timeline != null && timeline < EVOLUTION_CIPHERS.length - 1 && setTimeline(timeline + 1)}
          />
        </div>
      </Panel>

      {/* Evolution chain — what problem each step solved */}
      <EvolutionChain />

      {/* Comparison matrix */}
      <CompareCiphers />

      {/* Plaintext + keys config */}
      <KeyConfig plain={plain} onPlain={setPlain} keys={keys} onKeys={setKeys} dataLen={dataLen} />

      {/* Side-by-side encryption */}
      <SideBySide results={results} plain={plain} />

      {/* One message — six encryptions */}
      <OneMessageSix results={results} plain={plain} />

      {/* Key behaviour */}
      <KeyBehavior />

      {/* Security progression */}
      <SecurityProgression />

      {/* Attack map */}
      <AttackMap open={attackOpen} onOpen={setAttackOpen} />

      {/* Crackability visualizer */}
      <Crackability />

      {/* Guided experiment */}
      <TryEvolution plain={plain} setPlain={setPlain} results={results} keys={keys} reduced={reduced} />

      {/* Knowledge check */}
      <KnowledgeCheck />

      {/* Completion */}
      <Completion />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Encryption runner                                                    */
/* ------------------------------------------------------------------ */

interface RunResult {
  id: string
  name: string
  output: string
  ok: boolean
  note?: string
}

function encryptAll(plain: string, keys: Keys): RunResult[] {
  const build = (id: string, name: string, fn: () => string): RunResult => {
    try {
      return { id, name, output: fn(), ok: true }
    } catch {
      return { id, name, output: '—', ok: false, note: 'Invalid key for this cipher.' }
    }
  }
  return [
    build('caesar', 'Caesar', () => caesarEncrypt(plain, keys.caesar)),
    build('mono', 'Monoalphabetic', () => monoEncrypt(plain, keys.mono)),
    build('playfair', 'Playfair', () => playfairEncrypt(plain, keys.playfair)),
    build('hill', 'Hill', () => hillEncrypt(plain, keys.hill)),
    build('vigenere', 'Vigenère', () => vigenereEncrypt(plain, keys.vigenere)),
    build('otp', 'OTP', () => otpEncrypt(plain, keys.otp)),
  ]
}

/* ------------------------------------------------------------------ */
/* Journey progress                                                     */
/* ------------------------------------------------------------------ */

function JourneyProgress() {
  const [done, setDone] = useState<boolean[]>(() => EVOLUTION_CIPHERS.map(() => true))
  const toggle = (i: number) => setDone((d) => d.map((v, j) => (j === i ? !v : v)))
  const count = done.filter(Boolean).length
  return (
    <Panel
      label="CLASSICAL CRYPTOGRAPHY JOURNEY"
      title={`${count} / ${done.length} techniques explored`}
      actions={<History size={16} className="text-[rgb(var(--c-core))]" />}
    >
      <div className="flex flex-wrap items-center gap-2">
        {EVOLUTION_CIPHERS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(i)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.6rem] font-medium transition-colors',
              done[i]
                ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.1)] text-[rgb(var(--c-core))]'
                : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] text-[var(--c-text-faint)]',
            )}
          >
            <span className="font-mono text-[0.5rem]">0{c.index}</span>
            <span>{c.name.toUpperCase()}</span>
            {done[i] && <Check size={11} />}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">
        Purely educational — toggling these never locks or unlocks any lab. It is a personal record of your tour.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Timeline                                                             */
/* ------------------------------------------------------------------ */

function Timeline({
  selected,
  onSelect,
  reduced,
}: {
  selected: number | null
  onSelect: (i: number | null) => void
  reduced: boolean
}) {
  return (
    <div className="relative pl-6">
      {/* connecting rail */}
      <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-[rgba(94,234,212,0.6)] to-[rgba(167,139,250,0.6)]" />
      <div className="space-y-4">
        {EVOLUTION_CIPHERS.map((c, i) => {
          const sel = selected === i
          return (
            <div key={c.id} className="relative flex items-center gap-3">
              <button
                type="button"
                onClick={() => onSelect(sel ? null : i)}
                aria-pressed={sel}
                style={{ transform: sel && !reduced ? 'translateX(2px)' : undefined }}
                className={cn(
                  'relative z-10 grid h-[15px] w-[15px] shrink-0 -ml-6 place-items-center rounded-full border transition-all',
                  sel
                    ? 'border-[rgb(var(--c-core))] bg-[rgb(var(--c-core))] shadow-[0_0_12px_rgba(94,234,212,0.8)]'
                    : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.5)]',
                )}
              >
                <span className={cn('h-[5px] w-[5px] rounded-full', sel ? 'bg-[#04110f]' : 'bg-[var(--c-text-faint)]')} />
              </button>
              <button
                type="button"
                onClick={() => onSelect(sel ? null : i)}
                className={cn(
                  'group flex-1 rounded-lg border px-4 py-3 text-left transition-all',
                  sel
                    ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.08)] shadow-[0_0_20px_rgba(94,234,212,0.12)]'
                    : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] opacity-70 hover:opacity-100',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="mono-label !text-[0.5rem] font-semibold text-[rgb(var(--c-core))]">0{c.index}</span>
                  <span className="flex-1 text-sm font-medium text-[var(--c-text)]">{c.name}</span>
                  <span className={cn('hidden text-[0.55rem] sm:inline', sel ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-faint)]')}>
                    {c.chainLabel}
                  </span>
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TimelineDetail({
  cipher,
  reduced,
  onShowNext,
}: {
  cipher: EvolutionCipher | null
  reduced: boolean
  onShowNext: () => void
}) {
  if (!cipher) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <MousePointerClick size={18} className="text-[var(--c-text-faint)]" />
          <p className="text-xs text-[var(--c-text-faint)]">Select a cipher to open its module.</p>
        </div>
      </div>
    )
  }
  const next = EVOLUTION_CIPHERS[cipher.index]
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={cipher.id}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="space-y-3 rounded-lg border border-[rgb(var(--c-core))] bg-[rgba(0,0,0,0.3)] p-4"
      >
        <p className="mono-label text-[0.6rem] font-semibold text-[rgb(var(--c-core))]">
          {cipher.name.toUpperCase()} · 0{cipher.index}
        </p>
        <Fact label="CORE IDEA" text={cipher.coreIdea} tone="text-[var(--c-text)]" />
        <Fact label="HOW IT WORKS" text={cipher.howItWorks} tone="text-[var(--c-text-dim)]" />
        <Fact label="KEY IDEA" text={cipher.keyIdea} tone="text-[var(--c-text-dim)]" />

        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-3 font-mono text-sm">
          <p className="text-[var(--c-text)]">{cipher.examplePlain}</p>
          <ArrowDown size={12} className="my-1 text-[var(--c-text-faint)]" />
          <p className="text-[rgb(var(--c-core))]">{cipher.exampleCipher}</p>
          <p className="mono-label mt-2 !text-[0.5rem] text-[var(--c-text-faint)]">{cipher.exampleNote}</p>
        </div>

        <div className="rounded-md border border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.05)] p-3">
          <p className="mono-label flex items-center gap-1.5 !text-[0.5rem] font-semibold text-[var(--c-danger)]">
            <ShieldAlert size={12} /> MAIN PROBLEM
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--c-text-dim)]">{cipher.weakness}</p>
        </div>

        <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.04)] p-3">
          <p className="mono-label flex items-center gap-1.5 !text-[0.5rem] font-semibold text-[rgb(var(--c-core))]">
            <Sparkles size={12} /> WHY THE IDEA MOVED ON
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--c-text-dim)]">{cipher.whyNext}</p>
        </div>

        {next && (
          <button
            type="button"
            onClick={onShowNext}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[rgb(var(--c-core))] px-4 py-2 text-xs font-medium text-[rgb(var(--c-core))] transition-colors hover:bg-[rgba(94,234,212,0.1)]"
          >
            WHY MOVE ON? <ArrowRight size={13} /> {next.name.toUpperCase()}
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

function Fact({ label, text, tone }: { label: string; text: string; tone: string }) {
  return (
    <div>
      <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">{label}</p>
      <p className={cn('mt-0.5 text-xs leading-relaxed', tone)}>{text}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Evolution chain                                                      */
/* ------------------------------------------------------------------ */

function EvolutionChain() {
  return (
    <Panel label="THE EVOLUTION" title="Every step solved a problem the last one left" actions={<Route size={16} className="text-[var(--c-accent)]" />}>
      <div className="space-y-0">
        {EVOLUTION_CIPHERS.map((c, i) => (
          <div key={c.id}>
            <div className="flex items-center gap-3 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-4 py-3">
              <span className="mono-label !text-[0.5rem] font-semibold text-[rgb(var(--c-core))]">0{c.index}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--c-text)]">{c.name.toUpperCase()}</p>
                <p className="text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">{c.chainLabel}</p>
              </div>
            </div>
            {i < EVOLUTION_CIPHERS.length - 1 && (
              <div className="flex items-center gap-2 py-1 pl-5">
                <ArrowDown size={12} className="text-[var(--c-text-faint)]" />
                <span className="text-[0.5rem] text-[var(--c-text-faint)]">
                  SOLVED: {shortProblem(c)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <Lightbulb size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
        Cryptography evolved because every new technique tried to solve weaknesses or limitations of earlier approaches.
      </p>
    </Panel>
  )
}

function shortProblem(c: EvolutionCipher): string {
  const map: Record<string, string> = {
    caesar: 'a single fixed shift',
    monoalphabetic: 'the one-shift weakness with a substitution',
    playfair: 'preserved letter-frequency patterns',
    hill: 'single-letter frequency patterns (encrypts blocks)',
    vigenere: 'linear structure of fixed substitutions',
    otp: 'repetition in the keystream',
  }
  return map[c.id] ?? c.chainLabel
}

/* ------------------------------------------------------------------ */
/* Comparison matrix                                                    */
/* ------------------------------------------------------------------ */

const COMPARE_COLUMNS = [
  'CIPHER',
  'UNIT OF OPERATION',
  'KEY TYPE',
  'KEY BEHAVIOR',
  'MATHEMATICAL IDEA',
  'HISTORICAL STRENGTH',
  'MODERN SECURITY',
  'MAIN WEAKNESS',
]

function CompareCiphers() {
  const [sel, setSel] = useState<string[]>(['caesar', 'vigenere'])
  const toggle = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const selected = EVOLUTION_CIPHERS.filter((c) => sel.includes(c.id))
  return (
    <Panel
      label="COMPARE CIPHERS"
      title="Choose two or more techniques"
      actions={<Scale size={16} className="text-[rgb(var(--c-core))]" />}
    >
      <div className="flex flex-wrap items-center gap-2">
        {EVOLUTION_CIPHERS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.6rem] font-medium transition-colors',
              sel.includes(c.id)
                ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.1)] text-[rgb(var(--c-core))]'
                : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] text-[var(--c-text-faint)]',
            )}
          >
            {c.name.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto rounded-md border border-[var(--c-border)]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[rgba(94,234,212,0.05)]">
              {COMPARE_COLUMNS.map((h) => (
                <th key={h} className="mono-label whitespace-nowrap !text-[0.5rem] px-3 py-2 text-[var(--c-text-faint)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selected.map((c) => (
              <tr key={c.id} className="border-t border-[var(--c-border)] align-top">
                <td className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-[var(--c-text)]">{c.name}</td>
                <td className="whitespace-nowrap px-3 py-2 text-[0.62rem] text-[var(--c-text-dim)]">{c.unit}</td>
                <td className="whitespace-nowrap px-3 py-2 text-[0.62rem] text-[var(--c-text-dim)]">{c.keyType}</td>
                <td className="whitespace-nowrap px-3 py-2 text-[0.62rem] text-[rgb(var(--c-core))]">{c.keyBehavior}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-[0.62rem] text-[var(--c-text-dim)]">{c.math}</td>
                <td className="whitespace-nowrap px-3 py-2 text-[0.62rem] text-[var(--c-text-dim)]">{c.histStrength}</td>
                <td className="whitespace-nowrap px-3 py-2 text-[0.62rem] text-[var(--c-accent)]">{c.modernSecurity}</td>
                <td className="min-w-40 px-3 py-2 text-[0.62rem] text-[var(--c-text-dim)]">{c.mainWeakness}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">
        Uses ✓ / ✕ / concise text — no unsupported precise numerical security scores.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Key config + side-by-side + one-message-six                          */
/* ------------------------------------------------------------------ */

function KeyConfig({
  plain,
  onPlain,
  keys,
  onKeys,
  dataLen,
}: {
  plain: string
  onPlain: (v: string) => void
  keys: Keys
  onKeys: (k: Keys) => void
  dataLen: number
}) {
  const set = <K extends keyof Keys>(k: K, v: Keys[K]) => onKeys({ ...keys, [k]: v })
  return (
    <Panel
      label="MESSAGE & KEYS"
      title="One message — configure each key"
      actions={<KeyRound size={16} className="text-[rgb(var(--c-core))]" />}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">PLAINTEXT</p>
          <textarea
            value={plain}
            onChange={(e) => onPlain(e.target.value)}
            rows={2}
            aria-label="Plaintext for evolution comparison"
            className="mt-1 w-full resize-none rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-3 font-mono text-sm text-[var(--c-text)] outline-none focus:border-[rgb(var(--c-core))]"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <NumField label="CAESAR SHIFT" value={keys.caesar} onChange={(n) => set('caesar', n)} />
          <StrField label="MONO KEY" value={keys.mono} onChange={(v) => set('mono', v)} />
          <StrField label="PLAYFAIR KEYWORD" value={keys.playfair} onChange={(v) => set('playfair', v)} />
          <StrField label="HILL KEY MATRIX" value={keys.hill} onChange={(v) => set('hill', v)} />
          <StrField label="VIGENÈRE KEYWORD" value={keys.vigenere} onChange={(v) => set('vigenere', v)} />
          <div>
            <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">OTP KEY · {keys.otp.length}</p>
            <div className="mt-1 flex gap-1.5">
              <input
                value={keys.otp}
                onChange={(v) => set('otp', v.target.value)}
                aria-label="OTP key"
                className="w-full rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2 font-mono text-xs uppercase text-[rgb(var(--c-core))] outline-none focus:border-[rgb(var(--c-core))]"
              />
              <button
                type="button"
                onClick={() => set('otp', generateSecureOtpKey(dataLen))}
                aria-label="Generate random OTP key"
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--c-border)] px-2 text-[0.6rem] text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
              >
                <Dices size={13} /> NEW
              </button>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">{label}</p>
      <input
        type="number"
        min={0}
        max={25}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2 font-mono text-sm text-[var(--c-text)] outline-none focus:border-[rgb(var(--c-core))]"
      />
    </div>
  )
}

function StrField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2 font-mono text-xs uppercase text-[var(--c-text)] outline-none focus:border-[rgb(var(--c-core))]"
      />
    </div>
  )
}

function SideBySide({ results, plain }: { results: RunResult[]; plain: string }) {
  const [a, setA] = useState('caesar')
  const [b, setB] = useState('vigenere')
  const ra = results.find((r) => r.id === a)
  const rb = results.find((r) => r.id === b)
  return (
    <Panel label="SIDE-BY-SIDE" title="Two ciphers on one message" actions={<Layers size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="flex flex-wrap items-center gap-2">
        <Sel id={a} onChange={setA} exclude={b} />
        <span className="mono-label !text-[0.55rem] text-[var(--c-text-faint)]">VS</span>
        <Sel id={b} onChange={setB} exclude={a} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <OutCard title={ra?.name ?? 'A'} plain={plain} r={ra} />
        <OutCard title={rb?.name ?? 'B'} plain={plain} r={rb} />
      </div>
    </Panel>
  )
}

function Sel({ id, onChange, exclude }: { id: string; onChange: (v: string) => void; exclude: string }) {
  return (
    <select
      value={id}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.3)] px-3 py-2 text-xs text-[var(--c-text)] outline-none focus:border-[rgb(var(--c-core))]"
    >
      {EVOLUTION_CIPHERS.filter((c) => c.id !== exclude).map((c) => (
        <option key={c.id} value={c.id} className="bg-[#0a0f1a]">
          {c.name}
        </option>
      ))}
    </select>
  )
}

function OutCard({ title, plain, r }: { title: string; plain: string; r?: RunResult }) {
  return (
    <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-4">
      <p className="mono-label !text-[0.55rem] font-semibold text-[rgb(var(--c-core))]">{title.toUpperCase()}</p>
      <p className="mt-2 font-mono text-sm break-words text-[var(--c-text)]">{plain || ' '}</p>
      <ArrowDown size={12} className="my-1.5 text-[var(--c-text-faint)]" />
      <p className="font-mono text-sm break-words text-[var(--c-text)]">{r?.ok ? r.output : r?.note ?? '—'}</p>
    </div>
  )
}

function OneMessageSix({ results, plain }: { results: RunResult[]; plain: string }) {
  return (
    <Panel label="ONE MESSAGE — SIX ENCRYPTIONS" title="The same input through every technique" actions={<Zap size={16} className="text-[rgb(var(--c-core))]" />}>
      <p className="mb-3 text-xs text-[var(--c-text-dim)]">
        Plaintext <span className="font-mono text-[rgb(var(--c-core))]">{plain || '·'}</span>
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((r) => (
          <div key={r.id} className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
            <p className="mono-label !text-[0.5rem] font-semibold text-[rgb(var(--c-core))]">{r.name.toUpperCase()}</p>
            <p className={cn('mt-1.5 font-mono text-sm break-words', r.ok ? 'text-[var(--c-text)]' : 'text-[var(--c-danger)]')}>
              {r.ok ? r.output : r.note}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Key behavior                                                         */
/* ------------------------------------------------------------------ */

function KeyBehavior() {
  return (
    <Panel label="HOW DOES THE KEY BEHAVE?" title="Every cipher's key behaves differently" actions={<KeyRound size={16} className="text-[var(--c-accent)]" />}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {EVOLUTION_CIPHERS.map((c) => (
          <div key={c.id} className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
            <p className="text-sm font-medium text-[var(--c-text)]">{c.name}</p>
            <p className="mt-1 font-mono text-[0.6rem] font-semibold text-[rgb(var(--c-core))]">{c.keyBehavior}</p>
            <p className="mt-1 text-[0.6rem] text-[var(--c-text-faint)]">{c.keyIdea}</p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Security progression                                                 */
/* ------------------------------------------------------------------ */

function SecurityProgression() {
  return (
    <Panel label="HISTORICAL SECURITY EVOLUTION" title="Improvement is not the same as modern security" actions={<Shield size={16} className="text-[var(--c-accent)]" />}>
      <div className="space-y-1.5">
        {EVOLUTION_CIPHERS.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2">
            <span className="text-xs font-medium text-[var(--c-text)]">{c.name}</span>
            <span className="text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">{c.securityCategory}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        <AlertNote />
        Historical improvement does not automatically mean modern security. Each cipher still has weaknesses under today's standards.
      </p>
    </Panel>
  )
}

function AlertNote() {
  return <ShieldAlert size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
}

/* ------------------------------------------------------------------ */
/* Attack map                                                          */
/* ------------------------------------------------------------------ */

function AttackMap({ open, onOpen }: { open: number | null; onOpen: (i: number | null) => void }) {
  return (
    <Panel label="WHAT CAN ATTACK IT?" title="Interactive weakness map" actions={<Target size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {EVOLUTION_CIPHERS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className={cn(
              'rounded-md border px-3 py-3 text-left transition-colors',
              open === i ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)]' : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] hover:border-[rgb(var(--c-core))]',
            )}
          >
            <p className="text-sm font-medium text-[var(--c-text)]">{c.name}</p>
            <p className="mt-1 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
              {open === i ? c.attacks[0] : c.mainWeakness}
            </p>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">
        Educational conceptual visualization — not offensive hacking functionality. Click a card to read its attack.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Crackability                                                         */
/* ------------------------------------------------------------------ */

function Crackability() {
  const order = ['caesar', 'monoalphabetic', 'playfair', 'hill', 'vigenere']
  return (
    <Panel label="CRACKABILITY VISUALIZER" title="A conceptual scale" actions={<Target size={16} className="text-[var(--c-accent)]" />}>
      <p className="mb-3 text-xs text-[var(--c-text-dim)]">
        EASIER TO ATTACK <ArrowDown size={12} className="inline text-[var(--c-text-faint)]" />
      </p>
      <div className="space-y-1.5">
        {order.map((id) => {
          const c = EVOLUTION_CIPHERS.find((x) => x.id === id)!
          return (
            <div key={id} className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2">
              <span className="text-xs font-medium text-[var(--c-text)]">{c.name}</span>
              <span className="ml-2 text-[0.6rem] text-[var(--c-text-faint)]">{c.chainLabel}</span>
            </div>
          )
        })}
        <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)] px-3 py-2">
          <span className="text-xs font-medium text-[rgb(var(--c-core))]">OTP under correct conditions</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--c-text-dim)]">
        DIFFICULT / PERFECT SECRECY <ArrowDown size={12} className="inline text-[var(--c-text-faint)]" />
      </p>
      <p className="mt-3 flex items-start gap-2 text-[0.62rem] leading-relaxed text-[var(--c-text-faint)]">
        <InfoNote />
        EDUCATIONAL COMPARISON — NOT A FORMAL SECURITY SCORE. This is a rough ordering, not a rigorous measurement.
      </p>
    </Panel>
  )
}

function InfoNote() {
  return <Info size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
}

/* ------------------------------------------------------------------ */
/* Guided experiment                                                    */
/* ------------------------------------------------------------------ */

function TryEvolution({
  plain,
  setPlain,
  results,
  keys,
  reduced,
}: {
  plain: string
  setPlain: (v: string) => void
  results: RunResult[]
  keys: Keys
  reduced: boolean
}) {
  const [stage, setStage] = useState(0)
  const c = EVOLUTION_CIPHERS[stage]
  const r = results.find((x) => x.id === c.id)
  const next = () => setStage((s) => (s < EVOLUTION_CIPHERS.length - 1 ? s + 1 : 0))

  return (
    <Panel
      label="TRY THE EVOLUTION"
      title="Guided experiment — step through each technique"
      actions={<Play size={16} className="text-[rgb(var(--c-core))]" />}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mono-label !text-[0.55rem] text-[var(--c-text-faint)]">PLAINTEXT</span>
        <input
          value={plain}
          onChange={(e) => setPlain(e.target.value)}
          className="min-w-40 flex-1 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2 font-mono text-xs uppercase text-[var(--c-text)] outline-none focus:border-[rgb(var(--c-core))]"
        />
      </div>

      <motion.div
        key={c.id}
        initial={reduced ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-lg border border-[rgb(var(--c-core))] bg-[rgba(0,0,0,0.3)] p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="mono-label text-[0.6rem] font-semibold text-[rgb(var(--c-core))]">
            STAGE 0{c.index} · {c.name.toUpperCase()}
          </p>
          <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">
            {stage + 1} / {EVOLUTION_CIPHERS.length}
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-3 font-mono text-sm">
            <p className="break-words text-[var(--c-text)]">{plain || ' '}</p>
            <ArrowDown size={12} className="my-1 text-[var(--c-text-faint)]" />
            <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">{keysLabel(c, keys)}</p>
            <ArrowDown size={12} className="my-1 text-[var(--c-text-faint)]" />
            <p className={cn('break-words', r?.ok ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-danger)]')}>
              {r?.ok ? r.output : r?.note ?? '—'}
            </p>
          </div>
          <div className="space-y-2 text-[0.62rem] leading-relaxed">
            <div>
              <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">WHAT CHANGED?</p>
              <p className="text-[var(--c-text-dim)]">{c.coreIdea}</p>
            </div>
            <div>
              <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">WHY?</p>
              <p className="text-[var(--c-text-dim)]">{c.keyIdea}</p>
            </div>
            <div>
              <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">WHAT PROBLEM REMAINS?</p>
              <p className="text-[var(--c-text-dim)]">{c.weakness}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={next}
          className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--c-core))] px-5 py-2.5 text-xs font-semibold text-[#04110f] shadow-[0_0_18px_rgba(94,234,212,0.35)] transition-transform hover:scale-[1.02]"
        >
          <SkipForward size={14} /> NEXT EVOLUTION
        </button>
        <span className="text-[0.6rem] text-[var(--c-text-faint)]">
          Stage ends at OTP — press again to loop.
        </span>
      </div>
    </Panel>
  )
}

function keysLabel(c: EvolutionCipher, keys: Keys): string {
  const map: Record<string, string> = {
    caesar: `shift = ${keys.caesar}`,
    mono: 'substitution key',
    playfair: `keyword = ${keys.playfair}`,
    hill: `matrix = ${keys.hill}`,
    vigenere: `keyword = ${keys.vigenere}`,
    otp: 'random pad',
  }
  return map[c.id] ?? c.chainLabel
}

/* ------------------------------------------------------------------ */
/* Knowledge check                                                      */
/* ------------------------------------------------------------------ */

function KnowledgeCheck() {
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const q = EVOLUTION_QUESTIONS[qi]

  const choose = (o: string) => {
    if (picked !== null) return
    setPicked(o)
    if (o === q.answer) setScore((s) => s + 1)
  }
  const nextQ = () => {
    if (qi + 1 >= EVOLUTION_QUESTIONS.length) {
      setDone(true)
      return
    }
    setQi(qi + 1)
    setPicked(null)
  }
  const restart = () => {
    setQi(0)
    setPicked(null)
    setScore(0)
    setDone(false)
  }

  if (done) {
    return (
      <Panel label="KNOWLEDGE CHECK" title="Can you see the evolution?" actions={<GraduationCap size={16} className="text-[rgb(var(--c-core))]" />}>
        <p className="text-sm text-[var(--c-text)]">
          You answered {score} of {EVOLUTION_QUESTIONS.length} correctly.
        </p>
        <button
          type="button"
          onClick={restart}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--c-core))] px-4 py-2 text-xs text-[rgb(var(--c-core))] transition-colors hover:bg-[rgba(94,234,212,0.1)]"
        >
          <RefreshCw size={13} /> RETRY
        </button>
      </Panel>
    )
  }

  return (
    <Panel
      label="KNOWLEDGE CHECK"
      title={`Question ${qi + 1} of ${EVOLUTION_QUESTIONS.length} · ${score} correct`}
      actions={<GraduationCap size={16} className="text-[rgb(var(--c-core))]" />}
    >
      <p className="text-sm text-[var(--c-text)]">{q.prompt}</p>
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {q.options.map((o) => {
          const isPick = o === picked
          const isAnswer = o === q.answer
          return (
            <button
              key={o}
              type="button"
              disabled={picked !== null}
              onClick={() => choose(o)}
              className={cn(
                'rounded-md border px-3 py-2 text-left text-xs transition-all',
                picked === null && 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] text-[var(--c-text)] hover:border-[rgb(var(--c-core))]',
                picked !== null && isAnswer && 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.12)] text-[rgb(var(--c-core))]',
                picked !== null && isPick && !isAnswer && 'border-[var(--c-danger)] bg-[rgba(248,113,113,0.12)] text-[var(--c-danger)]',
                picked !== null && !isPick && !isAnswer && 'border-[var(--c-border)] bg-[rgba(0,0,0,0.15)] text-[var(--c-text-faint)]',
              )}
            >
              {o}
            </button>
          )
        })}
      </div>
      {picked !== null && (
        <div className="mt-3 rounded-md border border-[var(--c-border)] bg-[rgba(94,234,212,0.04)] px-3 py-2 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
          <p className={cn('font-semibold', picked === q.answer ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-danger)]')}>
            {picked === q.answer ? 'CORRECT' : `NOT QUITE — the answer is ${q.answer}.`}
          </p>
          <p className="mt-1">{q.explain}</p>
        </div>
      )}
      {picked !== null && (
        <button
          type="button"
          onClick={nextQ}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--c-core))] px-4 py-2 text-xs text-[rgb(var(--c-core))] transition-colors hover:bg-[rgba(94,234,212,0.1)]"
        >
          {qi + 1 >= EVOLUTION_QUESTIONS.length ? 'FINISH' : 'NEXT QUESTION'} <ArrowRight size={13} />
        </button>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Completion                                                           */
/* ------------------------------------------------------------------ */

function Completion() {
  return (
    <Panel label="CLASSICAL CRYPTOGRAPHY COMPLETE" title="You have explored six classical techniques" actions={<Sparkles size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {EVOLUTION_CIPHERS.map((c) => (
          <div key={c.id} className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2">
            <span className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">0{c.index}</span>
            <span className="ml-2 text-xs font-medium text-[var(--c-text)]">{c.name}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-[rgba(167,139,250,0.4)] bg-[rgba(167,139,250,0.06)] p-4">
        <p className="mono-label flex items-center gap-2 !text-[0.6rem] font-semibold text-[#c4b5fd]">
          NEXT FRONTIER <ArrowRight size={13} />
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {['BLOCK CIPHERS', 'DES', 'AES', 'MODERN CRYPTOGRAPHY'].map((t) => (
            <span key={t} className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-2 py-1 font-mono text-[0.55rem] text-[var(--c-text-faint)]">
              {t}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">
          These arrive in later parts of the project — not implemented yet.
        </p>
      </div>
    </Panel>
  )
}
