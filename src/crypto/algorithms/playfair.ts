import type {
  CipherAlgorithm,
  CipherVisualization,
  StepMode,
  TransformationStep,
} from '../types/CipherAlgorithm'

/**
 * PLAYFAIR CIPHER ENGINE
 *
 * A digraph (pair-of-letters) substitution built from a 5×5 keyword square.
 *
 *   - The 5×5 matrix holds 25 letters (I and J share a cell; the square has
 *     no J). The keyword is written in first (duplicates dropped), then the
 *     remaining alphabet fills the rest.
 *   - Plaintext is uppercased, non-alphabetic characters are removed, and
 *     double letters within a pair are split with an X; a trailing X pads an
 *     odd-length message.
 *   - Each digraph is encrypted by one of three rules:
 *       ROW       — both letters same row: shift each one step right.
 *       COLUMN    — both letters same column: shift each one step down.
 *       RECTANGLE — otherwise: swap each letter into the other's column.
 *
 * Pure, deterministic, DOM-free. Decryption uses the inverse of each rule.
 */

export const PF_ALPHABET = 'ABCDEFGHIKLMNOPQRSTUVWXYZ' // 25 letters, no J

export type PlayfairRule = 'ROW' | 'COLUMN' | 'RECTANGLE'

/** Build the 5×5 keyword square. J is folded into I. */
export function buildPlayfairMatrix(keyword: string): string[][] {
  const k = keyword
    .toUpperCase()
    .replace(/J/g, 'I')
    .replace(/[^A-Z]/g, '')
  const used = new Set<string>()
  const cells: string[] = []
  for (const ch of k) {
    if (!used.has(ch) && PF_ALPHABET.includes(ch)) {
      used.add(ch)
      cells.push(ch)
    }
  }
  for (const ch of PF_ALPHABET) {
    if (!used.has(ch)) {
      used.add(ch)
      cells.push(ch)
    }
  }
  const matrix: string[][] = []
  for (let r = 0; r < 5; r++) matrix.push(cells.slice(r * 5, r * 5 + 5))
  return matrix
}

/** Prepare plaintext into clean digraphs (uppercase, no spaces/punct, X splits/padding). */
export function prepareDigraphs(text: string): string[] {
  const s = text
    .toUpperCase()
    .replace(/J/g, 'I')
    .replace(/[^A-Z]/g, '')
  const out: string[] = []
  let i = 0
  while (i < s.length) {
    if (i === s.length - 1) {
      out.push(s[i] + 'X')
      i += 1
      break
    }
    if (s[i] === s[i + 1]) {
      out.push(s[i] + 'X')
      i += 1
    } else {
      out.push(s[i] + s[i + 1])
      i += 2
    }
  }
  return out
}

/** Generate a random Playfair keyword (a few unique letters). */
export function generatePlayfairKey(): string {
  const arr = PF_ALPHABET.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  const n = 5 + Math.floor(Math.random() * 4) // 5–8 letters
  return arr.slice(0, n).join('')
}

export type PrepDigraphKind = 'valid' | 'repeated' | 'padding'

export interface PrepDigraph {
  /** The raw letters that formed this pair before any X insertion. */
  pair: string
  /** Why X (or padding) was applied. */
  kind: PrepDigraphKind
  /** Short reason text for the preparation viewer. */
  reason: string
}

export interface PrepStages {
  /** Uppercase, spaces/punctuation stripped. */
  normalized: string
  /** J folded into I. */
  jHandled: string
  /** Digraphs with their prep reasons, in order. */
  digraphs: PrepDigraph[]
}

/**
 * Show the full plaintext-preparation pipeline: normalize → fold J → split
 * into digraphs (inserting X for repeats and padding an odd tail). Mirrors
 * `prepareDigraphs` exactly so the displayed pairs match real encryption.
 */
