/**
 * DATA ENCRYPTION STANDARD (DES) — real block-cipher engine.
 *
 * This is a genuine educational DES implementation, NOT a mock "plaintext →
 * ciphertext" button. It operates on 64-bit data blocks with the real DES
 * permutation and S-box tables, and exposes the full internal state at every
 * stage so the laboratory can visualise the same values the encryption engine
 * uses (single source of truth).
 *
 *   KEY FACTS (shown honestly):
 *   - DES accepts a 64-bit key block, but 8 of those bits are parity bits.
 *     The effective key is 56 bits.
 *   - 16 Feistel rounds, a 64-bit block, S-boxes for nonlinear substitution.
 *   - Historically important, NOT secure for modern sensitive data.
 *
 * This file is pure and DOM-free.
 */

/* ------------------------------------------------------------------ */
/* Standard DES tables (1-indexed positions, as published)             */
/* ------------------------------------------------------------------ */

/** Initial Permutation (IP). output[i] = input[table[i]-1]. */
export const DES_IP = [
  58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4,
  62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
  57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3,
  61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7,
]

/** Final Permutation (IP⁻¹). */
export const DES_FP = [
  40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31,
  38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29,
  36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27,
  34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25,
]

/** Expansion permutation E (32 → 48). */
export const DES_E = [
  32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9,
  8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17,
  16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25,
  24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1,
]

/** Permutation P (32 → 32). */
export const DES_P = [
  16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26,
  5, 18, 31, 10, 2, 8, 24, 14, 32, 27, 3, 9,
  19, 13, 30, 6, 22, 11, 4, 25,
]

/** Permuted Choice 1 (PC-1): 64 → 56, dropping the 8 parity bits. */
export const DES_PC1 = [
  57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18,
  10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36,
  63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22,
  14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4,
]

/** Permuted Choice 2 (PC-2): 56 → 48 for each round key. */
export const DES_PC2 = [
  14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10,
  23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2,
  41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48,
  44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32,
]

/** Left-shift schedule: most rounds shift 1 bit, rounds 3,9,15 shift 2. */
export const DES_SHIFTS = [
  1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1,
]

/** The 8 DES S-boxes, each 4 rows × 16 columns. */
export const DES_SBOXES: number[][] = [
  // S1
  [
    14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7,
    0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8,
    4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0,
    15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13,
  ],
  // S2
  [
    15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10,
    3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5,
    0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15,
    13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9,
  ],
  // S3
  [
    10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8,
    13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1,
    13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7,
    1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12,
  ],
  // S4
  [
    7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15,
    13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9,
    10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4,
    3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14,
  ],
  // S5
  [
    2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9,
    14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6,
    4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14,
    11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3,
  ],
  // S6
  [
    12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11,
    10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8,
    9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6,
    4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13,
  ],
  // S7
  [
    4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1,
    13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6,
    1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2,
    6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12,
  ],
  // S8
  [
    13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7,
    1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2,
    7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8,
    2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11,
  ],
]

/* ------------------------------------------------------------------ */
/* Bit / hex helpers                                                    */
/* ------------------------------------------------------------------ */

const HEX = '0123456789ABCDEF'

/** Validate a hex string; returns a clear message when invalid. */
export function validateHex(s: string): { valid: boolean; message?: string } {
  const t = s.trim().toUpperCase()
  if (t.length === 0) return { valid: false, message: 'EMPTY INPUT — provide hexadecimal characters.' }
  if (!/^[0-9A-F]+$/.test(t)) {
    return { valid: false, message: 'INVALID HEXADECIMAL — only 0–9 and A–F are allowed.' }
  }
  if (t.length % 2 !== 0) {
    return { valid: false, message: 'ODD NUMBER OF HEX DIGITS — pairs of characters are required.' }
  }
  return { valid: true }
}

/** Convert a hex string (uppercased) to a bit array (MSB first). */
export function hexToBits(hex: string): number[] {
  const h = hex.trim().toUpperCase()
  const bits: number[] = []
  for (const ch of h) {
    const v = HEX.indexOf(ch)
    bits.push((v >> 3) & 1, (v >> 2) & 1, (v >> 1) & 1, v & 1)
  }
  return bits
}

/** Convert a bit array to a hex string, grouping in 4s. */
export function bitsToHex(bits: number[]): string {
  let out = ''
  for (let i = 0; i < bits.length; i += 4) {
    const v = bits[i] * 8 + bits[i + 1] * 4 + bits[i + 2] * 2 + bits[i + 3]
    out += HEX[v]
  }
  return out
}

/** Render a bit array as a space-separated binary string (default groups of 8). */
export function bitsToString(bits: number[], group = 8): string {
  return bits.map(String).join('').replace(new RegExp(`(.{${group}})`, 'g'), '$1 ').trim()
}

function permute(bits: number[], table: number[]): number[] {
  return table.map((p) => bits[p - 1])
}

function xor(a: number[], b: number[]): number[] {
  return a.map((v, i) => v ^ b[i])
}

function rotl(bits: number[], n: number): number[] {
  return bits.slice(n).concat(bits.slice(0, n))
}

