import type {
  CipherAlgorithm,
  CipherVisualization,
  StepMode,
  TransformationStep,
} from '../types/CipherAlgorithm'

/**
 * MONOALPHABETIC SUBSTITUTION ENGINE
 *
 * Each plaintext letter is replaced by a fixed ciphertext letter taken from a
 * 26-letter substitution alphabet (a permutation of A–Z). Unlike Caesar, the
 * mapping is an arbitrary permutation, not a shift.
 *
 *   Encryption:  C = Key[ position(P) ]
 *   Decryption:  P = positionInverse( C )   (inverse of the key mapping)
 *
 * Pure, deterministic, DOM-free. Case is preserved; non-alphabetic characters
 * pass through unchanged. The same module supports encrypt() and decrypt() so
 * the future Decryption Lab can reuse it.
 */

export const MONO_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const MONO_DEFAULT_KEY = 'QWERTYUIOPASDFGHJKLZXCVBNM'

/** True when `ch` is a single ASCII alphabetic letter (A–Z / a–z). */
function isAlpha(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
}

export interface MonoKeyValidation {
  valid: boolean
  message: string
}

/**
 * Validate a substitution key.
 * A valid key is exactly 26 letters containing every A–Z exactly once.
 * Returns a clear educational message for the UI (no browser alerts).
 */
export function validateMonoKey(input: string): MonoKeyValidation {
  const upper = input.toUpperCase()
  const chars = upper.split('')

  if (chars.length !== 26) {
    return { valid: false, message: 'KEY MUST CONTAIN EVERY LETTER A–Z EXACTLY ONCE (26 LETTERS)' }
  }
  if (!chars.every(isAlpha)) {
    return { valid: false, message: 'INVALID CHARACTER IN KEY — LETTERS ONLY' }
  }
  if (new Set(chars).size !== 26) {
    return { valid: false, message: 'DUPLICATE LETTER DETECTED — 26 UNIQUE LETTERS REQUIRED' }
  }
  return { valid: true, message: 'VALID 26-LETTER SUBSTITUTION KEY' }
}

/**
 * Generate a random permutation of A–Z (Fisher–Yates). Always valid.
 * Educational: a fresh random key demonstrates that the mapping is arbitrary.
 */
export function generateMonoKey(): string {
  const arr = MONO_ALPHABET.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join('')
}

/** Position (0–25) of an uppercase letter in A–Z. */
function posOf(ch: string): number {
  return ch.toUpperCase().charCodeAt(0) - 65
}

/** Apply the key mapping in the requested direction, preserving case. */
function apply(text: string, key: string, mode: StepMode): string {
  const k = key.toUpperCase()
  const inverse = new Map<string, string>()
  if (mode === 'decrypt') {
    for (let i = 0; i < MONO_ALPHABET.length; i++) inverse.set(k[i], MONO_ALPHABET[i])
  }

  let out = ''
  for (const ch of text) {
    if (!isAlpha(ch)) {
      out += ch
      continue
    }
    const isUpper = ch === ch.toUpperCase()
    const mapped =
      mode === 'encrypt'
        ? k[posOf(ch)]
        : inverse.get(ch.toUpperCase()) ?? ch.toUpperCase()
    out += isUpper ? mapped : mapped.toLowerCase()
  }
  return out
}

/** Encrypt `text` using a 26-letter substitution `key`. */
export function monoEncrypt(text: string, key: string): string {
  return apply(text, key, 'encrypt')
}

/** Decrypt `text` using the same substitution `key` (inverse mapping). */
export function monoDecrypt(text: string, key: string): string {
  return apply(text, key, 'decrypt')
}

/**
 * Full per-character transformation record for `text`.
 * Powers the character grid, inspector, mathematics view and step-by-step mode.
 */
export function getMonoSteps(
  text: string,
  key: string,
  mode: StepMode = 'encrypt',
): TransformationStep[] {
  const k = key.toUpperCase()
  const inverse = new Map<string, string>()
  if (mode === 'decrypt') {
    for (let i = 0; i < MONO_ALPHABET.length; i++) inverse.set(k[i], MONO_ALPHABET[i])
  }

  const steps: TransformationStep[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (!isAlpha(ch)) {
      steps.push({
        index: i,
        originalCharacter: ch,
        originalValue: null,
        shift: null,
        calculation: null,
        resultValue: null,
        resultCharacter: ch,
        status: 'skipped',
        mode,
        reason: 'NON-ALPHABETIC · UNCHANGED',
        mathematics: [],
      })
      continue
    }

    const isUpper = ch === ch.toUpperCase()
    const origPos = posOf(ch)
    const mapped =
      mode === 'encrypt'
        ? k[origPos]
        : inverse.get(ch.toUpperCase()) ?? ch.toUpperCase()
    const resultChar = isUpper ? mapped : mapped.toLowerCase()
    const resultPos = posOf(mapped)
    const upperCh = ch.toUpperCase()

    steps.push({
      index: i,
      originalCharacter: ch,
      originalValue: origPos,
      shift: null,
      calculation: `${upperCh} → ${mapped}`,
      resultValue: resultPos,
      resultCharacter: resultChar,
      status: 'transformed',
      mode,
      note: `The cipher uses the same substitution rule for every occurrence of ${upperCh}.`,
      mathematics: [`P = ${upperCh}`, `Key[${upperCh}] = ${mapped}`, `C = ${mapped}`],
    })
  }

  return steps
}

/** Plain (A–Z) and permuted cipher alphabets for the mapping visualization. */
function getMonoVisualization(key: string): CipherVisualization {
  return {
    alphabet: MONO_ALPHABET.split(''),
    cipherAlphabet: key.toUpperCase().split(''),
  }
}

/** Full algorithm object — same contract as Caesar. */
export const monoalphabeticCipher: CipherAlgorithm = {
  meta: {
    id: 'monoalphabetic',
    name: 'Monoalphabetic Substitution',
    category: 'Substitution',
    family: 'substitution',
    requiresKey: true,
    keyType: '26-letter key',
    syllabusStatus: 'VTU_CORE',
    status: 'ACTIVE',
    syllabusModule: 'Module 1 · Classical Encryption Techniques',
    description:
      'Each plaintext letter maps to a fixed ciphertext letter via an arbitrary 26-letter substitution alphabet.',
    levels: ['concept', 'visualization', 'technical', 'experiment', 'challenge'],
    security: {
      securityLevel: 'WEAK',
      keySpace: '26! possible substitution alphabets',
      bruteForce: 'EXTREMELY LARGE IN THEORY',
      frequencyAnalysis: 'VULNERABLE',
      modernSecurity: 'NOT SECURE',
      weaknesses: [
        'Letter frequencies are preserved',
        'Repeated letters remain repeated',
        'Common word patterns remain visible',
        'Vulnerable to frequency analysis & pattern analysis',
        'Not suitable for modern secure communication',
      ],
      explanation:
        'Despite an enormous theoretical key space (26!), the substitution preserves the statistical structure of the language: letter frequencies, repeated letters and word patterns all survive. Frequency analysis can therefore recover the mapping quickly.',
    },
  },
  keyType: 'string',
  encrypt: monoEncrypt,
  decrypt: monoDecrypt,
  getSteps: getMonoSteps,
  getVisualizationData: getMonoVisualization,
}
