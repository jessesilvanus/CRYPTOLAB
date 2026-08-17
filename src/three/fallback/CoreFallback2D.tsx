import { useId } from 'react'

/**
 * 2D FALLBACK for the Cryptographic Core.
 *
 * Rendered when WebGL is unavailable so the experience still looks designed
 * and intentional — no broken canvas. Mirrors the 3D core: nucleus, three
 * orbit rings and travelling data dots, animated with SMIL.
 */
export function CoreFallback2D({ label = 'CORE' }: { label?: string }) {
  const gradId = useId()

  return (
    <div
      className="relative grid h-full w-full place-items-center"
      role="img"
      aria-label="Cryptographic Core — 2D visualization"
    >
      <svg viewBox="-100 -100 200 200" className="h-full w-full max-w-[420px]">
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5eead4" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#2f6e66" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#2f6e66" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Nucleus */}
        <circle cx="0" cy="0" r="22" fill={`url(#${gradId})`} />
        <circle
          cx="0"
          cy="0"
          r="22"
          fill="none"
          stroke="#5eead4"
          strokeWidth="1.5"
          opacity="0.85"
        />

        {/* Orbit ring 1 — teal, spins */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="360"
            dur="14s"
            repeatCount="indefinite"
          />
          <ellipse cx="0" cy="0" rx="52" ry="18" fill="none" stroke="#5eead4" strokeWidth="1" opacity="0.55" />
          <circle cx="52" cy="0" r="3" fill="#5eead4" />
        </g>

        {/* Orbit ring 2 — violet, spins reverse */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="-360"
            dur="20s"
            repeatCount="indefinite"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="70"
            ry="24"
            transform="rotate(-24)"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1"
            opacity="0.5"
          />
          <circle cx="70" cy="0" r="3" fill="#a78bfa" transform="rotate(-24)" />
        </g>

        {/* Orbit ring 3 — amber, spins */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="360"
            dur="26s"
            repeatCount="indefinite"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="86"
            ry="30"
            transform="rotate(18)"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1"
            opacity="0.45"
          />
          <circle cx="86" cy="0" r="3" fill="#fbbf24" transform="rotate(18)" />
        </g>

        {/* Center label */}
        <text
          textAnchor="middle"
          dy="4"
          fill="#e8eaf2"
          fontFamily="ui-monospace, monospace"
          fontSize="9"
          letterSpacing="2"
        >
          {label}
        </text>
      </svg>

      <span className="mono-label absolute bottom-2 left-1/2 -translate-x-1/2 text-center text-[0.6rem] opacity-70">
        2D COMPATIBILITY MODE
      </span>
    </div>
  )
}
