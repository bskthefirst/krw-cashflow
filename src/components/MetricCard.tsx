import type { ReactNode } from 'react'

type Props = {
  label: string
  value: string
  hint?: string
  children?: ReactNode
}

export function MetricCard({ label, value, hint, children }: Props) {
  return (
    <article className="metric-card">
      <p className="metric-card__label">{label}</p>
      <p className="metric-card__value">{value}</p>
      {hint ? <p className="metric-card__hint">{hint}</p> : null}
      {children}
    </article>
  )
}
