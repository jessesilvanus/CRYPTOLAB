import type { CipherId } from '../types/CryptoTypes'

/**
 * Default pipelines used to seed the Pipeline Builder UI.
 *
 * These are *display configurations* only — they describe which ciphers sit
 * in which order. The real encryption is wired in during Step 2.
 */
export interface PipelinePreset {
  id: string
  name: string
  description: string
  stages: CipherId[]
}

export const PIPELINE_PRESETS: PipelinePreset[] = [
  {
    id: 'classic-bridge',
    name: 'Classic Bridge',
    description: 'Substitution → transposition → polyalphabetic.',
    stages: ['caesar', 'rail-fence', 'vigenere'],
  },
  {
    id: 'double-sub',
    name: 'Double Substitution',
    description: 'Two substitutions stacked for depth.',
    stages: ['atbash', 'affine'],
  },
  {
    id: 'triple-turn',
    name: 'Triple Turn',
    description: 'A deeper classic stack.',
    stages: ['vigenere', 'columnar', 'rail-fence'],
  },
]
