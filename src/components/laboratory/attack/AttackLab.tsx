import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Fingerprint,
  Activity,
  Bomb,
  Grid3x3,
  Shield,
  ShieldAlert,
  Crosshair,
  KeyRound,
  Eye,
  Check,
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Lightbulb,
  BookOpen,
  ScanLine,
  AlertTriangle,
  Sparkles,
  GraduationCap,
  ChartColumn,
  Search,
} from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Panel } from '@/components/ui/Panel'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/utils/cn'
import { caesarEncrypt, caesarDecrypt } from '@/crypto/algorithms/caesar'
import { monoEncrypt, MONO_DEFAULT_KEY, MONO_ALPHABET, validateMonoKey } from '@/crypto/algorithms/monoalphabetic'
import { vigenereEncrypt } from '@/crypto/algorithms/vigenere'
import { playfairEncrypt } from '@/crypto/algorithms/playfair'
import { hillEncrypt, validateHillKey } from '@/crypto/algorithms/hill'
import {
  textToHex as desTextToHex,
  desEncryptBlockHex,
} from '@/crypto/algorithms/des'
import {
  textToHex as aesTextToHex,
  aesEncryptBlock,
} from '@/crypto/algorithms/aes'

/* ================================================================== */
/* Types + metadata                                                     */
/* ================================================================== */

type CipherId = 'caesar' | 'mono' | 'vigenere' | 'playfair' | 'hill' | 'des' | 'aes'

interface CipherMeta {
  id: CipherId
  name: string
  short: string
  family: string
  applies: { freq: boolean; brute: boolean; keyspace: boolean; pattern: boolean; monoAnalyzer: boolean; conceptual: 'playfair' | 'hill' | null; security: boolean }
  color: string
  desc: string
}

const CIPHERS: CipherMeta[] = [
  {
    id: 'caesar', name: 'CAESAR', short: 'Caesar', family: 'Classical substitution',
    applies: { freq: true, brute: true, keyspace: true, pattern: false, monoAnalyzer: false, conceptual: null, security: true },
    color: '#f87171',
    desc: 'A fixed shift of the alphabet. The smallest classical key space of all.',
  },
  {
    id: 'mono', name: 'MONOALPHABETIC SUBSTITUTION', short: 'Monoalphabetic', family: 'Classical substitution',
    applies: { freq: true, brute: false, keyspace: true, pattern: false, monoAnalyzer: true, conceptual: null, security: true },
    color: '#fb923c',
    desc: 'An arbitrary 26-letter substitution. Key space is huge, yet frequency analysis still breaks it.',
  },
  {
    id: 'vigenere', name: 'VIGENÈRE', short: 'Vigenère', family: 'Polyalphabetic substitution',
    applies: { freq: true, brute: false, keyspace: true, pattern: true, monoAnalyzer: false, conceptual: null, security: true },
    color: '#fbbf24',
    desc: 'A repeating keyword selects different shifts per letter. Breaks the single-letter frequency fingerprint.',
  },
  {
    id: 'playfair', name: 'PLAYFAIR', short: 'Playfair', family: 'Digraph block cipher',
    applies: { freq: false, brute: false, keyspace: true, pattern: false, monoAnalyzer: false, conceptual: 'playfair', security: true },
    color: '#a78bfa',
    desc: 'Encrypts letter pairs (digraphs) using a 5×5 key square. Single-letter statistics are less directly useful.',
  },
  {
    id: 'hill', name: 'HILL', short: 'Hill', family: 'Block cipher (linear)',
    applies: { freq: false, brute: false, keyspace: true, pattern: false, monoAnalyzer: false, conceptual: 'hill', security: true },
    color: '#60a5fa',
    desc: 'Multiplies plaintext blocks by a modular matrix key. Vulnerable to known-plaintext attacks.',
  },
  {
    id: 'des', name: 'DES', short: 'DES', family: 'Modern block cipher',
    applies: { freq: false, brute: false, keyspace: true, pattern: false, monoAnalyzer: false, conceptual: null, security: true },
    color: '#34d399',
    desc: '64-bit block, 56-bit effective key, 16 Feistel rounds. Classical frequency analysis does not apply.',
  },
  {
    id: 'aes', name: 'AES-128', short: 'AES-128', family: 'Modern block cipher',
    applies: { freq: false, brute: false, keyspace: true, pattern: false, monoAnalyzer: false, conceptual: null, security: true },
    color: '#2dd4bf',
    desc: '128-bit block, 128-bit key, 10 SPN rounds. Not realistically breakable by exhaustive search.',
  },
]

const CIPHER_BY_ID = Object.fromEntries(CIPHERS.map((c) => [c.id, c])) as Record<CipherId, CipherMeta>

/* Reference English letter frequencies (%). */
const REF_ENGLISH: Array<{ letter: string; pct: number }> = [
  { letter: 'E', pct: 12.7 }, { letter: 'T', pct: 9.1 }, { letter: 'A', pct: 8.2 }, { letter: 'O', pct: 7.5 },
  { letter: 'I', pct: 7.0 }, { letter: 'N', pct: 6.7 }, { letter: 'S', pct: 6.3 }, { letter: 'H', pct: 6.1 },
  { letter: 'R', pct: 6.0 }, { letter: 'D', pct: 4.3 }, { letter: 'L', pct: 4.0 }, { letter: 'C', pct: 2.8 },
  { letter: 'U', pct: 2.8 }, { letter: 'M', pct: 2.4 }, { letter: 'W', pct: 2.4 }, { letter: 'F', pct: 2.2 },
  { letter: 'G', pct: 2.0 }, { letter: 'Y', pct: 2.0 }, { letter: 'P', pct: 1.9 }, { letter: 'B', pct: 1.5 },
  { letter: 'V', pct: 1.0 }, { letter: 'K', pct: 0.8 }, { letter: 'J', pct: 0.15 }, { letter: 'X', pct: 0.15 },
  { letter: 'Q', pct: 0.1 }, { letter: 'Z', pct: 0.07 },
]
const REF_MAP = new Map(REF_ENGLISH.map((r) => [r.letter, r.pct]))

/* Security data per cipher for the strength meter + report. */
interface SecData {
  historical: string
  keySpaceLabel: string
  keySpaceLog10: number
  brute: string
  classical: string
  suitability: string
  rating: string
  ratingColor: string
}
const SEC: Record<CipherId, SecData> = {
  caesar: { historical: 'The classic shift cipher, used by Julius Caesar.', keySpaceLabel: '26', keySpaceLog10: 1.41, brute: 'Trivial — try 26 shifts by hand.', classical: 'Frequency analysis breaks it instantly.', suitability: 'Never for real security.', rating: 'VERY WEAK', ratingColor: '#f87171' },
  mono: { historical: 'Renaissance-era substitution, solved by 9th-century Arab cryptanalysts.', keySpaceLabel: '26! (≈ 4×10²⁶)', keySpaceLog10: 26.6, brute: 'Key space is huge, but simple substitution is not random enough to help.', classical: 'Frequency analysis breaks it — the classic success story.', suitability: 'Historical / educational only.', rating: 'VERY WEAK', ratingColor: '#f87171' },
  vigenere: { historical: '16th century, long considered unbreakable, cracked in the 19th century.', keySpaceLabel: '26^L (L = key length)', keySpaceLog10: 8, brute: 'Key space grows with key length, but patterns leak the length.', classical: 'Kasiski examination + frequency analysis can recover the key length; the key itself is not guaranteed.', suitability: 'Educational / historical.', rating: 'WEAK', ratingColor: '#fb923c' },
  playfair: { historical: 'First digraph cipher, used by British forces in WWI.', keySpaceLabel: '≈ 2⁵⁹ key squares', keySpaceLog10: 59, brute: 'Key squares are many but constrained; digraph attacks exist.', classical: 'Digraph frequency analysis reduces single-letter weaknesses.', suitability: 'Historical only.', rating: 'WEAK', ratingColor: '#fb923c' },
  hill: { historical: 'Matrix-based linear block cipher (1929).', keySpaceLabel: 'depends on block size', keySpaceLog10: 8, brute: 'Not the main threat — the math structure is.', classical: 'Known-plaintext attacks recover the matrix key from plaintext/ciphertext pairs.', suitability: 'Conceptual only — linear structure is a weakness.', rating: 'WEAK', ratingColor: '#fb923c' },
  des: { historical: 'First public block-cipher standard (1977), 16 Feistel rounds.', keySpaceLabel: '2^56', keySpaceLog10: 16.9, brute: '56-bit keys were brute-forced in 1998; now feasible with specialized hardware.', classical: 'Not applicable — modern block ciphers resist frequency analysis.', suitability: 'Obsolete for modern use; superseded by AES.', rating: 'WEAK / OBSOLETE', ratingColor: '#fbbf24' },
  aes: { historical: 'Modern symmetric standard (NIST, 2001), 10 SPN rounds.', keySpaceLabel: '2^128', keySpaceLog10: 38.5, brute: 'Exhaustive search is computationally infeasible with practical resources.', classical: 'Not applicable — frequency analysis does not break AES.', suitability: 'Strong for modern use when implemented correctly.', rating: 'STRONG', ratingColor: '#34d399' },
}

