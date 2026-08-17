/**
 * ADVANCED ENCRYPTION STANDARD (AES) — AES-128 real block-cipher engine.
 *
 * A genuine educational AES-128 implementation (NOT a mock). It operates on
 * 128-bit blocks with the real S-box, key expansion (RotWord / SubWord /
 * Rcon), and the four round transformations, exposing the full internal state
 * at every step so the laboratory visualises the same values the encryption
 * engine uses (single source of truth).
 *
 *   AES-128 FACTS:
 *   - block size  128 bits (16 bytes), state = 4×4 byte matrix (column-major)
 *   - key size    128 bits
 *   - rounds      10
 *   - structure   Substitution-Permutation Network (SPN), unlike DES's Feistel
 *
 * This file is pure and DOM-free.
 */

const HEX = '0123456789ABCDEF'

/* ------------------------------------------------------------------ */
/* AES S-box and inverse S-box                                          */
/* ------------------------------------------------------------------ */

/** Standard AES S-box (0x00 … 0xFF). */
export const AES_SBOX = [
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
]

/** Inverse S-box built by reversing AES_SBOX. */
export const AES_INV_SBOX: number[] = (() => {
  const inv = new Array(256)
  AES_SBOX.forEach((v, i) => {
    inv[v] = i
  })
  return inv
})()

/** Rcon constants used during key expansion (index 1..10 for AES-128). */
export const AES_RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36]

/* ------------------------------------------------------------------ */
/* Hex / byte helpers                                                   */
/* ------------------------------------------------------------------ */

export function hexToBytes(hex: string): number[] {
  const h = hex.trim().toUpperCase()
  const out: number[] = []
  for (let i = 0; i < h.length; i += 2) out.push(parseInt(h.slice(i, i + 2), 16))
  return out
}

export function bytesToHex(bytes: number[]): string {
  return bytes.map((b) => HEX[(b >> 4) & 0xf] + HEX[b & 0xf]).join('')
}

/** Validate a hex string. */
export function validateHex(s: string): { valid: boolean; message?: string } {
  const t = s.trim().toUpperCase()
  if (t.length === 0) return { valid: false, message: 'EMPTY INPUT — provide hexadecimal characters.' }
  if (!/^[0-9A-F]+$/.test(t)) return { valid: false, message: 'INVALID HEX — only 0–9 and A–F are allowed.' }
  if (t.length % 2 !== 0) return { valid: false, message: 'ODD NUMBER OF HEX DIGITS — pairs of characters are required.' }
  return { valid: true }
}

/** Validate a 128-bit (16-byte / 32-hex) input. */
export function validate128Hex(s: string, what: string): { valid: boolean; message?: string } {
  const v = validateHex(s)
  if (!v.valid) return v
  if (hexToBytes(s).length !== 16) {
    return { valid: false, message: `${what} MUST BE EXACTLY 32 HEX CHARACTERS = 128 BITS (16 BYTES).` }
  }
  return { valid: true }
}

/* ------------------------------------------------------------------ */
/* GF(2^8) arithmetic                                                   */
/* ------------------------------------------------------------------ */

/** Multiply two bytes in GF(2^8) with AES modulus x^8+x^4+x^3+x+1. */
export function gfMul(a: number, b: number): number {
  let p = 0
  let aa = a & 0xff
  let bb = b & 0xff
  for (let i = 0; i < 8; i++) {
    if (bb & 1) p ^= aa
    const hi = aa & 0x80
    aa = (aa << 1) & 0xff
    if (hi) aa ^= 0x1b
    bb >>= 1
  }
  return p & 0xff
}

/* ------------------------------------------------------------------ */
/* State helpers (grid index = row*4 + col, filled column-major)        */
/* ------------------------------------------------------------------ */

/** Fill a 4×4 state grid from 16 input bytes (column-major). */
export function inputToState(bytes: number[]): number[] {
  const s = new Array(16).fill(0)
  bytes.forEach((b, i) => {
    const col = (i / 4) | 0
    const row = i % 4
    s[row * 4 + col] = b
  })
  return s
}

/** Read a 4×4 state grid back into 16 output bytes (column-major). */
export function stateToBytes(s: number[]): number[] {
  const out = new Array(16).fill(0)
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) out[c * 4 + r] = s[r * 4 + c]
  return out
}

function subBytes(s: number[]): number[] {
  return s.map((b) => AES_SBOX[b])
}

function invSubBytes(s: number[]): number[] {
  return s.map((b) => AES_INV_SBOX[b])
}

function shiftRows(s: number[]): number[] {
  const out = new Array(16).fill(0)
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) out[r * 4 + c] = s[r * 4 + ((c + r) % 4)]
  return out
}

function invShiftRows(s: number[]): number[] {
  const out = new Array(16).fill(0)
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) out[r * 4 + c] = s[r * 4 + ((c - r + 4) % 4)]
  return out
}

