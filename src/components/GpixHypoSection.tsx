import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { animateDelayMs } from '../lib/animStyle'
import { loadEtfPrices, type EtfPricesPayload } from '../lib/etfPrices'
import {
  extraMonthlyAfterTaxSeparate,
  marginalMonthlyPerKrw,
  monthlyCashSplitByBook,
} from '../lib/hypoYield'
import { formatKrw } from '../lib/format'

const HYPO_STORAGE_KEY_V2 = 'krw-cashflow-hypo-v2'
const HYPO_STORAGE_KEY_V1 = 'krw-cashflow-hypo-v1'
const HYPO_FOCUS_KEY = 'krw-cashflow-hypo-focus-v1'

type HypoFocus = 'both' | 'gpix' | 'gpiq'

function loadFocus(): HypoFocus {
  try {
    const raw = localStorage.getItem(HYPO_FOCUS_KEY)
    if (raw === 'gpix' || raw === 'gpiq' || raw === 'both') return raw
  } catch {
    /* ignore */
  }
  return 'both'
}

/** Persisted: 추가 매수만 (월 세후 분배는 자산 입력에서 자동) */
type HypoPersist = {
  extraGpixKrw: number
  extraGpiqKrw: number
}

function finite(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function loadHypo(): HypoPersist {
  const empty: HypoPersist = { extraGpixKrw: 0, extraGpiqKrw: 0 }
  try {
    const rawV2 = localStorage.getItem(HYPO_STORAGE_KEY_V2)
    if (rawV2) {
      const p = JSON.parse(rawV2) as Partial<HypoPersist & Record<string, unknown>>
      return {
        extraGpixKrw: finite(p.extraGpixKrw),
        extraGpiqKrw: finite(p.extraGpiqKrw),
      }
    }
    const rawV1 = localStorage.getItem(HYPO_STORAGE_KEY_V1)
    if (rawV1) {
      const p = JSON.parse(rawV1) as {
        extraGpixKrw?: number
        extraGpiqKrw?: number
      }
      return {
        ...empty,
        extraGpixKrw: finite(p.extraGpixKrw),
        extraGpiqKrw: finite(p.extraGpiqKrw),
      }
    }
  } catch {
    /* ignore */
  }
  return empty
}

function num(v: string): number {
  const n = Number.parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatAsOf(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso
  }
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

type Props = {
  gpixGpiqMonthlyAfterTax: number
  gpixBookKrw: number
  gpiqBookKrw: number
}

export function GpixHypoSection({
  gpixGpiqMonthlyAfterTax,
  gpixBookKrw,
  gpiqBookKrw,
}: Props) {
  const [etf, setEtf] = useState<EtfPricesPayload | null>(null)
  const [priceFailed, setPriceFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [focus, setFocus] = useState<HypoFocus>(() => loadFocus())
  const [hypo, setHypo] = useState<HypoPersist>(() => loadHypo())
  const [gpixSharesDraft, setGpixSharesDraft] = useState('')
  const [gpiqSharesDraft, setGpiqSharesDraft] = useState('')
  const gpixSharesDraftRef = useRef('')
  const gpiqSharesDraftRef = useRef('')

  useLayoutEffect(() => {
    gpixSharesDraftRef.current = gpixSharesDraft
    gpiqSharesDraftRef.current = gpiqSharesDraft
  }, [gpixSharesDraft, gpiqSharesDraft])

  useEffect(() => {
    try {
      localStorage.setItem(HYPO_FOCUS_KEY, focus)
    } catch {
      /* ignore */
    }
  }, [focus])

  const showGpix = focus === 'both' || focus === 'gpix'
  const showGpiq = focus === 'both' || focus === 'gpiq'

  const splitMonthly = useMemo(
    () =>
      monthlyCashSplitByBook({
        totalMonthlyAfterTax: gpixGpiqMonthlyAfterTax,
        gpixBookKrw,
        gpiqBookKrw,
      }),
    [gpixGpiqMonthlyAfterTax, gpixBookKrw, gpiqBookKrw],
  )

  const applyPrices = useCallback((payload: EtfPricesPayload | null) => {
    if (!payload) {
      setPriceFailed(true)
      setEtf(null)
      return
    }
    setPriceFailed(false)
    setEtf(payload)

    const gpixQuote = payload.quotes.GPIX
    const gpiqQuote = payload.quotes.GPIQ
    const gpixShares = num(gpixSharesDraftRef.current)
    const gpiqShares = num(gpiqSharesDraftRef.current)
    if (gpixShares <= 0 && gpiqShares <= 0) return
    setHypo((h) => ({
      ...h,
      extraGpixKrw:
        gpixShares > 0 && gpixQuote && gpixQuote.krwPerShare > 0
          ? gpixShares * gpixQuote.krwPerShare
          : h.extraGpixKrw,
      extraGpiqKrw:
        gpiqShares > 0 && gpiqQuote && gpiqQuote.krwPerShare > 0
          ? gpiqShares * gpiqQuote.krwPerShare
          : h.extraGpiqKrw,
    }))
  }, [])

  const refreshPrices = useCallback(async () => {
    setRefreshing(true)
    try {
      const payload = await loadEtfPrices(import.meta.env.BASE_URL)
      applyPrices(payload)
    } finally {
      setRefreshing(false)
    }
  }, [applyPrices])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const payload = await loadEtfPrices(import.meta.env.BASE_URL)
      if (cancelled) return
      applyPrices(payload)
    })()
    return () => {
      cancelled = true
    }
  }, [applyPrices])

  useEffect(() => {
    localStorage.setItem(HYPO_STORAGE_KEY_V2, JSON.stringify(hypo))
  }, [hypo])

  const extraTotal = hypo.extraGpixKrw + hypo.extraGpiqKrw

  const separateExtra = useMemo(
    () =>
      extraMonthlyAfterTaxSeparate({
        gpixMonthlyAfterTax: splitMonthly.gpixMonthlyAfterTax,
        gpiqMonthlyAfterTax: splitMonthly.gpiqMonthlyAfterTax,
        gpixBookKrw,
        gpiqBookKrw,
        extraGpixKrw: hypo.extraGpixKrw,
        extraGpiqKrw: hypo.extraGpiqKrw,
      }),
    [splitMonthly, gpixBookKrw, gpiqBookKrw, hypo],
  )

  const marginalGpix = useMemo(
    () =>
      marginalMonthlyPerKrw(splitMonthly.gpixMonthlyAfterTax, gpixBookKrw),
    [splitMonthly.gpixMonthlyAfterTax, gpixBookKrw],
  )
  const marginalGpiq = useMemo(
    () =>
      marginalMonthlyPerKrw(splitMonthly.gpiqMonthlyAfterTax, gpiqBookKrw),
    [splitMonthly.gpiqMonthlyAfterTax, gpiqBookKrw],
  )

  const gpix = etf?.quotes?.GPIX
  const gpiq = etf?.quotes?.GPIQ

  const extraGpixShares =
    gpix && gpix.krwPerShare > 0 ? hypo.extraGpixKrw / gpix.krwPerShare : null
  const extraGpiqShares =
    gpiq && gpiq.krwPerShare > 0 ? hypo.extraGpiqKrw / gpiq.krwPerShare : null

  const hasBookForExtra =
    (hypo.extraGpixKrw > 0 && gpixBookKrw > 0) ||
    (hypo.extraGpiqKrw > 0 && gpiqBookKrw > 0)

  const highlightKrw = useMemo(() => {
    if (focus === 'gpix') return separateExtra.fromGpix
    if (focus === 'gpiq') return separateExtra.fromGpiq
    return separateExtra.total
  }, [focus, separateExtra.fromGpix, separateExtra.fromGpiq, separateExtra.total])

  const showHighlight =
    highlightKrw > 0 &&
    ((focus === 'gpix' && hypo.extraGpixKrw > 0 && gpixBookKrw > 0) ||
      (focus === 'gpiq' && hypo.extraGpiqKrw > 0 && gpiqBookKrw > 0) ||
      (focus === 'both' && extraTotal > 0 && hasBookForExtra))

  const highlightRef = useRef<HTMLParagraphElement>(null)

  const bothForecastBreak = useMemo(() => {
    const parts: string[] = []
    if (hypo.extraGpixKrw > 0 && gpixBookKrw > 0) {
      parts.push(`GPIX +${formatKrw(Math.round(separateExtra.fromGpix))}`)
    }
    if (hypo.extraGpiqKrw > 0 && gpiqBookKrw > 0) {
      parts.push(`GPIQ +${formatKrw(Math.round(separateExtra.fromGpiq))}`)
    }
    return parts.join(' · ')
  }, [
    hypo.extraGpixKrw,
    hypo.extraGpiqKrw,
    gpixBookKrw,
    gpiqBookKrw,
    separateExtra.fromGpix,
    separateExtra.fromGpiq,
  ])

  useLayoutEffect(() => {
    const el = highlightRef.current
    if (!el || !showHighlight) {
      return
    }
    el.classList.remove('hypo-calc__forecast-value--pop')
    requestAnimationFrame(() => {
      void el.offsetWidth
      el.classList.add('hypo-calc__forecast-value--pop')
    })
  }, [highlightKrw, showHighlight])

  const needsBookMsg =
    (showGpix && hypo.extraGpixKrw > 0 && gpixBookKrw <= 0) ||
    (showGpiq && hypo.extraGpiqKrw > 0 && gpiqBookKrw <= 0)

  function setExtraGpixFromShares(shares: number) {
    const px = etf?.quotes?.GPIX
    if (!px || px.krwPerShare <= 0 || !Number.isFinite(shares) || shares < 0) return
    setHypo((h) => ({ ...h, extraGpixKrw: shares * px.krwPerShare }))
  }

  function setExtraGpiqFromShares(shares: number) {
    const pq = etf?.quotes?.GPIQ
    if (!pq || pq.krwPerShare <= 0 || !Number.isFinite(shares) || shares < 0) return
    setHypo((h) => ({ ...h, extraGpiqKrw: shares * pq.krwPerShare }))
  }

  const sumBook = gpixBookKrw + gpiqBookKrw

  return (
    <section
      className="hypo-section animate__animated animate__fadeIn animate__faster"
      style={animateDelayMs(320)}
      aria-labelledby="hypo-section-heading"
    >
      <div className="hypo-section__head">
        <h2 id="hypo-section-heading" className="section-title hypo-section__title animate__animated animate__fadeIn animate__faster">
          추가 매수 → 예상 월 세후
        </h2>
        <span
          className="hypo-pill animate__animated animate__fadeIn animate__faster"
          style={animateDelayMs(90)}
          title="대시보드와 무관한 시뮬"
        >
          시뮬
        </span>
      </div>

      <p className="asset-editor__note hypo-section__note animate__animated animate__fadeIn animate__faster" style={animateDelayMs(40)}>
        <strong>여기서는 추가 매수만</strong> 넣습니다. 월 세후는 위 «세후 월 현금흐름» 합계를, 종목 나눔은 위 «매수·장부 금액» 비율로{' '}
        <strong>자동 적용</strong>합니다. 대시보드 숫자는 바뀌지 않습니다.
      </p>

      <div
        className="hypo-etf-bar animate__animated animate__fadeIn animate__faster"
        style={animateDelayMs(120)}
      >
        <div className="hypo-etf-bar__head">
          <span className="hypo-etf-bar__label">참고 시세</span>
          <button
            type="button"
            className="btn btn--ghost hypo-etf-bar__btn hypo-etf-bar__btn--bounce"
            onClick={() => void refreshPrices()}
            disabled={refreshing}
            aria-busy={refreshing}
            aria-label={refreshing ? '시세 새로고침 중' : '참고 시세 새로고침'}
          >
            <span
              className={`hypo-refresh-icon${refreshing ? ' hypo-refresh-icon--spin' : ''}`}
              aria-hidden
            >
              ↻
            </span>
            <span className="hypo-etf-bar__btn-text">{refreshing ? '불러오는 중…' : '새로고침'}</span>
          </button>
        </div>
        {etf && (
          <p className="hypo-etf-bar__meta animate__animated animate__fadeIn animate__faster">
            USD/KRW {etf.usdKrw.toFixed(2)} · 갱신 {formatAsOf(etf.asOf)}
          </p>
        )}
        {priceFailed && (
          <p className="hypo-etf-bar__warn animate__animated animate__headShake animate__faster" role="alert">
            시세 파일을 불러오지 못했습니다. 로컬에서는{' '}
            <code className="hypo-inline-code">npm run fetch-etf-prices</code> 로{' '}
            <code className="hypo-inline-code">public/etf-prices.json</code> 을 만든 뒤 다시 시도하세요.
          </p>
        )}
        <div className="hypo-etf-grid">
          {(focus === 'both' || focus === 'gpix') && (
            <div
              className="hypo-etf-card hypo-etf-card--gpix animate__animated animate__fadeIn animate__faster"
              style={animateDelayMs(etf ? 20 : 0)}
            >
              <div className="hypo-etf-card__sym">GPIX</div>
              {gpix ? (
                <>
                  <div className="hypo-etf-card__price">{formatKrw(gpix.krwPerShare, 0)}</div>
                  <div className="hypo-etf-card__sub">{formatUsd(gpix.usd)} · 주당</div>
                </>
              ) : (
                <div className="hypo-etf-card__muted hypo-etf-card__muted--wait" aria-hidden>
                  …
                </div>
              )}
            </div>
          )}
          {(focus === 'both' || focus === 'gpiq') && (
            <div
              className="hypo-etf-card hypo-etf-card--gpiq animate__animated animate__fadeIn animate__faster"
              style={animateDelayMs(etf ? 100 : 0)}
            >
              <div className="hypo-etf-card__sym">GPIQ</div>
              {gpiq ? (
                <>
                  <div className="hypo-etf-card__price">{formatKrw(gpiq.krwPerShare, 0)}</div>
                  <div className="hypo-etf-card__sub">{formatUsd(gpiq.usd)} · 주당</div>
                </>
              ) : (
                <div className="hypo-etf-card__muted hypo-etf-card__muted--wait" aria-hidden>
                  …
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className="hypo-calc hypo-calc--simple animate__animated animate__fadeIn animate__faster"
        style={animateDelayMs(200)}
      >
        <div className="hypo-focus-tabs" role="tablist" aria-label="추가 매수 종목">
          <button
            type="button"
            role="tab"
            aria-selected={focus === 'both'}
            className="hypo-focus-tabs__btn"
            onClick={() => setFocus('both')}
          >
            둘 다
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={focus === 'gpix'}
            className="hypo-focus-tabs__btn"
            onClick={() => setFocus('gpix')}
          >
            GPIX만
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={focus === 'gpiq'}
            className="hypo-focus-tabs__btn"
            onClick={() => setFocus('gpiq')}
          >
            GPIQ만
          </button>
        </div>

        <details className="hypo-calc__details">
          <summary className="hypo-calc__details-sum">월 세후·장부는 어떻게 쓰이나요?</summary>
          <p className="hypo-calc__details-body">
            월 세후 합계 <strong>{formatKrw(gpixGpiqMonthlyAfterTax)}</strong> 을 종목별로{' '}
            {sumBook > 0 ? (
              <>
                장부 비율로 나눕니다 (GPIX {formatKrw(splitMonthly.gpixMonthlyAfterTax)} · GPIQ{' '}
                {formatKrw(splitMonthly.gpiqMonthlyAfterTax)}).
              </>
            ) : (
              <>장부가 비어 있으면 50:50으로 나눕니다.</>
            )}{' '}
            장부: GPIX <strong>{formatKrw(gpixBookKrw)}</strong> · GPIQ <strong>{formatKrw(gpiqBookKrw)}</strong>
            — 위 입력에서 바꿉니다.
          </p>
        </details>

        <h3 className="hypo-calc__buy-heading">추가 매수 (KRW)</h3>

        {showGpix && (
          <label className="field hypo-field">
            <span>GPIX 더 살 금액</span>
            <div className="hypo-field__row">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={10000}
                value={hypo.extraGpixKrw}
                onChange={(e) => {
                  setGpixSharesDraft('')
                  setHypo((h) => ({ ...h, extraGpixKrw: num(e.target.value) }))
                }}
              />
              {gpix && gpix.krwPerShare > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost hypo-field__chip"
                  onClick={() => {
                    setHypo((h) => ({
                      ...h,
                      extraGpixKrw: h.extraGpixKrw + gpix.krwPerShare,
                    }))
                    setGpixSharesDraft((prev) => {
                      const current = num(prev)
                      return String((current > 0 ? current : 0) + 1)
                    })
                  }}
                >
                  +1주
                </button>
              )}
            </div>
            {hypo.extraGpixKrw > 0 && gpixBookKrw <= 0 && (
              <small className="field__meta hypo-calc__field-warn">
                위 «GPIX 매수·장부 금액»을 넣어야 예측이 나옵니다.
              </small>
            )}
            {extraGpixShares !== null && hypo.extraGpixKrw > 0 && (
              <small className="field__meta">≈ {extraGpixShares.toFixed(3)} 주 (참고 시세)</small>
            )}
          </label>
        )}

        {showGpiq && (
          <label className="field hypo-field">
            <span>GPIQ 더 살 금액</span>
            <div className="hypo-field__row">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={10000}
                value={hypo.extraGpiqKrw}
                onChange={(e) => {
                  setGpiqSharesDraft('')
                  setHypo((h) => ({ ...h, extraGpiqKrw: num(e.target.value) }))
                }}
              />
              {gpiq && gpiq.krwPerShare > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost hypo-field__chip"
                  onClick={() => {
                    setHypo((h) => ({
                      ...h,
                      extraGpiqKrw: h.extraGpiqKrw + gpiq.krwPerShare,
                    }))
                    setGpiqSharesDraft((prev) => {
                      const current = num(prev)
                      return String((current > 0 ? current : 0) + 1)
                    })
                  }}
                >
                  +1주
                </button>
              )}
            </div>
            {hypo.extraGpiqKrw > 0 && gpiqBookKrw <= 0 && (
              <small className="field__meta hypo-calc__field-warn">
                위 «GPIQ 매수·장부 금액»을 넣어야 예측이 나옵니다.
              </small>
            )}
            {extraGpiqShares !== null && hypo.extraGpiqKrw > 0 && (
              <small className="field__meta">≈ {extraGpiqShares.toFixed(3)} 주 (참고 시세)</small>
            )}
          </label>
        )}

        <details className="hypo-calc__details hypo-calc__details--sub">
          <summary className="hypo-calc__details-sum">주 단위로 입력 (선택)</summary>
          {showGpix && (
            <label className="field hypo-field">
              <span>GPIX 추가 주 수</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder={gpix ? `참고 주당 ${formatKrw(gpix.krwPerShare, 0)}` : ''}
                value={gpixSharesDraft}
                onChange={(e) => {
                  const raw = e.target.value
                  setGpixSharesDraft(raw)
                  const v = num(raw)
                  if (raw === '' || v === 0) {
                    setHypo((h) => ({ ...h, extraGpixKrw: 0 }))
                    return
                  }
                  if (gpix && gpix.krwPerShare > 0) {
                    setExtraGpixFromShares(v)
                  }
                }}
              />
            </label>
          )}
          {showGpiq && (
            <label className="field hypo-field">
              <span>GPIQ 추가 주 수</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder={gpiq ? `참고 주당 ${formatKrw(gpiq.krwPerShare, 0)}` : ''}
                value={gpiqSharesDraft}
                onChange={(e) => {
                  const raw = e.target.value
                  setGpiqSharesDraft(raw)
                  const v = num(raw)
                  if (raw === '' || v === 0) {
                    setHypo((h) => ({ ...h, extraGpiqKrw: 0 }))
                    return
                  }
                  if (gpiq && gpiq.krwPerShare > 0) {
                    setExtraGpiqFromShares(v)
                  }
                }}
              />
            </label>
          )}
        </details>

        <div className="hypo-calc__result hypo-calc__result--forecast">
          {needsBookMsg && (
            <p className="hypo-calc__warn animate__animated animate__fadeIn animate__faster">
              위 «GPIX / GPIQ» 블록에 매수·장부 금액을 넣어야 예측이 나옵니다.
            </p>
          )}

          {showHighlight && (
            <div className="hypo-calc__forecast-card">
              <p className="hypo-calc__forecast-label">예상 월 세후 증가 (추정)</p>
              <p
                ref={highlightRef}
                className="hypo-calc__forecast-value hypo-calc__forecast-value--pop"
              >
                {focus === 'both' ? (
                  <>
                    {bothForecastBreak ? (
                      <span className="hypo-calc__forecast-break">{bothForecastBreak}</span>
                    ) : null}
                    <span className="hypo-calc__forecast-total">
                      합계 <strong>{formatKrw(Math.round(separateExtra.total))}</strong>
                    </span>
                  </>
                ) : (
                  <strong>{formatKrw(Math.round(highlightKrw))}</strong>
                )}
              </p>
            </div>
          )}

          {((focus === 'both' && extraTotal > 0) ||
            (focus === 'gpix' && hypo.extraGpixKrw > 0) ||
            (focus === 'gpiq' && hypo.extraGpiqKrw > 0)) &&
            !hasBookForExtra && (
              <p className="hypo-calc__muted hypo-calc__hint-nudge">
                위에서 해당 종목 매수·장부 금액을 채우세요.
              </p>
            )}

          {((focus === 'both' && extraTotal <= 0 && (gpixBookKrw > 0 || gpiqBookKrw > 0)) ||
            (focus === 'gpix' && hypo.extraGpixKrw <= 0 && gpixBookKrw > 0) ||
            (focus === 'gpiq' && hypo.extraGpiqKrw <= 0 && gpiqBookKrw > 0)) && (
              <p className="hypo-calc__muted hypo-calc__hint-nudge">
                더 살 금액을 입력하면 예측이 표시됩니다.
              </p>
            )}

          <details className="hypo-calc__details hypo-calc__details--sub">
            <summary className="hypo-calc__details-sum">계산 세부 (선택)</summary>
            {showGpix && marginalGpix !== null && gpixBookKrw > 0 && (
              <p className="hypo-calc__line">
                GPIX 효율: 월 세후 <strong>{marginalGpix.toFixed(6)}</strong> / 보유 KRW / 월
              </p>
            )}
            {showGpiq && marginalGpiq !== null && gpiqBookKrw > 0 && (
              <p className="hypo-calc__line">
                GPIQ 효율: 월 세후 <strong>{marginalGpiq.toFixed(6)}</strong> / 보유 KRW / 월
              </p>
            )}
          </details>
        </div>
      </div>
    </section>
  )
}