export function prepareDigraphStages(text: string): PrepStages {
  const normalized = text.toUpperCase().replace(/[^A-Z]/g, '')
  const jHandled = normalized.replace(/J/g, 'I')
  const digraphs: PrepDigraph[] = []
  const s = jHandled
  let i = 0
  while (i < s.length) {
    if (i === s.length - 1) {
      digraphs.push({ pair: `${s[i]}X`, kind: 'padding', reason: `Odd length → pad with X` })
      i += 1
      break
    }
    if (s[i] === s[i + 1]) {
      digraphs.push({ pair: `${s[i]}X`, kind: 'repeated', reason: `Double ${s[i]} → insert X between` })
      i += 1
    } else {
      digraphs.push({ pair: `${s[i]}${s[i + 1]}`, kind: 'valid', reason: 'Distinct letters → valid pair' })
      i += 2
    }
  }
  return { normalized, jHandled, digraphs }
}

/** Human explanation of a Playfair rule, in student-friendly language. */
export function ruleExplain(rule: PlayfairRule, a: string, b: string, oa: string, ob: string): string {
  if (rule === 'ROW') {
    return `Because ${a} and ${b} share a row, each letter is replaced by the letter immediately to its right (wrapping around). ${a} → ${oa} and ${b} → ${ob}.`
  }
  if (rule === 'COLUMN') {
    return `Because ${a} and ${b} share a column, each letter is replaced by the letter immediately below it (wrapping around). ${a} → ${oa} and ${b} → ${ob}.`
  }
  return `Because ${a} and ${b} occupy different rows and columns, Playfair uses the rectangle rule: each letter is replaced by the letter in its own row but the other letter's column. ${a} → ${oa} and ${b} → ${ob}.`
}

/** Locate a letter's (row, column) in the square. */
export function findPosition(matrix: string[][], ch: string): [number, number] {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (matrix[r][c] === ch) return [r, c]
    }
  }
  return [0, 0]
}

/** The rule that governs this digraph inside the square. */
export function ruleFor(matrix: string[][], a: string, b: string): PlayfairRule {
  const [r1, c1] = findPosition(matrix, a)
  const [r2, c2] = findPosition(matrix, b)
  if (r1 === r2) return 'ROW'
  if (c1 === c2) return 'COLUMN'
  return 'RECTANGLE'
}

/** Encrypt one digraph pair. */
export function encryptDigraph(matrix: string[][], a: string, b: string): [string, string] {
  const [r1, c1] = findPosition(matrix, a)
  const [r2, c2] = findPosition(matrix, b)
  if (r1 === r2) return [matrix[r1][(c1 + 1) % 5], matrix[r2][(c2 + 1) % 5]]
  if (c1 === c2) return [matrix[(r1 + 1) % 5][c1], matrix[(r2 + 1) % 5][c2]]
  return [matrix[r1][c2], matrix[r2][c1]]
}

/** Decrypt one digraph pair (inverse of encrypt). */
export function decryptDigraph(matrix: string[][], a: string, b: string): [string, string] {
  const [r1, c1] = findPosition(matrix, a)
  const [r2, c2] = findPosition(matrix, b)
  if (r1 === r2) return [matrix[r1][(c1 + 4) % 5], matrix[r2][(c2 + 4) % 5]]
  if (c1 === c2) return [matrix[(r1 + 4) % 5][c1], matrix[(r2 + 4) % 5][c2]]
  return [matrix[r1][c2], matrix[r2][c1]]
}

/** Encrypt `text` with a Playfair `keyword`. */
export function playfairEncrypt(text: string, keyword: string): string {
  const m = buildPlayfairMatrix(keyword)
  return prepareDigraphs(text)
    .map((d) => encryptDigraph(m, d[0], d[1]).join(''))
    .join('')
}

/** Decrypt a Playfair ciphertext (returns prepared plaintext incl. filler X). */
export function playfairDecrypt(ciphertext: string, keyword: string): string {
  const m = buildPlayfairMatrix(keyword)
  let s = ciphertext.toUpperCase().replace(/[^A-Z]/g, '')
  if (s.length % 2) s += 'X'
  let out = ''
  for (let i = 0; i < s.length; i += 2) out += decryptDigraph(m, s[i], s[i + 1]).join('')
  return out
}

/** Per-digraph transformation record for the custom Playfair lab. */
export interface PlayfairDigraphStep {
  index: number
  pair: string
  rule: PlayfairRule
  positions: [[number, number], [number, number]]
  input: [string, string]
  output: [string, string]
  /** Single-line explanation of the rule, e.g. "Same row → shift right". */
  detail: string
}

