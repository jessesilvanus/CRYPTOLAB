import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Lock,
  Unlock,
  Network,
  Server,
  Shield,
  ShieldAlert,
  Eye,
  KeyRound,
  Activity,
  AlertTriangle,
  Check,
  X,
  ArrowDown,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  GraduationCap,
  BookOpen,
  Zap,
  Cpu,
  Radio,
} from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Panel } from '@/components/ui/Panel'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/utils/cn'
import { caesarEncrypt, caesarDecrypt } from '@/crypto/algorithms/caesar'
import { vigenereEncrypt, vigenereDecrypt } from '@/crypto/algorithms/vigenere'
import {
  textToHex as desTextToHex,
  hexToText as desHexToText,
  desEncryptBlockHex,
  desDecryptBlockHex,
} from '@/crypto/algorithms/des'
import {
  textToHex as aesTextToHex,
  hexToText as aesHexToText,
  aesEncryptBlock,
  aesDecryptBlock,
} from '@/crypto/algorithms/aes'

/** Non-hook reduced-motion check for use inside animation callbacks. */
function reducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/* ================================================================== */
/* Cipher configuration                                                 */
/* ================================================================== */

type CipherId = 'caesar' | 'vigenere' | 'des' | 'aes'

interface CipherMeta {
  id: CipherId
  name: string
  keyType: string
  behavior: string
  rating: string
  color: string
  desc: string
  isBlock: boolean
}

const CIPHERS: CipherMeta[] = [
  {
    id: 'caesar',
    name: 'CAESAR',
    keyType: 'Shift (0–25)',
    behavior: 'Character substitution',
    rating: 'VERY WEAK',
    color: '#f87171',
    desc: 'Each letter shifts a fixed number of places. Trivially breakable by frequency analysis.',
    isBlock: false,
  },
  {
    id: 'vigenere',
    name: 'VIGENÈRE',
    keyType: 'Keyword (letters)',
    behavior: 'Polyalphabetic substitution',
    rating: 'WEAK',
    color: '#fb923c',
    desc: 'A repeating keyword selects different Caesar shifts per character. Historically important, not modern-secure.',
    isBlock: false,
  },
  {
    id: 'des',
    name: 'DES',
    keyType: '16 hex digits = 64-bit (56 effective)',
    behavior: '64-bit block',
    rating: 'WEAK',
    color: '#fbbf24',
    desc: 'The historical block-cipher standard. Its 56-bit effective key is brute-forceable today.',
    isBlock: true,
  },
  {
    id: 'aes',
    name: 'AES-128',
    keyType: '32 hex digits = 128-bit',
    behavior: '128-bit block',
    rating: 'STRONG',
    color: '#34d399',
    desc: 'The modern symmetric standard: 128-bit block, 128-bit key, 10 SPN rounds. Strong when used correctly.',
    isBlock: true,
  },
]

/** Security comparison ladder (educational, not a strict ranking). */
const COMPARISON = [
  { id: 'caesar', name: 'CAESAR', role: 'Classical substitution', weakness: 'Single shift; frequency analysis breaks it instantly', modern: 'Educational only' },
  { id: 'vigenere', name: 'VIGENÈRE', role: 'Polyalphabetic substitution', weakness: 'Kasiski examination recovers the key length', modern: 'Educational / historical' },
  { id: 'des', name: 'DES', role: 'First standard block cipher', weakness: '56-bit effective key is brute-forceable', modern: 'Superseded by AES' },
  { id: 'aes', name: 'AES-128', role: 'Modern symmetric standard', weakness: 'Depends on correct use and key management', modern: 'Widely deployed today' },
]

/* ================================================================== */
/* Engine helpers (single source of truth)                              */
/* ================================================================== */

const isHex = (s: string, len: number) => /^[0-9A-Fa-f]{1,100}$/.test(s.trim()) && s.trim().length === len

function getKey(cipher: CipherId, s: { shift: number; vig: string; des: string; aes: string }): string | number {
  switch (cipher) {
    case 'caesar':
      return s.shift
    case 'vigenere':
      return s.vig.toUpperCase()
    case 'des':
      return s.des.toUpperCase()
    case 'aes':
      return s.aes.toUpperCase()
  }
}

function wrongKey(cipher: CipherId): string | number {
  switch (cipher) {
    case 'caesar':
      return 7
    case 'vigenere':
      return 'WRONGK'
    case 'des':
      return '13579BDF02468ACE'
    case 'aes':
      return '11111111111111111111111111111111'
  }
}

function encryptMessage(cipher: CipherId, message: string, key: string | number): string {
  switch (cipher) {
    case 'caesar':
      return caesarEncrypt(message.toUpperCase(), key as number)
    case 'vigenere':
      return vigenereEncrypt(message.toUpperCase(), key as string)
    case 'des':
      return desEncryptBlockHex(desTextToHex(message), key as string)
    case 'aes':
      return aesEncryptBlock(aesTextToHex(message), key as string)
  }
}

function decryptMessage(cipher: CipherId, payload: string, key: string | number): string {
  switch (cipher) {
    case 'caesar':
      return caesarDecrypt(payload, key as number)
    case 'vigenere':
      return vigenereDecrypt(payload, key as string)
    case 'des':
      return desHexToText(desDecryptBlockHex(payload, key as string))
    case 'aes':
      return aesHexToText(aesDecryptBlock(payload, key as string))
  }
}

/** Flip a byte/char inside the payload to simulate on-wire modification. */
function tamper(payload: string, isBlock: boolean): string {
  if (!payload) return payload
  if (isBlock) {
    const first = payload.slice(0, 2)
    const v = parseInt(first, 16) ^ 0x01
    return v.toString(16).toUpperCase().padStart(2, '0') + payload.slice(2)
  }
  const i = payload.search(/[A-Z]/)
  if (i === -1) return payload
  const ch = payload[i]
  const next = ch === 'Z' ? 'A' : String.fromCharCode(ch.charCodeAt(0) + 1)
  return payload.slice(0, i) + next + payload.slice(i + 1)
}

interface Engine {
  usable: boolean
  error: string | null
  plain: string
  ciphertext: string
  wirePayload: string
  recovered: string
  decryptionOk: boolean
  keyLabel: string
  isBlock: boolean
}

function buildEngine(
  cipher: CipherId,
  message: string,
  secure: boolean,
  wrong: boolean,
  tampered: boolean,
  shift: number,
  vig: string,
  des: string,
  aes: string,
): Engine {
  const meta = CIPHERS.find((c) => c.id === cipher)!
  const plain = message
  const key = getKey(cipher, { shift, vig, des, aes })

  // key validation
  let error: string | null = null
  if (!message.trim()) error = 'Enter a message to send.'
  else if (cipher === 'caesar' && (shift < 0 || shift > 25)) error = 'Caesar shift must be between 0 and 25.'
  else if (cipher === 'vigenere' && !/^[A-Za-z]+$/.test(vig)) error = 'Vigenère keyword must contain only letters.'
  else if (cipher === 'des' && !isHex(des, 16)) error = 'DES key must be exactly 16 hex digits (64 bits).'
  else if (cipher === 'aes' && !isHex(aes, 32)) error = 'AES key must be exactly 32 hex digits (128 bits).'
  if (error) return { usable: false, error, plain, ciphertext: '', wirePayload: '', recovered: '', decryptionOk: false, keyLabel: '—', isBlock: meta.isBlock }

  const keyLabel = !secure ? 'NO KEY — UNSECURED' : wrong ? 'WRONG KEY' : meta.name

  if (!secure) {
    // unsecured channel: plaintext travels as-is
    const wire = tampered ? tamper(plain, meta.isBlock) : plain
    const recovered = tampered ? tamper(plain, meta.isBlock) : plain
    return {
      usable: true,
      error: null,
      plain,
      ciphertext: plain,
      wirePayload: wire,
      recovered,
      decryptionOk: !tampered && recovered === plain,
      keyLabel,
      isBlock: meta.isBlock,
    }
  }

  // secure channel: encrypt with the (possibly wrong) key
  const encKey = wrong ? wrongKey(cipher) : key
  const ciphertext = encryptMessage(cipher, plain, encKey)
  const wirePayload = tampered ? tamper(ciphertext, meta.isBlock) : ciphertext
  const decKey = wrong ? wrongKey(cipher) : key
  const recovered = decryptMessage(cipher, wirePayload, decKey)
  const decryptionOk = !wrong && !tampered && recovered === plain

  return { usable: true, error: null, plain, ciphertext, wirePayload, recovered, decryptionOk, keyLabel, isBlock: meta.isBlock }
}

