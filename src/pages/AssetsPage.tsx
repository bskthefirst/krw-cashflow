import { AssetEditor } from '../components/AssetEditor'
import { GpixHypoSection } from '../components/GpixHypoSection'
import { InteractionSettings } from '../components/InteractionSettings'
import { usePortfolio } from '../context/usePortfolio'
import {
  currentMonthMetrics,
  getPureDailies,
  pureDailyFromPretax,
} from '../lib/cashflow'
import { formatKrw, formatPercent } from '../lib/format'
import { animateDelayMs } from '../lib/animStyle'

export function AssetsPage() {
  const { inputs, setInputs, reset } = usePortfolio()
  const preview = currentMonthMetrics(inputs)
  const { cmaPureDay, ethPureDay } = getPureDailies(inputs)

  return (
    <div className="page assets-page">
      <div className="assets-page__bg" aria-hidden />

      <header
        className="assets-page__hero page__hero animate__animated animate__fadeIn animate__faster"
        style={animateDelayMs(0)}
      >
        <p className="assets-page__kicker">설정 · 자산</p>
        <h1 className="page__title">자산 입력</h1>
        <p className="page__subtitle">
          스프레드시트와 동일하게 세전·세율 또는 월 세후 금액을 조정합니다.
        </p>
      </header>

      <aside
        className="assets-preview animate__animated animate__fadeIn animate__faster"
        style={animateDelayMs(45)}
      >
        <p className="assets-preview__title">미리보기</p>
        <dl className="assets-preview__dl">
          <div className="assets-preview__cell">
            <dt>CMA 순 일당</dt>
            <dd>{formatKrw(cmaPureDay)}</dd>
          </div>
          <div className="assets-preview__cell">
            <dt>ETH 순 일당</dt>
            <dd>{formatKrw(ethPureDay)}</dd>
          </div>
          <div className="assets-preview__cell assets-preview__cell--highlight">
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

      <div className="assets-page__columns">
        <section
          className="assets-page__panel assets-page__panel--editor animate__animated animate__fadeIn animate__faster"
          style={animateDelayMs(90)}
          aria-labelledby="assets-panel-editor-heading"
        >
          <div className="assets-page__panel-head">
            <h2 id="assets-panel-editor-heading" className="assets-page__panel-title">
              현금흐름 가정
            </h2>
            <p className="assets-page__panel-desc">
              CMA · ETH 일당과 ETF 배당·장부. 대시보드에 바로 반영됩니다.
            </p>
          </div>
          <AssetEditor inputs={inputs} onChange={setInputs} onReset={reset} />
        </section>

        <section
          className="assets-page__panel assets-page__panel--sim animate__animated animate__fadeIn animate__faster"
          style={animateDelayMs(130)}
        >
          <GpixHypoSection
            gpixGpiqMonthlyAfterTax={inputs.gpixGpiqMonthlyAfterTax}
            gpixBookKrw={inputs.gpixBookKrw}
            gpiqBookKrw={inputs.gpiqBookKrw}
            gpixAnnualYieldRate={inputs.gpixAnnualYieldRate}
            gpiqAnnualYieldRate={inputs.gpiqAnnualYieldRate}
            etfWithholdingRate={inputs.etfWithholdingRate}
          />
        </section>
      </div>

      <div
        className="assets-page__panel assets-page__panel--prefs animate__animated animate__fadeIn animate__faster"
        style={animateDelayMs(170)}
      >
        <InteractionSettings />
      </div>
    </div>
  )
}
