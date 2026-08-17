import { describe, expect, it } from 'vitest'
import {
  generateOtpKey,
  otpDataLength,
  otpEncrypt,
  otpDecrypt,
  getOtpSteps,
  otpReuseLeak,
  xorStr,
  normalizeOtpKey,
  toBinary,
} from './otp'

describe('OTP — key generation', () => {
  it('generates a key of the requested length over A–Z', () => {
    const k = generateOtpKey(12)
    expect(k).toHaveLength(12)
    expect(/^[A-Z]+$/.test(k)).toBe(true)
  })
  it('measures the data length (alphabetic chars only)', () => {
    expect(otpDataLength('HELLO JESSE')).toBe(10)
    expect(otpDataLength('Attack! 123')).toBe(6)
  })
})

describe('OTP — encryption', () => {
  it('encrypts with a known same-length key', () => {
    expect(otpEncrypt('HELLO', 'KMXOK')).toBe('RQIZY')
  })
  it('preserves spaces and case', () => {
    expect(otpEncrypt('Hi there', 'ABCDEFGH')).toBe('Hj vkiwk')
  })
  it('normalises the key to uppercase letters', () => {
    expect(normalizeOtpKey('a b c')).toBe('ABC')
  })
})

describe('OTP — decryption', () => {
  it('round-trips', () => {
    const k = generateOtpKey(otpDataLength('meet me at midnight'))
    const ct = otpEncrypt('meet me at midnight', k)
    expect(otpDecrypt(ct, k)).toBe('meet me at midnight')
  })
  it('decrypts the known example back', () => {
    expect(otpDecrypt('RQIZY', 'KMXOK')).toBe('HELLO')
  })
})

describe('OTP — steps', () => {
  it('exposes per-letter arithmetic', () => {
    const s = getOtpSteps('H', 'K')[0]
    expect(s.plain).toBe('H')
    expect(s.key).toBe('K')
    expect(s.pVal).toBe(7)
    expect(s.kVal).toBe(10)
    expect(s.cipherVal).toBe(17)
    expect(s.cipher).toBe('R')
  })
})

describe('OTP — key-reuse demo', () => {
  it('shows C1⊕C2 equals P1⊕P2 when the key is reused', () => {
    const m1 = 'ATTACK'
    const m2 = 'DEFEND'
    const key = 'TIGERX'
    expect(otpReuseLeak(m1, m2, key)).toBe(xorStr(m1, m2))
  })
  it('exposes binary strings', () => {
    const b = toBinary('A')
    expect(b).toEqual(['01000001'])
  })
})