/* ================================================================== */
/* Network lab — top-level state + layout                               */
/* ================================================================== */

const STAGES = [
  'MESSAGE CREATED',
  'ENCRYPTION',
  'PACKET CREATED',
  'PACKET ENTERS NETWORK',
  'ROUTER 1',
  'ROUTER 2',
  'OBSERVER SEES PACKET',
  'RECEIVER RECEIVES PACKET',
  'DECRYPTION',
  'MESSAGE RECOVERED',
]

const NODES = [
  { id: 'sender', label: 'SENDER', left: '0%' },
  { id: 'router1', label: 'ROUTER 1', left: '33%' },
  { id: 'router2', label: 'ROUTER 2', left: '66%' },
  { id: 'receiver', label: 'RECEIVER', left: '100%' },
]

function packetLeft(step: number): string {
  if (step <= 2) return '0%'
  if (step === 3) return '14%'
  if (step === 4) return '33%'
  if (step === 5) return '66%'
  if (step === 6) return '50%'
  return '100%'
}

function activeNode(step: number): string {
  if (step <= 3) return 'sender'
  if (step === 4) return 'router1'
  if (step === 5) return 'router2'
  if (step === 6) return 'router2'
  return 'receiver'
}

export function NetworkLab() {
  const reduced = useReducedMotion()
  const [cipher, setCipher] = useState<CipherId>('aes')
  const [message, setMessage] = useState('HELLO JESSE')
  const [secure, setSecure] = useState(true)
  const [wrong, setWrong] = useState(false)
  const [tampered, setTampered] = useState(false)
  const [shift, setShift] = useState(3)
  const [vig, setVig] = useState('SECRET')
  const [desKey, setDesKey] = useState('133457799BBCDFF1')
  const [aesKey, setAesKey] = useState('000102030405060708090A0B0C0D0E0F')
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal')
  const [selectedNode, setSelectedNode] = useState<string | null>('sender')
  const [inspecting, setInspecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const meta = CIPHERS.find((c) => c.id === cipher)!
  const engine = useMemo<Engine>(
    () => buildEngine(cipher, message, secure, wrong, tampered, shift, vig, desKey, aesKey),
    [cipher, message, secure, wrong, tampered, shift, vig, desKey, aesKey],
  )

  const speedMs = speed === 'slow' ? 900 : speed === 'normal' ? 480 : 160
  useEffect(() => {
    if (!playing || reduced) {
      setPlaying(false)
      return
    }
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= 9) {
          setPlaying(false)
          return 9
        }
        return s + 1
      })
    }, speedMs)
    return () => clearInterval(id)
  }, [playing, speedMs, reduced])

  const send = () => {
    if (!engine.usable) {
      setError(engine.error)
      return
    }
    setError(null)
    setStep(0)
    setInspecting(false)
    setPlaying(true)
  }

  const reset = () => {
    setPlaying(false)
    setStep(0)
    setInspecting(false)
    setSelectedNode('sender')
    setError(null)
  }

  const observerPayload = secure ? engine.wirePayload : engine.plain

  return (
    <div className="space-y-6">
      <SectionHeading
        kicker="MODULE 05 // NETWORK"
        title="Secure Communication Laboratory"
        sub="Connect cryptography to network security. Watch a plaintext message become ciphertext, travel through a simulated network as a packet, and get recovered by the receiver — while an observer only sees the ciphertext."
        actions={<Network size={18} className="text-[rgb(var(--c-core))]" />}
      />

      {/* Channel secure toggle */}
      <ChannelToggle secure={secure} setSecure={(v) => { setSecure(v); setPlaying(false); setWrong(false); setTampered(false) }} />

      {/* Main control room: sender → network → receiver */}
      <Panel
        label="SECURE NETWORK CONTROL ROOM"
        title="Sender → Network → Receiver"
        actions={<Cpu size={16} className="text-[rgb(var(--c-core))]" />}
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-1.5 text-[0.55rem] text-[var(--c-text-faint)]">
          <Activity size={12} className="text-[rgb(var(--c-core))]" />
          EDUCATIONAL NETWORK SIMULATION — no real network traffic, packets, or interception occur. Everything stays inside this browser.
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* SENDER */}
          <SenderPanel
            meta={meta}
            message={message}
            setMessage={setMessage}
            cipher={cipher}
            setCipher={setCipher}
            shift={shift}
            setShift={setShift}
            vig={vig}
            setVig={setVig}
            desKey={desKey}
            setDesKey={setDesKey}
            aesKey={aesKey}
            setAesKey={setAesKey}
          />

          {/* NETWORK BAND */}
          <div className="lg:col-span-2">
            <NetworkBand
              step={step}
              secure={secure}
              engine={engine}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              onInspect={() => setInspecting((v) => !v)}
              inspecting={inspecting}
            />
          </div>
        </div>

        {/* errors */}
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-[var(--c-danger)] bg-[rgba(248,113,113,0.06)] px-3 py-2 text-[0.6rem] leading-relaxed text-[var(--c-danger)]">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {/* Send controls */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={send}
            disabled={!engine.usable}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(var(--c-core))] px-6 py-2.5 text-xs font-semibold text-[#04110f] shadow-[0_0_18px_rgba(94,234,212,0.35)] transition-transform hover:scale-[1.02] disabled:opacity-40"
          >
            <Send size={14} /> {secure ? 'SEND SECURELY' : 'SEND (UNSECURED)'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
          >
            <RotateCcw size={14} /> RESET
          </button>
          <button
            type="button"
            onClick={() => setWrong((v) => !v)}
            disabled={!secure}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors disabled:opacity-40',
              wrong ? 'border-[var(--c-accent)] bg-[rgba(245,197,66,0.12)] text-[var(--c-accent)]' : 'border-[var(--c-border)] text-[var(--c-text-dim)] hover:border-[var(--c-accent)]',
            )}
          >
            <KeyRound size={13} /> {wrong ? 'WRONG KEY ON ✓' : 'TRY WRONG KEY'}
          </button>
          <button
            type="button"
            onClick={() => setTampered((v) => !v)}
            disabled={!secure}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors disabled:opacity-40',
              tampered ? 'border-[var(--c-danger)] bg-[rgba(248,113,113,0.12)] text-[var(--c-danger)]' : 'border-[var(--c-border)] text-[var(--c-text-dim)] hover:border-[var(--c-danger)]',
            )}
          >
            <AlertTriangle size={13} /> {tampered ? 'TAMPERED ✓' : 'SIMULATE TAMPERING'}
          </button>
        </div>
        {!secure && (
          <p className="mt-3 flex items-start gap-2 rounded-md border border-[var(--c-danger)] bg-[rgba(248,113,113,0.08)] px-3 py-2 text-[0.6rem] leading-relaxed text-[var(--c-danger)]">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" /> INSECURE COMMUNICATION — the message travels as plaintext. The observer can read it directly. Switch back to SECURE CHANNEL to see encryption protect the content.
          </p>
        )}
        {(wrong || tampered) && secure && (
          <p className="mt-3 flex items-start gap-2 rounded-md border border-[var(--c-accent)] bg-[rgba(245,197,66,0.06)] px-3 py-2 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
            <Info size={13} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
            {wrong
              ? 'The receiver is trying to decrypt with the WRONG key. See the receiver panel — the recovered text is unintelligible. The receiver needs the correct secret key to recover the intended plaintext.'
              : 'The packet payload was modified in transit. See the receiver panel — decryption no longer recovers the original message. Encryption alone does not automatically provide integrity.'}
          </p>
        )}
      </Panel>

      {/* Observer / eavesdropper */}
      <ObserverPanel
        secure={secure}
        observerPayload={observerPayload}
        engine={engine}
        step={step}
      />

      {/* Packet inspector */}
      <PacketInspector
        engine={engine}
        secure={secure}
        meta={meta}
        inspecting={inspecting}
        step={step}
        tampered={tampered}
        wrong={wrong}
      />

      {/* Step-by-step controller */}
      <StepByStep
        step={step}
        setStep={setStep}
        playing={playing}
        setPlaying={setPlaying}
        speed={speed}
        setSpeed={setSpeed}
        reduced={reduced}
        secure={secure}
        onSend={send}
      />

      {/* Side-by-side comparison */}
      <SideBySide engine={engine} secure={secure} meta={meta} message={message} />

      {/* Receiver detail */}
      <ReceiverPanel engine={engine} secure={secure} meta={meta} step={step} wrong={wrong} tampered={tampered} />

      {/* Secret key concept */}
      <KeyConcept secure={secure} meta={meta} />

      {/* Key distribution */}
      <KeyDistribution />

      {/* Security comparison */}
      <SecurityComparison />

      {/* Threat simulation */}
      <AttackScenarios />

      {/* Confidentiality + limits */}
      <Confidentiality />
      <EncryptionLimits />

      {/* Concept map */}
      <ConceptMap />

      {/* Challenge */}
      <Challenge
        setCipher={setCipher}
        setSecure={setSecure}
        send={send}
        cipher={cipher}
        secure={secure}
      />

      {/* Explanation */}
      <Explanation secure={secure} meta={meta} />
    </div>
  )
}