const LONG_SAMPLE = 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG AND THE PACK IS READY FOR THE LONG JOURNEY AHEAD'
const BLOCK_SAMPLE = { des: '0123456789ABCDEF', aes: '00112233445566778899AABBCCDDEEFF' }

/* ================================================================== */
/* Pure analysis helpers                                                */
/* ================================================================== */

function lettersOnly(s: string): string {
  return s.toUpperCase().replace(/[^A-Z]/g, '')
}

function encryptWith(cipher: CipherId, text: string, key: string): string {
  switch (cipher) {
    case 'caesar': return caesarEncrypt(text.toUpperCase(), clampShift(key))
    case 'mono': return monoEncrypt(text.toUpperCase(), key)
    case 'vigenere': return vigenereEncrypt(text.toUpperCase(), key.toUpperCase())
    case 'playfair': return playfairEncrypt(text, key)
    case 'hill': return hillEncrypt(text, key)
    case 'des': return desEncryptBlockHex(desTextToHex(text), key)
    case 'aes': return aesEncryptBlock(aesTextToHex(text), key)
  }
}

/** For the analysis UI, keep a single string form for each cipher's default key. */
const DEFAULT_KEY: Record<CipherId, string> = {
  caesar: '7',
  mono: MONO_DEFAULT_KEY,
  vigenere: 'CRYPTO',
  playfair: 'MONARCHY',
  hill: '3 3 2 5',
  des: '133457799BBCDFF1',
  aes: '000102030405060708090A0B0C0D0E0F',
}

function clampShift(s: string): number {
  const n = Number(s)
  return Number.isNaN(n) ? 0 : ((n % 26) + 26) % 26
}

function isValidKey(cipher: CipherId, key: string): boolean {
  switch (cipher) {
    case 'caesar': return /^-?\d+$/.test(key.trim())
    case 'mono': return validateMonoKey(key).valid
    case 'vigenere': return /^[A-Za-z]+$/.test(key)
    case 'playfair': return /^[A-Za-z]+$/.test(key)
    case 'hill': return validateHillKey(key).valid
    case 'des': return /^[0-9A-Fa-f]{16}$/.test(key)
    case 'aes': return /^[0-9A-Fa-f]{32}$/.test(key)
  }
}

function frequency(ciphertext: string) {
  const text = lettersOnly(ciphertext)
  const counts = new Map<string, number>()
  let total = 0
  for (const ch of text) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1)
    total++
  }
  const list = MONO_ALPHABET.split('')
    .map((letter) => ({ letter, count: counts.get(letter) ?? 0, pct: total ? ((counts.get(letter) ?? 0) / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count)
  return { list, total, text }
}

/** Find repeated length-3 sequences with positions + distances. */
function findRepeats(ciphertext: string) {
  const text = lettersOnly(ciphertext)
  const map = new Map<string, number[]>()
  for (let i = 0; i + 3 <= text.length; i++) {
    const seq = text.slice(i, i + 3)
    const arr = map.get(seq) ?? []
    arr.push(i)
    map.set(seq, arr)
  }
  const repeats = [...map.entries()]
    .filter(([, pos]) => pos.length >= 2)
    .map(([seq, pos]) => {
      const distances: number[] = []
      for (let i = 1; i < pos.length; i++) distances.push(pos[i] - pos[i - 1])
      const gcd = distances.length ? distances.reduce((a, b) => gcd2(a, b)) : 0
      return { seq, pos, distances, gcd }
    })
    .sort((a, b) => b.pos.length - a.pos.length)
  return repeats.slice(0, 6)
}
function gcd2(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd2(b, a % b)
}

/* ================================================================== */
/* Top-level lab                                                        */
/* ================================================================== */

const STEPS = [
  { n: '01', t: 'RECEIVE CIPHERTEXT', d: 'A ciphertext string arrives. Keep it as-is; do not assume its origin.' },
  { n: '02', t: 'ANALYZE FREQUENCY', d: 'Count letter occurrences. In simple substitution, the most common ciphertext letter usually maps to the most common English letter, E.' },
  { n: '03', t: 'GENERATE POSSIBLE SHIFTS', d: 'Caesar has only 26 possible keys. Each shift produces one candidate plaintext.' },
  { n: '04', t: 'TEST CANDIDATES', d: 'Read each candidate. The one that forms natural English is the likely plaintext.' },
  { n: '05', t: 'IDENTIFY LIKELY PLAINTEXT', d: 'The shift whose decryption reads clearly is the key. This demonstrates why a tiny key space is a fatal weakness.' },
]

export function AttackLab() {
  const reduced = useReducedMotion()
  const [cipher, setCipher] = useState<CipherId>('caesar')
  const [key, setKey] = useState(DEFAULT_KEY.caesar)
  const [ciphertext, setCiphertext] = useState('')
  const [analyzed, setAnalyzed] = useState(false)
  const [why, setWhy] = useState<string | null>(null)

  const meta = CIPHER_BY_ID[cipher]
  const isTextCipher = ['caesar', 'mono', 'vigenere', 'playfair', 'hill'].includes(cipher)

  // keep the key field in sync when cipher changes
  useEffect(() => {
    setKey(DEFAULT_KEY[cipher])
  }, [cipher])

  const validKey = isValidKey(cipher, key)

  const analyze = () => {
    if (!ciphertext.trim()) return
    setAnalyzed(true)
    setWhy(null)
  }
  const clear = () => {
    setCiphertext('')
    setAnalyzed(false)
    setWhy(null)
  }
  const loadExample = () => {
    const plain = isTextCipher ? 'THE COUNCIL MEETS AT MIDNIGHT BY THE OLD TOWER' : cipher === 'des' ? BLOCK_SAMPLE.des.slice(0, 8) : BLOCK_SAMPLE.aes.slice(0, 16)
    setCiphertext(encryptWith(cipher, plain, key))
    setAnalyzed(true)
  }
  const generate = () => {
    const plain = isTextCipher ? LONG_SAMPLE : cipher === 'des' ? BLOCK_SAMPLE.des.slice(0, 8) : BLOCK_SAMPLE.aes.slice(0, 16)
    setCiphertext(encryptWith(cipher, plain, key))
    setAnalyzed(true)
  }

  return (
    <div className="space-y-6">
      {/* Educational warning */}
      <div className="flex items-start gap-3 rounded-lg border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.05)] px-4 py-3">
        <Shield size={16} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
        <p className="text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
          <span className="font-semibold text-[rgb(var(--c-core))]">EDUCATIONAL CRYPTOGRAPHY SIMULATION.</span>{' '}
          This laboratory demonstrates classical cryptanalysis concepts using student-provided or locally generated
          ciphertext. It does not attack real systems, networks, accounts or communications. Everything runs inside your browser.
        </p>
      </div>

      <SectionHeading
        kicker="MODULE 06 // ATTACK"
        title="Crypto Attack & Analysis Lab"
        sub="A cryptographic investigation center. Experiment with why different ciphers have different strengths and weaknesses by analyzing ciphertext locally — never attacking real targets."
        actions={<Crosshair size={18} className="text-[rgb(var(--c-core))]" />}
      />

      {/* Investigation flow strip */}
      <div className="overflow-x-auto">
        <div className="flex min-w-[560px] items-center gap-2">
          {['CIPHERTEXT', 'CIPHER IDENTIFICATION', 'ANALYSIS ENGINE', 'ATTACK / ANALYSIS METHOD', 'RESULTS', 'SECURITY EXPLANATION'].map((s, i, arr) => (
            <Fragment key={s}>
              <div className="flex items-center gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-1.5">
                <span className="mono-label !text-[0.45rem] text-[rgb(var(--c-core))]">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[0.55rem] font-medium text-[var(--c-text)]">{s}</span>
              </div>
              {i < arr.length - 1 && <ArrowRight size={13} className="shrink-0 text-[var(--c-text-faint)]" />}
            </Fragment>
          ))}
        </div>
      </div>

      {/* INPUT */}
      <Panel label="INPUT" title="Select a cipher and load or type ciphertext" actions={<ScanLine size={16} className="text-[rgb(var(--c-core))]" />}>
        <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">CIPHER TO ANALYZE</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
          {CIPHERS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setCipher(c.id); setAnalyzed(false) }}
              aria-pressed={cipher === c.id}
              className={cn(
                'rounded-md border px-2 py-2 text-left transition-colors',
                cipher === c.id ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.1)]' : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] hover:border-[rgb(var(--c-core))]',
              )}
            >
              <p className="text-[0.58rem] font-semibold" style={{ color: cipher === c.id ? 'rgb(var(--c-core))' : 'var(--c-text)' }}>{c.short}</p>
              <p className="text-[0.45rem] text-[var(--c-text-faint)]">{c.family}</p>
            </button>
          ))}
        </div>

        {/* key (for sample generation) */}
        <div className="mt-3">
          <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">KEY FOR SAMPLE GENERATION</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              aria-label="Key for sample generation"
              className={cn(inputCls, 'w-full max-w-sm font-mono')}
            />
            <span className={cn('text-[0.5rem]', validKey ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-danger)]')}>
              {validKey ? 'valid key ✓' : 'invalid key for this cipher'}
            </span>
          </div>
          <p className="mt-1 text-[0.5rem] leading-relaxed text-[var(--c-text-faint)]">
            Used only to generate sample ciphertext locally. Caesar: a number 0–25 · Mono: 26-letter substitution · Vigenère/Playfair: a keyword · Hill: 4 numbers forming an invertible 2×2 matrix · DES: 16 hex · AES: 32 hex.
          </p>
        </div>

        <div className="mt-3">
          <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">ENTER CIPHERTEXT</p>
          <textarea
            value={ciphertext}
            onChange={(e) => { setCiphertext(e.target.value.toUpperCase()); setAnalyzed(false) }}
            rows={3}
            aria-label="Ciphertext to analyze"
            placeholder="Paste ciphertext here, or load an example / generate a sample…"
            className="mt-1 w-full resize-none rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.3)] p-3 font-mono text-sm text-[var(--c-text)] outline-none focus:border-[rgb(var(--c-core))]"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={analyze} disabled={!ciphertext.trim()} className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--c-core))] px-5 py-2 text-xs font-semibold text-[#04110f] shadow-[0_0_18px_rgba(94,234,212,0.35)] transition-transform hover:scale-[1.02] disabled:opacity-40">
            <Search size={14} /> ANALYZE
          </button>
          <button type="button" onClick={loadExample} disabled={!validKey} className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]">
            <BookOpen size={14} /> LOAD EXAMPLE
          </button>
          <button type="button" onClick={generate} disabled={!validKey} className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]">
            <Sparkles size={14} /> GENERATE SAMPLE
          </button>
          <button type="button" onClick={clear} className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[var(--c-danger)] hover:text-[var(--c-danger)]">
            <RotateCcw size={14} /> CLEAR
          </button>
        </div>
      </Panel>

      {/* CIPHER IDENTIFICATION */}
      <Panel label="CIPHER IDENTIFICATION" title={meta.name} actions={<Fingerprint size={16} className="text-[rgb(var(--c-core))]" />}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="max-w-2xl text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">{meta.desc}</p>
          <SecTag rating={SEC[cipher].rating} color={SEC[cipher].ratingColor} />
        </div>
        {!isTextCipher && (
          <p className="mt-2 flex items-start gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
            {meta.id === 'aes'
              ? 'AES resists classical frequency analysis. The available analysis here is key-space size and a security explanation — NOT an attempt to break AES.'
              : 'DES resists classical frequency analysis. The available analysis here is key-space scale and a security explanation — NOT a real DES cracking tool.'}
          </p>
        )}
      </Panel>

      {/* ANALYSIS MODES */}
      <AnalysisModes cipher={cipher} />

      {/* Results (gated on analyzed) */}
      {analyzed && (
        <>
          {isTextCipher ? (
            <>
              {meta.applies.freq && <FrequencyLab ciphertext={ciphertext} cipher={cipher} why={why} setWhy={setWhy} />}
              {cipher === 'caesar' && <CaesarBruteForce ciphertext={ciphertext} reduced={reduced} />}
              {cipher === 'caesar' && <CaesarKeySpace />}
              {cipher === 'mono' && <MonoAnalyzer ciphertext={ciphertext} />}
              {cipher === 'vigenere' && <VigenereAnalysis ciphertext={ciphertext} why={why} setWhy={setWhy} />}
              {cipher === 'playfair' && <PlayfairAnalysis why={why} setWhy={setWhy} />}
              {cipher === 'hill' && <HillAnalysis why={why} setWhy={setWhy} />}
            </>
          ) : (
            <>
              {cipher === 'des' && <DesAnalysis />}
              {cipher === 'aes' && <AesAnalysis />}
            </>
          )}

          <KeySpaceComparison cipher={cipher} />
          <StrengthMeter cipher={cipher} />
          <SecurityReport cipher={cipher} />
        </>
      )}

      {/* Timeless educational sections */}
      <AttackTimeline />
      <InvestigationMode />
      <StepByStepMode reduced={reduced} />
      <EncryptedNotUnbreakable />
      <ExtendedTopics />
    </div>
  )
}

