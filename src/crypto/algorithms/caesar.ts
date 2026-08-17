import type {
  CipherAlgorithm,
  CipherVisualization,
  StepMode,
  TransformationStep,
} from '../types/CipherAlgorithm'

/**
 * CAESAR CIPHER ENGINE
 *
 *   Encryption:  C = (P + K) mod 26
 *   Decryption:  P = (C - K) mod 26
 *
 * where P/C are alphabet values (A=0 … Z=25) and K is the shift key.
 *
 * Pure, deterministic, DOM-free logic — safe to unit test and reusable by the
 * future Decryption Lab. Case is preserved; non-alphabetic characters pass
 * through unchanged.
 */

const A_UPPER = 'A'.charCodeAt(0) // 65
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/** True when `ch` is a single ASCII alphabetic letter (A–Z / a–z). */
export function isAlphabetic(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
}

/**
 * Normalize any integer shift into the range 0–25.
 * Negative (-3 → 23) and large (29 → 3) values wrap around the alphabet.
 */
export function normalizeShift(raw: number): number {
  const n = Math.round(raw)
  return ((n % 26) + 26) % 26
}

/** Shift a single letter by `k`, preserving its case. */
function shiftLetter(ch: string, k: number, mode: StepMode): string {
  const code = ch.charCodeAt(0)
  const base = code >= 97 ? 97 : 65 // lowercase base is 97, uppercase 65
  const value = code - base
  const shifted =
    mode === 'encrypt' ? (value + k) % 26 : (value - k + 26) % 26
  return String.fromCharCode(base + shifted)
}

/** Encrypt `text` with a Caesar shift `shift`. */
export function caesarEncrypt(text: string, shift: number): string {
  const k = normalizeShift(shift)
  let out = ''
  for (const ch of text) {
    out += isAlphabetic(ch) ? shiftLetter(ch, k, 'encrypt') : ch
  }
  return out
}

/** Decrypt `text` with a Caesar shift `shift`. */
export function caesarDecrypt(text: string, shift: number): string {
  const k = normalizeShift(shift)
  let out = ''
  for (const ch of text) {
    out += isAlphabetic(ch) ? shiftLetter(ch, k, 'decrypt') : ch
  }
  return out
}

/**
 * Produce the full per-character transformation record for `text`.
 * Powers the character grid, inspector, mathematics view and step-by-step mode.
 */
export function getCaesarSteps(
  text: string,
  shift: number,
  mode: StepMode = 'encrypt',
): TransformationStep[] {
  const k = normalizeShift(shift)
  const steps: TransformationStep[] = []

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (!isAlphabetic(ch)) {
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

    const isUpper = ch.charCodeAt(0) <= 90
    const base = isUpper ? 65 : 97
    const origValue = ch.toUpperCase().charCodeAt(0) - A_UPPER // A=0…Z=25
    const resultValue =
      mode === 'encrypt'
        ? (origValue + k) % 26
        : (origValue - k + 26) % 26
    const resultChar = String.fromCharCode(base + resultValue)
    const intermediate = mode === 'encrypt' ? origValue + k : origValue - k

    steps.push({
      index: i,
      originalCharacter: ch,
      originalValue: origValue,
      shift: k,
      calculation: mode === 'encrypt'
        ? `(${origValue} + ${k}) mod 26`
        : `(${origValue} - ${k}) mod 26`,
      resultValue,
      resultCharacter: resultChar,
      status: 'transformed',
      mode,
      mathematics: [
        `${ch} = ${origValue}`,
        `${origValue} ${mode === 'encrypt' ? '+' : '-'} ${k} = ${intermediate}`,
        `${intermediate} mod 26 = ${resultValue}`,
        `${resultValue} = ${resultChar}`,
      ],
    })
  }

  return steps
}

/** Rotated alphabet (plain → cipher) for the visual alphabet wheel. */
function getCaesarVisualization(shift: number): CipherVisualization {
  const k = normalizeShift(shift)
  return {
    alphabet: [...ALPHABET],
    cipherAlphabet: ALPHABET.map((_, i) => ALPHABET[(i + k) % 26]),
  }
}

/** Full algorithm object — the single entry point the UI and future labs use. */
export const caesarCipher: CipherAlgorithm = {
  meta: {
    id: 'caesar',
    name: 'Caesar Shift',
    category: 'Substitution',
    family: 'substitution',
    requiresKey: true,
    keyType: 'Numeric Shift',
    syllabusStatus: 'VTU_CORE',
    status: 'ACTIVE',
    syllabusModule: 'Module 1 · Classical Encryption Techniques',
    description:
      'Each alphabetic character is shifted by a fixed number of positions (the key).',
    levels: ['concept', 'visualization', 'technical', 'experiment', 'challenge'],
    security: {
      securityLevel: 'VERY_WEAK',
      keySpace: '26 possible shifts',
      bruteForce: 'TRIVIAL',
      frequencyAnalysis: 'VULNERABLE',
      modernSecurity: 'NOT SECURE',
      weaknesses: [
        'Very small key space (only 26 shifts)',
        'Fixed substitution pattern',
        'Vulnerable to brute-force attacks',
        'Vulnerable to frequency analysis',
        'Not suitable for modern secure communication',
      ],
      explanation:
        'Caesar uses a fixed substitution pattern in which every alphabetic character is shifted by the same amount. Because there are only 26 possible shifts, an attacker can test every key quickly — and a frequency analysis of common letters can reveal the plaintext even faster.',
    },
  },
  keyType: 'shift',
  encrypt: caesarEncrypt,
  decrypt: caesarDecrypt,
  getSteps: getCaesarSteps,
  getVisualizationData: getCaesarVisualization,
}
