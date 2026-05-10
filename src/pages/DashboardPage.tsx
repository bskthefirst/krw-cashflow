import { MetricCard } from '../components/MetricCard'
import { MonthlyTrend } from '../components/MonthlyTrend'
import { usePortfolio } from '../context/usePortfolio'
import {
  buildMonthlyProjection,
  currentMonthMetrics,
  getPureDailies,
  projectionTotals,
} from '../lib/cashflow'
import { formatKrw } from '../lib/format'

export function DashboardPage() {
  const { inputs } = usePortfolio()
  const now = currentMonthMetrics(inputs)
  const projection = buildMonthlyProjection(inputs, 24)
  const { sum24, avgMonthly } = projectionTotals(projection)
  const { cmaPureDay, ethPureDay } = getPureDailies(inputs)

  return (
    <div className="page dashboard">
      <header className="page__hero">
        <h1 className="page__title">순현금 대시보드</h1>
        <p className="page__subtitle">
          이번 달 기준 세후 순현금 (KRW). 자산 입력에서 숫자를 바꾸면 즉시
          반영됩니다.
        </p>
      </header>

      <section className="dashboard__kpis">
        <MetricCard
          label="이번 달 순현금 (월)"
          value={formatKrw(now.monthlyTotal)}
          hint={`${now.daysInMonth}일 기준`}
        />
        <MetricCard
          label="순현금 (일 평균)"
          value={formatKrw(now.totalPureDaily)}
          hint="CMA + ETH 일당 + GPIX/GPIQ 일할"
        />
        <MetricCard
          label="24개월 합계"
          value={formatKrw(sum24)}
          hint="예측 시작월부터 24개월"
        />
        <MetricCard
          label="24개월 월평균"
          value={formatKrw(avgMonthly)}
        />
      </section>

      <section className="dashboard__breakdown">
        <h2 className="section-title">이번 달 구성</h2>
        <div className="breakdown-grid">
          <div className="breakdown-item">
            <span className="breakdown-item__name">CMA (월)</span>
            <span className="breakdown-item__val">
              {formatKrw(now.cmaPureMonthly)}
            </span>
            <span className="breakdown-item__sub">
              일 {formatKrw(cmaPureDay)} · 세후
            </span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-item__name">ETH (월)</span>
            <span className="breakdown-item__val">
              {formatKrw(now.ethPureMonthly)}
            </span>
            <span className="breakdown-item__sub">
              일 {formatKrw(ethPureDay)} · 세후
            </span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-item__name">GPIX/GPIQ (월)</span>
            <span className="breakdown-item__val">
              {formatKrw(now.gpixMonthly)}
            </span>
            <span className="breakdown-item__sub">
              일할 {formatKrw(now.gpixPureDaily)}
            </span>
          </div>
        </div>
      </section>

      <MonthlyTrend rows={projection} />
    </div>
  )
}
