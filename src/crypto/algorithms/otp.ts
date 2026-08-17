import type {
  CipherAlgorithm,
  CipherVisualization,
  StepMode,
  TransformationStep,
} from '../types/CipherAlgorithm'

/**
 * ONE-TIME PAD ENGINE
 *
 * A Vigenère-like cipher whose key is truly random, exactly as long as the
 * message, and never reused.
 *
 *   Encryption:  C = (P + Kᵢ) mod 26
 *   Decryption:  P = (C − Kᵢ) mod 26
 *
 * THEORETICALLY, with a truly random, same-length, single-use key, every
 * plaintext is equally likely (perfect secrecy). PRACTICALLY, generating,
 * distributing and never-reusing such keys is hard — the key-management burden
 * is why OTP is rarely used for modern communication. Pure, deterministic,
 * DOM-free (randomness is only injected by the explicit generator).
 */

export const OTP_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function isAlpha(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
}

/** Generate a random key of `length` alphabetic characters (A–Z). */
export function generateOtpKey(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) out += OTP_ALPHABET[Math.floor(Math.random() * 26)]
  return out
}

/** Whether a cryptographically secure browser randomness source is available. */
export function hasSecureRandomness(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
}

/**
 * Generate a key from a cryptographically appropriate randomness source when
 * available (crypto.getRandomValues), falling back to Math.random otherwise.
 */
export function generateSecureOtpKey(length: number): string {
  if (hasSecureRandomness()) {
    const arr = new Uint32Array(length)
    crypto.getRandomValues(arr)
    let out = ''
    for (let i = 0; i < length; i++) out += OTP_ALPHABET[arr[i] % 26]
    return out
  }
  return generateOtpKey(length)
}

/** Number of alphabetic (data) characters in `text` — the key length required. */
export function otpDataLength(text: string): number {
  return text.replace(/[^A-Za-z]/g, '').length
}

/** Strip a key down to A–Z only (uppercased). */
export function normalizeOtpKey(key: string): string {
  return key.toUpperCase().replace(/[^A-Z]/g, '')
}

/** Encrypt/decrypt `text` with a same-length `key`. */
export function otpRun(text: string, key: string, mode: StepMode): string {
  const k = normalizeOtpKey(key)
  let ki = 0
  let out = ''
  for (const ch of text) {
    if (!isAlpha(ch)) {
      out += ch
      continue
    }
    const base = ch.charCodeAt(0) >= 97 ? 97 : 65
    const p = ch.toUpperCase().charCodeAt(0) - 65
    const kk = k[ki] ? k[ki].charCodeAt(0) - 65 : 0
    const c = mode === 'encrypt' ? (p + kk) % 26 : (p - kk + 26) % 26
    out += String.fromCharCode(base + c)
    ki++
  }
  return out
}

export function otpEncrypt(text: string, key: string): string {
  return otpRun(text, key, 'encrypt')
}
export function otpDecrypt(text: string, key: string): string {
  return otpRun(text, key, 'decrypt')
}

/** Per-character record: plaintext, key letter, values, arithmetic, cipher. */
export interface OtpStep {
  index: number
  plain: string
  key: string
  pVal: number
  kVal: number
  intermediate: number
  cipherVal: number
  cipher: string
  status: 'transformed' | 'skipped'
}

/** Compute per-character steps with the additive (mod 26) arithmetic shown. */
export function getOtpSteps(text: string, key: string, mode: StepMode = 'encrypt'): OtpStep[] {
  const k = normalizeOtpKey(key)
  const steps: OtpStep[] = []
  let ki = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (!isAlpha(ch)) {
      steps.push({
        index: i,
        plain: ch,
        key: '',
        pVal: -1,
        kVal: -1,
        intermediate: -1,
        cipherVal: -1,
        cipher: ch,
        status: 'skipped',
      })
      continue
    }
    const base = ch.charCodeAt(0) >= 97 ? 97 : 65
    const pVal = ch.toUpperCase().charCodeAt(0) - 65
    const keyCh = k[ki] ?? 'A'
    const kVal = keyCh.charCodeAt(0) - 65
    const intermediate = mode === 'encrypt' ? pVal + kVal : pVal - kVal
    const cipherVal = ((intermediate % 26) + 26) % 26
    steps.push({
      index: i,
      plain: ch,
      key: keyCh,
      pVal,
      kVal,
      intermediate,
      cipherVal,
      cipher: String.fromCharCode(base + cipherVal),
      status: 'transformed',
    })
    ki++
  }
  return steps
}

/** Binary (ASCII) representation of a string, for the key-reuse demo. */
export function toBinary(text: string): string[] {
  return text.split('').map((ch) => ch.charCodeAt(0).toString(2).padStart(8, '0'))
}

