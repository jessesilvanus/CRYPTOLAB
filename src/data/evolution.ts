/**
 * CIPHER EVOLUTION — educational dataset for the Evolution Lab.
 *
 * Every technique described here is already implemented and ACTIVE in
 * CRYPTOLAB. Descriptions are concise and conceptual — they explain how each
 * method addressed weaknesses in earlier approaches without inventing a strict
 * historical lineage. Security terms are educational classifications, not
 * formal proofs.
 */

export interface EvolutionCipher {
  id: string
  name: string
  index: number
  coreIdea: string
  howItWorks: string
  keyIdea: string
  weakness: string
  whyNext: string
  examplePlain: string
  exampleCipher: string
  exampleNote: string
  unit: string
  keyType: string
  keyBehavior: string
  math: string
  histStrength: string
  modernSecurity: string
  mainWeakness: string
  securityCategory: string
  attacks: string[]
  /** Short label for the evolution chain ("what problem"). */
  chainLabel: string
}

export const EVOLUTION_CIPHERS: EvolutionCipher[] = [
  {
    id: 'caesar',
    name: 'Caesar',
    index: 1,
    coreIdea: 'A fixed shift applied to every letter.',
    howItWorks:
      'Each letter is replaced by the letter a fixed number of positions down the alphabet: C = (P + 3) mod 26.',
    keyIdea: 'The key is a single number — the shift.',
    weakness: 'The same shift is used throughout the whole message.',
    whyNext:
      'Because there are only 26 possible shifts, an attacker can simply try them all. Later methods replaced one fixed shift with richer, larger substitution systems.',
    examplePlain: 'HELLO',
    exampleCipher: 'KHOOR',
    exampleNote: 'shift = 3',
    unit: 'Single letter',
    keyType: 'Number (shift)',
    keyBehavior: 'ONE FIXED SHIFT',
    math: 'C = (P + K) mod 26',
    histStrength: 'Classic and simple; named after Julius Caesar.',
    modernSecurity: 'Trivially broken — only 26 possible shifts.',
    mainWeakness: 'Same shift everywhere; exhaustive search is trivial.',
    securityCategory: 'Highly vulnerable to exhaustive search.',
    attacks: ['Brute force / exhaustive shift search (only 26 possibilities).'],
    chainLabel: 'One fixed shift',
  },
  {
    id: 'monoalphabetic',
    name: 'Monoalphabetic',
    index: 2,
    coreIdea: 'Each plaintext letter maps to a fixed ciphertext letter.',
    howItWorks:
      'A substitution alphabet gives every letter its own mapping, e.g. A→Q, B→M, C→Z — a permutation of all 26 letters.',
    keyIdea: 'The key is the whole substitution alphabet, not just a single number.',
    weakness: 'Letter-frequency patterns are preserved, so the plaintext language leaks through.',
    whyNext:
      'Frequency analysis exploits the preserved letter frequencies. Later methods hid those patterns by encrypting pairs or blocks of letters.',
    examplePlain: 'A B C',
    exampleCipher: 'Q M Z',
    exampleNote: 'one possible substitution mapping',
    unit: 'Single letter',
    keyType: 'Substitution alphabet',
    keyBehavior: 'FIXED SUBSTITUTION ALPHABET',
    math: 'Bijective permutation over 26 letters',
    histStrength: 'A far larger key space than Caesar.',
    modernSecurity: 'Broken by frequency analysis.',
    mainWeakness: 'Letter-frequency patterns remain.',
    securityCategory: 'Frequency-analysis weakness.',
    attacks: ['Frequency analysis — common letter frequencies survive substitution.'],
    chainLabel: 'Fixed substitution',
  },
  {
    id: 'playfair',
    name: 'Playfair',
    index: 3,
    coreIdea: 'Encrypt letter pairs (digraphs) instead of single letters.',
    howItWorks:
      'A 5×5 matrix is built from a keyword (I/J merged), then each plaintext pair is transformed with row, column, or rectangle rules.',
    keyIdea: 'The key is the keyword that shapes the 5×5 matrix.',
    weakness: 'Digraph encryption changes single-letter patterns but is still open to classical cryptanalysis.',
    whyNext:
      'Pairing letters disrupts single-letter frequency, yet structural patterns remain. Systematic block mathematics offered a stronger, more general idea.',
    examplePlain: 'HELLO',
    exampleCipher: 'CFSUPM',
    exampleNote: 'keyword = MONARCHY',
    unit: 'Letter pairs (digraphs)',
    keyType: 'Keyword → 5×5 matrix',
    keyBehavior: '5×5 KEY MATRIX',
    math: 'Grid positions + digraph rules',
    histStrength: 'A standard field cipher of its era (used around WWI–WWII).',
    modernSecurity: 'Not secure for modern communication.',
    mainWeakness: 'Still vulnerable to classical digraph cryptanalysis.',
    securityCategory: 'Digraph-based classical cipher; still cryptanalytically vulnerable.',
    attacks: ['Classical digraph cryptanalysis of paired-letter patterns.'],
    chainLabel: 'Letter pairs',
  },
  {
    id: 'hill',
    name: 'Hill',
    index: 4,
    coreIdea: 'Encrypt blocks of letters using matrix multiplication over mod 26.',
    howItWorks:
      'Split plaintext into vectors and multiply by a key matrix: C = K · P mod 26. Decryption needs an invertible key matrix.',
    keyIdea: 'The key is an invertible matrix.',
    weakness: 'The linear structure can be exploited by known-plaintext and linear-cryptanalysis techniques.',
    whyNext:
      'Matrices are systematic and spread each output over a block, but their linear structure was attacked. Later methods shifted to moving, repeating keys.',
    examplePlain: 'HELP',
    exampleCipher: 'HIAT',
    exampleNote: 'key = [[3,3],[2,5]]',
    unit: 'Blocks of letters',
    keyType: 'Invertible matrix',
    keyBehavior: 'MATRIX',
    math: 'Linear algebra · C = K·P mod 26',
    histStrength: 'Introduced matrix mathematics to classical encryption.',
    modernSecurity: 'Broken by known-plaintext / linear attacks.',
    mainWeakness: 'Linear structure creates cryptanalytic weaknesses.',
    securityCategory: 'Linear algebra structure creates weaknesses.',
    attacks: ['Known-plaintext attack (solve linear equations), linear cryptanalysis.'],
    chainLabel: 'Matrix mathematics',
  },
  {
    id: 'vigenere',
    name: 'Vigenère',
    index: 5,
    coreIdea: 'Multiple Caesar shifts controlled by a repeating keyword.',
    howItWorks:
      'The keyword is aligned over the plaintext and each letter is shifted by its key letter: C = (P + Kᵢ) mod 26.',
    keyIdea: 'The key is a keyword repeated cyclically.',
    weakness: 'Repeating the keyword creates periodic structure that can be measured (Kasiski examination).',
    whyNext:
      'Repetition leaks the key length. A key that never repeats would remove that structure — the central idea behind the one-time pad.',
    examplePlain: 'ATTACKATDAWN',
    exampleCipher: 'LXFOPVEFRNHR',
    exampleNote: 'keyword = LEMON',
    unit: 'Single letter, shift changes per position',
    keyType: 'Repeating keyword',
    keyBehavior: 'REPEATING KEYWORD',
    math: 'C = (P + Kᵢ) mod 26',
    histStrength: 'Long considered unbreakable ("le chiffre indéchiffrable").',
    modernSecurity: 'Broken by key-length estimation + frequency analysis.',
    mainWeakness: 'Repeating keys create exploitable patterns.',
    securityCategory: 'Repeating-key weaknesses.',
    attacks: ['Kasiski examination (estimate key length) then per-column frequency analysis.'],
    chainLabel: 'Repeating keystream',
  },
  {
    id: 'otp',
    name: 'One-Time Pad',
    index: 6,
    coreIdea: 'A truly random secret key at least as long as the plaintext, used only once.',
    howItWorks: 'C = (P + K) mod 26 using a fresh, random, message-length key.',
    keyIdea: 'Security comes from how the key is generated, sized, and used — not from the algorithm.',
    weakness: 'Practically difficult: key distribution, storage, and guaranteeing single use.',
    whyNext:
      'The mathematics is sound — with correct key handling it can achieve perfect secrecy. The remaining challenge is real-world key management.',
    examplePlain: 'HELLO',
    exampleCipher: 'RANDOM-LOOKING',
    exampleNote: 'fresh random key, same length',
    unit: 'Single letter',
    keyType: 'Random key, length = plaintext',
    keyBehavior: 'RANDOM NON-REPEATING PAD',
    math: 'C = (P + K) mod 26, fresh random K',
    histStrength: 'Can achieve theoretical perfect secrecy under its strict conditions.',
    modernSecurity: 'Perfect secrecy only when all OTP conditions are met.',
    mainWeakness: 'Key distribution and management in practice.',
    securityCategory: 'Perfect secrecy under strict conditions.',
    attacks: [
      'Correctly used OTP is not broken by ciphertext-only cryptanalysis; failures come from violating OTP conditions such as key reuse or poor randomness.',
    ],
    chainLabel: 'Random one-time key',
  },
]

