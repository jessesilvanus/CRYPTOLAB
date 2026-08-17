import {
  Home,
  Lock,
  Unlock,
  Blocks,
  Workflow,
  Network,
  Crosshair,
  GraduationCap,
  Route,
  Cpu,
  Binary,
  type LucideIcon,
} from 'lucide-react'

/**
 * Navigation + lab module metadata.
 * Single source of truth for both the sidebar and the lab-home module grid.
 */

export interface NavItem {
  id: string
  label: string
  path: string
  icon: LucideIcon
  group: 'overview' | 'cryptography' | 'communication'
  /** One-line supporting text shown in the module grid. */
  description: string
  /** Short hand-written hook shown on hover / tooltip. */
  tagline: string
}

export const NAV_GROUPS: Array<{ id: string; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'cryptography', label: 'Cryptography' },
  { id: 'communication', label: 'Communication' },
]

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'HOME',
    path: '/home',
    icon: Home,
    group: 'overview',
    description: 'Laboratory overview and module launchpad.',
    tagline: 'The laboratory at a glance.',
  },
  {
    id: 'evolution',
    label: 'CIPHER EVOLUTION',
    path: '/evolution',
    icon: Route,
    group: 'overview',
    description:
      'Travel the classical cipher timeline and compare every technique side by side.',
    tagline: 'How cryptography evolved, and why.',
  },
  {
    id: 'encrypt',
    label: 'ENCRYPTION LAB',
    path: '/encrypt',
    icon: Lock,
    group: 'cryptography',
    description: 'Transform plaintext into ciphertext and observe every stage.',
    tagline: 'Where input becomes a secret.',
  },
  {
    id: 'decrypt',
    label: 'DECRYPTION LAB',
    path: '/decrypt',
    icon: Unlock,
    group: 'cryptography',
    description: 'Reverse the transformation and understand why the key matters.',
    tagline: 'Revealing what was hidden.',
  },
  {
    id: 'ciphers',
    label: 'CIPHER LAB',
    path: '/ciphers',
    icon: Blocks,
    group: 'cryptography',
    description:
      'Explore classical substitution, transposition and polyalphabetic techniques.',
    tagline: 'The families of classical ciphers.',
  },
  {
    id: 'pipeline',
    label: 'PIPELINE BUILDER',
    path: '/pipeline',
    icon: Workflow,
    group: 'cryptography',
    description:
      'Combine multiple cryptographic techniques into a transformation pipeline.',
    tagline: 'Stack transformations in sequence.',
  },
  {
    id: 'des',
    label: 'DES BLOCK CIPHER',
    path: '/des',
    icon: Cpu,
    group: 'cryptography',
    description:
      'Watch a 64-bit block move through the initial permutation, sixteen Feistel rounds, the key schedule and the final permutation.',
    tagline: 'Sixteen rounds of the Feistel engine.',
  },
  {
    id: 'aes',
    label: 'AES BLOCK CIPHER',
    path: '/aes',
    icon: Binary,
    group: 'cryptography',
    description:
      'Watch a 128-bit block move through the SubBytes, ShiftRows, MixColumns and AddRoundKey stages across ten rounds of the modern standard.',
    tagline: 'Ten rounds of the substitution-permutation network.',
  },
  {
    id: 'network',
    label: 'SECURE COMMUNICATION',
    path: '/network',
    icon: Network,
    group: 'communication',
    description: 'Watch plaintext become ciphertext and travel through a simulated network as an encrypted packet.',
    tagline: 'Secrets in motion.',
  },
  {
    id: 'attack',
    label: 'CRYPTO ATTACK LAB',
    path: '/attack',
    icon: Crosshair,
    group: 'communication',
    description: 'Analyze ciphertext locally to understand why ciphers differ in strength.',
    tagline: 'Probe where the cipher is weak.',
  },
  {
    id: 'learn',
    label: 'LEARNING CENTER',
    path: '/learn',
    icon: GraduationCap,
    group: 'communication',
    description: 'Understand the theory behind every transformation.',
    tagline: 'From concept to confidence.',
  },
]

/** Convenience: the lab modules (everything except HOME). */
export const LAB_MODULES = NAV_ITEMS.filter((n) => n.id !== 'home')

export function getNavItem(id: string): NavItem | undefined {
  return NAV_ITEMS.find((n) => n.id === id)
}