/* ================================================================== */
/* Helpers                                                              */
/* ================================================================== */

function Info({ size, className }: { size?: number; className?: string }) {
  return <svg width={size ?? 16} height={size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
}

function SecTag({ rating }: { rating: string }) {
  const color =
    rating === 'VERY_WEAK' ? '#f87171' : rating === 'WEAK' ? '#fb923c' : rating === 'STRONG' ? '#34d399' : '#a78bfa'
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.5rem] font-medium" style={{ color, borderColor: `${color}55`, background: `${color}14` }}>
      <span className="h-1 w-1 rounded-full" style={{ background: color }} /> {rating.replace(/_/g, ' ')}
    </span>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

const inputCls =
  'w-full rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-2 font-mono text-sm text-[var(--c-text)] outline-none focus:border-[rgb(var(--c-core))]'

/* ================================================================== */
/* Channel toggle                                                       */
/* ================================================================== */

function ChannelToggle({ secure, setSecure }: { secure: boolean; setSecure: (v: boolean) => void }) {
  return (
    <Panel label="CHANNEL" title="Secure vs unsecured channel">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            [true, 'SECURE CHANNEL', Lock],
            [false, 'UNSECURED CHANNEL', Radio],
          ] as const
        ).map(([val, label, Icon]) => (
          <button
            key={label}
            type="button"
            onClick={() => setSecure(val)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors',
              secure === val
                ? val
                  ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.12)] text-[rgb(var(--c-core))]'
                  : 'border-[var(--c-danger)] bg-[rgba(248,113,113,0.12)] text-[var(--c-danger)]'
                : 'border-[var(--c-border)] text-[var(--c-text-dim)] hover:text-[var(--c-text)]',
            )}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
        {secure
          ? 'On a SECURE CHANNEL the message is encrypted before it enters the network. The observer sees ciphertext, not the message.'
          : 'On an UNSECURED CHANNEL the message travels as plaintext. This is the strongest demonstration of why encryption matters.'}
      </p>
    </Panel>
  )
}

/* ================================================================== */
/* Sender panel                                                         */
/* ================================================================== */