export interface EvolutionQuestion {
  prompt: string
  options: string[]
  answer: string
  explain: string
}

export const EVOLUTION_QUESTIONS: EvolutionQuestion[] = [
  {
    prompt: 'Which cipher encrypts letter pairs using a 5×5 key matrix?',
    options: ['Caesar', 'Playfair', 'Vigenère', 'OTP'],
    answer: 'Playfair',
    explain:
      'Playfair builds a 5×5 matrix from a keyword (I/J merged) and transforms pairs of letters with row, column, and rectangle rules.',
  },
  {
    prompt: 'Which cipher encrypts blocks of letters using matrix multiplication?',
    options: ['Hill', 'Caesar', 'Playfair', 'Monoalphabetic'],
    answer: 'Hill',
    explain:
      'Hill treats blocks as vectors and multiplies them by an invertible key matrix over mod 26: C = K·P mod 26.',
  },
  {
    prompt: 'Which cipher requires a truly random key at least as long as the plaintext and used only once?',
    options: ['Vigenère', 'Caesar', 'OTP', 'Playfair'],
    answer: 'OTP',
    explain:
      'The one-time pad needs a random, message-length, single-use key. Under those conditions it can achieve perfect secrecy.',
  },
  {
    prompt: 'Which cipher uses a repeating keyword to give every position a different shift?',
    options: ['Caesar', 'Monoalphabetic', 'Hill', 'Vigenère'],
    answer: 'Vigenère',
    explain:
      'Vigenère aligns a repeating keyword over the plaintext so the shift changes each position — until the keyword repeats.',
  },
  {
    prompt: 'Which cipher is directly weakened by letter-frequency analysis because single letters keep their frequencies?',
    options: ['Monoalphabetic', 'Hill', 'OTP', 'Vigenère'],
    answer: 'Monoalphabetic',
    explain:
      'A monoalphabetic substitution is a fixed permutation, so the most common letters in English stay the most common — frequency analysis breaks it.',
  },
]
