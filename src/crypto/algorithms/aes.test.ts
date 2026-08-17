import { describe, it, expect } from 'vitest'
import {
  AES_SBOX,
  AES_INV_SBOX,
  AES_RCON,
  gfMul,
  hexToBytes,
  bytesToHex,
  validate128Hex,
  inputToState,
  stateToBytes,
  aesKeyExpansion,
  aesKeyTrace,
  aesBlock,
  aesEncryptBlock,
  aesDecryptBlock,
  textToHex,
  hexToText,
  AES_TEST_VECTOR,
} from './aes'

describe('AES hex helpers', () => {
  it('hexToBytes / bytesToHex round-trip', () => {
    expect(bytesToHex(hexToBytes('00112233AAFF'))).toBe('00112233AAFF')
  })
  it('validate128Hex rejects wrong lengths and bad chars', () => {
    expect(validate128Hex('00', 'X').valid).toBe(false)
    expect(validate128Hex('ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ', 'X').valid).toBe(false)
    expect(validate128Hex('00112233445566778899AABBCCDDEEFF', 'X').valid).toBe(true)
  })
})

describe('AES GF(2^8)', () => {
  it('gfMul matches known AES results', () => {
    // {57} * {13} = {FE} from FIPS-197 worked example
    expect(gfMul(0x57, 0x13)).toBe(0xfe)
    expect(gfMul(2, 0xd4)).toBe(0xb3)
    expect(gfMul(3, 0xbf)).toBe(0xda)
  })
})

describe('AES S-box', () => {
  it('S-box maps the FIPS-197 example bytes', () => {
    // Input 53 → ED ; 01 → 7C ; 67 → 85
    expect(AES_SBOX[0x53]).toBe(0xed)
    expect(AES_SBOX[0x01]).toBe(0x7c)
    expect(AES_SBOX[0x67]).toBe(0x85)
    expect(AES_SBOX[0x00]).toBe(0x63)
  })
  it('inverse S-box inverts the S-box', () => {
    for (let i = 0; i < 256; i++) expect(AES_INV_SBOX[AES_SBOX[i]]).toBe(i)
  })
})

describe('AES state layout (column-major)', () => {
  it('inputToState fills column-major and stateToBytes reads it back', () => {
    const bytes = hexToBytes('00112233445566778899AABBCCDDEEFF')
    const s = inputToState(bytes)
    // Column 0 top→bottom = 00 44 88 CC
    expect(s[0]).toBe(0x00)
    expect(s[1]).toBe(0x44)
    expect(s[2]).toBe(0x88)
    expect(s[3]).toBe(0xcc)
    // Row 0 = 00 11 22 33
    expect(s[0]).toBe(0x00)
    expect(s[4]).toBe(0x11)
    expect(s[8]).toBe(0x22)
    expect(s[12]).toBe(0x33)
    expect(bytesToHex(stateToBytes(s))).toBe('00112233445566778899AABBCCDDEEFF')
  })
})

describe('AES key expansion', () => {
  it('expands a 16-byte key into 44 words', () => {
    const w = aesKeyExpansion(hexToBytes('000102030405060708090A0B0C0D0E0F'))
    expect(w.length).toBe(44)
    // First word = key bytes 0..3
    expect(bytesToHex(w[0])).toBe('00010203')
    // W[4] = RotWord(SubWord(W[3])) ^ Rcon[1] ^ W[0]  (FIPS-197 Fig.12)
    expect(bytesToHex(w[4])).toBe('D6AA74FD')
    // W[43] (last word of RK10) from FIPS-197
    expect(bytesToHex(w[43])).toBe('4D2B30C5')
  })
  it('aesKeyTrace builds 11 round keys', () => {
    const t = aesKeyTrace('000102030405060708090A0B0C0D0E0F')
    expect(t.valid).toBe(true)
    expect(t.roundKeys.length).toBe(11)
    // round keys are stored in 4×4 grid layout; read back column-major
    expect(bytesToHex(stateToBytes(t.roundKeys[0]))).toBe('000102030405060708090A0B0C0D0E0F')
    // RK1 from FIPS-197: D6AA74FD D2AF72FA DAA678F1 D6AB76FE
    expect(bytesToHex(stateToBytes(t.roundKeys[1]))).toBe('D6AA74FDD2AF72FADAA678F1D6AB76FE')
    // RK10 (final) from FIPS-197 main example (Fig.12): 13111D7F E3944A17 F307A78B 4D2B30C5
    expect(bytesToHex(stateToBytes(t.roundKeys[10]))).toBe('13111D7FE3944A17F307A78B4D2B30C5')
  })
  it('Rcon array matches AES-128 constants', () => {
    expect(AES_RCON.slice(1)).toEqual([0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36])
  })
})