function SenderPanel(props: {
  meta: CipherMeta
  message: string
  setMessage: (v: string) => void
  cipher: CipherId
  setCipher: (v: CipherId) => void
  shift: number
  setShift: (v: number) => void
  vig: string
  setVig: (v: string) => void
  desKey: string
  setDesKey: (v: string) => void
  aesKey: string
  setAesKey: (v: string) => void
}) {
  const maxLen = props.meta.isBlock ? (props.meta.id === 'des' ? 8 : 16) : 40
  return (
    <div className="mx-auto w-full max-w-[28rem] justify-self-center rounded-lg border border-[rgb(var(--c-core))] bg-[rgba(0,0,0,0.25)] p-4 min-w-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--c-border)] text-[rgb(var(--c-core))]">
            <Send size={15} />
          </span>
          <p className="mono-label text-[0.6rem] font-semibold text-[var(--c-text)]">SENDER</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.08)] px-2 py-0.5 text-[0.5rem] text-[rgb(var(--c-core))]">
          <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--c-core))]" /> ONLINE
        </span>
      </div>

        <Field label="MESSAGE">
        <>
          <textarea
            value={props.message}
            onChange={(e) => props.setMessage(e.target.value.toUpperCase())}
            maxLength={maxLen}
            rows={2}
            aria-label="Message to send"
            className="mt-1 w-full resize-none rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.3)] p-2.5 font-mono text-sm text-[rgb(var(--c-core))] outline-none focus:border-[rgb(var(--c-core))]"
          />
          <p className="mt-1 text-[0.5rem] text-[var(--c-text-faint)]">
            {props.meta.isBlock ? `Single ${props.meta.id === 'des' ? '64-bit (8-byte)' : '128-bit (16-byte)'} block — longer messages need a chaining mode.` : 'Text cipher — any letters work.'}
          </p>
        </>
      </Field>

      <div className="mt-3">
        <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">SELECT ENCRYPTION</p>
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          {CIPHERS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => props.setCipher(c.id)}
              className={cn(
                'rounded-md border px-2 py-1.5 text-left transition-colors',
                props.cipher === c.id ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.1)]' : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] hover:border-[rgb(var(--c-core))]',
              )}
            >
              <p className="text-[0.58rem] font-semibold" style={{ color: props.cipher === c.id ? 'rgb(var(--c-core))' : 'var(--c-text)' }}>
                {c.name}
              </p>
              <p className="text-[0.48rem] text-[var(--c-text-faint)]">{c.behavior}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Per-cipher key input */}
      <div className="mt-3">
        {props.meta.id === 'caesar' && (
          <Field label={`KEY · SHIFT (0–25) · CURRENT ${props.shift}`}>
            <input
              type="range"
              min={0}
              max={25}
              value={props.shift}
              onChange={(e) => props.setShift(Number(e.target.value))}
              aria-label="Caesar shift"
              className="w-full accent-[rgb(var(--c-core))]"
            />
            <p className="mt-1 text-[0.5rem] text-[var(--c-text-faint)]">Each letter shifts {props.shift} places.</p>
          </Field>
        )}
        {props.meta.id === 'vigenere' && (
          <Field label="KEY · KEYWORD (LETTERS)">
            <input value={props.vig} onChange={(e) => props.setVig(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} aria-label="Vigenère keyword" className={inputCls} />
          </Field>
        )}
        {props.meta.id === 'des' && (
          <Field label="KEY · 16 HEX DIGITS (64 BITS)">
            <input value={props.desKey} onChange={(e) => props.setDesKey(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 16))} aria-label="DES key (16 hex)" className={inputCls} />
            <p className={cn('mt-1 text-[0.5rem]', isHex(props.desKey, 16) ? 'text-[var(--c-text-faint)]' : 'text-[var(--c-danger)]')}>
              {isHex(props.desKey, 16) ? 'valid 64-bit key ✓' : 'exactly 16 hex characters required'}
            </p>
          </Field>
        )}
        {props.meta.id === 'aes' && (
          <Field label="KEY · 32 HEX DIGITS (128 BITS)">
            <input value={props.aesKey} onChange={(e) => props.setAesKey(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 32))} aria-label="AES key (32 hex)" className={inputCls} />
            <p className={cn('mt-1 text-[0.5rem]', isHex(props.aesKey, 32) ? 'text-[var(--c-text-faint)]' : 'text-[var(--c-danger)]')}>
              {isHex(props.aesKey, 32) ? 'valid 128-bit key ✓' : 'exactly 32 hex characters required'}
            </p>
          </Field>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <SecTag rating={props.meta.rating} />
        <p className="text-[0.5rem] text-[var(--c-text-faint)]">{props.meta.keyType}</p>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Network band                                                         */
/* ================================================================== */

function NetworkBand(props: {
  step: number
  secure: boolean
  engine: Engine
  selectedNode: string | null
  setSelectedNode: (id: string) => void
  onInspect: () => void
  inspecting: boolean
}) {
  const left = packetLeft(props.step)
  const active = activeNode(props.step)
  return (
    <div className="flex h-full flex-col rounded-lg border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-4 w-full min-w-0">
      <div className="flex items-center justify-between">
        <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">NETWORK / INTERNET</p>
        <button
          type="button"
          onClick={props.onInspect}
          className={cn(
            'rounded-full border px-3 py-1 text-[0.5rem] transition-colors',
            props.inspecting ? 'border-[rgb(var(--c-core))] text-[rgb(var(--c-core))]' : 'border-[var(--c-border)] text-[var(--c-text-dim)] hover:border-[rgb(var(--c-core))]',
          )}
        >
          {props.inspecting ? 'HIDE PACKET' : 'INSPECT PACKET'}
        </button>
      </div>

      {/* Track */}
      <div className="relative mt-4 h-24">
        {/* base grid line */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[repeating-linear-gradient(90deg,rgba(94,234,212,0.35)_0,rgba(94,234,212,0.35)_1px,transparent_1px,transparent_18px)]" />
        {/* nodes */}
        {NODES.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => props.setSelectedNode(n.id)}
            className={cn(
              'absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border px-2 py-1 text-center transition-colors',
              props.selectedNode === n.id ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.15)]' : 'border-[var(--c-border)] bg-[rgba(0,0,0,0.45)]',
              active === n.id ? 'shadow-[0_0_14px_rgba(94,234,212,0.5)]' : '',
            )}
            style={{ left: n.left }}
            aria-label={`${n.label} node`}
          >
            <span className={cn('mono-label !text-[0.45rem]', active === n.id ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-faint)]')}>{n.label}</span>
            <span className={cn('mx-auto mt-0.5 block h-1 w-1 rounded-full', active === n.id ? 'bg-[rgb(var(--c-core))]' : 'bg-[var(--c-text-faint)]')} />
          </button>
        ))}
        {/* travelling packet */}
        <AnimatePresence>
          {props.step >= 2 && props.step <= 7 && (
            <motion.div
              key="packet"
              initial={reducedMotion() ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reducedMotion() ? undefined : { opacity: 0 }}
              className="absolute top-1/2 z-20 -translate-y-1/2 cursor-pointer"
              style={{ left, transition: 'left 0.55s ease' }}
              onClick={props.onInspect}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && props.onInspect()}
              aria-label="Travelling packet — press to inspect"
            >
              <div className={cn(
                'flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[0.5rem]',
                props.secure ? 'border-[rgb(var(--c-core))] bg-[#062b26] text-[rgb(var(--c-core))] shadow-[0_0_12px_rgba(94,234,212,0.4)]' : 'border-[var(--c-danger)] bg-[#2b0a0a] text-[var(--c-danger)]',
              )}>
                <span className="text-[0.6rem]">▣</span>
                <span>PACKET</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Node status strip */}
      <div className="mt-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.3)] p-2 text-[0.55rem] text-[var(--c-text-dim)]">
        {(() => {
          const sel = NODES.find((n) => n.id === props.selectedNode)
          if (!sel) return null
          const reached = props.step >= (sel.id === 'sender' ? 0 : sel.id === 'router1' ? 4 : sel.id === 'router2' ? 5 : 7)
          return (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="mono-label !text-[0.45rem] text-[rgb(var(--c-core))]">NODE · {sel.label}</span>
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--c-core))]" /> STATUS ONLINE</span>
              <span className="inline-flex items-center gap-1">{reached ? <Check size={11} className="text-[rgb(var(--c-core))]" /> : <X size={11} className="text-[var(--c-text-faint)]" />} PACKET RECEIVED</span>
              <span className="inline-flex items-center gap-1">{reached && sel.id !== 'receiver' ? <Check size={11} className="text-[rgb(var(--c-core))]" /> : <X size={11} className="text-[var(--c-text-faint)]" />} PACKET FORWARDED</span>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

/* ================================================================== */
/* Observer panel                                                       */
/* ================================================================== */

function ObserverPanel({ secure, observerPayload, engine, step }: { secure: boolean; observerPayload: string; engine: Engine; step: number }) {
  const active = step >= 6
  return (
    <Panel
      label="OBSERVER / EAVESDROPPER"
      title="What can an attacker see?"
      actions={secure ? <Eye size={16} className="text-[rgb(var(--c-core))]" /> : <Eye size={16} className="text-[var(--c-danger)]" />}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">OBSERVER VIEW{active ? '' : ' · AWAITING PACKET'}</p>
          <div className={cn('mt-2 rounded-md border p-3 font-mono text-[0.6rem]', secure ? 'border-[var(--c-border)] bg-[rgba(0,0,0,0.25)]' : 'border-[var(--c-danger)] bg-[rgba(248,113,113,0.06)]')}>
            <p className="text-[var(--c-text-faint)]">PAYLOAD</p>
            <p className={cn('mt-1 break-all text-xs', secure ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-danger)]')}>
              {active ? observerPayload : '·····'}
            </p>
          </div>

          <ul className="mt-3 space-y-1 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
            <li className="flex items-center gap-2">
              <Check size={12} className="text-[rgb(var(--c-core))]" /> Visible: packet metadata (source, destination, protocol)
            </li>
            <li className="flex items-center gap-2">
              {secure ? (
                <>
                  <Check size={12} className="text-[rgb(var(--c-core))]" /> Visible: <span className="text-[rgb(var(--c-core))]">encrypted payload</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={12} className="text-[var(--c-danger)]" /> Visible: <span className="text-[var(--c-danger)]">PLAINTEXT EXPOSED</span>
                </>
              )}
            </li>
            <li className="flex items-center gap-2">
              {secure ? (
                <>
                  <X size={12} className="text-[var(--c-danger)]" /> Not visible: <span className="text-[var(--c-text)]">original plaintext</span>
                </>
              ) : (
                <>
                  <Check size={12} className="text-[var(--c-danger)]" /> Not protected: <span className="text-[var(--c-danger)]">anything readable</span>
                </>
              )}
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">PLAINTEXT (FOR COMPARISON)</p>
          <p className="mt-1 break-all font-mono text-xs text-[var(--c-text-dim)]">{engine.plain}</p>
          <p className="mt-3 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
            {secure ? (
              <>
                Encryption transforms the readable plaintext into ciphertext. The observer can see the <span className="text-[var(--c-text)]">packet and its metadata</span>, but cannot directly read the <span className="text-[rgb(var(--c-core))]">protected message content</span>. This is <span className="text-[var(--c-text)]">confidentiality</span>.
              </>
            ) : (
              <>
                With no encryption, the plaintext <span className="text-[var(--c-danger)]">is exposed on the wire</span> — anyone on the channel reads it directly. This is why encryption matters on untrusted networks.
              </>
            )}
          </p>
          <p className="mt-2 text-[0.55rem] leading-relaxed text-[var(--c-text-faint)]">
            Note: encryption does not automatically hide all network metadata (who talks to whom, when, how much). This simulation shows only what the observer can see in a simplified channel.
          </p>
        </div>
      </div>
    </Panel>
  )
}

/* ================================================================== */
/* Packet inspector                                                     */
/* ================================================================== */

function PacketInspector({ engine, secure, meta, inspecting, step, tampered, wrong }: { engine: Engine; secure: boolean; meta: CipherMeta; inspecting: boolean; step: number; tampered: boolean; wrong: boolean }) {
  if (!inspecting) return null
  const active = step >= 2
  const payload = active ? engine.wirePayload : '—'
  return (
    <Panel label="PACKET INSPECTOR" title="Metadata vs encrypted payload" actions={<Activity size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.04)] p-3">
        <div className="grid gap-x-6 gap-y-1 font-mono text-[0.58rem] text-[var(--c-text-dim)] sm:grid-cols-2">
          <p><span className="text-[var(--c-text-faint)]">PACKET ID</span> <span className="text-[var(--c-text)]">#001</span></p>
          <p><span className="text-[var(--c-text-faint)]">STATUS</span> <span className="text-[rgb(var(--c-core))]">{active ? 'IN TRANSIT' : 'QUEUED'}</span></p>
          <p><span className="text-[var(--c-text-faint)]">SOURCE</span> <span className="text-[var(--c-text)]">SENDER</span></p>
          <p><span className="text-[var(--c-text-faint)]">DESTINATION</span> <span className="text-[var(--c-text)]">RECEIVER</span></p>
          <p><span className="text-[var(--c-text-faint)]">PROTOCOL</span> <span className="text-[var(--c-text)]">CRYPTOLAB SECURE</span></p>
          <p><span className="text-[var(--c-text-faint)]">ENCRYPTION</span> <span className="text-[var(--c-text)]">{secure ? meta.name : 'NONE'}</span></p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">METADATA</p>
          <p className="mt-1 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">
            The packet header is generally <span className="text-[var(--c-text)]">visible</span> — source, destination, timing and size are not protected by encrypting the payload.
          </p>
        </div>
        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">ENCRYPTED PAYLOAD{tampered ? ' · MODIFIED' : ''}{wrong ? ' · WRONG KEY AT RECEIVER' : ''}</p>
          <p className="mt-1 break-all font-mono text-xs text-[rgb(var(--c-core))]">{payload}</p>
          <p className="mt-2 text-[0.55rem] leading-relaxed text-[var(--c-text-faint)]">
            Encryption protects the message content, but encryption alone does not automatically hide all network metadata.
          </p>
        </div>
      </div>
    </Panel>
  )
}