/* ------------------------------------------------------------------ */
/* Key schedule                                                         */
/* ------------------------------------------------------------------ */

export interface DesKeyRound {
  n: number
  shift: number
  /** C after this round's left-shift. */
  c: string
  /** D after this round's left-shift. */
  d: string
  /** Combined 56-bit C+D. */
  cd: string
  /** 48-bit round key K(n). */
  k: string
}

export interface DesKeySchedule {
  valid: boolean
  keyHex: string
  keyBits: string
  /** Parity bits that are dropped by PC-1 (the 8 LSB of each key byte). */
  parityIndices: number[]
  pc1Out: string
  c0: string
  d0: string
  rounds: DesKeyRound[]
}

/**
 * Derive all 16 round keys from a 64-bit hex key.
 * Returns a structured trace the UI can visualise (single source of truth).
 */
export function desKeySchedule(keyHex: string): DesKeySchedule {
  const { valid } = validateHex(keyHex)
  if (!valid || hexToBits(keyHex).length !== 64) {
    return {
      valid: false,
      keyHex,
      keyBits: '',
      parityIndices: [],
      pc1Out: '',
      c0: '',
      d0: '',
      rounds: [],
    }
  }
  const keyBits = hexToBits(keyHex)
  const pc1Out = permute(keyBits, DES_PC1)
  const c0 = pc1Out.slice(0, 28)
  const d0 = pc1Out.slice(28)
  let c = c0
  let d = d0
  const rounds: DesKeyRound[] = []
  for (let i = 0; i < 16; i++) {
    const shift = DES_SHIFTS[i]
    c = rotl(c, shift)
    d = rotl(d, shift)
    const cd = c.concat(d)
    const k = permute(cd, DES_PC2)
    rounds.push({
      n: i + 1,
      shift,
      c: bitsToString(c, 7),
      d: bitsToString(d, 7),
      cd: bitsToString(cd, 7),
      k: bitsToString(k, 6),
    })
  }
  // Parity bits are the LSB of each of the 8 key bytes (positions 8,16,...,64).
  const parityIndices = [8, 16, 24, 32, 40, 48, 56, 64]
  return {
    valid: true,
    keyHex: keyHex.trim().toUpperCase(),
    keyBits: bitsToString(keyBits, 8),
    parityIndices,
    pc1Out: bitsToString(pc1Out, 7),
    c0: bitsToString(c0, 7),
    d0: bitsToString(d0, 7),
    rounds,
  }
}

/* ------------------------------------------------------------------ */
/* F-function                                                           */
/* ------------------------------------------------------------------ */

export interface DesFStage {
  /** 32-bit R. */
  r: string
  /** 48-bit expanded R. */
  expanded: string
  /** 48-bit round key. */
  k: string
  /** 48-bit XOR result. */
  xorOut: string
  /** 8 groups of 6 bits, as binary strings. */
  groups6: string[]
  /** Row (first+last bits) for each group. */
  rows: number[]
  /** Column (middle 4 bits) for each group. */
  cols: number[]
  /** S-box number (1–8) for each group. */
  boxIdx: number[]
  /** 4-bit S-box output per group. */
  groups4: string[]
  /** 32-bit concatenated S-box output. */
  sOut: string
  /** 32-bit P output = F(R,K). */
  f: string
}

/** Run the DES F-function on a 32-bit R with a 48-bit round key. */
export function desF(rBits: number[], kBits: number[]): DesFStage {
  const expanded = permute(rBits, DES_E)
  const x = xor(expanded, kBits)
  const groups6: string[] = []
  const rows: number[] = []
  const cols: number[] = []
  const groups4: string[] = []
  for (let i = 0; i < 8; i++) {
    const g = x.slice(i * 6, i * 6 + 6)
    groups6.push(bitsToString(g, 6))
    const row = g[0] * 2 + g[5]
    const col = g[1] * 8 + g[2] * 4 + g[3] * 2 + g[4]
    rows.push(row)
    cols.push(col)
    const box = DES_SBOXES[i]
    const val = box[row * 16 + col]
    groups4.push(val.toString(2).padStart(4, '0'))
  }
  const sOutBits = groups4.join('').split('').map(Number)
  const f = permute(sOutBits, DES_P)
  return {
    r: bitsToString(rBits, 4),
    expanded: bitsToString(expanded, 6),
    k: bitsToString(kBits, 6),
    xorOut: bitsToString(x, 6),
    groups6,
    rows,
    cols,
    boxIdx: Array.from({ length: 8 }, (_, i) => i + 1),
    groups4,
    sOut: bitsToString(sOutBits, 4),
    f: bitsToString(f, 4),
  }
}

/* ------------------------------------------------------------------ */
/* Full block trace                                                     */
/* ------------------------------------------------------------------ */

export interface DesRound {
  n: number
  lPrev: string
  rPrev: string
  k: string
  /** Complete F-function internals for this round. */
  f: DesFStage
  lNew: string
  rNew: string
}