/* ================================================================== */
/* Analysis modes matrix                                                */
/* ================================================================== */

const METHODS = [
  { key: 'freq', name: 'A · FREQUENCY ANALYSIS', desc: 'Count letter occurrences and compare to English.' },
  { key: 'brute', name: 'B · BRUTE-FORCE VISUALIZER', desc: 'Try every possible key, one by one.' },
  { key: 'keyspace', name: 'C · KEY-SPACE ANALYSIS', desc: 'How many keys exist and how hard is search.' },
  { key: 'pattern', name: 'D · PATTERN ANALYSIS', desc: 'Repeated sequences and key-length clues.' },
  { key: 'monoAnalyzer', name: 'E · SUBSTITUTION ANALYZER', desc: 'Interactive letter-mapping table.' },
] as const

function AnalysisModes({ cipher }: { cipher: CipherId }) {
  const meta = CIPHER_BY_ID[cipher]
  return (
    <Panel label="ANALYSIS MODES" title="Which methods apply to this cipher?" actions={<Grid3x3 size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="overflow-x-auto rounded-md border border-[var(--c-border)]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[rgba(94,234,212,0.05)]">
              <th className="mono-label px-3 py-2 !text-[0.5rem] text-[var(--c-text-faint)]">METHOD</th>
              {CIPHERS.map((c) => (
                <th key={c.id} className="px-2 py-2 text-center">
                  <span className={cn('text-[0.55rem] font-semibold', cipher === c.id ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-faint)]')}>{c.short}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METHODS.map((m) => (
                <tr key={m.key} className="border-t border-[var(--c-border)]">
                  <td className="px-3 py-2">
                    <p className="text-[0.58rem] font-semibold text-[var(--c-text)]">{m.name}</p>
                    <p className="text-[0.48rem] text-[var(--c-text-faint)]">{m.desc}</p>
                  </td>
                  {CIPHERS.map((c) => {
                    const val = c.applies[m.key]
                    return (
                      <td key={c.id} className="px-2 py-2 text-center">
                        {val ? <Check size={14} className="mx-auto text-[rgb(var(--c-core))]" /> : <X size={14} className="mx-auto text-[var(--c-text-faint)]" />}
                      </td>
                    )
                  })}
                </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[0.55rem] leading-relaxed text-[var(--c-text-faint)]">
        The selected cipher ({meta.short}) is highlighted. Classical methods apply to simple substitution ciphers; modern block ciphers (DES, AES) rely on key-space size instead of classical statistics.
      </p>
    </Panel>
  )
}

/* ================================================================== */
/* Frequency analysis                                                   */
/* ================================================================== */

function FrequencyLab({ ciphertext, cipher, why, setWhy }: { ciphertext: string; cipher: CipherId; why: string | null; setWhy: (k: string | null) => void }) {
  const { list, total } = useMemo(() => frequency(ciphertext), [ciphertext])
  const insufficient = total < 50
  const shown = list.filter((l) => l.count > 0).slice(0, 12)
  const top = shown[0]
  const topRef = top ? REF_MAP.get(top.letter) : 0

  return (
    <Panel label="FREQUENCY ANALYSIS" title="Letter counts and percentages" actions={<Activity size={16} className="text-[rgb(var(--c-core))]" />}>
      {insufficient ? (
        <div className="flex items-start gap-2 rounded-md border border-[var(--c-accent)] bg-[rgba(245,197,66,0.06)] px-3 py-2 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
          <span>
            <span className="font-semibold text-[var(--c-accent)]">INSUFFICIENT DATA FOR RELIABLE FREQUENCY ANALYSIS.</span>{' '}
            Only {total} letters detected. Frequency analysis needs enough text (roughly 50+ letters) for the letter
            distribution to stabilise — short ciphertext does not produce meaningful statistics, and we will not pretend it does.
          </span>
        </div>
      ) : (
        <p className="text-[0.6rem] text-[var(--c-text-faint)]">
          {total} letters analysed. The most common letter is <span className="text-[rgb(var(--c-core))]">{top?.letter}</span> at{' '}
          <span className="text-[var(--c-text)]">{top?.pct.toFixed(1)}%</span>
          {topRef ? <> (English reference: <span className="text-[var(--c-text)]">{topRef}%</span> for the same letter)</> : null}.
        </p>
      )}

      {/* bar chart (all 26, or top 12) */}
      <div className="mt-3 space-y-1">
        {shown.map(({ letter, count, pct }) => {
          const ref = REF_MAP.get(letter) ?? 0
          const barW = total ? Math.max(2, (count / Math.max(1, shown[0].count)) * 100) : 0
          return (
            <div key={letter} className="flex items-center gap-2">
              <span className="w-4 text-right font-mono text-[0.58rem] text-[var(--c-text)]">{letter}</span>
              <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-[rgba(148,163,184,0.15)]">
                <div className="h-full rounded-sm bg-gradient-to-r from-[rgba(94,234,212,0.4)] to-[rgb(var(--c-core))]" style={{ width: `${barW}%` }} />
              </div>
              <span className="w-12 text-right font-mono text-[0.55rem] text-[var(--c-text-dim)]">{pct.toFixed(1)}%</span>
              <span className="hidden w-10 text-right font-mono text-[0.5rem] text-[var(--c-text-faint)] sm:inline">ref {ref}%</span>
            </div>
          )
        })}
      </div>

      {insufficient && (
        <p className="mt-3 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
          Tip: load a longer example (GENERATE SAMPLE) to see a meaningful frequency distribution.
        </p>
      )}

      <FrequencyComparison ciphertext={ciphertext} cipher={cipher} />

      <WhyButton open={why === 'freq'} onToggle={() => setWhy(why === 'freq' ? null : 'freq')}>
        Frequency analysis works because some classical substitutions preserve the statistical characteristics of natural
        language. English letters appear with roughly stable rates (E is ~12.7%), so a substitution cipher that maps each
        plaintext letter to a fixed ciphertext letter carries those rates over. You can therefore guess that the most common
        ciphertext letter is probably the plaintext letter E.
        <br />
        <span className="text-[var(--c-text)]">Why this does NOT break modern AES:</span> AES is a substitution-permutation
        network over 128-bit blocks that mixes every bit of the block with the key. A single ciphertext letter does not map to a
        single plaintext letter, and the avalanche effect means changing one plaintext bit flips roughly half of the ciphertext bits.
        No simple letter-level statistic survives, so this classical idea does not transfer.
      </WhyButton>
    </Panel>
  )
}

function FrequencyComparison({ ciphertext, cipher }: { ciphertext: string; cipher: CipherId }) {
  const { list } = useMemo(() => frequency(ciphertext), [ciphertext])
  const shown = list.filter((l) => l.count > 0).slice(0, 8)
  return (
    <div className="mt-4 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
      <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">CIPHERTEXT FREQUENCY vs REFERENCE ENGLISH</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div>
          {shown.map(({ letter, pct }) => (
            <div key={letter} className="flex items-center gap-1.5">
              <span className="w-3 font-mono text-[0.55rem] text-[var(--c-text)]">{letter}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-[rgba(148,163,184,0.15)]">
                <div className="h-full bg-[rgb(var(--c-core))]" style={{ width: `${Math.min(100, pct * 4)}%` }} />
              </div>
              <span className="w-11 text-right font-mono text-[0.5rem] text-[rgb(var(--c-core))]">{pct.toFixed(1)}</span>
            </div>
          ))}
        </div>
        <div>
          {shown.map(({ letter }) => {
            const ref = REF_MAP.get(letter) ?? 0
            return (
              <div key={letter} className="flex items-center gap-1.5">
                <span className="w-3 font-mono text-[0.55rem] text-[var(--c-text-dim)]">{letter}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-[rgba(148,163,184,0.15)]">
                  <div className="h-full bg-[var(--c-accent)]" style={{ width: `${Math.min(100, ref * 4)}%` }} />
                </div>
                <span className="w-11 text-right font-mono text-[0.5rem] text-[var(--c-text-dim)]">{ref.toFixed(1)}</span>
              </div>
            )
          })}
        </div>
      </div>
      <p className="mt-2 text-[0.55rem] leading-relaxed text-[var(--c-text-dim)]">
        <span className="text-[rgb(var(--c-core))]">Ciphertext</span> vs <span className="text-[var(--c-accent)]">English reference</span>.
        For a monoalphabetic substitution, the ciphertext distribution mirrors English — renaming each letter but preserving its
        rate ({cipher === 'vigenere' ? 'for Vigenère this mirror only holds within a single Caesar column once the key length is known; the full-text distribution looks flatter'
          : cipher === 'mono' || cipher === 'caesar' ? 'as shown here'
          : 'when applicable'}). This statistical fingerprint is what classical frequency analysis exploits — and why it does not
        transfer to modern block ciphers like AES.
      </p>
    </div>
  )
}

/* ================================================================== */
/* Caesar brute force + key space                                        */
/* ================================================================== */

function CaesarBruteForce({ ciphertext, reduced }: { ciphertext: string; reduced: boolean }) {
  const { text } = useMemo(() => frequency(ciphertext), [ciphertext])
  const candidates = useMemo(() => {
    const arr: Array<{ shift: number; text: string }> = []
    for (let s = 0; s < 26; s++) arr.push({ shift: s, text: caesarDecrypt(text, s) })
    return arr
  }, [text])
  const [sel, setSel] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing || reduced) { setPlaying(false); return }
    const id = setInterval(() => setSel((s) => (s + 1) % 26), 350)
    return () => clearInterval(id)
  }, [playing, reduced])

  const reset = () => { setPlaying(false); setSel(0) }

  return (
    <Panel label="CAESAR BRUTE-FORCE VISUALIZER" title="TRY ALL SHIFTS — only 26 possible keys" actions={<Bomb size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => { setSel((s) => Math.max(0, s - 1)); setPlaying(false) }} aria-label="Previous shift" className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]">
          <SkipBack size={14} /> PREV
        </button>
        <button type="button" onClick={() => setPlaying(!playing)} disabled={reduced} aria-label={playing ? 'Pause' : 'Play all shifts'} className="inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(var(--c-core))] px-5 py-2 text-xs font-semibold text-[#04110f] shadow-[0_0_18px_rgba(94,234,212,0.35)] transition-transform hover:scale-[1.02] disabled:opacity-40">
          {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'PAUSE' : 'PLAY ALL'}
        </button>
        <button type="button" onClick={() => { setSel((s) => Math.min(25, s + 1)); setPlaying(false) }} aria-label="Next shift" className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]">
          <SkipForward size={14} /> NEXT
        </button>
        <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]">
          <RotateCcw size={14} /> RESET
        </button>
      </div>
      {reduced && <p className="mt-2 text-center text-[0.5rem] text-[var(--c-text-faint)]">Reduced-motion on — use PREV / NEXT.</p>}

      <div className="mt-3 rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)] px-3 py-2">
        <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">CURRENT CANDIDATE · SHIFT {sel}</p>
        <p className="mt-1 break-all font-mono text-sm text-[rgb(var(--c-core))]">{candidates[sel].text}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
        {candidates.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setSel(i); setPlaying(false) }}
            className={cn(
              'rounded-md border px-2 py-1.5 text-left transition-colors',
              sel === i ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.14)]' : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] hover:border-[rgb(var(--c-core))]',
            )}
          >
            <p className="mono-label !text-[0.45rem] text-[var(--c-text-faint)]">SHIFT {i}</p>
            <p className={cn('truncate text-[0.55rem]', sel === i ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-dim)]')}>{c.text.slice(0, 24)}</p>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">
        Visually verify: there are only <span className="text-[var(--c-text)]">26 possible Caesar keys</span>, and the correct one reads as
        natural English. This is why a tiny key space makes exhaustive search practical.
      </p>
    </Panel>
  )
}

