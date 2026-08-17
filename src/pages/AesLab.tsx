import { AesLab as AesLabComponent } from '@/components/laboratory/aes/AesLab'

/**
 * AES block cipher laboratory — thin page wrapper around the lab component.
 */
export function AesLab() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <AesLabComponent />
    </div>
  )
}