/* ================================================================== */
/* Step-by-step controller                                              */
/* ================================================================== */

function StepByStep(props: {
  step: number
  setStep: (n: number) => void
  playing: boolean
  setPlaying: (v: boolean) => void
  speed: 'slow' | 'normal' | 'fast'
  setSpeed: (s: 'slow' | 'normal' | 'fast') => void
  reduced: boolean
  secure: boolean
  onSend: () => void
}) {
  const stage = STAGES[props.step]
  return (
    <Panel label="STEP-BY-STEP NETWORK MODE" title="Walk the message through the network" actions={<GraduationCap size={16} className="text-[rgb(var(--c-core))]" />}>
      {/* stage progress */}
      <div className="flex items-center justify-between">
        <span className="mono-label !text-[0.55rem] text-[var(--c-text-dim)]">STAGE</span>
        <span className="mono-label !text-[0.6rem] text-[var(--c-text)]">
          {String(props.step + 1).padStart(2, '0')} / {String(STAGES.length).padStart(2, '0')}
        </span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[rgba(148,163,184,0.2)]">
        <div
          className="h-full rounded-full bg-[rgb(var(--c-core))] transition-all duration-300"
          style={{ width: `${((props.step + 1) / STAGES.length) * 100}%` }}
        />
      </div>
      <p className="mt-2 rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.06)] px-3 py-2 font-mono text-[0.6rem] text-[rgb(var(--c-core))]">
        {String(props.step + 1).padStart(2, '0')} · {stage}
      </p>

      {/* controls — one clean centered group */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => { props.setStep(Math.max(0, props.step - 1)); props.setPlaying(false) }}
          aria-label="Previous stage"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
        >
          <SkipBack size={14} /> PREV
        </button>
        <button
          type="button"
          onClick={() => props.setPlaying(!props.playing)}
          disabled={props.reduced}
          aria-label={props.playing ? 'Pause' : 'Play'}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(var(--c-core))] px-5 py-2 text-xs font-semibold text-[#04110f] shadow-[0_0_18px_rgba(94,234,212,0.35)] transition-transform hover:scale-[1.02] disabled:opacity-40"
        >
          {props.playing ? <Pause size={14} /> : <Play size={14} />} {props.playing ? 'PAUSE' : 'PLAY'}
        </button>
        <button
          type="button"
          onClick={() => { props.setStep(Math.min(9, props.step + 1)); props.setPlaying(false) }}
          aria-label="Next stage"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
        >
          <SkipForward size={14} /> NEXT
        </button>
        <button
          type="button"
          onClick={() => { props.setStep(0); props.setPlaying(false) }}
          aria-label="Reset stages"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
        >
          <RotateCcw size={14} /> RESET
        </button>
      </div>

      {/* speed — separate row */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:justify-end">
        <span className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">SPEED</span>
        {(['slow', 'normal', 'fast'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => props.setSpeed(s)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[0.55rem] transition-colors',
              props.speed === s ? 'border-[rgb(var(--c-core))] text-[rgb(var(--c-core))]' : 'border-[var(--c-border)] text-[var(--c-text-faint)]',
            )}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={props.onSend}
          className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--c-core))] px-4 py-2 text-xs font-medium text-[rgb(var(--c-core))] transition-colors hover:bg-[rgba(94,234,212,0.1)]"
        >
          <Send size={13} /> {props.secure ? 'RUN FULL SECURE TRANSMISSION' : 'RUN UNSECURED TRANSMISSION'}
        </button>
        {props.reduced && <span className="text-[0.55rem] text-[var(--c-text-faint)]">Reduced-motion on — use PREV / NEXT.</span>}
      </div>
    </Panel>
  )
}