describe('AES FIPS-197 official test vector', () => {
  it('encrypts the known vector to the known ciphertext', () => {
    const out = aesEncryptBlock(AES_TEST_VECTOR.plain, AES_TEST_VECTOR.key)
    expect(out).toBe(AES_TEST_VECTOR.expected)
  })
  it('full trace ends at the expected ciphertext', () => {
    const t = aesBlock(AES_TEST_VECTOR.plain, AES_TEST_VECTOR.key, 'encrypt')
    expect(t.valid).toBe(true)
    expect(t.rounds.length).toBe(10)
    expect(t.cipherHex).toBe(AES_TEST_VECTOR.expected)
  })
  it('round 10 does NOT apply MixColumns', () => {
    const t = aesBlock(AES_TEST_VECTOR.plain, AES_TEST_VECTOR.key, 'encrypt')
    expect(t.rounds[9].hasMixColumns).toBe(false)
    // round 10 mixColumns equals shiftRows (no transformation applied)
    expect(t.rounds[9].mixColumns).toEqual(t.rounds[9].shiftRows)
    for (let i = 0; i < 9; i++) expect(t.rounds[i].hasMixColumns).toBe(true)
  })
  it('round 10 output matches FIPS-197 final state', () => {
    const t = aesBlock(AES_TEST_VECTOR.plain, AES_TEST_VECTOR.key, 'encrypt')
    // FIPS-197 Fig.6 round 10 (before final read-out) state:
    // 69C4E0D8 6A7B0430 D8CDB780 70B4C55A
    const expected = '69C4E0D86A7B0430D8CDB78070B4C55A'
    expect(bytesToHex(stateToBytes(t.rounds[9].output))).toBe(expected)
  })
})

describe('AES decryption', () => {
  it('decrypts the ciphertext back to the plaintext', () => {
    const out = aesDecryptBlock(AES_TEST_VECTOR.expected, AES_TEST_VECTOR.key)
    expect(out).toBe(AES_TEST_VECTOR.plain)
  })
  it('round-trips through encrypt then decrypt', () => {
    const plain = 'C0FFEEC0FFEEC0FFC0FFEEC0FFEEC0FF'
    const key = '2B7E151628AED2A6ABF7158809CF4F3C'
    const c = aesEncryptBlock(plain, key)
    expect(c).not.toBe(plain)
    expect(aesDecryptBlock(c, key)).toBe(plain)
  })
  it('decryption uses reversed round-key order', () => {
    const e = aesBlock(AES_TEST_VECTOR.plain, AES_TEST_VECTOR.key, 'encrypt')
    const d = aesBlock(AES_TEST_VECTOR.expected, AES_TEST_VECTOR.key, 'decrypt')
    expect(d.rounds[0].n).toBe(10)
    expect(e.rounds[0].n).toBe(1)
    expect(d.rounds[9].n).toBe(1)
  })
})

describe('AES text helpers', () => {
  it('textToHex pads to 32 hex chars', () => {
    expect(textToHex('HELLO')).toBe('48454C4C4F0000000000000000000000')
  })
  it('hexToText converts back', () => {
    expect(hexToText('48454C4C4F000000000000000000000000').slice(0, 5)).toBe('HELLO')
  })
})
