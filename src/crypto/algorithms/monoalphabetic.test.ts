import { describe, it, expect } from 'vitest'
import {
  monoEncrypt,
  monoDecrypt,
  validateMonoKey,
  generateMonoKey,
  getMonoSteps,
  MONO_ALPHABET,
  monoalphabeticCipher,
} from './monoalphabetic'

const QWERTY = 'QWERTYUIOPASDFGHJKLZXCVBNM'

describe('monoEncrypt — QWERTY mapping', () => {
  it('Test 1: HELLO -> ITSSG', () => {
    expect(monoEncrypt('HELLO', QWERTY)).toBe('ITSSG')
  })

  it('maps each letter to its substitution (A->Q, H->I, O->G)', () => {
    expect(monoEncrypt('A', QWERTY)).toBe('Q')
    expect(monoEncrypt('H', QWERTY)).toBe('I')
    expect(monoEncrypt('O', QWERTY)).toBe('G')
  })

  it('Test 3: preserves case, spaces, punctuation and numbers', () => {
    // H->I e->t l->s l->s o->g · J->P e->t s->l s->l e->t
    expect(monoEncrypt('Hello, Jesse! 123', QWERTY)).toBe('Itssg, Ptllt! 123')
  })

  it('Test 2: HELLO JESSE encrypts correctly', () => {
    // H->I E->T L->S L->S O->G · J->P E->T S->L S->L E->T
    expect(monoEncrypt('HELLO JESSE', QWERTY)).toBe('ITSSG PTLLT')
  })

  it('identity key leaves the plaintext unchanged (Test 7)', () => {
    expect(monoEncrypt('HELLO WORLD', MONO_ALPHABET)).toBe('HELLO WORLD')
  })
})

describe('monoDecrypt', () => {
  it('Test 8: round-trips exactly', () => {
    const samples = ['HELLO JESSE', 'Hello, Jesse! 123', 'Zebra AND lion', 'AAAA', 'x']
    for (const s of samples) {
      expect(monoDecrypt(monoEncrypt(s, QWERTY), QWERTY)).toBe(s)
    }
  })

  it('reverse mapping: Q -> A (inverse of A -> Q)', () => {
    expect(monoDecrypt('Q', QWERTY)).toBe('A')
    expect(monoDecrypt('ITSSG', QWERTY)).toBe('HELLO')
  })
})

describe('validateMonoKey', () => {
  it('accepts a valid 26-letter key', () => {
    expect(validateMonoKey(QWERTY).valid).toBe(true)
    expect(validateMonoKey(MONO_ALPHABET).valid).toBe(true)
  })

  it('accepts lowercase keys (case-insensitive)', () => {
    expect(validateMonoKey('qwertyuiopasdfghjklzxcvbnm').valid).toBe(true)
  })

  it('Test 5: rejects a short key', () => {
    const r = validateMonoKey('QWERTY')
    expect(r.valid).toBe(false)
    expect(r.message).toMatch(/26/)
  })

  it('Test 4: rejects duplicates', () => {
    const r = validateMonoKey('AABBCCDDEEFFGGHHIIJJKKLLMM')
    expect(r.valid).toBe(false)
    expect(r.message).toMatch(/DUPLICATE/)
  })

  it('rejects invalid characters', () => {
    const r = validateMonoKey('ABCDEFGHIJKLMNOPQRSTUVWXY1')
    expect(r.valid).toBe(false)
    expect(r.message).toMatch(/INVALID CHARACTER/)
  })
})

describe('generateMonoKey', () => {
  it('Test 6: produces exactly 26 unique letters, all A-Z present', () => {
    for (let i = 0; i < 20; i++) {
      const key = generateMonoKey()
      expect(key).toHaveLength(26)
      expect(new Set(key.split('')).size).toBe(26)
      expect(key.split('').sort().join('')).toBe(MONO_ALPHABET)
      expect(validateMonoKey(key).valid).toBe(true)
    }
  })
})

describe('getMonoSteps', () => {
  it('produces a substitution step for a letter', () => {
    const steps = getMonoSteps('H', QWERTY, 'encrypt')
    expect(steps[0]).toMatchObject({
      originalCharacter: 'H',
      originalValue: 7,
      calculation: 'H → I',
      resultValue: 8,
      resultCharacter: 'I',
      status: 'transformed',
    })
    expect(steps[0].mathematics).toEqual(['P = H', 'Key[H] = I', 'C = I'])
    expect(steps[0].note).toMatch(/same substitution rule/)
  })

  it('marks non-alphabetic characters as skipped', () => {
    const steps = getMonoSteps('A!B', QWERTY)
    expect(steps[1].status).toBe('skipped')
    expect(steps[1].resultCharacter).toBe('!')
  })
})

describe('monoalphabeticCipher algorithm object', () => {
  it('implements the common interface with a string key', () => {
    expect(monoalphabeticCipher.keyType).toBe('string')
    expect(monoalphabeticCipher.meta.status).toBe('ACTIVE')
    expect(monoalphabeticCipher.encrypt('HELLO', QWERTY)).toBe('ITSSG')
    expect(monoalphabeticCipher.decrypt('ITSSG', QWERTY)).toBe('HELLO')
  })

  it('returns a permuted alphabet visualization', () => {
    const viz = monoalphabeticCipher.getVisualizationData(QWERTY)
    expect(viz.alphabet.join('')).toBe(MONO_ALPHABET)
    expect(viz.cipherAlphabet.join('')).toBe(QWERTY)
  })
})
