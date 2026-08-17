/**
 * Shared domain types for the CRYPTOLAB crypto engine and cipher catalog.
 *
 * The catalog is organised around the VTU 2022 Scheme BCS703 Module 1 syllabus
 * (the VTU CORE learning path) plus an EXTENDED set of additional classical
 * techniques students can explore beyond the syllabus. Only Caesar is
 * implemented (ACTIVE); every other entry is catalog metadata with status
 * COMING_NEXT / LOCKED. No fake functionality.
 */

/** Visual state of the 3D Cryptographic Core. */
export type CoreState = 'idle' | 'hover' | 'processing' | 'success' | 'error'

/** A single unit of data moving through a pipeline stage. */
export interface DataUnit {
  id: string
  value: string
}

/** Result of running one cipher stage over some input. */
export interface StageResult {
  input: DataUnit[]
  output: DataUnit[]
  /** Short human-readable label of the operation that ran. */
  operation: string
  /** Optional per-character trace for the step-by-step viewer. */
  trace?: Array<{ from: string; to: string; detail: string }>
}

/**
 * Unique identifier for every algorithm in the catalog.
 * The classical set spans both VTU CORE topics and EXTENDED additions.
 */
export type CipherId =
  // VTU CORE — Module 1 classical encryption techniques
  | 'caesar'
  | 'monoalphabetic'
  | 'playfair'
  | 'hill'
  | 'vigenere'
  | 'otp'
  // EXTENDED — useful classical additions beyond the syllabus
  | 'atbash'
  | 'affine'
  | 'rail-fence'
  | 'columnar'
  // Block cipher (VTU CORE — Module 1 introduction)
  | 'des'
  | 'aes'
  // Data hiding technique (VTU CORE — Module 1)
  | 'steganography'

/** Broad algorithmic grouping used across the UI. */
export type CipherCategory =
  | 'Substitution'
  | 'Polyalphabetic'
  | 'Transposition'
  | 'Block Cipher'
  | 'Data Hiding'

/** Classical family, kept for pipeline/lab visualizations. */
export type CipherFamily = 'substitution' | 'polyalphabetic' | 'transposition' | 'block' | 'steganography'

/** Educational security classification — NOT a formal proof. */
export type SecurityLevel =
  | 'VERY_WEAK'
  | 'WEAK'
  | 'MODERATE'
  | 'STRONG'
  | 'VERY_STRONG'
  | 'SPECIAL'

/** Whether a cipher is part of the main academic path or an extension. */
export type SyllabusStatus = 'VTU_CORE' | 'EXTENDED'

/** Whether the algorithm is live, on the roadmap, or parked. */
export type CipherStatus = 'ACTIVE' | 'COMING_NEXT' | 'LOCKED'

/**
 * Structured security profile for a technique.
 * The rating is an educational classification based on understandable
 * properties (key space, predictability, frequency-analysis resistance,
 * brute-force resistance, known attacks, modern practicality) — NOT a formal
 * cryptographic security proof.
 */
export interface SecurityProfile {
  securityLevel: SecurityLevel
  /** Key space expressed readably, e.g. "26 possible shifts". */
  keySpace: string
  bruteForce: string
  frequencyAnalysis: string
  modernSecurity: string
  weaknesses: string[]
  /** Concise, educational "why". */
  explanation: string
  /** Optional extra notes (e.g. OTP perfect-secrecy caveats). */
  notes?: string[]
  /** Set for special-case entries (e.g. One-Time Pad). */
  isSpecial?: boolean
}

/**
 * Full reusable metadata for every cipher. Kept OUTSIDE React so the UI just
 * reads a structured record. `name`, `family`, `requiresKey` and `levels`
 * remain compatible with the pipeline + lab visualizations.
 */
export interface CipherMetadata {
  id: CipherId
  name: string
  category: CipherCategory
  /** Classical family (substitution / polyalphabetic / transposition / …). */
  family: CipherFamily
  requiresKey: boolean
  /** How the key is collected in the UI (shift / string / none). */
  keyType: string
  /** VTU CORE vs EXTENDED. */
  syllabusStatus: SyllabusStatus
  /** Roadmap state: ACTIVE / COMING_NEXT / LOCKED. */
  status: CipherStatus
  /** Syllabus anchor, e.g. "Module 1 · Classical Encryption Techniques". */
  syllabusModule: string
  description: string
  /** Progressive-learning levels supported. */
  levels: Array<'concept' | 'visualization' | 'technical' | 'experiment' | 'challenge'>
  /** Structured security analysis. */
  security: SecurityProfile
  /** Optional route for a live laboratory page (e.g. '/des'). */
  path?: string
}

/** An ordered list of ciphers = a transformation pipeline. */
export type Pipeline = CipherId[]

/** Config for a future pipeline run. */
export interface PipelineRequest {
  plaintext: string
  key: string
  pipeline: Pipeline
}
