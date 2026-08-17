import type { CipherId, CipherMetadata } from '../types/CryptoTypes'

/**
 * CIPHER CATALOG (Step 2B)
 *
 * Single source of truth the UI reads to list algorithms and their security
 * profiles. Organised as:
 *   - VTU CORE  : the primary academic path (Module 1 topics)
 *   - EXTENDED  : useful classical techniques beyond the syllabus
 *   - BLOCK     : block-cipher / DES entry (future lab)
 *   - DATA HIDING : steganography (a distinct technique, not an algorithm)
 *
 * Only Caesar is ACTIVE. Every other entry is metadata with status
 * COMING_NEXT / LOCKED — no fake functionality. The security rating is an
 * educational classification, not a formal cryptographic proof.
 */

/** Rotated-alphabet helpers reused by several substitution ciphers. */
const FULL_LEVELS: CipherMetadata['levels'] = [
  'concept',
  'visualization',
  'technical',
  'experiment',
  'challenge',
]

export const CIPHER_REGISTRY: CipherMetadata[] = [
  // ---------------- VTU CORE — CLASSICAL ----------------
  {
    id: 'caesar',
    name: 'Caesar Cipher',
    category: 'Substitution',
    family: 'substitution',
    requiresKey: true,
    keyType: 'Numeric Shift',
    syllabusStatus: 'VTU_CORE',
    status: 'ACTIVE',
    syllabusModule: 'Module 1 · Classical Encryption Techniques',
    description: 'Each alphabetic character is shifted by a fixed number of positions.',
    levels: FULL_LEVELS,
    security: {
      securityLevel: 'VERY_WEAK',
      keySpace: '26 possible shifts',
      bruteForce: 'TRIVIAL',
      frequencyAnalysis: 'VULNERABLE',
      modernSecurity: 'NOT SECURE',
      weaknesses: [
        'Very small key space (only 26 shifts)',
        'Fixed substitution pattern',
        'Vulnerable to brute-force attacks',
        'Vulnerable to frequency analysis',
      ],
      explanation:
        'A fixed substitution pattern shifts every letter by the same amount. Only 26 keys exist, so brute force is trivial and frequency analysis reveals the plaintext.',
    },
  },
  {
    id: 'monoalphabetic',
    name: 'Monoalphabetic Substitution',
    category: 'Substitution',
    family: 'substitution',
    requiresKey: true,
    keyType: '26-letter key',
    syllabusStatus: 'VTU_CORE',
    status: 'ACTIVE',
    syllabusModule: 'Module 1 · Classical Encryption Techniques',
    description: 'Each letter maps to a fixed, unique replacement — a general permutation of the alphabet.',
    levels: FULL_LEVELS,
    security: {
      securityLevel: 'WEAK',
      keySpace: '26! possible mappings',
      bruteForce: 'Large key space, but…',
      frequencyAnalysis: 'VULNERABLE',
      modernSecurity: 'NOT SECURE',
      weaknesses: [
        'Preserves letter frequencies',
        'Vulnerable to frequency analysis & language statistics',
      ],
      explanation:
        'The key space (26!) looks huge, but a monoalphabetic substitution preserves the underlying letter frequencies of the language, so frequency analysis and statistical attacks break it quickly.',
    },
  },
  {
    id: 'playfair',
    name: 'Playfair Cipher',
    category: 'Polyalphabetic',
    family: 'polyalphabetic',
    requiresKey: true,
    keyType: 'Keyword',
    syllabusStatus: 'VTU_CORE',
    status: 'ACTIVE',
    syllabusModule: 'Module 1 · Classical Encryption Techniques',
    description: 'Encrypts digraphs (pairs of letters) using a 5×5 keyword key square.',
    levels: FULL_LEVELS,
    security: {
      securityLevel: 'WEAK',
      keySpace: '~25! keyword arrangements',
      bruteForce: 'Resists naive brute force',
      frequencyAnalysis: 'PARTIALLY RESISTANT',
      modernSecurity: 'NOT SECURE',
      weaknesses: [
        'Hides single-letter frequencies better, but digraph structure remains',
        'Vulnerable to digraph-frequency and other classical cryptanalysis',
        'Limited key structure',
      ],
      explanation:
        'Encrypting digraphs hides simple single-letter frequencies, but the underlying structure of a 5×5 square and digraph patterns leave it open to classical cryptanalysis.',
    },
  },
  {
    id: 'hill',
    name: 'Hill Cipher',
    category: 'Polyalphabetic',
    family: 'polyalphabetic',
    requiresKey: true,
    keyType: 'Matrix',
    syllabusStatus: 'VTU_CORE',
    status: 'ACTIVE',
    syllabusModule: 'Module 1 · Classical Encryption Techniques',
    description: 'Encrypts blocks of letters via linear-algebra matrix multiplication.',
    levels: FULL_LEVELS,
    security: {
      securityLevel: 'WEAK',
      keySpace: 'Depends on matrix size',
      bruteForce: 'Depends on key matrix',
      frequencyAnalysis: 'RESISTS SINGLE-LETTER ANALYSIS',
      modernSecurity: 'NOT SECURE',
      weaknesses: [
        'Linear structure creates exploitable relationships',
        'Classical version unsuitable for modern security',
      ],
      explanation:
        'Hill works on blocks with a key matrix. Its linear structure creates exploitable relationships between plaintext and ciphertext, and the classical version is not secure by modern standards.',
    },
  },
  {
    id: 'vigenere',
    name: 'Vigenère Cipher',
    category: 'Polyalphabetic',
    family: 'polyalphabetic',
    requiresKey: true,
    keyType: 'Keyword',
    syllabusStatus: 'VTU_CORE',
    status: 'ACTIVE',
    syllabusModule: 'Module 1 · Classical Encryption Techniques',
    description: 'A polyalphabetic cipher where the shift changes per position using a repeating keyword.',
    levels: FULL_LEVELS,
    security: {
      securityLevel: 'WEAK',
      keySpace: '26^(keyword length)',
      bruteForce: 'Impractical alone',
      frequencyAnalysis: 'PARTIALLY RESISTANT',
      modernSecurity: 'NOT SECURE',
      weaknesses: [
        'Key is repeated cyclically',
        'Kasiski examination + frequency analysis reveal the key length and key',
      ],
      explanation:
        'Repeating the keyword creates periodic structure. An attacker can find the key length (Kasiski examination), then split the message and solve each Caesar column by frequency analysis.',
    },
  },
  {
    id: 'otp',
    name: 'One-Time Pad',
    category: 'Polyalphabetic',
    family: 'polyalphabetic',
    requiresKey: true,
    keyType: 'Random key (length = plaintext)',
    syllabusStatus: 'VTU_CORE',
    status: 'ACTIVE',
    syllabusModule: 'Module 1 · Classical Encryption Techniques',
    description: 'A Vigenère-like cipher using a truly random, never-reused key as long as the plaintext.',
    levels: FULL_LEVELS,
    security: {
      securityLevel: 'SPECIAL',
      keySpace: 'Random key, length = plaintext',
      bruteForce: 'Defeated by ciphertext alone',
      frequencyAnalysis: 'IMMUNE (if used correctly)',
      modernSecurity: 'PERFECT SECRECY (theoretical)',
      weaknesses: [
        'Key must be truly random',
        'Key length must equal plaintext',
        'Key must never be reused',
        'Secure key distribution is hard in practice',
      ],
      isSpecial: true,
      explanation:
        'With a truly random key that is as long as the message and used only once, every plaintext is equally likely — this is the special property of THEORETICAL PERFECT SECRECY. In practice, generating, distributing and never-reusing such keys is hard, which limits real use.',
    },
  },
  // ---------------- EXTENDED — beyond the syllabus ----------------
  {
    id: 'atbash',
    name: 'Atbash',
    category: 'Substitution',
    family: 'substitution',
    requiresKey: false,
    keyType: 'None (fixed reverse)',
    syllabusStatus: 'EXTENDED',
    status: 'COMING_NEXT',
    syllabusModule: 'EXTENDED LAB · Beyond syllabus',
    description: 'A fixed substitution that reverses the alphabet (A↔Z, B↔Y).',
    levels: FULL_LEVELS,
    security: {
      securityLevel: 'VERY_WEAK',
      keySpace: '1 fixed mapping',
      bruteForce: 'TRIVIAL (no key at all)',
      frequencyAnalysis: 'VULNERABLE',
      modernSecurity: 'NOT SECURE',
      weaknesses: ['No key to hide', 'Simple reverse substitution preserves frequencies'],
      explanation:
        'Atbash has a single fixed mapping with no key, so it offers essentially no secrecy beyond obscuring the text at a glance.',
    },
  },
  {
    id: 'affine',
    name: 'Affine Cipher',
    category: 'Substitution',
    family: 'substitution',
    requiresKey: true,
    keyType: 'Two numbers (a, b)',
    syllabusStatus: 'EXTENDED',
    status: 'COMING_NEXT',
    syllabusModule: 'EXTENDED LAB · Beyond syllabus',
    description: 'A substitution of the form C = (a·P + b) mod 26.',
    levels: FULL_LEVELS,
    security: {
      securityLevel: 'VERY_WEAK',
      keySpace: '12 × 26 = 312 usable keys',
      bruteForce: 'TRIVIAL',
      frequencyAnalysis: 'VULNERABLE',
      modernSecurity: 'NOT SECURE',
      weaknesses: ['Small key space', 'Preserves single-letter frequencies'],
      explanation:
        'The affine cipher is a linear substitution with a small usable key space (~312 keys) and the same frequency-analysis weakness as other monoalphabetic substitutions.',
    },
  },
  {
    id: 'rail-fence',
    name: 'Rail Fence',
    category: 'Transposition',
    family: 'transposition',
    requiresKey: false,
    keyType: 'None (rail count)',
    syllabusStatus: 'EXTENDED',
    status: 'COMING_NEXT',
    syllabusModule: 'EXTENDED LAB · Beyond syllabus',
    description: 'A transposition that writes text in a zig-zag pattern and reads it row by row.',
    levels: FULL_LEVELS,
    security: {
      securityLevel: 'WEAK',
      keySpace: 'Small (number of rails)',
      bruteForce: 'TRIVIAL',
      frequencyAnalysis: 'IMMUNE (frequencies preserved)',
      modernSecurity: 'NOT SECURE',
      weaknesses: ['Preserves letter frequencies', 'Few possible rails make recovery easy'],
      explanation:
        'Transposition does not change letter frequencies, which is a strong clue for cryptanalysis; the small number of rails makes brute force trivial.',
    },
  },
  {
    id: 'columnar',
    name: 'Columnar Transposition',
    category: 'Transposition',
    family: 'transposition',
    requiresKey: true,
    keyType: 'Keyword / key order',
    syllabusStatus: 'EXTENDED',
    status: 'COMING_NEXT',
    syllabusModule: 'EXTENDED LAB · Beyond syllabus',
    description: 'A transposition that writes text into columns and reads them in key order.',
    levels: FULL_LEVELS,
    security: {
      securityLevel: 'WEAK',
      keySpace: 'Depends on key length',
      bruteForce: 'Anagramming recovers it',
      frequencyAnalysis: 'IMMUNE (frequencies preserved)',
      modernSecurity: 'NOT SECURE',
      weaknesses: ['Preserves letter frequencies', 'Recoverable by anagramming / column analysis'],
      explanation:
        'A stronger transposition than rail fence, but it preserves frequencies and can be broken by anagramming once the column count is found.',
    },
  },
  // ---------------- BLOCK CIPHER ----------------
  {
    id: 'des',
    name: 'Data Encryption Standard (DES)',
    category: 'Block Cipher',
    family: 'block',
    requiresKey: true,
    keyType: '56-bit key',
    syllabusStatus: 'VTU_CORE',
    status: 'ACTIVE',
    path: '/des',
    syllabusModule: 'Module 1 · Block Ciphers & DES',
    description: 'A 64-bit block cipher with a 56-bit key, historically important in the development of block-cipher design.',
    levels: FULL_LEVELS,
    security: {
      securityLevel: 'WEAK',
      keySpace: '2^56 keys',
      bruteForce: 'FEASIBLE (hardware attacks)',
      frequencyAnalysis: 'N/A (block cipher)',
      modernSecurity: 'INSECURE TODAY',
      weaknesses: [
        'Effective key size (56 bits) is too small',
        'Brute-force attacks are feasible with modern hardware',
        'Structural weaknesses (e.g. complementarity, block size)',
      ],
      explanation:
        'DES is historically important but considered insecure today: its 56-bit effective key size makes brute-force recovery feasible. Do not mistake historical importance for modern strength.',
    },
  },
  {
    id: 'aes',
    name: 'Advanced Encryption Standard (AES)',
    category: 'Block Cipher',
    family: 'block',
    requiresKey: true,
    keyType: '128-bit key',
    syllabusStatus: 'VTU_CORE',
    status: 'ACTIVE',
    path: '/aes',
    syllabusModule: 'Module 1 · Block Ciphers & DES',
    description: 'The modern block-cipher standard: a 128-bit block cipher with a 128-bit key and 10 rounds of a substitution-permutation network.',
    levels: FULL_LEVELS,
    security: {
      securityLevel: 'STRONG',
      keySpace: '2^128 keys',
      bruteForce: 'INFEASIBLE',
      frequencyAnalysis: 'N/A (block cipher)',
      modernSecurity: 'SECURE (as standardised)',
      weaknesses: [
        'Only secure with correct use (proper key management, modes, no reuse)',
        'Key size is the main lever — 128-bit keys offer ample margin today',
      ],
      explanation:
        'AES-128 offers a 2^128 key space; exhaustive search is astronomically infeasible with known technology. It is the modern standard for symmetric encryption. Strength depends on using it correctly within a proven mode of operation.',
    },
  },
  // ---------------- DATA HIDING ----------------
  {
    id: 'steganography',
    name: 'Steganography',
    category: 'Data Hiding',
    family: 'steganography',
    requiresKey: false,
    keyType: 'None (carrier-based)',
    syllabusStatus: 'VTU_CORE',
    status: 'LOCKED',
    syllabusModule: 'Module 1 · Steganography',
    description: 'Hides the very existence of a message inside an innocent-looking carrier (e.g. an image).',
    levels: FULL_LEVELS,
    security: {
      securityLevel: 'MODERATE',
      keySpace: 'Depends on carrier & embedding',
      bruteForce: 'Not brute-force oriented',
      frequencyAnalysis: 'N/A',
      modernSecurity: 'DIFFERENT GOAL',
      weaknesses: [
        'Does not encrypt the message itself',
        'Detectable if the carrier is analysed carefully',
      ],
      explanation:
        'Steganography is not an encryption algorithm — it hides the presence of a message. Its security goal is secrecy of existence rather than secrecy of content, so it is classified separately.',
    },
  },
]

/** All VTU CORE classical ciphers, in syllabus order. */
export const CIPHERS_VTU_CORE = CIPHER_REGISTRY.filter(
  (c) => c.syllabusStatus === 'VTU_CORE' && c.category !== 'Block Cipher' && c.category !== 'Data Hiding',
)

/** Extended classical techniques beyond the syllabus. */
export const CIPHERS_EXTENDED = CIPHER_REGISTRY.filter((c) => c.syllabusStatus === 'EXTENDED')

/** Block-cipher entries (future DES lab). */
export const CIPHERS_BLOCK = CIPHER_REGISTRY.filter((c) => c.category === 'Block Cipher')

/** Data-hiding entries (steganography). */
export const CIPHERS_DATA_HIDING = CIPHER_REGISTRY.filter((c) => c.category === 'Data Hiding')

/** Lookup helper for components that only know a cipher id. */
export function getCipher(id: CipherId | string): CipherMetadata | undefined {
  return CIPHER_REGISTRY.find((c) => c.id === id)
}