/* ================================================================== */
/* Side-by-side comparison                                              */
/* ================================================================== */

function SideBySide({ engine, secure, meta, message }: { engine: Engine; secure: boolean; meta: CipherMeta; message: string }) {
  return (
    <Panel label="SECURE VS INSECURE" title="Side-by-side comparison" actions={<Zap size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-[var(--c-danger)] bg-[rgba(248,113,113,0.04)] p-3">
          <p className="mono-label !text-[0.5rem] text-[var(--c-danger)]">UNENCRYPTED</p>
          <FlowLine label="MESSAGE" value={message} />
          <FlowLine label="NETWORK" value={message} accent="#f87171" />
          <FlowLine label="OBSERVER" value={message} accent="#f87171" />
          <FlowLine label="RECEIVER" value={message} />
          <p className="mt-2 text-[0.55rem] text-[var(--c-danger)]">Plaintext is exposed at every hop.</p>
        </div>
        <div className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.04)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">ENCRYPTED · {meta.name}</p>
          <FlowLine label="MESSAGE" value={message} />
          <FlowLine label="ENCRYPTION" value={secure ? engine.ciphertext : '—'} accent="rgb(var(--c-core))" />
          <FlowLine label="NETWORK / OBSERVER" value={secure ? engine.wirePayload : '—'} accent="rgb(var(--c-core))" />
          <FlowLine label="DECRYPTION" value={secure ? engine.recovered : '—'} accent="rgb(var(--c-core))" />
          <p className="mt-2 text-[0.55rem] text-[rgb(var(--c-core))]">Only ciphertext is visible on the wire; the message is recovered only at the receiver.</p>
        </div>
      </div>
      <p className="mt-3 text-[0.58rem] leading-relaxed text-[var(--c-text-faint)]">
        The values above are produced by the actual {meta.name} engine — the ciphertext is real, not a placeholder.
      </p>
    </Panel>
  )
}

function FlowLine({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="mb-1.5 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-2.5 py-1.5">
      <p className="mono-label !text-[0.45rem] text-[var(--c-text-faint)]">{label}</p>
      <p className="mt-0.5 break-all font-mono text-[0.58rem]" style={{ color: accent ?? 'var(--c-text)' }}>{value}</p>
    </div>
  )
}

/* ================================================================== */
/* Receiver panel                                                       */
/* ================================================================== */

function ReceiverPanel({ engine, secure, meta, step, wrong, tampered }: { engine: Engine; secure: boolean; meta: CipherMeta; step: number; wrong: boolean; tampered: boolean }) {
  const received = step >= 7
  const decrypted = step >= 8
  const failed = secure && (wrong || tampered)
  return (
    <Panel label="RECEIVER" title="Reversing the transformation" actions={<Unlock size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--c-border)] text-[var(--c-accent)]">
              <Server size={15} />
            </span>
            <p className="mono-label text-[0.6rem] font-semibold text-[var(--c-text)]">RECEIVER</p>
          </div>
          <div className="mt-3 space-y-1 font-mono text-[0.55rem] text-[var(--c-text-dim)]">
            <p className="text-[var(--c-text-faint)]">PACKET RECEIVED</p>
            <p className={cn('text-xs', received ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-faint)]')}>{received ? engine.wirePayload : '————'}</p>
            <p className="mt-1 text-[var(--c-text-faint)]">{secure ? '↓ DECRYPTION ENGINE' : '↓ NO DECRYPTION (UNSECURED)'}</p>
            <p className="text-[var(--c-text-faint)]">MESSAGE RECEIVED</p>
            <p className={cn('break-all text-xs', decrypted ? (failed ? 'text-[var(--c-danger)]' : 'text-[rgb(var(--c-core))]') : 'text-[var(--c-text-faint)]')}>
              {decrypted ? engine.recovered : '————'}
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <KeyRound size={13} className="text-[var(--c-accent)]" />
            <span className="text-[0.55rem] text-[var(--c-text-faint)]">KEY AT RECEIVER · <span className={cn(failed ? 'text-[var(--c-danger)]' : 'text-[rgb(var(--c-core))]')}>{wrong ? 'WRONG' : secure ? 'CORRECT' : 'NONE'}</span></span>
          </div>
        </div>

        <div className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
          <p className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">DECRYPTION RESULT</p>
          {!secure ? (
            <p className="mt-2 text-[0.6rem] leading-relaxed text-[var(--c-danger)]">
              This channel is unsecured — there is no decryption step because the message was never encrypted. The receiver gets plaintext directly.
            </p>
          ) : failed ? (
            <>
              <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-[var(--c-danger)]">
                <AlertTriangle size={14} /> {wrong ? 'DECRYPTION FAILED' : 'INTEGRITY VIOLATION'}
              </p>
              <p className="mt-1 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
                {wrong
                  ? 'The receiver used the wrong secret key, so the ciphertext did not decrypt back to the intended message. The recovered text is unintelligible.'
                  : 'The payload was modified in transit, so decryption no longer yields the original message. Encryption alone does not automatically provide integrity.'}
              </p>
              {engine.isBlock && (
                <p className="mt-2 break-all font-mono text-[0.55rem] text-[var(--c-text-dim)]">RECOVERED: {engine.recovered}</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
              Using the correct {meta.name} key, the receiver's decryption engine recovered the original plaintext. Symmetric encryption requires both parties to possess the appropriate secret key.
            </p>
          )}
        </div>
      </div>
    </Panel>
  )
}

/* ================================================================== */
/* Key concept                                                          */
/* ================================================================== */

function KeyConcept({ secure, meta }: { secure: boolean; meta: CipherMeta }) {
  return (
    <Panel label="SECRET KEY CONCEPT" title="A shared secret between sender and receiver" actions={<KeyRound size={16} className="text-[var(--c-accent)]" />}>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <NodePill label="SENDER" icon={<Send size={14} />} />
        <div className="flex flex-col items-center text-center">
          <KeyRound size={18} className="text-[var(--c-accent)]" />
          <p className="mono-label mt-1 !text-[0.5rem] text-[var(--c-accent)]">{secure ? 'SHARED SECRET KEY' : 'NO KEY'}</p>
          <p className="text-[0.5rem] text-[var(--c-text-faint)]">{secure ? 'same key at both ends' : 'unsecured channel'}</p>
        </div>
        <NodePill label="RECEIVER" icon={<Unlock size={14} />} />
      </div>
      <p className="mt-3 text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        {secure ? (
          <>
            <span className="text-[var(--c-text)]">Symmetric encryption</span> ({meta.name}) requires the sender and receiver to possess the <span className="text-[var(--c-accent)]">same secret key</span>. The sender encrypts with it and the receiver decrypts with it.
          </>
        ) : (
          <>No key is exchanged because the channel is unsecured — plaintext travels unprotected.</>
        )}
      </p>
    </Panel>
  )
}

function NodePill({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-4 py-2 text-[0.6rem] font-semibold text-[var(--c-text)]">
      {icon} {label}
    </div>
  )
}

/* ================================================================== */
/* Key distribution                                                     */
/* ================================================================== */

