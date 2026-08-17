import type {
  CipherAlgorithm,
  CipherVisualization,
  StepMode,
  TransformationStep,
} from '../types/CipherAlgorithm'

/**
 * VIGENÈRE CIPHER ENGINE
 *
 * A polyalphabetic cipher where the shift changes per position, driven by a
 * repeating keyword.
 *
 *   Encryption:  C = (P + Kᵢ) mod 26,   Kᵢ = keyword[(i mod len)]
 *   Decryption:  P = (C − Kᵢ) mod 26
 *
 * The keyword is repeated cyclically over the plaintext. Case is preserved;
 * spaces/punctuation are passed through unchanged and do not consume a key
 * letter. Pure, deterministic, DOM-free.
 */

export const VIG_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function isAlpha(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
}

/** Keep only A–Z from a keyword (uppercased). */
export function normalizeVigKey(key: string): string {
  return key.toUpperCase().replace(/[^A-Z]/g, '')
}

/** Encrypt/decrypt `text` with a repeating `keyword`. */
export function vigenereRun(text: string, keyword: string, mode: StepMode): string {
  const k = normalizeVigKey(keyword)
  if (k.length === 0) return text
  let ki = 0
  let out = ''
  for (const ch of text) {
    if (!isAlpha(ch)) {
      out += ch
      continue
    }
    const base = ch.charCodeAt(0) >= 97 ? 97 : 65
    const p = ch.toUpperCase().charCodeAt(0) - 65
    const kk = k[ki % k.length].charCodeAt(0) - 65
    const c = mode === 'encrypt' ? (p + kk) % 26 : (p - kk + 26) % 26
    out += String.fromCharCode(base + c)
    ki++
  }
  return out
}

export function vigenereEncrypt(text: string, keyword: string): string {
  return vigenereRun(text, keyword, 'encrypt')
}
export function vigenereDecrypt(text: string, keyword: string): string {
  return vigenereRun(text, keyword, 'decrypt')
}

/** The key letter aligned to each plaintext position (for the tabula visual). */
export function alignKey(text: string, keyword: string): string[] {
  const k = normalizeVigKey(keyword)
  const aligned: string[] = []
  let ki = 0
  for (const ch of text) {
    if (!isAlpha(ch)) {
      aligned.push('')
      continue
    }
    aligned.push(k[ki % k.length])
    ki++
  }
  return aligned
}

export interface VigenereStep {
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

/** Per-character record with the aligned key letter and full arithmetic. */
export function getVigenereSteps(text: string, keyword: string, mode: StepMode = 'encrypt'): VigenereStep[] {
  const k = normalizeVigKey(keyword)
  const steps: VigenereStep[] = []
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
    const keyCh = k[ki % k.length]
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

/** Alphabet + key-aligned cipher alphabet for the generic visualization contract. */
function getVigenereVisualization(keyword: string): CipherVisualization {
  const k = normalizeVigKey(keyword)
  return {
    alphabet: VIG_ALPHABET.split(''),
    cipherAlphabet: VIG_ALPHABET.split('').map((_, i) =>
      VIG_ALPHABET[(i + (k.charCodeAt(0) || 65) - 65) % 26],
    ),
  }
}

/** Character-level steps for the shared per-character machinery. */
function getVigenereStepsGeneric(
  text: string,
  keyword: string,
  mode: StepMode = 'encrypt',
): TransformationStep[] {
  return getVigenereSteps(text, keyword, mode).map((s) => ({
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
        ? `Key letter ${s.key} (${s.kVal}) controls the shift at this position — the shift changes as the keyword repeats.`
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
export const vigenereCipher: CipherAlgorithm = {
  meta: {
    id: 'vigenere',
    name: 'Vigenère Cipher',
    category: 'Polyalphabetic',
    family: 'polyalphabetic',
    requiresKey: true,
    keyType: 'Keyword',
    syllabusStatus: 'VTU_CORE',
    status: 'ACTIVE',
    syllabusModule: 'Module 1 · Classical Encryption Techniques',
    description:
      'A polyalphabetic cipher where the shift changes per position using a repeating keyword.',
    levels: ['concept', 'visualization', 'technical', 'experiment', 'challenge'],
    security: {
      securityLevel: 'WEAK',
      keySpace: '26^(keyword length)',
      bruteForce: 'Impractical alone',
      frequencyAnalysis: 'PARTIALLY RESISTANT',
      modernSecurity: 'NOT SECURE',
      weaknesses: [
        'Key is repeated cyclically',
        'Kasiski examination reveals the key length',
        'Each column can then be solved as a Caesar cipher by frequency analysis',
      ],
      explanation:
        'Repeating the keyword creates periodic structure. An attacker finds the key length (Kasiski examination), splits the message into Caesar columns, and solves each by frequency analysis.',
    },
  },
  keyType: 'string',
  encrypt: (text, key) => vigenereEncrypt(text, String(key)),
  decrypt: (text, key) => vigenereDecrypt(text, String(key)),
  getSteps: getVigenereStepsGeneric,
  getVisualizationData: getVigenereVisualization,
}
