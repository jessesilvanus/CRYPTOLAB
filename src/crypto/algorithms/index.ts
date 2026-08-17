import type { CipherAlgorithm } from '../types/CipherAlgorithm'
import type { CipherId } from '../types/CryptoTypes'
import { caesarCipher } from './caesar'
import { monoalphabeticCipher } from './monoalphabetic'
import { playfairCipher } from './playfair'
import { hillCipher } from './hill'
import { vigenereCipher } from './vigenere'
import { otpCipher } from './otp'

/**
 * Algorithm registry.
 * Maps a cipher id to its implemented CipherAlgorithm.
 * Caesar (2A), Monoalphabetic (2C), Playfair, Hill, Vigenère and One-Time Pad
 * are implemented (ACTIVE) — the rest return `undefined` (the UI treats them
 * as "engine pending").
 */
export const ALGORITHMS: Partial<Record<CipherId, CipherAlgorithm>> = {
  caesar: caesarCipher,
  monoalphabetic: monoalphabeticCipher,
  playfair: playfairCipher,
  hill: hillCipher,
  vigenere: vigenereCipher,
  otp: otpCipher,
}

/** Get the implemented algorithm for `id`, or `undefined` if not yet built. */
export function getCipherAlgorithm(id: CipherId): CipherAlgorithm | undefined {
  return ALGORITHMS[id]
}