function mixColumns(s: number[]): number[] {
  const out = new Array(16).fill(0)
  for (let c = 0; c < 4; c++) {
    const s0 = s[0 * 4 + c]
    const s1 = s[1 * 4 + c]
    const s2 = s[2 * 4 + c]
    const s3 = s[3 * 4 + c]
    out[0 * 4 + c] = gfMul(2, s0) ^ gfMul(3, s1) ^ s2 ^ s3
    out[1 * 4 + c] = s0 ^ gfMul(2, s1) ^ gfMul(3, s2) ^ s3
    out[2 * 4 + c] = s0 ^ s1 ^ gfMul(2, s2) ^ gfMul(3, s3)
    out[3 * 4 + c] = gfMul(3, s0) ^ s1 ^ s2 ^ gfMul(2, s3)
  }
  return out
}

function invMixColumns(s: number[]): number[] {
  const out = new Array(16).fill(0)
  for (let c = 0; c < 4; c++) {
    const s0 = s[0 * 4 + c]
    const s1 = s[1 * 4 + c]
    const s2 = s[2 * 4 + c]
    const s3 = s[3 * 4 + c]
    out[0 * 4 + c] = gfMul(14, s0) ^ gfMul(11, s1) ^ gfMul(13, s2) ^ gfMul(9, s3)
    out[1 * 4 + c] = gfMul(9, s0) ^ gfMul(14, s1) ^ gfMul(11, s2) ^ gfMul(13, s3)
    out[2 * 4 + c] = gfMul(13, s0) ^ gfMul(9, s1) ^ gfMul(14, s2) ^ gfMul(11, s3)
    out[3 * 4 + c] = gfMul(11, s0) ^ gfMul(13, s1) ^ gfMul(9, s2) ^ gfMul(14, s3)
  }
  return out
}

function addRoundKey(s: number[], rk: number[]): number[] {
  return s.map((b, i) => b ^ rk[i])
}

/* ------------------------------------------------------------------ */
/* Key expansion                                                        */
/* ------------------------------------------------------------------ */

export interface AesKeyRound {
  /** 4-byte word. */
  word: number[]
  /** The 16-byte round key built from words W[4r..4r+3]. */
  roundKey: number[]
}

export interface AesKeyTrace {
  valid: boolean
  keyHex: string
  /** 44 expanded words (each 4 bytes). */
  words: number[][]
  /** 11 round keys, RK0 (input key) … RK10. */
  roundKeys: number[][]
  rcon: number[]
}

function rotWord(w: number[]): number[] {
  return [w[1], w[2], w[3], w[0]]
}

function subWord(w: number[]): number[] {
  return w.map((b) => AES_SBOX[b])
}

/** Expand a 16-byte key into 44 words (AES-128). */
export function aesKeyExpansion(key: number[]): number[][] {
  const w: number[][] = []
  for (let i = 0; i < 4; i++) w.push(key.slice(i * 4, i * 4 + 4))
  for (let i = 4; i < 44; i++) {
    let temp = w[i - 1].slice()
    if (i % 4 === 0) {
      const rot = rotWord(temp)
      const sub = subWord(rot)
      sub[0] ^= AES_RCON[i / 4]
      temp = sub
    }
    w.push(w[i - 4].map((b, j) => b ^ temp[j]))
  }
  return w
}

/** Structured key schedule trace. */
export function aesKeyTrace(keyHex: string): AesKeyTrace {
  const { valid } = validate128Hex(keyHex, 'KEY')
  if (!valid) {
    return { valid: false, keyHex: keyHex.trim().toUpperCase(), words: [], roundKeys: [], rcon: AES_RCON }
  }
  const key = hexToBytes(keyHex)
  const words = aesKeyExpansion(key)
  const roundKeys: number[][] = []
  for (let r = 0; r <= 10; r++) {
    const rk = new Array(16).fill(0)
    for (let c = 0; c < 4; c++) {
      const w = words[r * 4 + c]
      for (let row = 0; row < 4; row++) rk[row * 4 + c] = w[row]
    }
    roundKeys.push(rk)
  }
  return { valid: true, keyHex: keyHex.trim().toUpperCase(), words, roundKeys, rcon: AES_RCON }
}

/* ------------------------------------------------------------------ */
/* Full block trace                                                     */
/* ------------------------------------------------------------------ */

export interface AesRoundTrace {
  n: number
  /** Has MixColumns (rounds 1–9 yes, round 10 no). */
  hasMixColumns: boolean
  /** Input state (after AddRoundKey of previous round / ARK0 for round 1). */
  input: number[]
  subBytes: number[]
  shiftRows: number[]
  mixColumns: number[]
  roundKey: number[]
  output: number[]
}

