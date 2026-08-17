import { NetworkLab as NetworkLabComponent } from '@/components/laboratory/network/NetworkLab'

/**
 * SECURE COMMUNICATION network laboratory — thin page wrapper around the
 * lab component. All simulation state and encryption lives inside the
 * component; this page just hosts it inside the standard max-width shell.
 */
export function NetworkLab() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <NetworkLabComponent />
    </div>
  )
}
