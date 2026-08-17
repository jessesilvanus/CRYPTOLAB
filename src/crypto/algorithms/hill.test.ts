import { describe, expect, it } from 'vitest'
import {
  validateHillKey,
  encryptBlock,
  hillEncrypt,
  hillDecrypt,
  getHillSteps,
  mod,
  gcd,
  modInverse,
  generateHillKey,
} from './hill'

const K: [[number, number], [number, number]] = [
  [9, 4],
  [5, 7],
]

describe('Hill — modular arithmetic helpers', () => {
  it('mod wraps negatives', () => {
    expect(mod(-2, 26)).toBe(24)
  })
  it('gcd', () => {
    expect(gcd(17, 26)).toBe(1)
    expect(gcd(24, 26)).toBe(2)
  })
  it('modular inverse', () => {
    expect(modInverse(17, 26)).toBe(23)
    expect(modInverse(2, 26)).toBe(0)
  })
})

describe('Hill — key validation', () => {
  it('accepts an invertible matrix and reports det/inverse', () => {
    const v = validateHillKey('9 4 5 7')
    expect(v.valid).toBe(true)
    expect(v.det).toBe(17)
    expect(v.invDet).toBe(23)
    expect(v.gcdVal).toBe(1)
  })
  it('rejects a matrix with gcd(det,26)≠1', () => {
    const v = validateHillKey('2 4 1 3')
    expect(v.valid).toBe(false)
    expect(v.message).toContain('NOT INVERTIBLE')
  })
  it('rejects non-numeric input', () => {
    expect(validateHillKey('a b c d').valid).toBe(false)
  })
  it('rejects wrong count of numbers', () => {
    expect(validateHillKey('1 2 3').valid).toBe(false)
  })
  it('generates a valid invertible matrix', () => {
    for (let i = 0; i < 40; i++) {
      const k = generateHillKey()
      expect(validateHillKey(k).valid).toBe(true)
    }
  })
})

describe('Hill — encryption', () => {
  it('encrypts a single block', () => {
    expect(encryptBlock(K, [7, 8])).toEqual([17, 13]) // H I → R N
  })
  it('encrypts HILL to RNNC with key [[9,4],[5,7]]', () => {
    expect(hillEncrypt('HILL', '9 4 5 7')).toBe('RNNC')
  })
  it('pads an odd-length message with X', () => {
    expect(hillEncrypt('HEY', '9 4 5 7')).toBe('BLWV')
  })
})

describe('Hill — decryption', () => {
  it('decrypts RNNC back to HILL', () => {
    expect(hillDecrypt('RNNC', '9 4 5 7')).toBe('HILL')
  })
  it('round-trips', () => {
    const ct = hillEncrypt('attackatdawn', '3 3 2 5')
    expect(hillDecrypt(ct, '3 3 2 5')).toBe('ATTACKATDAWN')
  })
  it('refuses to decrypt with a non-invertible key', () => {
    expect(hillDecrypt('RNNC', '2 4 1 3')).toBe('')
  })
})

describe('Hill — steps', () => {
  it('exposes per-block raw arithmetic', () => {
    const steps = getHillSteps('HI', '9 4 5 7')
    expect(steps).toHaveLength(1)
    expect(steps[0].block).toEqual(['H', 'I'])
    expect(steps[0].values).toEqual([7, 8])
    expect(steps[0].products).toEqual([95, 91])
    expect(steps[0].cipher).toEqual([17, 13])
    expect(steps[0].outChars).toEqual(['R', 'N'])
  })
})
