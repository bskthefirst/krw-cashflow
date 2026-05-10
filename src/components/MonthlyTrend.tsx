import type { MonthlyProjectionRow } from '../lib/cashflow'

type Props = {
  rows: MonthlyProjectionRow[]
}

export function MonthlyTrend({ rows }: Props) {
  const max = Math.max(...rows.map((r) => r.totalPureMonthly), 1)
  const barMaxWidth = 100

  return (
    <div className="monthly-trend">
      <h2 className="section-title">24개월 순현금</h2>
      <ul className="monthly-trend__list" aria-label="월별 순현금 막대">
        {rows.map((r) => {
          const pct = (r.totalPureMonthly / max) * barMaxWidth
          return (
            <li key={r.monthKey} className="monthly-trend__row">
              <span className="monthly-trend__label">{r.label}</span>
              <div className="monthly-trend__track">
                <span
                  className="monthly-trend__bar"
                  style={{ width: `${pct}%` }}
                  title={`${r.totalPureMonthly.toLocaleString('ko-KR')} KRW`}
                />
              </div>
              <span className="monthly-trend__num">
                {r.totalPureMonthly.toLocaleString('ko-KR')}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
