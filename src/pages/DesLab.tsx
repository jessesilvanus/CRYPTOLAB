import { DesLab as DesLabComponent } from '@/components/laboratory/des/DesLab'

/**
 * DES PAGE — thin wrapper around the DES Block Cipher Laboratory.
 * Mirrors the other page patterns so routing stays simple.
 */
export function DesLab() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <DesLabComponent />
    </div>
  )
}
