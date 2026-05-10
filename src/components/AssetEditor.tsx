import type { AssetInputs } from '../lib/cashflow'
import { animateDelayMs } from '../lib/animStyle'
import { formatPercent } from '../lib/format'

type Props = {
  inputs: AssetInputs
  onChange: (patch: Partial<AssetInputs>) => void
  onReset: () => void
}

function num(v: string): number {
  const n = Number.parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

export function AssetEditor({ inputs, onChange, onReset }: Props) {
  return (
    <div className="asset-editor">
      <section
        className="asset-editor__block animate__animated animate__fadeIn animate__faster"
        style={animateDelayMs(40)}
      >
        <h2 className="section-title">발행어음 CMA</h2>
        <label className="field">
          <span>세전 일당 (KRW)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            value={inputs.cmaPretaxPerDay}
            onChange={(e) =>
              onChange({ cmaPretaxPerDay: num(e.target.value) })
            }
          />
        </label>
        <label className="field">
          <span>세율 (원천징수 등)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={1}
            step={0.001}
            value={inputs.cmaTaxRate}
            onChange={(e) =>
              onChange({ cmaTaxRate: num(e.target.value) })
            }
          />
          <small className="field__meta">{formatPercent(inputs.cmaTaxRate)}</small>
        </label>
      </section>

      <section
        className="asset-editor__block animate__animated animate__fadeIn animate__faster"
        style={animateDelayMs(110)}
      >
        <h2 className="section-title">ETH 스테이킹</h2>
        <label className="field">
          <span>세전 일당 (KRW)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            value={inputs.ethPretaxPerDay}
            onChange={(e) =>
              onChange({ ethPretaxPerDay: num(e.target.value) })
            }
          />
        </label>
        <label className="field">
          <span>세율</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={1}
            step={0.01}
            value={inputs.ethTaxRate}
            onChange={(e) =>
              onChange({ ethTaxRate: num(e.target.value) })
            }
          />
          <small className="field__meta">{formatPercent(inputs.ethTaxRate)}</small>
        </label>
      </section>

      <section
        className="asset-editor__block animate__animated animate__fadeIn animate__faster"
        style={animateDelayMs(180)}
      >
        <h2 className="section-title">GPIX / GPIQ</h2>
        <p className="asset-editor__note">
          세후 월별 순현금 <strong>합계</strong>와, 종목별 <strong>매수·장부 금액</strong>을
          여기서 같이 둡니다. 아래 시뮬은 이 장부 금액을 그대로 씁니다.
        </p>
        <label className="field">
          <span>세후 월 현금흐름 (KRW)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={100}
            value={inputs.gpixGpiqMonthlyAfterTax}
            onChange={(e) =>
              onChange({ gpixGpiqMonthlyAfterTax: num(e.target.value) })
            }
          />
        </label>
        <label className="field">
          <span>GPIX 매수·장부 금액 (KRW)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={10000}
            value={inputs.gpixBookKrw}
            onChange={(e) => onChange({ gpixBookKrw: num(e.target.value) })}
          />
          <small className="field__meta">
            그 종목에 묶여 있는 금액(보통 매수 원금·증권 앱 표시). 월 세후 ÷ 이 금액으로 비율을 냅니다.
          </small>
        </label>
        <label className="field">
          <span>GPIQ 매수·장부 금액 (KRW)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={10000}
            value={inputs.gpiqBookKrw}
            onChange={(e) => onChange({ gpiqBookKrw: num(e.target.value) })}
          />
          <small className="field__meta">
            GPIX와 별도입니다. 시뮬의 장부 입력은 모두 여기서만 바뀝니다.
          </small>
        </label>
      </section>

      <section
        className="asset-editor__block animate__animated animate__fadeIn animate__faster"
        style={animateDelayMs(250)}
      >
        <h2 className="section-title">예측 시작월</h2>
        <label className="field">
          <span>24개월 차트 시작 (매월 1일)</span>
          <input
            type="month"
            value={inputs.forecastStartMonth.slice(0, 7)}
            onChange={(e) => {
              const v = e.target.value
              if (!v) return
              onChange({ forecastStartMonth: `${v}-01` })
            }}
          />
        </label>
      </section>

      <div
        className="asset-editor__actions animate__animated animate__fadeIn animate__faster"
        style={animateDelayMs(320)}
      >
        <button type="button" className="btn btn--ghost" onClick={onReset}>
          기본값으로 초기화
        </button>
      </div>
    </div>
  )
}
