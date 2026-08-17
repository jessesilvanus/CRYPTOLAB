import { describe, expect, it } from 'vitest'
import {
  buildPlayfairMatrix,
  prepareDigraphs,
  ruleFor,
  encryptDigraph,
  playfairEncrypt,
  playfairDecrypt,
  getPlayfairSteps,
} from './playfair'

const KEY_MATRIX = buildPlayfairMatrix('KEY')
const MONARCHY_MATRIX = buildPlayfairMatrix('MONARCHY')

describe('Playfair — key matrix', () => {
  it('builds the 5×5 square from a keyword', () => {
    expect(MONARCHY_MATRIX[0]).toEqual(['M', 'O', 'N', 'A', 'R'])
    expect(MONARCHY_MATRIX.flat()).toHaveLength(25)
  })
  it('keyword letters fill first, then the rest of the alphabet', () => {
    expect(KEY_MATRIX[0]).toEqual(['K', 'E', 'Y', 'A', 'B'])
    expect(KEY_MATRIX[1]).toEqual(['C', 'D', 'F', 'G', 'H'])
  })
  it('drops duplicate keyword letters and excludes J', () => {
    const m = buildPlayfairMatrix('GOOGLE')
    expect(m.flat().indexOf('G')).toBe(0)
    expect(m.flat().join('')).not.toContain('J')
    expect(new Set(m.flat()).size).toBe(25)
  })
})

describe('Playfair — digraph preparation', () => {
  it('splits plaintext into digraphs', () => {
    expect(prepareDigraphs('HELLO')).toEqual(['HE', 'LX', 'LO'])
  })
  it('splits double letters with X', () => {
    // B A L L O O N → BA | LL→LX | L O | O N
    expect(prepareDigraphs('balloon')).toEqual(['BA', 'LX', 'LO', 'ON'])
  })
  it('removes spaces and punctuation, uppercases, folds J into I', () => {
    // "HELLOJESSE" → J folds to I → HE LL OI ES SE with X split
    expect(prepareDigraphs('Hello, Jesse!')).toEqual(['HE', 'LX', 'LO', 'IE', 'SX', 'SE'])
  })
  it('pads an odd-length message with X', () => {
    expect(prepareDigraphs('HEY')).toEqual(['HE', 'YX'])
  })
  it('folds J into I', () => {
    expect(prepareDigraphs('JACK')).toEqual(['IA', 'CK'])
  })
})

describe('Playfair — rules', () => {
  it('detects ROW / COLUMN / RECTANGLE', () => {
    expect(ruleFor(KEY_MATRIX, 'B', 'E')).toBe('ROW')
    expect(ruleFor(KEY_MATRIX, 'B', 'Z')).toBe('COLUMN')
    expect(ruleFor(KEY_MATRIX, 'H', 'I')).toBe('RECTANGLE')
  })
  it('same row shifts right', () => {
    expect(encryptDigraph(KEY_MATRIX, 'B', 'E')).toEqual(['K', 'Y'])
  })
  it('same column shifts down', () => {
    expect(encryptDigraph(KEY_MATRIX, 'B', 'Z')).toEqual(['H', 'B'])
  })
  it('rectangle swaps columns', () => {
    expect(encryptDigraph(KEY_MATRIX, 'H', 'I')).toEqual(['C', 'O'])
  })
})

describe('Playfair — full ciphertext', () => {
  it('encrypts HELLO with MONARCHY to a known result', () => {
    expect(playfairEncrypt('HELLO', 'MONARCHY')).toBe('CFSUPM')
  })
  it('decrypts back to the prepared plaintext', () => {
    expect(playfairDecrypt('CFSUPM', 'MONARCHY')).toBe('HELXLO')
  })
  it('round-trips on a longer message', () => {
    const prepared = prepareDigraphs('attack at dawn').join('')
    const ct = playfairEncrypt(prepared, 'HILLKEY')
    expect(playfairDecrypt(ct, 'HILLKEY')).toBe(prepared)
  })
})

describe('Playfair — steps', () => {
  it('produces a step per digraph with rule + positions', () => {
    const steps = getPlayfairSteps('HELLO', 'MONARCHY')
    expect(steps).toHaveLength(3)
    expect(steps[0].pair).toBe('HE')
    expect(steps[0].rule).toBe('RECTANGLE')
    expect(steps[0].output).toEqual(['C', 'F'])
    expect(steps[0].positions).toEqual([
      [1, 1],
      [2, 0],
    ])
    expect(steps[0].detail).toContain('Rectangle rule')
  })
})