function CaesarKeySpace() {
  return (
    <Panel label="CAESAR KEY-SPACE VISUALIZATION" title="KEY SPACE — 26 possible keys" actions={<KeyRound size={16} className="text-[var(--c-accent)]" />}>
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 lg:grid-cols-13">
        {Array.from({ length: 26 }, (_, i) => (
          <div key={i} className="grid h-9 place-items-center rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] text-[0.58rem] text-[var(--c-text-dim)]">
            {i}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
        Because the key space is tiny (<span className="text-[var(--c-text)]">26 possible shifts</span>), trying every Caesar shift is
        practical — even by hand. Compared to a modern cipher, this is effectively no protection at all.
      </p>
      <div className="mt-2"><SecTag rating="VERY WEAK" color="#f87171" /></div>
    </Panel>
  )
}

/* ================================================================== */
/* Mono substitution analyzer                                            */
/* ================================================================== */

function MonoAnalyzer({ ciphertext }: { ciphertext: string }) {
  const { text, list } = useMemo(() => frequency(ciphertext), [ciphertext])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const set = (cipherLetter: string, plain: string) => setMapping((m) => ({ ...m, [cipherLetter]: plain.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1) }))

  const substituted = text
    .split('')
    .map((ch) => mapping[ch] || '·')
    .join('')

  const useHints = () => {
    // map the 3 most frequent ciphertext letters to E, T, A as a hypothesis
    const top = list.filter((l) => l.count > 0).map((l) => l.letter)
    const guesses = ['E', 'T', 'A']
    const next: Record<string, string> = {}
    top.forEach((l, i) => { if (guesses[i]) next[l] = guesses[i] })
    setMapping((m) => ({ ...m, ...next }))
  }
  const resetMap = () => setMapping({})

  return (
    <Panel label="SUBSTITUTION ANALYZER" title="Manual letter mapping (frequency-aided)" actions={<Fingerprint size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">CIPHERTEXT LETTERS BY FREQUENCY</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {list.filter((l) => l.count > 0).slice(0, 12).map(({ letter, count }) => (
              <span key={letter} className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-2 py-1 text-[0.55rem] text-[var(--c-text-dim)]">
                {letter} <span className="text-[var(--c-text-faint)]">{count}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-[0.55rem] leading-relaxed text-[var(--c-text-faint)]">
            In English, E, T and A are the most frequent letters. Hypothesis: the most common ciphertext letters may map to them.
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">LETTER MAPPING TABLE (CIPHER → PLAINTEXT GUESS)</p>
          </div>
          <div className="mt-2 grid grid-cols-6 gap-1 sm:grid-cols-8 lg:grid-cols-13">
            {MONO_ALPHABET.split('').map((cl) => (
              <label key={cl} className="flex flex-col items-center">
                <span className="text-[0.5rem] text-[var(--c-text-faint)]">{cl}</span>
                <input
                  value={mapping[cl] ?? ''}
                  onChange={(e) => set(cl, e.target.value)}
                  maxLength={1}
                  aria-label={`Cipher ${cl} maps to plaintext`}
                  className="mt-0.5 h-8 w-8 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.3)] text-center font-mono text-[0.6rem] text-[rgb(var(--c-core))] outline-none focus:border-[rgb(var(--c-core))]"
                />
              </label>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={useHints} className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--c-core))] px-3 py-1.5 text-[0.55rem] text-[rgb(var(--c-core))] transition-colors hover:bg-[rgba(94,234,212,0.1)]">
              <Lightbulb size={12} /> USE FREQUENCY HINTS (hypothesis only)
            </button>
            <button type="button" onClick={resetMap} className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-3 py-1.5 text-[0.55rem] text-[var(--c-text-dim)] transition-colors hover:border-[var(--c-danger)] hover:text-[var(--c-danger)]">
              <RotateCcw size={12} /> RESET MAPPING
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.05)] p-3">
        <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">SUBSTITUTED TEXT (using your mapping)</p>
        <p className="mt-1 break-all font-mono text-sm text-[rgb(var(--c-core))]">{substituted || '—'}</p>
        <p className="mt-1 break-all font-mono text-[0.55rem] text-[var(--c-text-faint)]">raw ciphertext: {text}</p>
      </div>

      <p className="mt-3 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">
        This tool does <span className="text-[var(--c-text)]">not</span> automatically confirm a mapping is correct. It lets you test
        hypotheses derived from frequency analysis, known plaintext clues and letter substitution. Only you can decide when the
        text reads as natural English.
      </p>
    </Panel>
  )
}

/* ================================================================== */
/* Vigenère pattern analysis                                             */
/* ================================================================== */

function VigenereAnalysis({ ciphertext, why, setWhy }: { ciphertext: string; why: string | null; setWhy: (k: string | null) => void }) {
  const repeats = useMemo(() => findRepeats(ciphertext), [ciphertext])
  return (
    <Panel label="VIGENÈRE ANALYSIS" title="Repeated patterns and key-length clues" actions={<Eye size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="flex items-start gap-2 rounded-md border border-[var(--c-accent)] bg-[rgba(245,197,66,0.06)] px-3 py-2 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
        <span>
          <span className="font-semibold text-[var(--c-accent)]">EDUCATIONAL ANALYSIS.</span> This section demonstrates how repeated
          sequences can hint at a possible key length. It does <span className="text-[var(--c-text)]">not</span> reliably recover
          arbitrary Vigenère keys.
        </span>
      </div>

      <p className="mt-3 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
        When the same sequence of letters appears more than once, the distance between its occurrences is often a multiple of the
        keyword length. The greatest common divisor of those distances is a possible key-length clue (the basis of the Kasiski
        examination).
      </p>

      {repeats.length === 0 ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[var(--c-text-faint)]" />
          No repeated length-3 sequences found in this ciphertext. Longer text or a shorter keyword may produce repeats.
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-md border border-[var(--c-border)]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[rgba(94,234,212,0.05)]">
                <th className="mono-label px-3 py-2 !text-[0.5rem] text-[var(--c-text-faint)]">SEQUENCE</th>
                <th className="mono-label px-3 py-2 !text-[0.5rem] text-[var(--c-text-faint)]">OCCURRENCES (POSITIONS)</th>
                <th className="mono-label px-3 py-2 !text-[0.5rem] text-[var(--c-text-faint)]">DISTANCES</th>
                <th className="mono-label px-3 py-2 !text-[0.5rem] text-[var(--c-text-faint)]">GCD CLUE</th>
              </tr>
            </thead>
            <tbody>
              {repeats.map((r) => (
                <tr key={r.seq} className="border-t border-[var(--c-border)]">
                  <td className="px-3 py-2 font-mono text-[0.6rem] text-[rgb(var(--c-core))]">{r.seq}</td>
                  <td className="px-3 py-2 font-mono text-[0.55rem] text-[var(--c-text-dim)]">{r.pos.join(', ')}</td>
                  <td className="px-3 py-2 font-mono text-[0.55rem] text-[var(--c-text-dim)]">{r.distances.join(', ')}</td>
                  <td className="px-3 py-2 font-mono text-[0.6rem] text-[var(--c-accent)]">{r.gcd || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <FlowCard t="REPEATED PATTERNS" d="Identical ciphertext segments recur because the key repeats. Their spacing reveals the key length." />
        <FlowCard t="POSSIBLE KEY-LENGTH CLUES" d="The GCD of the distances between a repeated sequence is a candidate keyword length." />
      </div>

      <WhyButton open={why === 'vig'} onToggle={() => setWhy(why === 'vig' ? null : 'vig')}>
        Vigenère defeats single-letter frequency analysis because the same plaintext letter can encrypt to different ciphertext
        letters depending on its position in the keyword. But the keyword <span className="text-[var(--c-text)]">repeats</span>, and
        that repetition leaks information: when the key period aligns with a repeated plaintext sequence, the same ciphertext
        sequence reappears. Measuring the distance between repeats (Kasiski) and analysing the frequency within each key column
        (Friedman / index of coincidence) recovers the key. This is why Vigenère is historically important but not modern-secure.
      </WhyButton>
    </Panel>
  )
}

function FlowCard({ t, d }: { t: string; d: string }) {
  return (
    <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
      <p className="mono-label !text-[0.5rem] text-[var(--c-text)]">{t}</p>
      <p className="mt-1 text-[0.55rem] leading-relaxed text-[var(--c-text-dim)]">{d}</p>
    </div>
  )
}

/* ================================================================== */
/* Playfair + Hill conceptual                                           */
/* ================================================================== */

function PlayfairAnalysis({ why, setWhy }: { why: string | null; setWhy: (k: string | null) => void }) {
  return (
    <Panel label="PLAYFAIR ANALYSIS" title="Digraph structure — conceptual" actions={<Grid3x3 size={16} className="text-[rgb(var(--c-core))]" />}>
      <ConceptualBanner />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <FlowCard t="DIGRAPH STRUCTURE" d="Playfair encrypts letter pairs (digraphs), not single letters. The plaintext is split into pairs before encryption." />
        <FlowCard t="5 × 5 KEY SQUARE" d="A 5×5 grid built from a keyword (I and J share a cell). Each digraph is encrypted using row, column or rectangle rules." />
        <FlowCard t="REPEATED-LETTER HANDLING" d="If a digraph has identical letters, an X is inserted between them so each pair is distinct before encryption." />
        <FlowCard t="PAIR-BASED ENCRYPTION" d="Because pairs map to pairs, single-letter frequency analysis is less directly applicable than with simple substitution." />
      </div>
      <p className="mt-3 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">
        Ordinary single-letter frequency analysis is <span className="text-[var(--c-text)]">less directly applicable</span> to Playfair
        than to simple substitution ciphers, because the unit of operation is a pair. This is why digraph-based ciphers obscure
        single-letter statistics — though they are still breakable by digraph frequency analysis and are not secure by modern standards.
      </p>
      <WhyButton open={why === 'playfair'} onToggle={() => setWhy(why === 'playfair' ? null : 'playfair')}>
        A simple substitution cipher preserves single-letter frequencies because each plaintext letter has a fixed ciphertext
        replacement. Playfair instead operates on pairs: a plaintext pair maps to a ciphertext pair in a way that depends on
        both letters and the key square. The single-letter fingerprint is therefore smeared across pairs, making
        single-letter frequency analysis far less effective — but the pair structure is itself a clue and can be attacked with
        digraph frequency analysis.
      </WhyButton>
    </Panel>
  )
}

function HillAnalysis({ why, setWhy }: { why: string | null; setWhy: (k: string | null) => void }) {
  return (
    <Panel label="HILL CIPHER ANALYSIS" title="Block-based linear transformation — conceptual" actions={<ChartColumn size={16} className="text-[rgb(var(--c-core))]" />}>
      <ConceptualBanner />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <FlowCard t="BLOCK-BASED TRANSFORMATION" d="The plaintext is grouped into fixed-size blocks (2 letters for a 2×2 key) and each block is transformed together." />
        <FlowCard t="MATRIX KEY" d="The key is a matrix. Each block is multiplied by the key matrix modulo 26 to produce the ciphertext block." />
        <FlowCard t="MODULAR ARITHMETIC" d="All arithmetic is done modulo 26, so letter values wrap around the alphabet after each multiplication." />
        <FlowCard t="KNOWN PLAINTEXT IS POWERFUL" d="Given enough plaintext/ciphertext pairs, the matrix key can be recovered by solving linear equations — a known-plaintext attack." />
      </div>
      <p className="mt-3 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">
        The <span className="text-[var(--c-text)]">relationship between plaintext blocks and ciphertext blocks is linear</span>. That
        linear structure is exactly what makes Hill vulnerable to a <span className="text-[var(--c-text)]">known-plaintext attack</span>:
        with a few matching plaintext/ciphertext block pairs, an attacker can solve for the key matrix. This tool does not auto-crack
        arbitrary Hill ciphertext.
      </p>
      <WhyButton open={why === 'hill'} onToggle={() => setWhy(why === 'hill' ? null : 'hill')}>
        Hill's ciphertext block is the plaintext block multiplied by the key matrix modulo 26. Multiplication is a linear
        operation, so ciphertext depends on plaintext in a linear, invertible way. If an attacker knows some plaintext and the
        matching ciphertext (a known-plaintext pair), they can set up a small system of modular equations and solve it for the
        key matrix — no exhaustive search needed. Modern ciphers deliberately introduce heavy non-linearity (S-boxes) to defeat
        exactly this class of attack.
      </WhyButton>
    </Panel>
  )
}

function ConceptualBanner() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-[var(--c-accent)] bg-[rgba(245,197,66,0.06)] px-3 py-2 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
      <Info size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
      <span>
        <span className="font-semibold text-[var(--c-accent)]">CONCEPTUAL ANALYSIS ONLY.</span> No fake cracking results are produced.
        This section explains the structure and the relevant attack concepts without pretending to break the cipher.
      </span>
    </div>
  )
}

/* ================================================================== */
/* DES + AES security                                                   */
/* ================================================================== */

function DesAnalysis() {
  return (
    <Panel label="DES SECURITY ANALYSIS" title="56-bit effective key — a broken modern cipher" actions={<Shield size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatBox k="BLOCK SIZE" v="64 bits" />
        <StatBox k="EFFECTIVE KEY" v="56 bits" />
        <StatBox k="ROUNDS" v="16 Feistel" />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">KEY SPACE</p>
          <p className="mt-1 font-mono text-lg text-[var(--c-text)]">2^56</p>
          <p className="mt-1 text-[0.55rem] leading-relaxed text-[var(--c-text-dim)]">
            Exhaustive search of the 56-bit key space became practical enough historically (a 1998 DES Cracker) to make DES
            unsuitable for modern security.
          </p>
        </div>
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[var(--c-text-dim)]">NOTE</p>
          <p className="mt-1 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">
            Classical frequency analysis does <span className="text-[var(--c-text)]">not</span> apply to DES, and no real DES cracking
            system is implemented here. The focus is a conceptual brute-force scale visualization.
          </p>
        </div>
      </div>
      <BruteScale />
    </Panel>
  )
}

function AesAnalysis() {
  return (
    <Panel label="AES-128 SECURITY ANALYZER" title="A modern standard not breakable by exhaustive search" actions={<Shield size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox k="KEY SIZE" v="128 bits" />
        <StatBox k="KEY SPACE" v="2^128" />
        <StatBox k="ROUNDS" v="10" />
        <StatBox k="BLOCK" v="128 bits" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">SECURITY</span>
        <SecTag rating="STRONG" color="#34d399" />
      </div>
      <p className="mt-3 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
        Trying every AES-128 key is <span className="text-[var(--c-text)]">computationally infeasible</span> with currently practical
        resources. The key space (2^128) is astronomically larger than anything that could be searched. This analyzer does{' '}
        <span className="text-[var(--c-text)]">not</span> simulate billions or trillions of keys and shows no fake cracking progress —
        it uses a conceptual scale visualization instead.
      </p>
      <BruteScale />
    </Panel>
  )
}

function BruteScale() {
  const rows = [
    { name: 'Caesar', label: '26', log: 1.41, color: '#f87171' },
    { name: 'DES', label: '2^56', log: 16.9, color: '#fbbf24' },
    { name: 'AES-128', label: '2^128', log: 38.5, color: '#34d399' },
  ]
  const maxLog = 38.5
  return (
    <div className="mt-4 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
      <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">BRUTE-FORCE SCALE VISUALIZATION (logarithmic, not to physical scale)</p>
      <div className="mt-3 space-y-3">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="flex items-center justify-between text-[0.55rem]">
              <span className="font-semibold text-[var(--c-text)]">{r.name}</span>
              <span className="font-mono" style={{ color: r.color }}>{r.label}</span>
            </div>
            <div className="mt-1 h-4 w-full overflow-hidden rounded-sm bg-[rgba(148,163,184,0.15)]">
              <div className="h-full rounded-sm" style={{ width: `${(r.log / maxLog) * 100}%`, background: `linear-gradient(90deg, ${r.color}55, ${r.color})` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[0.55rem] leading-relaxed text-[var(--c-text-faint)]">
        Bars are scaled logarithmically (base-10 of the key count). The gap between 26 and 2^56 is already enormous; between 2^56 and
        2^128 it grows by many orders of magnitude. A larger key space makes exhaustive search exponentially harder.
      </p>
    </div>
  )
}

function StatBox({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3 text-center">
      <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">{k}</p>
      <p className="mt-1 font-mono text-sm text-[var(--c-text)]">{v}</p>
    </div>
  )
}

/* ================================================================== */
/* Key-space comparison                                                 */
/* ================================================================== */

function KeySpaceComparison({ cipher }: { cipher: CipherId }) {
  const rows = [
    { name: 'Caesar', label: '26', log: 1.41, color: '#f87171', note: 'trivial' },
    { name: 'DES', label: '2^56', log: 16.9, color: '#fbbf24', note: 'broken in 1998' },
    { name: 'AES-128', label: '2^128', log: 38.5, color: '#34d399', note: 'infeasible' },
  ]
  const maxLog = 38.5
  return (
    <Panel label="KEY-SPACE COMPARISON" title="The enormous scale difference" actions={<KeyRound size={16} className="text-[var(--c-accent)]" />}>
      <p className="mb-3 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
        The selected cipher is <span className="text-[rgb(var(--c-core))]">{CIPHER_BY_ID[cipher].short}</span> with a key space of{' '}
        <span className="text-[var(--c-text)]">{SEC[cipher].keySpaceLabel}</span>.
      </p>
      {rows.map((r) => (
        <div key={r.name} className="mb-2">
          <div className="flex items-center justify-between text-[0.55rem]">
            <span className="font-semibold text-[var(--c-text)]">{r.name}</span>
            <span className="font-mono" style={{ color: r.color }}>{r.label} · {r.note}</span>
          </div>
          <div className="mt-1 h-4 w-full overflow-hidden rounded-sm bg-[rgba(148,163,184,0.15)]">
            <div className="h-full rounded-sm" style={{ width: `${(r.log / maxLog) * 100}%`, background: `linear-gradient(90deg, ${r.color}55, ${r.color})` }} />
          </div>
        </div>
      ))}
      <p className="mt-2 flex items-start gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2 text-[0.55rem] leading-relaxed text-[var(--c-text-faint)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
        Not drawn to literal physical scale. Bars use a base-10 logarithmic scale. A larger key space means an attacker must try
        vastly more candidates, making exhaustive search exponentially harder.
      </p>
    </Panel>
  )
}

/* ================================================================== */
/* Strength meter + report                                               */
/* ================================================================== */

function StrengthMeter({ cipher }: { cipher: CipherId }) {
  const s = SEC[cipher]
  const aspects: Array<[string, string]> = [
    ['Historical importance', s.historical],
    ['Key-space size', s.keySpaceLabel],
    ['Resistance to brute force', s.brute],
    ['Resistance to classical analysis', s.classical],
    ['Modern suitability', s.suitability],
  ]
  return (
    <Panel label="SECURITY STRENGTH METER" title={CIPHER_BY_ID[cipher].name} actions={<ChartColumn size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="mb-3 flex items-center gap-2">
        <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">SECURITY</span>
        <SecTag rating={s.rating} color={s.ratingColor} />
      </div>
      <div className="space-y-1.5">
        {aspects.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="w-52 shrink-0 text-[0.55rem] font-medium text-[var(--c-text)]">{k}</span>
            <span className="text-[0.55rem] leading-relaxed text-[var(--c-text-dim)]">{v}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[0.55rem] leading-relaxed text-[var(--c-text-faint)]">
        A single rating does not capture every aspect of cryptographic security. This meter summarizes a few relevant dimensions;
        real-world security also depends on implementation, key management, mode of operation and randomness.
      </p>
    </Panel>
  )
}

function SecurityReport({ cipher }: { cipher: CipherId }) {
  const s = SEC[cipher]
  const obs = cipher === 'aes'
    ? ['Large key space (2^128)', 'Classical frequency analysis is not applicable']
    : cipher === 'des'
      ? ['56-bit effective key is too small today', 'Classical frequency analysis is not applicable']
      : ['Small / analysable key space', 'Statistical structure leaks plaintext clues']
  return (
    <Panel label="SECURITY REPORT" title="CRYPTOGRAPHIC SECURITY REPORT" actions={<Shield size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] p-4 font-mono text-[0.6rem] leading-loose">
        <p><span className="text-[var(--c-text-faint)]">Cipher:</span> <span className="text-[var(--c-text)]">{CIPHER_BY_ID[cipher].name}</span></p>
        {obs.map((o) => (
          <p key={o}><span className="text-[var(--c-text-faint)]">Observed:</span> <span className="text-[var(--c-text-dim)]">{o}</span></p>
        ))}
        <p><span className="text-[var(--c-text-faint)]">Analysis:</span> <span className="text-[var(--c-text-dim)]">{s.brute}</span></p>
        <p><span className="text-[var(--c-text-faint)]">Security:</span> <span className="text-[var(--c-text)]">{s.rating}</span></p>
        <p><span className="text-[var(--c-text-faint)]">Modern recommendation:</span> <span className="text-[var(--c-text-dim)]">{s.suitability}</span></p>
      </div>
    </Panel>
  )
}

/* ================================================================== */
/* Timeline + Encrypted ≠ unbreakable + Extended topics                  */
/* ================================================================== */

function AttackTimeline() {
  const items = [
    { t: 'CLASSICAL SUBSTITUTION', solve: 'Hide the message by replacing letters.', weak: 'Frequency analysis preserved the letter statistics.', next: 'Drove the need to hide repeated patterns.' },
    { t: 'POLYALPHABETIC CIPHERS', solve: 'Use multiple alphabets so one plaintext letter varies.', weak: 'Repeating key periods leaked the key length (Kasiski).', next: 'Led to ciphers with no repeating key.' },
    { t: 'BLOCK CIPHERS', solve: 'Encrypt fixed-size blocks, mixing letters together.', weak: 'Linear structure allowed mathematical (e.g. linear/differential) attacks.', next: 'Drove heavy non-linearity in round functions.' },
    { t: 'DES', solve: 'First public block-cipher standard with 16 Feistel rounds.', weak: '56-bit key became brute-forceable in 1998.', next: 'A larger key space and better design.' },
    { t: 'AES', solve: 'Modern SPN block cipher with 128-bit keys.', weak: 'Exhaustive search infeasible; attacks remain research-level.', next: 'The current symmetric standard.' },
  ]
  return (
    <Panel label="HOW CRYPTANALYSIS EVOLVED" title="Attack timeline" actions={<BookOpen size={16} className="text-[rgb(var(--c-core))]" />}>
      <p className="mb-3 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">
        This connects directly to the Cipher Evolution Lab: every improvement in cipher design was a response to a discovered weakness.
      </p>
      <ol className="relative space-y-3 border-l border-[var(--c-border)] pl-4">
        {items.map((it) => (
          <li key={it.t} className="relative">
            <span className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-[rgb(var(--c-core))]" />
            <p className="mono-label !text-[0.6rem] font-semibold text-[var(--c-text)]">{it.t}</p>
            <p className="mt-0.5 text-[0.55rem] leading-relaxed text-[var(--c-text-dim)]">
              <span className="text-[rgb(var(--c-core))]">Solved:</span> {it.solve} ·{' '}
              <span className="text-[var(--c-accent)]">Weakness:</span> {it.weak} ·{' '}
              <span className="text-[var(--c-text)]">Improved:</span> {it.next}
            </p>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

function EncryptedNotUnbreakable() {
  const factors = ['algorithm', 'key size', 'implementation', 'key management', 'mode of operation', 'randomness', 'authentication / integrity', 'endpoint security']
  return (
    <Panel label="ENCRYPTED ≠ UNBREAKABLE" title="Why ciphertext is not automatically secure" actions={<ShieldAlert size={16} className="text-[var(--c-accent)]" />}>
      <p className="text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
        Producing ciphertext is not the same as producing security. Whether a cryptosystem is actually secure depends on several
        factors that the ciphertext alone cannot tell you:
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {factors.map((f) => (
          <span key={f} className="rounded-full border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-1 text-[0.55rem] text-[var(--c-text-dim)]">{f}</span>
        ))}
      </div>
      <p className="mt-3 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">
        In short: a strong algorithm with a large key can still be undermined by a weak implementation, a leaked or reused key, or an
        insecure mode of operation. Security is a property of the whole system, not of the ciphertext string alone.
      </p>
    </Panel>
  )
}

function ExtendedTopics() {
  const topics = [
    { t: 'Known-plaintext attack', d: 'When an attacker has some plaintext and its matching ciphertext, they can derive key information — the main threat to the Hill cipher.' },
    { t: 'Chosen-plaintext concept', d: 'An attacker who can pick plaintext and observe its encryption learns how the cipher behaves. A research and design consideration.' },
    { t: 'Differential cryptanalysis', d: 'Studies how differences in plaintext spread through the rounds to differences in ciphertext, to recover key material.' },
    { t: 'Linear cryptanalysis', d: 'Approximates the cipher with linear equations over a few bits to infer the key with high probability.' },
    { t: 'Modern cryptanalysis', d: 'Research-level attacks on modern ciphers target specific constructions, side channels, or usage flaws — not simple statistics.' },
    { t: 'Authenticated encryption', d: 'Modes such as AES-GCM combine confidentiality with integrity and authentication, addressing a gap that encryption alone leaves open.' },
  ]
  return (
    <Panel label="EXTENDED TOPICS" title="Beyond the core syllabus (conceptual)" actions={<Sparkles size={16} className="text-[var(--c-accent)]" />}>
      <p className="mb-3 flex items-start gap-2 rounded-md border border-[var(--c-accent)] bg-[rgba(245,197,66,0.06)] px-3 py-2 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">
        <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
        These are educational concepts only. No real-world offensive tooling is implemented or recommended.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {topics.map((tp) => (
          <div key={tp.t} className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
            <p className="mono-label !text-[0.55rem] font-semibold text-[var(--c-text)]">{tp.t.toUpperCase()}</p>
            <p className="mt-1 text-[0.55rem] leading-relaxed text-[var(--c-text-dim)]">{tp.d}</p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

/* ================================================================== */
/* Crypto investigation mode                                             */
/* ================================================================== */

const INV_PLAIN = 'THE COUNCIL MEETS AT MIDNIGHT BY THE OLD TOWER'
const INV_SHIFT = 5
const INV_CIPHER = caesarEncrypt(INV_PLAIN, INV_SHIFT)

function InvestigationMode() {
  const [hints, setHints] = useState(0)
  const [guessCipher, setGuessCipher] = useState('')
  const [guessShift, setGuessShift] = useState('')
  const [guessPlain, setGuessPlain] = useState('')
  const [checkedExp, setCheckedExp] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const idOk = guessCipher.trim().toUpperCase() === 'CAESAR'
  const shiftOk = Number(guessShift) === INV_SHIFT
  const plainOk = guessPlain.trim().toUpperCase().replace(/[^A-Z]/g, '') === INV_PLAIN.replace(/[^A-Z]/g, '')
  const score = (idOk ? 25 : 0) + (shiftOk ? 25 : 0) + (plainOk ? 40 : 0) + (checkedExp ? 10 : 0)
  const verdict = score >= 90 ? 'Excellent cryptanalysis.' : score >= 60 ? 'Good work — review the explanation.' : score >= 30 ? 'Getting there — check the hints.' : 'Keep investigating.'

  const HINTS = [
    'This is a classical substitution cipher where every letter shifts by a fixed amount.',
    'It is the simplest monoalphabetic cipher — there are only 26 possible keys, and one of them makes the text readable.',
    'A common heuristic: the most frequent English letter is E. If the frequent ciphertext letter maps to E, the shift often follows — sample enough text before trusting it.',
  ]

  return (
    <Panel label="CRYPTO INVESTIGATION" title="Can you crack this intercepted message?" actions={<Crosshair size={16} className="text-[rgb(var(--c-core))]" />}>
      <p className="text-[0.6rem] text-[var(--c-text-faint)]">You intercepted this ciphertext:</p>
      <div className="mt-2 rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)] px-3 py-2 font-mono text-sm text-[rgb(var(--c-core))] break-all">
        {INV_CIPHER}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block mono-label !text-[0.5rem] text-[var(--c-text-faint)]">1 · IDENTIFY CIPHER TYPE</span>
          <input value={guessCipher} onChange={(e) => setGuessCipher(e.target.value)} aria-label="Identify cipher type" placeholder="e.g. CAESAR" className={cn(inputCls, 'mt-1 w-full')} />
        </label>
        <label className="block">
          <span className="block mono-label !text-[0.5rem] text-[var(--c-text-faint)]">2 · TRY SHIFTS — WHAT IS THE KEY?</span>
          <input value={guessShift} onChange={(e) => setGuessShift(e.target.value)} aria-label="Guess the shift" placeholder="0–25" className={cn(inputCls, 'mt-1 w-full')} />
        </label>
        <label className="block sm:col-span-2">
          <span className="block mono-label !text-[0.5rem] text-[var(--c-text-faint)]">3 · RECOVER PLAINTEXT</span>
          <textarea value={guessPlain} onChange={(e) => setGuessPlain(e.target.value.toUpperCase())} rows={2} aria-label="Recover the plaintext" placeholder="The recovered message…" className={cn(inputCls, 'mt-1 resize-none w-full')} />
        </label>
        <label className="flex items-start gap-2 text-[0.55rem] text-[var(--c-text-dim)] sm:col-span-2">
          <input type="checkbox" checked={checkedExp} onChange={(e) => setCheckedExp(e.target.checked)} aria-label="Explain how you solved it" className="h-3.5 w-3.5 accent-[rgb(var(--c-core))] mt-0.5 shrink-0" />
          <span>4 · I can explain why frequency analysis helps here (self-check).</span>
        </label>
      </div>

      {/* hints */}
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {HINTS.map((_, i) => (
          <button key={i} type="button" onClick={() => setHints(Math.max(hints, i + 1))} className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--c-accent)] px-3 py-1.5 text-[0.55rem] text-[var(--c-accent)] transition-colors hover:bg-[rgba(245,197,66,0.1)]">
            <Lightbulb size={12} /> HINT {i + 1}
          </button>
        ))}
        <button type="button" onClick={() => setRevealed(true)} className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--c-border)] px-3 py-1.5 text-[0.55rem] text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]">
          <Eye size={12} /> REVEAL SOLUTION
        </button>
      </div>

      {hints > 0 && (
        <div className="mt-2 space-y-1">
          {HINTS.slice(0, hints).map((h, i) => (
            <p key={i} className="text-[0.55rem] leading-relaxed text-[var(--c-accent)]">Hint {i + 1}: {h}</p>
          ))}
        </div>
      )}

      {revealed && (
        <div className="mt-2 rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.05)] px-3 py-2 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">
          <span className="text-[rgb(var(--c-core))]">Solution:</span> cipher = Caesar · shift = {INV_SHIFT} · plaintext = “
          <span className="text-[var(--c-text)]">{INV_PLAIN}</span>”.
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => setSubmitted(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(var(--c-core))] px-5 py-2 text-xs font-semibold text-[#04110f] shadow-[0_0_18px_rgba(94,234,212,0.35)] transition-transform hover:scale-[1.02]">
          <Check size={14} /> SUBMIT INVESTIGATION
        </button>
        <button type="button" onClick={() => { setHints(0); setGuessCipher(''); setGuessShift(''); setGuessPlain(''); setCheckedExp(false); setRevealed(false); setSubmitted(false) }} className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]">
          <RotateCcw size={14} /> RESTART
        </button>
      </div>

      {submitted && (
        <div className="mt-3 rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.05)] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="mono-label !text-[0.55rem] text-[var(--c-text-faint)]">INVESTIGATION SCORE</span>
            <span className="font-mono text-lg text-[rgb(var(--c-core))]">{score} / 100</span>
          </div>
          <p className="mt-1 text-[0.58rem] text-[var(--c-text-dim)]">{verdict}</p>
          <p className="mt-1 text-[0.5rem] text-[var(--c-text-faint)]">
            The score is educational and does not affect the rest of CRYPTOLAB.
          </p>
        </div>
      )}
    </Panel>
  )
}

/* ================================================================== */
/* Step-by-step mode                                                     */
/* ================================================================== */

function StepByStepMode({ reduced }: { reduced: boolean }) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing || reduced) { setPlaying(false); return }
    const id = setInterval(() => setStep((s) => { if (s >= STEPS.length - 1) { setPlaying(false); return s } return s + 1 }), 900)
    return () => clearInterval(id)
  }, [playing, reduced])

  const st = STEPS[step]

  return (
    <Panel label="STEP-BY-STEP MODE" title="Walk through the Caesar attack" actions={<GraduationCap size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="flex items-center justify-between">
        <span className="mono-label !text-[0.55rem] text-[var(--c-text-dim)]">STAGE</span>
        <span className="mono-label !text-[0.6rem] text-[var(--c-text)]">{st.n} / 05</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[rgba(148,163,184,0.2)]">
        <div className="h-full rounded-full bg-[rgb(var(--c-core))] transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      <div className="mt-2 rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)] px-3 py-2">
        <p className="mono-label !text-[0.55rem] text-[rgb(var(--c-core))]">{st.n} · {st.t}</p>
        <p className="mt-1 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">{st.d}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => { setStep(Math.max(0, step - 1)); setPlaying(false) }} aria-label="Previous stage" className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]">
          <SkipBack size={14} /> PREV
        </button>
        <button type="button" onClick={() => setPlaying(!playing)} disabled={reduced} aria-label={playing ? 'Pause' : 'Play stages'} className="inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(var(--c-core))] px-5 py-2 text-xs font-semibold text-[#04110f] shadow-[0_0_18px_rgba(94,234,212,0.35)] transition-transform hover:scale-[1.02] disabled:opacity-40">
          {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'PAUSE' : 'PLAY'}
        </button>
        <button type="button" onClick={() => { setStep(Math.min(STEPS.length - 1, step + 1)); setPlaying(false) }} aria-label="Next stage" className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]">
          <SkipForward size={14} /> NEXT
        </button>
        <button type="button" onClick={() => { setStep(0); setPlaying(false) }} aria-label="Reset stages" className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]">
          <RotateCcw size={14} /> RESET
        </button>
      </div>
      {reduced && <p className="mt-2 text-center text-[0.5rem] text-[var(--c-text-faint)]">Reduced-motion on — use PREV / NEXT.</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5">
        {STEPS.map((s, i) => (
          <button
            key={s.n}
            type="button"
            onClick={() => { setStep(i); setPlaying(false) }}
            aria-pressed={step === i}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[0.5rem] transition-colors',
              step === i ? 'border-[rgb(var(--c-core))] text-[rgb(var(--c-core))]' : 'border-[var(--c-border)] text-[var(--c-text-faint)] hover:border-[rgb(var(--c-core))]',
            )}
          >
            {s.n}
          </button>
        ))}
      </div>
    </Panel>
  )
}

/* ================================================================== */
/* Shared small pieces                                                   */
/* ================================================================== */

function ArrowRight({ size, className }: { size?: number; className?: string }) {
  return <svg width={size ?? 16} height={size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
}

function Info({ size, className }: { size?: number; className?: string }) {
  return <svg width={size ?? 16} height={size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
}

function SecTag({ rating, color }: { rating: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.55rem] font-medium" style={{ color, borderColor: `${color}55`, background: `${color}14` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} /> {rating.replace(/_/g, ' ')}
    </span>
  )
}

function WhyButton({ open, onToggle, children }: { open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="mt-3">
      <button type="button" onClick={onToggle} aria-expanded={open} className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--c-core))] px-3 py-1.5 text-[0.55rem] text-[rgb(var(--c-core))] transition-colors hover:bg-[rgba(94,234,212,0.1)]">
        <Lightbulb size={12} /> WHY DOES THIS WORK?
      </button>
      <AnimatePresence>
        {open && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 overflow-hidden rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">
            {children}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

const inputCls =
  'w-full rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.3)] px-3 py-2 font-mono text-sm text-[var(--c-text)] outline-none focus:border-[rgb(var(--c-core))]'
