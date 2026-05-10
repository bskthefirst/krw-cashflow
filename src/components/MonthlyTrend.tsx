import type { CSSProperties } from 'react'
import { useCallback, useState } from 'react'
import { animateDelayMs } from '../lib/animStyle'
import type { MonthlyProjectionRow } from '../lib/cashflow'
import {
  prefersReducedMotion,
  TAP_POP_DURATION,
  triggerTapPopFeedback,
} from '../lib/tapPopFeedback'

type Props = {
  rows: MonthlyProjectionRow[]
}

function shortTick(monthKey: string): string {
  const [y, mo] = monthKey.split('-')
  return `${String(y).slice(2)}.${mo}`
}

export function MonthlyTrend({ rows }: Props) {
  const max = Math.max(...rows.map((r) => r.totalPureMonthly), 1)
  const [activeBarKey, setActiveBarKey] = useState<string | null>(null)

  const playBarPop = useCallback((monthKey: string) => {
    if (prefersReducedMotion()) return

    triggerTapPopFeedback()

    setActiveBarKey(null)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setActiveBarKey(monthKey))
    })
  }, [])

  const onBarPopEnd = useCallback((monthKey: string) => {
    setActiveBarKey((k) => (k === monthKey ? null : k))
  }, [])

  return (
    <section className="monthly-trend" aria-labelledby="monthly-trend-heading">
      <div className="monthly-trend__head animate__animated animate__fadeIn animate__faster">
        <div>
          <h2 id="monthly-trend-heading" className="monthly-trend__title">
            24개월 순현금
          </h2>
          <p className="monthly-trend__caption">
            세후 순현금 월별 추정 · 막대를 누르면 천천히 탄성 있게 움직여요{' '}
            <span className="monthly-trend__caption-wink" aria-hidden>
              ✨
            </span>
          </p>
        </div>
      </div>

      <div
        className="monthly-trend__panel animate__animated animate__fadeIn animate__faster"
        style={animateDelayMs(90)}
      >
        <div className="monthly-trend__y-axis" aria-hidden>
          <span className="monthly-trend__y-label">고</span>
          <div className="monthly-trend__y-grid" />
          <span className="monthly-trend__y-label">저</span>
        </div>

        <div
          className="monthly-trend__scroll"
          tabIndex={0}
          role="region"
          aria-label="24-month vertical cashflow chart. Scroll horizontally. Tap a bar for animation."
        >
          <div className="monthly-trend__chart">
            {rows.map((r, i) => {
              const pct = Math.max((r.totalPureMonthly / max) * 100, 0.35)
              const rounded = Math.round(r.totalPureMonthly)
              const title = `${r.label} — ${rounded.toLocaleString('ko-KR')} KRW`
              const stagger = Math.min(i * 22, 520)
              const isPop = activeBarKey === r.monthKey

              const popStyle = isPop
                ? ({
                    '--animate-duration': TAP_POP_DURATION,
                  } as CSSProperties)
                : undefined

              return (
                <div
                  key={r.monthKey}
                  className="monthly-trend__col animate__animated animate__fadeIn animate__faster"
                  style={animateDelayMs(stagger)}
                >
                  <button
                    type="button"
                    className={
                      isPop
                        ? 'monthly-trend__hit animate__animated animate__rubberBand'
                        : 'monthly-trend__hit'
                    }
                    style={popStyle}
                    aria-label={`${r.label} cashflow bar. Tap for elastic animation.`}
                    title={`${title} · tap`}
                    onClick={(e) => {
                      e.stopPropagation()
                      playBarPop(r.monthKey)
                    }}
                    onAnimationEnd={() => onBarPopEnd(r.monthKey)}
                  >
                    <div className="monthly-trend__track-v">
                      <div
                        className="monthly-trend__bar-v"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                  </button>
                  <span className="monthly-trend__tick">{shortTick(r.monthKey)}</span>
                  <span className="monthly-trend__col-value">
                    {rounded.toLocaleString('ko-KR')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
