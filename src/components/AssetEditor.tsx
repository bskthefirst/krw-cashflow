import type { AssetInputs } from '../lib/cashflow'
import { formatKrw, formatPercent } from '../lib/format'

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
      <section className="asset-editor__block">
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

      <section className="asset-editor__block">
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

      <section className="asset-editor__block">
        <h2 className="section-title">GPIX / GPIQ</h2>
        <p className="asset-editor__note">
          현재 보유 주수·구매가를 입력하면 장부 금액이 자동 계산됩니다. 월 세후 현금흐름은 실제 수령 금액을 직접 입력하세요.
        </p>

        <h3 className="asset-editor__sub-title">GPIX</h3>
        <label className="field">
          <span>보유 주수 (주)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.01}
            value={inputs.gpixShares}
            onChange={(e) =>
              onChange({ gpixShares: num(e.target.value) })
            }
          />
        </label>
        <label className="field">
          <span>구매가 (1주당 KRW)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            value={inputs.gpixPurchaseKrw}
            onChange={(e) =>
              onChange({ gpixPurchaseKrw: num(e.target.value) })
            }
          />
          <small className="field__meta">
            장부 금액 (자동): {formatKrw(inputs.gpixBookKrw)}
          </small>
        </label>

        <h3 className="asset-editor__sub-title">GPIQ</h3>
        <label className="field">
          <span>보유 주수 (주)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.01}
            value={inputs.gpiqShares}
            onChange={(e) =>
              onChange({ gpiqShares: num(e.target.value) })
            }
          />
        </label>
        <label className="field">
          <span>구매가 (1주당 KRW)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            value={inputs.gpiqPurchaseKrw}
            onChange={(e) =>
              onChange({ gpiqPurchaseKrw: num(e.target.value) })
            }
          />
          <small className="field__meta">
            장부 금액 (자동): {formatKrw(inputs.gpiqBookKrw)}
          </small>
        </label>

        <h3 className="asset-editor__sub-title">월 현금흐름</h3>
        <label className="field">
          <span>세후 월 현금흐름 합계 (KRW)</span>
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
          <small className="field__meta">
            증권사 월배당 실수령액. 연배당 ÷ 12 × (1 − 15.4%) 로 추산 가능.
          </small>
        </label>
      </section>

      <section className="asset-editor__block">
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

      <div className="asset-editor__actions">
        <button type="button" className="btn btn--ghost" onClick={onReset}>
          기본값으로 초기화
        </button>
      </div>
    </div>
  )
}
