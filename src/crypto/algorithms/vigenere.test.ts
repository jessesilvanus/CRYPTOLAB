import { describe, expect, it } from 'vitest'
import {
  vigenereEncrypt,
  vigenereDecrypt,
  alignKey,
  getVigenereSteps,
  normalizeVigKey,
} from './vigenere'

describe('Vigenère — encryption', () => {
  it('encrypts ATTACK with KEY to a known result', () => {
    expect(vigenereEncrypt('ATTACK', 'KEY')).toBe('KXRKGI')
  })
  it('repeats the keyword cyclically', () => {
    // CRYPTO with KEY (KEYKEY)
    expect(vigenereEncrypt('CRYPTO', 'KEY')).toBe('MVWZXM')
  })
  it('preserves case', () => {
    expect(vigenereEncrypt('Attack', 'Key')).toBe('Kxrkgi')
  })
  it('preserves spaces and punctuation, key not consumed by them', () => {
    expect(vigenereEncrypt('attack at dawn', 'LEMON')).toBe('lxfopv ef rnhr')
  })
  it('returns text unchanged for an empty key', () => {
    expect(vigenereEncrypt('HELLO', '')).toBe('HELLO')
  })
})

describe('Vigenère — decryption', () => {
  it('decrypts KXRKGI back to ATTACK', () => {
    expect(vigenereDecrypt('KXRKGI', 'KEY')).toBe('ATTACK')
  })
  it('round-trips', () => {
    expect(vigenereDecrypt(vigenereEncrypt('meetmeaftertheparty', 'BREAD'), 'BREAD')).toBe(
      'meetmeaftertheparty',
    )
  })
})

describe('Vigenère — alignment + steps', () => {
  it('aligns the key under each plaintext letter', () => {
    expect(alignKey('HELLO', 'KEY')).toEqual(['K', 'E', 'Y', 'K', 'E'])
  })
  it('aligns only over alphabetic characters', () => {
    expect(alignKey('H E', 'KEY')).toEqual(['K', '', 'E'])
  })
  it('exposes the exact arithmetic for a letter', () => {
    const s = getVigenereSteps('H', 'KEY')[0]
    expect(s.plain).toBe('H')
    expect(s.key).toBe('K')
    expect(s.pVal).toBe(7)
    expect(s.kVal).toBe(10)
    expect(s.cipherVal).toBe(17)
    expect(s.cipher).toBe('R')
  })
  it('normalises the key to uppercase letters only', () => {
    expect(normalizeVigKey('Ke y!1')).toBe('KEY')
  })
})
