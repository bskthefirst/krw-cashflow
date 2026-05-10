import type { CSSProperties, ReactNode } from 'react'
import { useTapRubberBand } from '../hooks/useTapRubberBand'
import { animateDelayMs } from '../lib/animStyle'

type Props = {
  label: string
  value: string
  hint?: string
  /** Stagger entrance animation (ms). Uses Animate.css `--animate-delay`. */
  delayMs?: number
  /** Strong purple styling for the primary KPI. */
  variant?: 'default' | 'hero'
  children?: ReactNode
}

export function MetricCard({
  label,
  value,
  hint,
  delayMs = 0,
  variant = 'default',
  children,
}: Props) {
  const { trigger, onPopEnd, tapOverlayClass, tapOverlayStyle } =
    useTapRubberBand()

  const delayStyle: CSSProperties | undefined =
    delayMs > 0 ? animateDelayMs(delayMs) : undefined

  return (
    <article
      className={`metric-card animate__animated animate__fadeInUp animate__faster${
        variant === 'hero' ? ' metric-card--hero' : ''
      }`}
      style={delayStyle}
      data-kpi={variant === 'hero' ? 'primary' : undefined}
    >
      <div
        role="button"
        tabIndex={0}
        className={`metric-card__tap${tapOverlayClass ? ` ${tapOverlayClass}` : ''}`}
        style={tapOverlayStyle}
        aria-label={`${label}. Tap for haptic bounce.`}
        onClick={trigger}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          trigger()
        }}
        onAnimationEnd={onPopEnd}
      >
        <p className="metric-card__label">{label}</p>
        <p className="metric-card__value">{value}</p>
        {hint ? <p className="metric-card__hint">{hint}</p> : null}
        {children}
      </div>
    </article>
  )
}