/** Compute every digraph step with the matrix/rule detail the lab needs. */
export function getPlayfairSteps(text: string, keyword: string): PlayfairDigraphStep[] {
  const m = buildPlayfairMatrix(keyword)
  const pairs = prepareDigraphs(text)
  return pairs.map((pair, idx) => {
    const [a, b] = [pair[0], pair[1]]
    const rule = ruleFor(m, a, b)
    const [r1, c1] = findPosition(m, a)
    const [r2, c2] = findPosition(m, b)
    const [oa, ob] = encryptDigraph(m, a, b)
    const detail =
      rule === 'ROW'
        ? `Same row → shift each letter right`
        : rule === 'COLUMN'
          ? `Same column → shift each letter down`
          : `Rectangle rule → swap columns (${a}↔${ob}, ${b}↔${oa})`
    return {
      index: idx,
      pair,
      rule,
      positions: [
        [r1, c1],
        [r2, c2],
      ],
      input: [a, b],
      output: [oa, ob],
      detail,
    }
  })
}

/** Plain alphabet and the flattened square for the generic visualization contract. */
function getPlayfairVisualization(keyword: string): CipherVisualization {
  return {
    alphabet: PF_ALPHABET.split(''),
    cipherAlphabet: buildPlayfairMatrix(keyword).flat(),
  }
}

/** Character-level steps for the shared per-character machinery (used rarely). */
function getPlayfairStepsGeneric(
  text: string,
  keyword: string,
  mode: StepMode = 'encrypt',
): TransformationStep[] {
  const result = mode === 'encrypt' ? playfairEncrypt(text, keyword) : playfairDecrypt(text, keyword)
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '')
  return result.split('').map((ch, i) => ({
    index: i,
    originalCharacter: clean[i] ?? '',
    originalValue: clean[i] ? clean[i].charCodeAt(0) - 65 : null,
    shift: null,
    calculation: mode === 'encrypt' ? `digraph → ${ch}` : `digraph ← ${ch}`,
    resultValue: ch.charCodeAt(0) - 65,
    resultCharacter: ch,
    status: 'transformed',
    mode,
    note: 'Playfair encrypts pairs of letters, not single characters.',
    mathematics: [`Pair ${i}: ${clean[i] ?? '·'}${clean[i + 1] ?? ''}`, `Rule applied`, `Output: ${ch}`],
  }))
}

/** Full algorithm object — same contract as Caesar / Monoalphabetic. */
export const playfairCipher: CipherAlgorithm = {
  meta: {
    id: 'playfair',
    name: 'Playfair Cipher',
    category: 'Polyalphabetic',
    family: 'polyalphabetic',
    requiresKey: true,
    keyType: 'Keyword',
    syllabusStatus: 'VTU_CORE',
    status: 'ACTIVE',
    syllabusModule: 'Module 1 · Classical Encryption Techniques',
    description:
      'Encrypts digraphs (pairs of letters) using a 5×5 keyword square and three geometric rules.',
    levels: ['concept', 'visualization', 'technical', 'experiment', 'challenge'],
    security: {
      securityLevel: 'WEAK',
      keySpace: '~25! keyword arrangements',
      bruteForce: 'Resists naive brute force',
      frequencyAnalysis: 'PARTIALLY RESISTANT',
      modernSecurity: 'NOT SECURE',
      weaknesses: [
        'Hides single-letter frequencies, but digraph structure remains',
        'Vulnerable to digraph-frequency & other classical cryptanalysis',
        'Limited 5×5 key structure',
        'Not suitable for modern secure communication',
      ],
      explanation:
        'Encrypting digraphs hides simple single-letter frequencies, but the underlying 5×5 structure and digraph patterns leave it open to classical cryptanalysis.',
    },
  },
  keyType: 'string',
  encrypt: (text, key) => playfairEncrypt(text, String(key)),
  decrypt: (text, key) => playfairDecrypt(text, String(key)),
  getSteps: getPlayfairStepsGeneric,
  getVisualizationData: getPlayfairVisualization,
}
