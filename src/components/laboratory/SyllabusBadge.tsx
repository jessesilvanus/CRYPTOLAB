/**
 * Small project-scope badge. Communicates that CRYPTOLAB is an academic
 * laboratory aligned to the VTU syllabus — not an official certification.
 */
export function SyllabusBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[rgba(148,163,184,0.06)] px-3 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--c-core))]" />
      <span className="mono-label !text-[0.55rem] text-[var(--c-text-dim)]">
        VTU 22 SCHEME · MODULE 1
      </span>
    </span>
  )
}
