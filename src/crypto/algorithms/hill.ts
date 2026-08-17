import type {
  CipherAlgorithm,
  CipherVisualization,
  StepMode,
  TransformationStep,
} from '../types/CipherAlgorithm'

/**
 * HILL CIPHER ENGINE (2×2)
 *
 * A polyalphabetic block cipher built on linear algebra over mod 26.
 *
 *   Plaintext  → split into blocks of two letters.
 *   Each block → column vector [P1 P2]ᵀ
 *   Cipher     = K · P  (mod 26),  K = [[a b],[c d]]
 *
 *     C1 = (a·P1 + b·P2) mod 26
 *     C2 = (c·P1 + d·P2) mod 26
 *
 * Decryption needs K⁻¹ (mod 26), which exists only when
 *     det(K) = (a·d − b·c)  and  gcd(det(K), 26) = 1.
 * That check is surfaced educationally so students see why a non-invertible
 * matrix cannot decrypt.
 *
 * Pure, deterministic, DOM-free. Non-alphabetic characters are stripped and an
 * X pads an odd-length message (classical convention).
 */

export const HILL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export type HillMatrix = [[number, number], [number, number]]

/** Modular arithmetic helpers. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}
export function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) [a, b] = [b, a % b]
  return a
}
function egcd(a: number, b: number): { x: number; y: number; g: number } {
  if (b === 0) return { x: 1, y: 0, g: a }
  const { x, y, g } = egcd(b, a % b)
  return { x: y, y: x - Math.floor(a / b) * y, g }
}
/** Multiplicative inverse of `a` modulo `m`, or 0 if none exists. */
export function modInverse(a: number, m: number): number {
  const { x, g } = egcd(mod(a, m), m)
  return g === 1 ? mod(x, m) : 0
}

/** Convert a 4-number input string into a 2×2 matrix. */
export function parseHillKey(input: string): number[] {
  return (input.match(/-?\d+/g) ?? []).map(Number)
}
export function toMatrix(nums: number[]): HillMatrix {
  return [
    [nums[0], nums[1]],
    [nums[2], nums[3]],
  ]
}

export interface HillKeyValidation {
  valid: boolean
  message: string
  det: number | null
  invDet: number | null
  gcdVal: number | null
}

/**
 * Validate a Hill key and compute the determinant / modular inverse.
 * Returns a clear educational message for the UI.
 */
export function validateHillKey(input: string): HillKeyValidation {
  const nums = parseHillKey(input)
  if (nums.length !== 4) {
    return { valid: false, message: 'ENTER EXACTLY 4 NUMBERS — a b c d', det: null, invDet: null, gcdVal: null }
  }
  if (!nums.every((n) => Number.isInteger(n) && n >= 0 && n <= 25)) {
    return { valid: false, message: 'ALL VALUES MUST BE WHOLE NUMBERS 0–25', det: null, invDet: null, gcdVal: null }
  }
  const [[a, b], [c, d]] = toMatrix(nums)
  const det = mod(a * d - b * c, 26)
  const g = gcd(det, 26)
  if (g !== 1) {
    return {
      valid: false,
      message: `DET = ${det} · gcd(${det},26) = ${g} ≠ 1 — MATRIX NOT INVERTIBLE, DECRYPTION IMPOSSIBLE`,
      det,
      invDet: null,
      gcdVal: g,
    }
  }
  const invDet = modInverse(det, 26)
  return {
    valid: true,
    message: `DET = ${det} · gcd(${det},26) = 1 · MODULAR INVERSE = ${invDet}`,
    det,
    invDet,
    gcdVal: 1,
  }
}

/** Generate a random invertible 2×2 Hill key (gcd(det(K), 26) = 1 guaranteed). */
export function generateHillKey(): string {
  for (;;) {
    const r = () => Math.floor(Math.random() * 26)
    const nums = [r(), r(), r(), r()]
    const det = mod(nums[0] * nums[3] - nums[1] * nums[2], 26)
    if (gcd(det, 26) === 1) return nums.join(' ')
  }
}

/** K⁻¹ (mod 26) for decryption. Requires an invertible matrix. */
export function inverseMatrix(matrix: HillMatrix, invDet: number): HillMatrix {
  const [[a, b], [c, d]] = matrix
  return [
    [mod(d * invDet, 26), mod(-b * invDet, 26)],
    [mod(-c * invDet, 26), mod(a * invDet, 26)],
  ]
}

/** Encrypt one block of two letter-values. */
export function encryptBlock(matrix: HillMatrix, p: [number, number]): [number, number] {
  const [[a, b], [c, d]] = matrix
  return [mod(a * p[0] + b * p[1], 26), mod(c * p[0] + d * p[1], 26)]
}

/** Decrypt one block of two letter-values. */
export function decryptBlock(inv: HillMatrix, c: [number, number]): [number, number] {
  return encryptBlock(inv, c) // K⁻¹·C is the same linear form
}

/** Encrypt `text` with a 2×2 Hill key string "a b c d". */
export function hillEncrypt(text: string, key: string): string {
  const nums = parseHillKey(key)
  if (nums.length !== 4) return ''
  const m = toMatrix(nums)
  let s = text.toUpperCase().replace(/[^A-Z]/g, '')
  if (s.length % 2) s += 'X'
  let out = ''
  for (let i = 0; i < s.length; i += 2) {
    const [c1, c2] = encryptBlock(m, [s.charCodeAt(i) - 65, s.charCodeAt(i + 1) - 65])
    out += HILL_ALPHABET[c1] + HILL_ALPHABET[c2]
  }
  return out
}