export interface DesTrace {
  valid: boolean
  blockHex: string
  blockBits: string
  ipOut: string
  /** ipMap[i] = source (1-indexed input) bit that lands at output position i+1. */
  ipMap: number[]
  l0: string
  r0: string
  rounds: DesRound[]
  /** R16 L16 — the arrangement fed to the final permutation. */
  finalSwap: string
  fpOut: string
  fpMap: number[]
  cipherHex: string
}

/** Encrypt/decrypt a 64-bit hex block with a 64-bit hex key, returning a full trace. */
export function desBlock(blockHex: string, keyHex: string, mode: 'encrypt' | 'decrypt'): DesTrace {
  const schedule = desKeySchedule(keyHex)
  const invalid: DesTrace = {
    valid: false,
    blockHex,
    blockBits: '',
    ipOut: '',
    ipMap: [],
    l0: '',
    r0: '',
    rounds: [],
    finalSwap: '',
    fpOut: '',
    fpMap: [],
    cipherHex: '',
  }
  const bv = validateHex(blockHex)
  if (!schedule.valid || !bv.valid || hexToBits(blockHex).length !== 64) return invalid

  const blockBits = hexToBits(blockHex)
  const ipOut = permute(blockBits, DES_IP)
  const l0 = ipOut.slice(0, 32)
  const r0 = ipOut.slice(32)
  let l = l0
  let r = r0

  // Round keys applied in forward order for encryption, reverse for decryption.
  const order = schedule.rounds.map((s) => s.n)
  if (mode === 'decrypt') order.reverse()

  const rounds: DesRound[] = []
  for (let i = 0; i < 16; i++) {
    const n = order[i]
    const round = schedule.rounds.find((x) => x.n === n)!
    const kBits = round.k.replace(/[^01]/g, '').split('').map(Number)
    const f = desF(r, kBits)
    const fBits = f.f.split(' ').join('').split('').map(Number)
    const lNew = r
    const rNew = xor(l, fBits)
    rounds.push({
      n,
      lPrev: bitsToString(l, 4),
      rPrev: bitsToString(r, 4),
      k: round.k,
      f,
      lNew: bitsToString(lNew, 4),
      rNew: bitsToString(rNew, 4),
    })
    l = lNew
    r = rNew
  }

  // DES final arrangement: after round 16 the halves are swapped (R16 L16)
  // before the final permutation.
  const finalSwap = r.concat(l)
  const fpOut = permute(finalSwap, DES_FP)

  return {
    valid: true,
    blockHex: blockHex.trim().toUpperCase(),
    blockBits: bitsToString(blockBits, 8),
    ipOut: bitsToString(ipOut, 8),
    ipMap: DES_IP,
    l0: bitsToString(l0, 4),
    r0: bitsToString(r0, 4),
    rounds,
    finalSwap: bitsToString(finalSwap, 8),
    fpOut: bitsToString(fpOut, 8),
    fpMap: DES_FP,
    cipherHex: bitsToHex(fpOut),
  }
}

/* ------------------------------------------------------------------ */
/* High-level API                                                       */
/* ------------------------------------------------------------------ */

/** Validate a 64-bit data block in hex. */
export function validateBlockHex(hex: string): { valid: boolean; message?: string } {
  const v = validateHex(hex)
  if (!v.valid) return v
  if (hexToBits(hex).length !== 64) {
    return { valid: false, message: 'DES PROCESSES 64-BIT BLOCKS — enter exactly 16 hex characters.' }
  }
  return { valid: true }
}

/** Validate a DES key (16 hex chars = 64 bits, 8 of which are parity). */
export function validateKeyHex(hex: string): { valid: boolean; message?: string } {
  const v = validateHex(hex)
  if (!v.valid) return v
  if (hexToBits(hex).length !== 64) {
    return { valid: false, message: 'DES KEY MUST BE 16 HEX CHARACTERS (64 bits, incl. 8 parity bits).' }
  }
  return { valid: true }
}

/** Encrypt a 64-bit hex block. Returns hex ciphertext (or '' when invalid). */
export function desEncryptBlockHex(blockHex: string, keyHex: string): string {
  return desBlock(blockHex, keyHex, 'encrypt').cipherHex
}

/** Decrypt a 64-bit hex block. Returns hex plaintext (or '' when invalid). */
export function desDecryptBlockHex(blockHex: string, keyHex: string): string {
  return desBlock(blockHex, keyHex, 'decrypt').cipherHex
}

/** Convert an 8-char ASCII string to its 64-bit hex block. */
export function textToHex(text: string): string {
  let out = ''
  for (const ch of text) out += ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')
  return out
}

/** Convert a 64-bit hex block back to ASCII (best effort). */
export function hexToText(hex: string): string {
  const h = hex.trim().toUpperCase()
  let out = ''
  for (let i = 0; i < h.length; i += 2) {
    const c = parseInt(h.slice(i, i + 2), 16)
    out += String.fromCharCode(c)
  }
  return out
}

/**
 * Built-in educational test vector (FIPS 81):
 *   plaintext  0123456789ABCDEF
 *   key        133457799BBCDFF1
 *   ciphertext 85E813540F0AB405
 */
export const DES_TEST_VECTOR = {
  plain: '0123456789ABCDEF',
  key: '133457799BBCDFF1',
  expected: '85E813540F0AB405',
}
