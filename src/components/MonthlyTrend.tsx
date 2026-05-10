import { useCallback, useState } from 'react'
import type { MonthlyProjectionRow } from '../lib/cashflow'
import { animateDelayMs } from '../lib/animStyle'

type Props = {
  rows: MonthlyProjectionRow[]
}

function shortTick(monthKey: string): string {
  const [y, mo] = monthKey.split('-')
  return `${String(y).slice(2)}.${mo}`
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function MonthlyTrend({ rows }: Props) {
  const max = Math.max(...rows.map((r) => r.totalPureMonthly), 1)
  const [jelloKey, setJelloKey] = useState<string | null>(null)

  const playJello = useCallback((monthKey: string) => {
    if (prefersReducedMotion()) return
    /* Replay: clear then re-apply next frame so CSS animation restarts */
    setJelloKey(null)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setJelloKey(monthKey))
    })
  }, [])

  const onJelloEnd = useCallback((monthKey: string) => {
    setJelloKey((k) => (k === monthKey ? null : k))
  }, [])

  return (
    <section className="monthly-trend" aria-labelledby="monthly-trend-heading">
      <div className="monthly-trend__head animate__animated animate__fadeInDown animate__faster">
        <div>
          <h2 id="monthly-trend-heading" className="monthly-trend__title">
            24개월 순현금
          </h2>
          <p className="monthly-trend__caption">
            세후 순현금 월별 추정 · 막대를 누르면 통통{' '}
            <span className="monthly-trend__caption-wink" aria-hidden>
              ✨
            </span>
          </p>
        </div>
      </div>

      <div
        className="monthly-trend__panel animate__animated animate__fadeInUp animate__faster"
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
          aria-label="24개월 순현금 세로 막대 차트, 좌우로 스크롤. 각 막대를 누르면 애니메이션"
        >
          <div className="monthly-trend__chart">
            {rows.map((r, i) => {
              const pct = Math.max((r.totalPureMonthly / max) * 100, 0.35)
              const rounded = Math.round(r.totalPureMonthly)
              const title = `${r.label} — ${rounded.toLocaleString('ko-KR')} KRW`
              const stagger = Math.min(i * 22, 520)
              const isJello = jelloKey === r.monthKey

              return (
                <div
                  key={r.monthKey}
                  className="monthly-trend__col animate__animated animate__fadeInUp animate__faster"
                  style={animateDelayMs(stagger)}
                >
                  <button
                    type="button"
                    className={
                      isJello
                        ? 'monthly-trend__hit animate__animated animate__jello animate__faster'
                        : 'monthly-trend__hit'
                    }
                    aria-label={`${r.label} 순현금 막대. 탭하면 통통 애니메이션`}
                    title={`${title} · 탭하면 통통`}
                    onClick={(e) => {
                      e.stopPropagation()
                      playJello(r.monthKey)
                    }}
                    onAnimationEnd={() => onJelloEnd(r.monthKey)}
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