/** Decrypt a Hill ciphertext (returns '' if the key matrix is not invertible). */
export function hillDecrypt(ciphertext: string, key: string): string {
  const v = validateHillKey(key)
  if (!v.valid || v.invDet == null) return ''
  const inv = inverseMatrix(toMatrix(parseHillKey(key)), v.invDet)
  let s = ciphertext.toUpperCase().replace(/[^A-Z]/g, '')
  if (s.length % 2) s += 'X'
  let out = ''
  for (let i = 0; i < s.length; i += 2) {
    const [p1, p2] = decryptBlock(inv, [s.charCodeAt(i) - 65, s.charCodeAt(i + 1) - 65])
    out += HILL_ALPHABET[p1] + HILL_ALPHABET[p2]
  }
  return out
}

/** Per-block transformation record for the custom Hill lab. */
export interface HillBlockStep {
  index: number
  block: [string, string]
  values: [number, number]
  key: HillMatrix
  products: [number, number] // pre-mod intermediate sums
  cipher: [number, number]
  outChars: [string, string]
}

/** Compute every block step with the raw arithmetic the "mathematics" view needs. */
export function getHillSteps(text: string, key: string): HillBlockStep[] {
  const nums = parseHillKey(key)
  if (nums.length !== 4) return []
  const m = toMatrix(nums)
  let s = text.toUpperCase().replace(/[^A-Z]/g, '')
  if (s.length % 2) s += 'X'
  const steps: HillBlockStep[] = []
  for (let i = 0; i < s.length; i += 2) {
    const p1 = s.charCodeAt(i) - 65
    const p2 = s.charCodeAt(i + 1) - 65
    const raw1 = m[0][0] * p1 + m[0][1] * p2
    const raw2 = m[1][0] * p1 + m[1][1] * p2
    const c1 = mod(raw1, 26)
    const c2 = mod(raw2, 26)
    steps.push({
      index: i / 2,
      block: [s[i], s[i + 1]],
      values: [p1, p2],
      key: m,
      products: [raw1, raw2],
      cipher: [c1, c2],
      outChars: [HILL_ALPHABET[c1], HILL_ALPHABET[c2]],
    })
  }
  return steps
}

/** Alphabet + visualization contract (flat key shown for reference). */
function getHillVisualization(key: string): CipherVisualization {
  const nums = parseHillKey(key)
  return {
    alphabet: HILL_ALPHABET.split(''),
    cipherAlphabet:
      nums.length === 4
        ? nums.map((n) => HILL_ALPHABET[mod(n, 26)])
        : HILL_ALPHABET.split(''),
  }
}

/** Character-level steps for the shared per-character machinery. */
function getHillStepsGeneric(
  text: string,
  key: string,
  mode: StepMode = 'encrypt',
): TransformationStep[] {
  const result = mode === 'encrypt' ? hillEncrypt(text, key) : hillDecrypt(text, key)
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '')
  return result.split('').map((ch, i) => ({
    index: i,
    originalCharacter: clean[i] ?? '',
    originalValue: clean[i] ? clean[i].charCodeAt(0) - 65 : null,
    shift: null,
    calculation: mode === 'encrypt' ? `K·P mod 26 → ${ch}` : `K⁻¹·C mod 26 → ${ch}`,
    resultValue: ch.charCodeAt(0) - 65,
    resultCharacter: ch,
    status: 'transformed',
    mode,
    note: 'Hill encrypts pairs of letters via 2×2 matrix multiplication mod 26.',
    mathematics: [`Block ${i}: ${clean[i] ?? '·'}${clean[i + 1] ?? ''}`, `Result: ${ch}`],
  }))
}

/** Full algorithm object — same contract as the other ciphers. */
export const hillCipher: CipherAlgorithm = {
  meta: {
    id: 'hill',
    name: 'Hill Cipher',
    category: 'Polyalphabetic',
    family: 'polyalphabetic',
    requiresKey: true,
    keyType: 'Matrix',
    syllabusStatus: 'VTU_CORE',
    status: 'ACTIVE',
    syllabusModule: 'Module 1 · Classical Encryption Techniques',
    description:
      'Encrypts blocks of letters via linear-algebra matrix multiplication (K·P mod 26).',
    levels: ['concept', 'visualization', 'technical', 'experiment', 'challenge'],
    security: {
      securityLevel: 'WEAK',
      keySpace: 'Depends on matrix size',
      bruteForce: 'Depends on key matrix',
      frequencyAnalysis: 'RESISTS SINGLE-LETTER ANALYSIS',
      modernSecurity: 'NOT SECURE',
      weaknesses: [
        'Linear structure creates exploitable plaintext/ciphertext relationships',
        '2×2 known-plaintext attack is straightforward',
        'Classical version unsuitable for modern security',
      ],
      explanation:
        'Hill works on blocks with a key matrix. Its linear structure lets an attacker build a system of equations from a few known plaintext/ciphertext pairs, so the classical version is not secure by modern standards.',
    },
  },
  keyType: 'string',
  encrypt: (text, key) => hillEncrypt(text, String(key)),
  decrypt: (text, key) => hillDecrypt(text, String(key)),
  getSteps: getHillStepsGeneric,
  getVisualizationData: getHillVisualization,
}