function KeyDistribution() {
  return (
    <Panel label="KEY SHARING" title="But how do the sender and receiver get the key?" actions={<BookOpen size={16} className="text-[var(--c-accent)]" />}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
            Symmetric encryption creates a <span className="text-[var(--c-text)]">key-distribution problem</span>: both parties must already share the same secret key, but how do you securely hand a secret to the other side in the first place?
          </p>
          <div className="mt-3 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3 text-center">
            <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">SENDER + SECRET KEY \ \ RECEIVER + SECRET KEY</p>
            <p className="mt-1 text-[0.55rem] text-[var(--c-accent)]">SECURE KEY DISTRIBUTION PROBLEM</p>
          </div>
        </div>
        <div className="rounded-md border border-[rgba(167,139,250,0.4)] bg-[rgba(167,139,250,0.06)] p-3">
          <p className="mono-label !text-[0.5rem] text-[#c4b5fd]">NEXT FRONTIER · PUBLIC-KEY CRYPTOGRAPHY</p>
          <p className="mt-2 text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">
            Public-key cryptography (e.g. RSA, Diffie–Hellman, ECC) lets parties establish a shared secret over an untrusted channel without sending the secret itself. It is not implemented here — it is the natural next step for solving key distribution.
          </p>
          <p className="mono-label mt-2 !text-[0.45rem] text-[var(--c-text-faint)]">EXTENDED TOPIC</p>
        </div>
      </div>
    </Panel>
  )
}

/* ================================================================== */
/* Security comparison                                                  */
/* ================================================================== */

