import { AssetEditor } from '../components/AssetEditor'
import { GpixHypoSection } from '../components/GpixHypoSection'
import { InteractionSettings } from '../components/InteractionSettings'
import { usePortfolio } from '../context/usePortfolio'
import { animateDelayMs } from '../lib/animStyle'
import {
  currentMonthMetrics,
  getPureDailies,
  pureDailyFromPretax,
} from '../lib/cashflow'
import { formatKrw, formatPercent } from '../lib/format'

export function AssetsPage() {
  const { inputs, setInputs, reset } = usePortfolio()
  const preview = currentMonthMetrics(inputs)
  const { cmaPureDay, ethPureDay } = getPureDailies(inputs)

  return (
    <div className="page assets-page">
      <header className="page__hero animate__animated animate__fadeIn animate__faster">
        <h1 className="page__title">자산 입력</h1>
        <p className="page__subtitle">
          스프레드시트와 동일하게 세전·세율 또는 월 세후 금액을 조정합니다.
        </p>
      </header>

      <aside
        className="assets-preview animate__animated animate__fadeIn animate__faster"
        style={animateDelayMs(70)}
      >
        <p className="assets-preview__title">미리보기</p>
        <dl className="assets-preview__dl">
          <div
            className="assets-preview__cell animate__animated animate__fadeIn animate__faster"
            style={animateDelayMs(90)}
          >
            <dt>CMA 순 일당</dt>
            <dd>{formatKrw(cmaPureDay)}</dd>
          </div>
          <div
            className="assets-preview__cell animate__animated animate__fadeIn animate__faster"
            style={animateDelayMs(150)}
          >
            <dt>ETH 순 일당</dt>
            <dd>{formatKrw(ethPureDay)}</dd>
          </div>
          <div
            className="assets-preview__cell animate__animated animate__fadeIn animate__faster"
            style={animateDelayMs(210)}
          >
            <dt>이번 달 순현금 (합계)</dt>
            <dd>{formatKrw(preview.monthlyTotal)}</dd>
          </div>
        </dl>
        <p className="assets-preview__fine">
          CMA 세후 일당 ={' '}
          {pureDailyFromPretax(inputs.cmaPretaxPerDay, inputs.cmaTaxRate).toFixed(
            2,
          )}{' '}
          ({formatPercent(inputs.cmaTaxRate)} 원천 가정)
        </p>
      </aside>

      <AssetEditor inputs={inputs} onChange={setInputs} onReset={reset} />

      <GpixHypoSection
        gpixGpiqMonthlyAfterTax={inputs.gpixGpiqMonthlyAfterTax}
        gpixBookKrw={inputs.gpixBookKrw}
        gpiqBookKrw={inputs.gpiqBookKrw}
      />

      <InteractionSettings style={animateDelayMs(400)} />
    </div>
  )
}
