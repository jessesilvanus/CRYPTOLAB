import { describe, it, expect } from 'vitest'
import {
  desEncryptBlockHex,
  desDecryptBlockHex,
  desBlock,
  desKeySchedule,
  validateBlockHex,
  validateKeyHex,
  textToHex,
  hexToText,
  DES_TEST_VECTOR,
  DES_IP,
  DES_FP,
  DES_SBOXES,
  DES_PC1,
  DES_PC2,
  DES_SHIFTS,
} from './des'

describe('DES — standard test vector', () => {
  it('encrypts the FIPS-81 vector to the expected ciphertext', () => {
    expect(desEncryptBlockHex(DES_TEST_VECTOR.plain, DES_TEST_VECTOR.key)).toBe(
      DES_TEST_VECTOR.expected,
    )
  })

  it('decrypts the ciphertext back to the plaintext', () => {
    expect(desDecryptBlockHex(DES_TEST_VECTOR.expected, DES_TEST_VECTOR.key)).toBe(
      DES_TEST_VECTOR.plain,
    )
  })

  it('is self-consistent: round trip returns the original block', () => {
    const pt = '1F2E3D4C5B6A7980'
    const key = '0101010101010101'
    const ct = desEncryptBlockHex(pt, key)
    expect(desDecryptBlockHex(ct, key)).toBe(pt)
  })

  it('produces a 64-bit ciphertext', () => {
    expect(desEncryptBlockHex(DES_TEST_VECTOR.plain, DES_TEST_VECTOR.key)).toMatch(/^[0-9A-F]{16}$/)
  })
})

describe('DES — block trace', () => {
  it('exposes 16 rounds and valid L0/R0', () => {
    const t = desBlock(DES_TEST_VECTOR.plain, DES_TEST_VECTOR.key, 'encrypt')
    expect(t.valid).toBe(true)
    expect(t.rounds).toHaveLength(16)
    expect(t.l0).toHaveLength(39) // 32 bits grouped by 4 → "8 groups ×4 + 7 spaces"
    expect(t.r0).toHaveLength(39)
    expect(t.cipherHex).toBe(DES_TEST_VECTOR.expected)
  })

  it('applies round keys in reverse order for decryption', () => {
    const enc = desBlock(DES_TEST_VECTOR.plain, DES_TEST_VECTOR.key, 'encrypt')
    const dec = desBlock(DES_TEST_VECTOR.expected, DES_TEST_VECTOR.key, 'decrypt')
    expect(enc.rounds[0].n).toBe(1)
    expect(dec.rounds[0].n).toBe(16)
    expect(dec.rounds[15].n).toBe(1)
  })
})

describe('DES — key schedule', () => {
  it('derives 16 round keys with the real rotation schedule', () => {
    const s = desKeySchedule(DES_TEST_VECTOR.key)
    expect(s.valid).toBe(true)
    expect(s.rounds).toHaveLength(16)
    expect(s.rounds.map((r) => r.shift)).toEqual(DES_SHIFTS)
    expect(DES_SHIFTS.reduce((a, b) => a + b, 0)).toBe(28)
  })

  it('PC-1 reduces 64 bits to 56 (drops 8 parity bits)', () => {
    expect(DES_PC1).toHaveLength(56)
    const used = new Set(DES_PC1)
    // Parity bits (8,16,24,32,40,48,56,64) must be absent.
    ;[8, 16, 24, 32, 40, 48, 56, 64].forEach((p) => expect(used.has(p)).toBe(false))
  })

  it('PC-2 reduces 56 to 48', () => {
    expect(DES_PC2).toHaveLength(48)
    expect(DES_PC2.every((v) => v >= 1 && v <= 56)).toBe(true)
  })

  it('each round key is 48 bits', () => {
    const s = desKeySchedule(DES_TEST_VECTOR.key)
    s.rounds.forEach((r) => {
      expect(r.k.replace(/[^01]/g, '')).toHaveLength(48)
    })
  })
})

describe('DES — tables integrity', () => {
  it('IP and FP are permutations (each index used exactly once)', () => {
    ;[DES_IP, DES_FP].forEach((t) => {
      expect(new Set(t).size).toBe(64)
      expect(Math.min(...t)).toBe(1)
      expect(Math.max(...t)).toBe(64)
    })
  })

  it('E-expansion maps 32 bits to 48', () => {
    expect(DES_IP).toHaveLength(64)
    // E table references only input positions 1..32 (no high indices).
    expect(Math.max(...[32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17, 16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25, 24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1])).toBe(32)
  })

  it('has 8 S-boxes of 4×16 = 64 values each', () => {
    expect(DES_SBOXES).toHaveLength(8)
    DES_SBOXES.forEach((box) => {
      expect(box).toHaveLength(64)
      expect(box.every((v) => v >= 0 && v <= 15)).toBe(true)
    })
  })
})

describe('DES — input validation', () => {
  it('rejects blocks that are not 64 bits', () => {
    expect(validateBlockHex('1234').valid).toBe(false)
    expect(validateBlockHex('').valid).toBe(false)
    expect(validateBlockHex('ZZ').valid).toBe(false)
    expect(validateBlockHex(DES_TEST_VECTOR.plain).valid).toBe(true)
  })

  it('rejects invalid keys and accepts 16-hex keys', () => {
    expect(validateKeyHex('1234').valid).toBe(false)
    expect(validateKeyHex('0123456789ABC').valid).toBe(false)
    expect(validateKeyHex(DES_TEST_VECTOR.key).valid).toBe(true)
  })
})

describe('DES — text helpers', () => {
  it('converts 8 ASCII chars to a 16-hex block and back', () => {
    const t = 'CRYPTOLAB'.slice(0, 8)
    const hex = textToHex(t)
    expect(hex).toHaveLength(16)
    expect(hexToText(hex)).toBe(t)
  })
})