/** XOR two strings byte-by-byte (XOR-based OTP). */
export function xorStr(a: string, b: string): string {
  let out = ''
  for (let i = 0; i < a.length; i++) out += String.fromCharCode(a.charCodeAt(i) ^ b.charCodeAt(i))
  return out
}

/**
 * Key-reuse leak (XOR-based OTP demonstration):
 *   C1 ⊕ C2 = (P1 ⊕ K) ⊕ (P2 ⊕ K) = P1 ⊕ P2
 * so XORing two ciphertexts that share a key reveals the XOR of the two
 * plaintexts. This is the classic proof that reusing an OTP key leaks data.
 */
export function otpReuseLeak(msg1: string, msg2: string, key: string): string {
  const len = Math.max(msg1.length, msg2.length)
  const k = key.repeat(Math.ceil(len / key.length)).slice(0, len)
  const c1 = xorStr(msg1, k)
  const c2 = xorStr(msg2, k)
  return xorStr(c1, c2)
}

/** Show a plain char as a readable control symbol (space → ␣). */
export function displayChar(ch: string): string {
  return ch === ' ' ? '␣' : ch
}

/** Alphabet + reference cipher alphabet for the generic visualization contract. */
function getOtpVisualization(key: string): CipherVisualization {
  const k = normalizeOtpKey(key)
  return {
    alphabet: OTP_ALPHABET.split(''),
    cipherAlphabet: OTP_ALPHABET.split('').map((_, i) =>
      OTP_ALPHABET[(i + (k.charCodeAt(0) || 65) - 65) % 26],
    ),
  }
}

/** Character-level steps for the shared per-character machinery. */
function getOtpStepsGeneric(text: string, key: string, mode: StepMode = 'encrypt'): TransformationStep[] {
  return getOtpSteps(text, key, mode).map((s) => ({
    index: s.index,
    originalCharacter: s.plain,
    originalValue: s.pVal >= 0 ? s.pVal : null,
    shift: s.kVal >= 0 ? s.kVal : null,
    calculation:
      s.status === 'transformed'
        ? mode === 'encrypt'
          ? `(${s.pVal} + ${s.kVal}) mod 26`
          : `(${s.pVal} - ${s.kVal}) mod 26`
        : null,
    resultValue: s.cipherVal >= 0 ? s.cipherVal : null,
    resultCharacter: s.cipher,
    status: s.status,
    mode,
    reason: s.status === 'skipped' ? 'NON-ALPHABETIC · UNCHANGED' : undefined,
    note:
      s.status === 'transformed'
        ? `Key letter ${s.key} (${s.kVal}) is used exactly once here — it is never repeated anywhere in the message.`
        : undefined,
    mathematics:
      s.status === 'transformed'
        ? [
            `${s.plain} = ${s.pVal}`,
            `Key ${s.key} = ${s.kVal}`,
            `${s.pVal} ${mode === 'encrypt' ? '+' : '-'} ${s.kVal} = ${s.intermediate}`,
            `${s.intermediate} mod 26 = ${s.cipherVal}`,
            `${s.cipherVal} = ${s.cipher}`,
          ]
        : [],
  }))
}

/** Full algorithm object — same contract as the other ciphers. */
export const otpCipher: CipherAlgorithm = {
  meta: {
    id: 'otp',
    name: 'One-Time Pad',
    category: 'Polyalphabetic',
    family: 'polyalphabetic',
    requiresKey: true,
    keyType: 'Random key (length = plaintext)',
    syllabusStatus: 'VTU_CORE',
    status: 'ACTIVE',
    syllabusModule: 'Module 1 · Classical Encryption Techniques',
    description:
      'A Vigenère-like cipher using a truly random, never-reused key as long as the plaintext.',
    levels: ['concept', 'visualization', 'technical', 'experiment', 'challenge'],
    security: {
      securityLevel: 'SPECIAL',
      keySpace: 'Random key, length = plaintext',
      bruteForce: 'Defeated by ciphertext alone',
      frequencyAnalysis: 'IMMUNE (if used correctly)',
      modernSecurity: 'PERFECT SECRECY (theoretical)',
      weaknesses: [
        'Key must be truly random',
        'Key length must equal plaintext',
        'Key must never be reused',
        'Secure key distribution is hard in practice',
      ],
      isSpecial: true,
      explanation:
        'With a truly random key as long as the message, used only once, every plaintext is equally likely — THEORETICAL PERFECT SECRECY. In practice, generating, distributing and never-reusing such keys is hard, which limits real-world use.',
    },
  },
  keyType: 'string',
  encrypt: (text, key) => otpEncrypt(text, String(key)),
  decrypt: (text, key) => otpDecrypt(text, String(key)),
  getSteps: getOtpStepsGeneric,
  getVisualizationData: getOtpVisualization,
}
