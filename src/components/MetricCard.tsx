import type { CSSProperties, ReactNode } from 'react'
import { animateDelayMs } from '../lib/animStyle'

type Props = {
  label: string
  value: string
  hint?: string
  /** Stagger entrance animation (ms). Uses Animate.css `--animate-delay`. */
  delayMs?: number
  children?: ReactNode
}

export function MetricCard({
  label,
  value,
  hint,
  delayMs = 0,
  children,
}: Props) {
  const delayStyle: CSSProperties | undefined =
    delayMs > 0 ? animateDelayMs(delayMs) : undefined

  return (
    <article
      className="metric-card animate__animated animate__fadeInUp animate__faster"
      style={delayStyle}
    >
      <p className="metric-card__label">{label}</p>
      <p className="metric-card__value">{value}</p>
      {hint ? <p className="metric-card__hint">{hint}</p> : null}
      {children}
    </article>
  )
}
