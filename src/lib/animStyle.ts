import type { CSSProperties } from 'react'

/** Animate.css v4 `--animate-delay` helper */
export function animateDelayMs(ms: number): CSSProperties {
  return { '--animate-delay': `${ms}ms` } as CSSProperties
}
