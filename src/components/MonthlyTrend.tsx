import type { MonthlyProjectionRow } from '../lib/cashflow'
import { animateDelayMs } from '../lib/animStyle'

type Props = {
  rows: MonthlyProjectionRow[]
}

function shortTick(monthKey: string): string {
  const [y, mo] = monthKey.split('-')
  return `${String(y).slice(2)}.${mo}`
}

export function MonthlyTrend({ rows }: Props) {
  const max = Math.max(...rows.map((r) => r.totalPureMonthly), 1)

  return (
    <section className="monthly-trend" aria-labelledby="monthly-trend-heading">
      <div className="monthly-trend__head animate__animated animate__fadeInDown animate__faster">
        <div>
          <h2 id="monthly-trend-heading" className="monthly-trend__title">
            24개월 순현금
          </h2>
          <p className="monthly-trend__caption">
            세후 순현금 월별 추정 · 막대 높이는 최대 대비 비율입니다
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
          aria-label="24개월 순현금 세로 막대 차트, 좌우로 스크롤"
        >
          <div className="monthly-trend__chart">
            {rows.map((r, i) => {
              const pct = Math.max((r.totalPureMonthly / max) * 100, 0.35)
              const rounded = Math.round(r.totalPureMonthly)
              const title = `${r.label} — ${rounded.toLocaleString('ko-KR')} KRW`
              const stagger = Math.min(i * 22, 520)
              return (
                <div
                  key={r.monthKey}
                  className="monthly-trend__col animate__animated animate__fadeInUp animate__faster"
                  style={animateDelayMs(stagger)}
                >
                  <div className="monthly-trend__track-v" title={title}>
                    <div
                      className="monthly-trend__bar-v"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
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