export interface AesTrace {
  valid: boolean
  blockHex: string
  keyHex: string
  /** Initial state after AddRoundKey with RK0. */
  initialState: number[]
  initialStateAfterArk0: number[]
  rounds: AesRoundTrace[]
  cipherHex: string
}

/** Encrypt/decrypt a 128-bit hex block, returning a full round trace. */
export function aesBlock(blockHex: string, keyHex: string, mode: 'encrypt' | 'decrypt'): AesTrace {
  const invalid: AesTrace = {
    valid: false,
    blockHex,
    keyHex,
    initialState: [],
    initialStateAfterArk0: [],
    rounds: [],
    cipherHex: '',
  }
  const bv = validate128Hex(blockHex, 'PLAINTEXT')
  const kv = validate128Hex(keyHex, 'KEY')
  if (!bv.valid || !kv.valid) return invalid

  const keyTrace = aesKeyTrace(keyHex)
  const state0 = inputToState(hexToBytes(blockHex))
  const rounds: AesRoundTrace[] = []

  if (mode === 'encrypt') {
    let s = addRoundKey(state0, keyTrace.roundKeys[0])
    const initialStateAfterArk0 = s.slice()
    for (let r = 1; r <= 10; r++) {
      const input = s.slice()
      const sb = subBytes(s)
      const sr = shiftRows(sb)
      const mc = r < 10 ? mixColumns(sr) : sr
      s = addRoundKey(mc, keyTrace.roundKeys[r])
      rounds.push({
        n: r,
        hasMixColumns: r < 10,
        input,
        subBytes: sb,
        shiftRows: sr,
        mixColumns: mc,
        roundKey: keyTrace.roundKeys[r].slice(),
        output: s.slice(),
      })
    }
    return {
      valid: true,
      blockHex: blockHex.trim().toUpperCase(),
      keyHex: keyHex.trim().toUpperCase(),
      initialState: state0,
      initialStateAfterArk0,
      rounds,
      cipherHex: bytesToHex(stateToBytes(s)),
    }
  }

  // Decryption: inverse of encryption. Each forward round is SB,SR,MC,ARK
  // (round 10: SB,SR,ARK), so each inverse step is ARK,MC⁻¹,SR⁻¹,SB⁻¹,
  // applied round 10 → 1, then undo the initial ARK0.
  let s = state0
  for (let r = 10; r >= 1; r--) {
    const input = s.slice()
    const ark = addRoundKey(s, keyTrace.roundKeys[r])
    const mc = r < 10 ? invMixColumns(ark) : ark
    const sr = invShiftRows(mc)
    const sb = invSubBytes(sr)
    s = sb
    rounds.push({
      n: r,
      hasMixColumns: r < 10,
      input,
      subBytes: sb,
      shiftRows: sr,
      mixColumns: mc,
      roundKey: keyTrace.roundKeys[r].slice(),
      output: s.slice(),
    })
  }
  s = addRoundKey(s, keyTrace.roundKeys[0])

  return {
    valid: true,
    blockHex: blockHex.trim().toUpperCase(),
    keyHex: keyHex.trim().toUpperCase(),
    initialState: state0,
    initialStateAfterArk0: [],
    rounds,
    cipherHex: bytesToHex(stateToBytes(s)),
  }
}

/* ------------------------------------------------------------------ */
/* High-level API                                                       */
/* ------------------------------------------------------------------ */

/** Encrypt a 128-bit hex block with a 128-bit hex key. */
export function aesEncryptBlock(blockHex: string, keyHex: string): string {
  return aesBlock(blockHex, keyHex, 'encrypt').cipherHex
}

/** Decrypt a 128-bit hex block with a 128-bit hex key. */
export function aesDecryptBlock(blockHex: string, keyHex: string): string {
  return aesBlock(blockHex, keyHex, 'decrypt').cipherHex
}

/** Convert up to 16 ASCII chars to a 128-bit hex block. */
export function textToHex(text: string): string {
  let out = ''
  for (const ch of text.slice(0, 16)) out += ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')
  return out.padEnd(32, '00')
}

/** Convert a 128-bit hex block back to ASCII (best effort). */
export function hexToText(hex: string): string {
  return hexToBytes(hex)
    .map((b) => String.fromCharCode(b))
    .join('')
}

/**
 * Official FIPS-197 AES-128 test vector.
 *   plaintext  00112233445566778899AABBCCDDEEFF
 *   key        000102030405060708090A0B0C0D0E0F
 *   ciphertext 69C4E0D86A7B0430D8CDB78070B4C55A
 */
export const AES_TEST_VECTOR = {
  plain: '00112233445566778899AABBCCDDEEFF',
  key: '000102030405060708090A0B0C0D0E0F',
  expected: '69C4E0D86A7B0430D8CDB78070B4C55A',
}
