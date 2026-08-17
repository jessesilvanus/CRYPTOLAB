import { describe, it, expect } from 'vitest'
import {
  caesarEncrypt,
  caesarDecrypt,
  normalizeShift,
  isAlphabetic,
  getCaesarSteps,
  caesarCipher,
} from './caesar'

describe('caesarEncrypt', () => {
  it('encrypts HELLO with shift 3 to KHOOR', () => {
    expect(caesarEncrypt('HELLO', 3)).toBe('KHOOR')
  })

  it('encrypts XYZ with shift 3 to ABC (wraps around)', () => {
    expect(caesarEncrypt('XYZ', 3)).toBe('ABC')
  })

  it('returns the original for shift 0', () => {
    expect(caesarEncrypt('HELLO', 0)).toBe('HELLO')
  })

  it('shift 1: HELLO -> IFMMP', () => {
    expect(caesarEncrypt('HELLO', 1)).toBe('IFMMP')
  })

  it('shift 25: HELLO -> GDKKN', () => {
    expect(caesarEncrypt('HELLO', 25)).toBe('GDKKN')
  })

  it('Z + 1 wraps to A', () => {
    expect(caesarEncrypt('Z', 1)).toBe('A')
  })

  it('z + 1 wraps to a (case preserved)', () => {
    expect(caesarEncrypt('z', 1)).toBe('a')
  })

  it('preserves letter case', () => {
    expect(caesarEncrypt('Hello Jesse', 3)).toBe('Khoor Mhvvh')
  })

  it('preserves spaces and punctuation', () => {
    expect(caesarEncrypt('HELLO WORLD!', 3)).toBe('KHOOR ZRUOG!')
  })

  it('leaves non-alphabetic characters untouched', () => {
    expect(caesarEncrypt('Hello, Jesse! 2026', 3)).toBe('Khoor, Mhvvh! 2026')
  })

  it('handles the empty string', () => {
    expect(caesarEncrypt('', 3)).toBe('')
  })

  it('handles strings containing only punctuation', () => {
    expect(caesarEncrypt('!? 123 .', 3)).toBe('!? 123 .')
  })

  it('normalizes large shifts (29 -> 3)', () => {
    expect(caesarEncrypt('HELLO', 29)).toBe('KHOOR')
  })

  it('normalizes negative shifts (-23 -> 3)', () => {
    expect(caesarEncrypt('HELLO', -23)).toBe('KHOOR')
  })
})

describe('caesarDecrypt', () => {
  it('decrypts KHOOR with shift 3 to HELLO', () => {
    expect(caesarDecrypt('KHOOR', 3)).toBe('HELLO')
  })

  it('round-trips: decrypt(encrypt(x)) === x', () => {
    const samples = ['HELLO JESSE', 'Zebra, zany! 123', 'A', 'zzz', 'Python3!']
    for (const s of samples) {
      for (const k of [0, 1, 3, 25]) {
        expect(caesarDecrypt(caesarEncrypt(s, k), k)).toBe(s)
      }
    }
  })

  it('decrypts ABC with shift 3 to XYZ', () => {
    expect(caesarDecrypt('ABC', 3)).toBe('XYZ')
  })

  it('shift 0 decrypts to the same string', () => {
    expect(caesarDecrypt('HELLO', 0)).toBe('HELLO')
  })
})

describe('normalizeShift', () => {
  it('keeps 0..25 unchanged', () => {
    for (let i = 0; i < 26; i++) expect(normalizeShift(i)).toBe(i)
  })

  it('wraps negative values into 0..25', () => {
    expect(normalizeShift(-1)).toBe(25)
    expect(normalizeShift(-3)).toBe(23)
    expect(normalizeShift(-26)).toBe(0)
    expect(normalizeShift(-29)).toBe(23)
  })

  it('wraps large values into 0..25', () => {
    expect(normalizeShift(26)).toBe(0)
    expect(normalizeShift(29)).toBe(3)
    expect(normalizeShift(52)).toBe(0)
  })
})

describe('isAlphabetic', () => {
  it('recognizes upper and lower case', () => {
    expect(isAlphabetic('A')).toBe(true)
    expect(isAlphabetic('z')).toBe(true)
  })

  it('rejects non-letters', () => {
    expect(isAlphabetic(' ')).toBe(false)
    expect(isAlphabetic('!')).toBe(false)
    expect(isAlphabetic('1')).toBe(false)
  })
})

describe('getCaesarSteps', () => {
  it('produces a transformed step for a letter', () => {
    const steps = getCaesarSteps('H', 3, 'encrypt')
    expect(steps[0]).toMatchObject({
      originalCharacter: 'H',
      originalValue: 7,
      shift: 3,
      calculation: '(7 + 3) mod 26',
      resultValue: 10,
      resultCharacter: 'K',
      status: 'transformed',
    })
  })

  it('marks non-alphabetic characters as skipped', () => {
    const steps = getCaesarSteps('A B', 3)
    expect(steps).toHaveLength(3)
    expect(steps[1].status).toBe('skipped')
    expect(steps[1].resultCharacter).toBe(' ')
  })

  it('exposes the mathematics chain', () => {
    const steps = getCaesarSteps('H', 3)
    expect(steps[0].mathematics).toEqual([
      'H = 7',
      '7 + 3 = 10',
      '10 mod 26 = 10',
      '10 = K',
    ])
  })

  it('computes decryption steps with the reverse formula', () => {
    const steps = getCaesarSteps('K', 3, 'decrypt')
    expect(steps[0]).toMatchObject({
      originalValue: 10,
      calculation: '(10 - 3) mod 26',
      resultValue: 7,
      resultCharacter: 'H',
    })
  })
})

describe('caesarCipher algorithm object', () => {
  it('implements the common interface', () => {
    expect(caesarCipher.keyType).toBe('shift')
    expect(caesarCipher.meta.id).toBe('caesar')
    expect(caesarCipher.encrypt('HELLO', 3)).toBe('KHOOR')
    expect(caesarCipher.decrypt('KHOOR', 3)).toBe('HELLO')
  })

  it('returns a rotated alphabet visualization', () => {
    const viz = caesarCipher.getVisualizationData(3)
    expect(viz.alphabet[0]).toBe('A')
    expect(viz.cipherAlphabet[0]).toBe('D')
    expect(viz.cipherAlphabet[3]).toBe('G')
    expect(viz.cipherAlphabet[25]).toBe('C')
  })
})
