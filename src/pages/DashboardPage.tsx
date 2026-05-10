import { MetricCard } from '../components/MetricCard'
import { MonthlyTrend } from '../components/MonthlyTrend'
import { usePortfolio } from '../context/usePortfolio'
import { useTapRubberBand } from '../hooks/useTapRubberBand'
import { animateDelayMs } from '../lib/animStyle'
import {
  buildMonthlyProjection,
  currentMonthMetrics,
  getPureDailies,
  projectionTotals,
} from '../lib/cashflow'
import { formatKrw } from '../lib/format'

function BreakdownTile(props: {
  delayMs: number
  ariaLabel: string
  name: string
  value: string
  sub: string
}) {
  const { trigger, onPopEnd, tapOverlayClass, tapOverlayStyle } =
    useTapRubberBand()

  const delayStyle = animateDelayMs(props.delayMs)

  return (
    <div
      className="breakdown-item animate__animated animate__fadeIn animate__faster"
      style={delayStyle}
    >
      <div
        role="button"
        tabIndex={0}
        className={`breakdown-item__tap${tapOverlayClass ? ` ${tapOverlayClass}` : ''}`}
        style={tapOverlayStyle}
        aria-label={props.ariaLabel}
        onClick={trigger}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          trigger()
        }}
        onAnimationEnd={onPopEnd}
      >
        <span className="breakdown-item__name">{props.name}</span>
        <span className="breakdown-item__val">{props.value}</span>
        <span className="breakdown-item__sub">{props.sub}</span>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { inputs } = usePortfolio()
  const now = currentMonthMetrics(inputs)
  const projection = buildMonthlyProjection(inputs, 24)
  const { sum24, avgMonthly } = projectionTotals(projection)
  const { cmaPureDay, ethPureDay } = getPureDailies(inputs)

  return (
    <div className="page dashboard">
      <header className="page__hero animate__animated animate__fadeIn animate__faster">
        <h1 className="page__title">순현금 대시보드</h1>
        <p className="page__subtitle">
          이번 달 기준 세후 순현금 (KRW). 자산 입력에서 숫자를 바꾸면 즉시
          반영됩니다.
        </p>
      </header>

      <section className="dashboard__kpis">
        <MetricCard
          variant="hero"
          label="이번 달 순현금 (월)"
          value={formatKrw(now.monthlyTotal)}
          hint={`${now.daysInMonth}일 기준`}
          delayMs={40}
        />
        <MetricCard
          label="순현금 (일 평균)"
          value={formatKrw(now.totalPureDaily)}
          hint="CMA + ETH 일당 + GPIX/GPIQ 일할"
          delayMs={110}
        />
        <MetricCard
          label="24개월 합계"
          value={formatKrw(sum24)}
          hint="예측 시작월부터 24개월"
          delayMs={180}
        />
        <MetricCard
          label="24개월 월평균"
          value={formatKrw(avgMonthly)}
          delayMs={250}
        />
      </section>

      <section className="dashboard__breakdown">
        <h2
          className="section-title animate__animated animate__fadeIn animate__faster"
          style={animateDelayMs(10)}
        >
          이번 달 구성
        </h2>
        <div className="breakdown-grid">
          <BreakdownTile
            delayMs={60}
            ariaLabel="CMA monthly pure cashflow. Tap for haptic bounce."
            name="CMA (월)"
            value={formatKrw(now.cmaPureMonthly)}
            sub={`일 ${formatKrw(cmaPureDay)} · 세후`}
          />
          <BreakdownTile
            delayMs={130}
            ariaLabel="ETH staking monthly pure cashflow. Tap for haptic bounce."
            name="ETH (월)"
            value={formatKrw(now.ethPureMonthly)}
            sub={`일 ${formatKrw(ethPureDay)} · 세후`}
          />
          <BreakdownTile
            delayMs={200}
            ariaLabel="GPIX GPIQ monthly pure cashflow. Tap for haptic bounce."
            name="GPIX/GPIQ (월)"
            value={formatKrw(now.gpixMonthly)}
            sub={`일할 ${formatKrw(now.gpixPureDaily)}`}
          />
        </div>
      </section>

      <MonthlyTrend rows={projection} />
    </div>
  )
}