function SecurityComparison() {
  return (
    <Panel label="EDUCATIONAL SECURITY COMPARISON" title="Caesar → Vigenère → DES → AES" actions={<Shield size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="overflow-x-auto rounded-md border border-[var(--c-border)]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[rgba(94,234,212,0.05)]">
              <th className="mono-label px-3 py-2 !text-[0.5rem] text-[var(--c-text-faint)]">CIPHER</th>
              <th className="mono-label px-3 py-2 !text-[0.5rem] text-[var(--c-text-faint)]">HISTORICAL ROLE</th>
              <th className="mono-label px-3 py-2 !text-[0.5rem] text-[var(--c-text-faint)]">MAJOR WEAKNESS</th>
              <th className="mono-label px-3 py-2 !text-[0.5rem] text-[var(--c-text-faint)]">MODERN RELEVANCE</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((c) => (
              <tr key={c.id} className="border-t border-[var(--c-border)]">
                <td className="px-3 py-2 text-[0.6rem] font-semibold text-[var(--c-text)]">{c.name}</td>
                <td className="px-3 py-2 text-[0.6rem] text-[var(--c-text-dim)]">{c.role}</td>
                <td className="px-3 py-2 text-[0.6rem] text-[var(--c-text-dim)]">{c.weakness}</td>
                <td className="px-3 py-2 text-[0.6rem] text-[var(--c-text-dim)]">{c.modern}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[0.55rem] leading-relaxed text-[var(--c-text-faint)]">
        This is an educational comparison, not a strict mathematical ranking. AES is the strongest of the four shown and is the modern standard.
      </p>
    </Panel>
  )
}

/* ================================================================== */
/* Threat simulation                                                    */
/* ================================================================== */

function AttackScenarios() {
  const scenarios = [
    { icon: <Eye size={15} />, t: 'EAVESDROPPING', d: 'An observer on the channel captures the packet. With encryption they see only ciphertext; without it, plaintext.' },
    { icon: <Radio size={15} />, t: 'UNENCRYPTED TRANSMISSION', d: 'No encryption means anyone can read the message as it travels. This is what the UNSECURED CHANNEL demonstrates.' },
    { icon: <KeyRound size={15} />, t: 'WRONG KEY', d: 'A receiver without the correct key cannot recover the plaintext — decryption yields unintelligible data.' },
    { icon: <AlertTriangle size={15} />, t: 'MESSAGE TAMPERING', d: 'Modifying the payload in transit breaks the recovered message. Encryption alone does not detect changes; authenticated modes (AES-GCM) can.' },
  ]
  return (
    <Panel label="THREAT SIMULATION" title="Conceptual attack scenarios" actions={<ShieldAlert size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        {scenarios.map((s) => (
          <div key={s.t} className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.2)] p-3">
            <div className="flex items-center gap-2 text-[0.6rem] font-semibold text-[var(--c-text)]">
              <span className="grid h-7 w-7 place-items-center rounded-md border border-[var(--c-border)] text-[rgb(var(--c-core))]">{s.icon}</span>
              {s.t}
            </div>
            <p className="mt-2 text-[0.58rem] leading-relaxed text-[var(--c-text-dim)]">{s.d}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-start gap-2 rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.15)] px-3 py-2 text-[0.55rem] leading-relaxed text-[var(--c-text-faint)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[rgb(var(--c-core))]" />
        Educational simulation only — no real traffic is sniffed, captured or intercepted. Everything stays inside this browser.
      </p>
    </Panel>
  )
}

/* ================================================================== */
/* Confidentiality + limits                                             */
/* ================================================================== */

function Confidentiality() {
  return (
    <Panel label="CONFIDENTIALITY" title="What does encryption provide?" actions={<Lock size={16} className="text-[rgb(var(--c-core))]" />}>
      <p className="text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
        Encryption transforms readable plaintext into ciphertext so that <span className="text-[var(--c-text)]">unauthorized observers cannot directly read</span> the protected message content. On the simulated network, the observer sees only the encrypted payload.
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[0.55rem]">
        <span className="rounded-md border border-[var(--c-border)] bg-[rgba(0,0,0,0.25)] px-3 py-1.5 font-mono text-[var(--c-text)]">HELLO JESSE</span>
        <ArrowDown size={13} className="text-[rgb(var(--c-core))]" />
        <span className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.08)] px-3 py-1.5 font-mono text-[rgb(var(--c-core))]">A1F8…</span>
      </div>
    </Panel>
  )
}

function EncryptionLimits() {
  const items = [
    'Authentication (proving who sent the message)',
    'Integrity (detecting if it changed in transit)',
    'Secure key exchange (getting the key to both sides)',
    'Protection from traffic analysis (who talks to whom, when)',
    'Endpoint security (the devices themselves)',
  ]
  return (
    <Panel label="ENCRYPTION ≠ COMPLETE SECURITY" title="What encryption does not automatically solve" actions={<ShieldAlert size={16} className="text-[var(--c-accent)]" />}>
      <ul className="space-y-1.5 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2">
            <X size={13} className="mt-0.5 shrink-0 text-[var(--c-danger)]" /> {it}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[0.6rem] leading-relaxed text-[var(--c-text-faint)]">
        Encryption provides confidentiality for the message content. A complete security design needs authentication, integrity, secure key management and more — each addressed separately.
      </p>
    </Panel>
  )
}

/* ================================================================== */
/* Concept map                                                          */
/* ================================================================== */

function ConceptMap() {
  const terms = [
    { t: 'CONFIDENTIALITY', d: 'Encryption hides the message content from observers on the network.' },
    { t: 'INTEGRITY', d: 'Detection that the message was not altered in transit (authenticated modes like AES-GCM).' },
    { t: 'AUTHENTICATION', d: 'Proving the message really came from the claimed sender.' },
    { t: 'KEY MANAGEMENT', d: 'Securely generating, distributing and protecting the secret keys.' },
  ]
  const [sel, setSel] = useState(0)
  return (
    <Panel label="NETWORK SECURITY CONCEPT MAP" title="Click each term to see a short explanation" actions={<Network size={16} className="text-[rgb(var(--c-core))]" />}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {terms.map((tr, i) => (
          <div key={tr.t} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSel(i)}
              aria-expanded={sel === i}
              className={cn(
                'rounded-md border px-3 py-1.5 text-[0.58rem] font-medium transition-colors',
                sel === i ? 'border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.12)] text-[rgb(var(--c-core))]' : 'border-[var(--c-border)] text-[var(--c-text-dim)] hover:border-[rgb(var(--c-core))]',
              )}
            >
              {tr.t}
            </button>
            {i < terms.length - 1 && <span className="text-[0.6rem] text-[rgb(var(--c-core))]">+</span>}
          </div>
        ))}
        <span className="rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.1)] px-3 py-1.5 text-[0.58rem] font-semibold text-[rgb(var(--c-core))]">= NETWORK SECURITY</span>
      </div>
      <p className="mt-3 rounded-md border border-[rgb(var(--c-core))] bg-[rgba(0,0,0,0.25)] px-4 py-3 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
        <span className="text-[rgb(var(--c-core))]">{terms[sel].t}</span> — {terms[sel].d}
      </p>
    </Panel>
  )
}

/* ================================================================== */
/* Challenge                                                            */
/* ================================================================== */

function Challenge(props: { setCipher: (c: CipherId) => void; setSecure: (s: boolean) => void; send: () => void; cipher: CipherId; secure: boolean }) {
  const [pickC, setPickC] = useState<CipherId>('aes')
  const [pickS, setPickS] = useState(true)
  const [done, setDone] = useState(false)
  const run = () => {
    props.setCipher(pickC)
    props.setSecure(pickS)
    setDone(true)
    // let state settle, then send
    setTimeout(() => props.send(), 0)
  }
  const score = !pickS ? 1 : pickC === 'aes' ? 5 : pickC === 'des' ? 4 : pickC === 'vigenere' ? 3 : 2
  const lines =
    !pickS
      ? ['The message travelled as plaintext — an observer could read it. No confidentiality.', 'Encryption is essential on an untrusted network.']
      : pickC === 'aes'
        ? ['AES-128 is the modern standard — strong confidentiality with a 128-bit key.', 'Best choice for securing the message in transit.']
        : pickC === 'des'
          ? ['DES works, but its 56-bit key is weak by modern standards.', 'Works for the demonstration, but AES is stronger.']
          : pickC === 'vigenere'
            ? ['Vigenère is historically important but not modern-secure (Kasiski breaks it).', 'AES would protect the message far better.']
            : ['Caesar is trivially breakable by frequency analysis.', 'Fine for learning, not for real security.']
  return (
    <Panel label="LEARNING CHALLENGE" title="Secure the message" actions={<GraduationCap size={16} className="text-[rgb(var(--c-core))]" />}>
      {!done ? (
        <>
          <p className="text-[0.62rem] leading-relaxed text-[var(--c-text-dim)]">
            <span className="text-[var(--c-text)]">Scenario:</span> Alice wants to send <span className="text-[rgb(var(--c-core))]">"MEET ME AT 6"</span> to Bob so he receives it securely. Choose the encryption and channel, then run the simulation.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">ENCRYPTION</p>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {(['aes', 'des', 'caesar', 'vigenere'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPickC(c)}
                    className={cn(
                      'rounded-md border px-2 py-1.5 text-[0.58rem] transition-colors',
                      pickC === c ? 'border-[rgb(var(--c-core))] text-[rgb(var(--c-core))]' : 'border-[var(--c-border)] text-[var(--c-text-dim)]',
                    )}
                  >
                    {CIPHERS.find((x) => x.id === c)!.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mono-label !text-[0.5rem] text-[var(--c-text-faint)]">CHANNEL</p>
              <div className="mt-1 flex gap-1.5">
                <button type="button" onClick={() => setPickS(true)} className={cn('rounded-md border px-3 py-1.5 text-[0.58rem] transition-colors', pickS ? 'border-[rgb(var(--c-core))] text-[rgb(var(--c-core))]' : 'border-[var(--c-border)] text-[var(--c-text-dim)]')}>ENCRYPTED</button>
                <button type="button" onClick={() => setPickS(false)} className={cn('rounded-md border px-3 py-1.5 text-[0.58rem] transition-colors', !pickS ? 'border-[var(--c-danger)] text-[var(--c-danger)]' : 'border-[var(--c-border)] text-[var(--c-text-dim)]')}>UNENCRYPTED</button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={run}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[rgb(var(--c-core))] px-5 py-2.5 text-xs font-semibold text-[#04110f] shadow-[0_0_18px_rgba(94,234,212,0.35)] transition-transform hover:scale-[1.02]"
          >
            <Send size={14} /> RUN TRANSMISSION
          </button>
        </>
      ) : (
        <div>
          <div className="flex items-center gap-2">
            <Check size={16} className="text-[rgb(var(--c-core))]" />
            <span className="text-sm font-semibold text-[var(--c-text)]">Transmission complete</span>
            <span className="ml-auto rounded-full border border-[rgb(var(--c-core))] px-3 py-0.5 font-mono text-[0.6rem] text-[rgb(var(--c-core))]">SECURITY {score} / 5</span>
          </div>
          <p className="mt-1 text-[0.6rem] text-[var(--c-text-faint)]">
            You chose <span className="text-[var(--c-text)]">{CIPHERS.find((x) => x.id === pickC)!.name}</span> + <span className={pickS ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-danger)]'}>{pickS ? 'ENCRYPTED' : 'UNENCRYPTED'}</span> channel.
          </p>
          <ul className="mt-3 space-y-1.5 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
            {lines.map((l) => (
              <li key={l} className="flex items-start gap-2"><span className="mt-0.5 text-[rgb(var(--c-core))]">•</span>{l}</li>
            ))}
          </ul>
          <p className="mt-2 text-[0.55rem] leading-relaxed text-[var(--c-text-faint)]">
            This is a learning check, not a grade — the goal is to understand why confidentiality and key strength matter.
          </p>
          <button
            type="button"
            onClick={() => setDone(false)}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[rgb(var(--c-core))]"
          >
            <RotateCcw size={14} /> TRY AGAIN
          </button>
        </div>
      )}
    </Panel>
  )
}

/* ================================================================== */
/* Explanation                                                          */
/* ================================================================== */

function Explanation({ secure, meta }: { secure: boolean; meta: CipherMeta }) {
  const steps = [
    'The sender created plaintext.',
    secure ? `Encryption (${meta.name}) transformed the plaintext into ciphertext.` : 'No encryption was applied — the message stayed as plaintext.',
    'The ciphertext (or plaintext) travelled through the simulated network as a packet.',
    'An observer could see the packet but could not directly read the protected message content' + (secure ? '' : ' — because it was never protected'),
    'The receiver used the appropriate key to decrypt the message.',
    'The original plaintext was recovered.',
  ]
  return (
    <Panel label="WHAT DID YOU JUST SEE?" title="Reviewing the journey" actions={<BookOpen size={16} className="text-[rgb(var(--c-core))]" />}>
      <ol className="space-y-1.5 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mono-label !text-[0.5rem] text-[rgb(var(--c-core))]">{String(i + 1).padStart(2, '0')}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 rounded-md border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.04)] px-3 py-2 text-[0.6rem] leading-relaxed text-[var(--c-text-dim)]">
        Encryption protects message confidentiality while the message is travelling through an untrusted network. CRYPTOLAB is now a cryptography lab, a network-security lab, and an interactive learning platform.
      </p>
    </Panel>
  )
}
