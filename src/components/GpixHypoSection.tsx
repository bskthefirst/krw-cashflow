import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { loadEtfPrices, type EtfPricesPayload } from '../lib/etfPrices'
import {
  extraMonthlyAfterTaxSeparate,
  marginalMonthlyPerKrw,
  monthlyCashSplitByBook,
} from '../lib/hypoYield'
import { formatKrw, formatPercent } from '../lib/format'

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
  /** True if this leg’s KRW was last driven from the 금액 field (vs 주). */
  gpixLedByKrw?: boolean
  gpiqLedByKrw?: boolean
}

function finite(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function asBool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined
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
        gpixLedByKrw: asBool(p.gpixLedByKrw),
        gpiqLedByKrw: asBool(p.gpiqLedByKrw),
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
  /** 금액-led user cleared 주; keep input empty instead of snapping derived 주 back in (controlled-input race). */
  const [gpixHideDerivedShares, setGpixHideDerivedShares] = useState(false)
  const [gpiqHideDerivedShares, setGpiqHideDerivedShares] = useState(false)
  const gpixSharesDraftRef = useRef('')
  const gpiqSharesDraftRef = useRef('')
  const hypoLatestRef = useRef(hypo)
  const etfLatestRef = useRef<EtfPricesPayload | null>(null)

  useLayoutEffect(() => {
    hypoLatestRef.current = hypo
    etfLatestRef.current = etf
    gpixSharesDraftRef.current = gpixSharesDraft
    gpiqSharesDraftRef.current = gpiqSharesDraft
  }, [hypo, etf, gpixSharesDraft, gpiqSharesDraft])

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
    const prevEtf = etfLatestRef.current
    setEtf(payload)

    const gpixQuote = payload.quotes.GPIX
    const gpiqQuote = payload.quotes.GPIQ
    const h = hypoLatestRef.current

    let gpixShares = num(gpixSharesDraftRef.current)
    let gpiqShares = num(gpiqSharesDraftRef.current)

    const oldGpixPx = prevEtf?.quotes?.GPIX?.krwPerShare
    const oldGpiqPx = prevEtf?.quotes?.GPIQ?.krwPerShare
    const inferredFromKrwGpix =
      gpixShares <= 0 &&
      h.extraGpixKrw > 0 &&
      typeof oldGpixPx === 'number' &&
      oldGpixPx > 0
    const inferredFromKrwGpiq =
      gpiqShares <= 0 &&
      h.extraGpiqKrw > 0 &&
      typeof oldGpiqPx === 'number' &&
      oldGpiqPx > 0
    if (inferredFromKrwGpix) gpixShares = h.extraGpixKrw / oldGpixPx
    if (inferredFromKrwGpiq) gpiqShares = h.extraGpiqKrw / oldGpiqPx

    if (gpixShares <= 0 && gpiqShares <= 0) return
    setHypo((prev) => ({
      ...prev,
      extraGpixKrw:
        gpixShares > 0 && gpixQuote && gpixQuote.krwPerShare > 0
          ? gpixShares * gpixQuote.krwPerShare
          : prev.extraGpixKrw,
      extraGpiqKrw:
        gpiqShares > 0 && gpiqQuote && gpiqQuote.krwPerShare > 0
          ? gpiqShares * gpiqQuote.krwPerShare
          : prev.extraGpiqKrw,
    }))
    setGpixHideDerivedShares(false)
    setGpiqHideDerivedShares(false)
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
    try {
      localStorage.setItem(HYPO_STORAGE_KEY_V2, JSON.stringify(hypo))
    } catch {
      /* ignore quota / private mode */
    }
  }, [hypo])

  const separateExtra = useMemo(
    () =>
      extraMonthlyAfterTaxSeparate({
        portfolioMonthlyAfterTax: gpixGpiqMonthlyAfterTax,
        gpixMonthlyAfterTax: splitMonthly.gpixMonthlyAfterTax,
        gpiqMonthlyAfterTax: splitMonthly.gpiqMonthlyAfterTax,
        gpixBookKrw,
        gpiqBookKrw,
        extraGpixKrw: hypo.extraGpixKrw,
        extraGpiqKrw: hypo.extraGpiqKrw,
      }),
    [splitMonthly, gpixBookKrw, gpiqBookKrw, hypo, gpixGpiqMonthlyAfterTax],
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

  /** When draft is empty, show shares implied by persisted KRW (avoids blank reload + no setState-in-effect). */
  const gpixSharesInputValue = useMemo(() => {
    if (gpixSharesDraft !== '') return gpixSharesDraft
    if (gpixHideDerivedShares && hypo.gpixLedByKrw === true) return ''
    if (!gpix || gpix.krwPerShare <= 0 || hypo.extraGpixKrw <= 0) return ''
    const sh = hypo.extraGpixKrw / gpix.krwPerShare
    if (!Number.isFinite(sh) || sh <= 0) return ''
    return String(Math.round(sh * 1_000_000) / 1_000_000)
  }, [
    gpixSharesDraft,
    gpixHideDerivedShares,
    hypo.gpixLedByKrw,
    gpix,
    hypo.extraGpixKrw,
  ])

  const gpiqSharesInputValue = useMemo(() => {
    if (gpiqSharesDraft !== '') return gpiqSharesDraft
    if (gpiqHideDerivedShares && hypo.gpiqLedByKrw === true) return ''
    if (!gpiq || gpiq.krwPerShare <= 0 || hypo.extraGpiqKrw <= 0) return ''
    const sh = hypo.extraGpiqKrw / gpiq.krwPerShare
    if (!Number.isFinite(sh) || sh <= 0) return ''
    return String(Math.round(sh * 1_000_000) / 1_000_000)
  }, [
    gpiqSharesDraft,
    gpiqHideDerivedShares,
    hypo.gpiqLedByKrw,
    gpiq,
    hypo.extraGpiqKrw,
  ])

  const extraGpixShares =
    gpix && gpix.krwPerShare > 0 ? hypo.extraGpixKrw / gpix.krwPerShare : null
  const extraGpiqShares =
    gpiq && gpiq.krwPerShare > 0 ? hypo.extraGpiqKrw / gpiq.krwPerShare : null

  const highlightKrw = useMemo(() => {
    if (focus === 'gpix') return separateExtra.fromGpix
    if (focus === 'gpiq') return separateExtra.fromGpiq
    return separateExtra.total
  }, [focus, separateExtra.fromGpix, separateExtra.fromGpiq, separateExtra.total])

  const activeBuy =
    focus === 'gpix'
      ? hypo.extraGpixKrw > 0
      : focus === 'gpiq'
        ? hypo.extraGpiqKrw > 0
        : hypo.extraGpixKrw > 0 || hypo.extraGpiqKrw > 0

  const yieldBasisKrw =
    focus === 'gpix'
      ? hypo.extraGpixKrw
      : focus === 'gpiq'
        ? hypo.extraGpiqKrw
        : hypo.extraGpixKrw + hypo.extraGpiqKrw

  const monthlyYieldOnBasis =
    yieldBasisKrw > 0 && highlightKrw >= 0 ? highlightKrw / yieldBasisKrw : null

  const showYieldCard = activeBuy && gpixGpiqMonthlyAfterTax > 0

  const usesProportionalGpix =
    hypo.extraGpixKrw > 0 && gpixBookKrw <= 0 && gpixGpiqMonthlyAfterTax > 0
  const usesProportionalGpiq =
    hypo.extraGpiqKrw > 0 && gpiqBookKrw <= 0 && gpixGpiqMonthlyAfterTax > 0

  const bothForecastBreak = useMemo(() => {
    const parts: string[] = []
    if (hypo.extraGpixKrw > 0) {
      parts.push(`GPIX +${formatKrw(Math.round(separateExtra.fromGpix))}/월`)
    }
    if (hypo.extraGpiqKrw > 0) {
      parts.push(`GPIQ +${formatKrw(Math.round(separateExtra.fromGpiq))}/월`)
    }
    return parts.join(' · ')
  }, [
    hypo.extraGpixKrw,
    hypo.extraGpiqKrw,
    separateExtra.fromGpix,
    separateExtra.fromGpiq,
  ])

  const needsMonthlyMsg = activeBuy && gpixGpiqMonthlyAfterTax <= 0

  function setExtraGpixFromShares(shares: number) {
    setGpixHideDerivedShares(false)
    const px = etf?.quotes?.GPIX
    if (!px || px.krwPerShare <= 0 || !Number.isFinite(shares) || shares < 0) return
    setHypo((h) => ({
      ...h,
      extraGpixKrw: shares * px.krwPerShare,
      gpixLedByKrw: false,
    }))
  }

  function setExtraGpiqFromShares(shares: number) {
    setGpiqHideDerivedShares(false)
    const pq = etf?.quotes?.GPIQ
    if (!pq || pq.krwPerShare <= 0 || !Number.isFinite(shares) || shares < 0) return
    setHypo((h) => ({
      ...h,
      extraGpiqKrw: shares * pq.krwPerShare,
      gpiqLedByKrw: false,
    }))
  }

  const sumBook = gpixBookKrw + gpiqBookKrw

  return (
    <section className="hypo-section" aria-labelledby="hypo-section-heading">
      <h2 id="hypo-section-heading" className="hypo-section__title">
        GPIX / GPIQ · 추가 매수 월 세후 수익
      </h2>
      <p className="hypo-section__note">
        주 또는 KRW로 추가 매수를 넣으면, 그만큼의 <strong>월 세후 현금흐름</strong>과{' '}
        <strong>월 수익률</strong>을 보여 줍니다. (위 «세후 월 현금흐름» 합계 필요)
      </p>

      <div className="hypo-prices">
        <div className="hypo-prices__toolbar">
          <span className="hypo-prices__caption">참고 시세</span>
          <button
            type="button"
            className="btn btn--ghost hypo-prices__refresh"
            onClick={() => void refreshPrices()}
            disabled={refreshing}
            aria-busy={refreshing}
          >
            {refreshing ? '갱신 중' : '갱신'}
          </button>
        </div>
        <div className="hypo-prices__list">
          {(focus === 'both' || focus === 'gpix') && (
            <span className="hypo-prices__sym">
              GPIX{' '}
              {gpix ? (
                <>
                  {formatKrw(gpix.krwPerShare, 0)}
                  <span className="hypo-prices__usd"> {formatUsd(gpix.usd)}</span>
                </>
              ) : (
                <span className="hypo-prices__pending">—</span>
              )}
            </span>
          )}
          {focus === 'both' && <span className="hypo-prices__sep">·</span>}
          {(focus === 'both' || focus === 'gpiq') && (
            <span className="hypo-prices__sym">
              GPIQ{' '}
              {gpiq ? (
                <>
                  {formatKrw(gpiq.krwPerShare, 0)}
                  <span className="hypo-prices__usd"> {formatUsd(gpiq.usd)}</span>
                </>
              ) : (
                <span className="hypo-prices__pending">—</span>
              )}
            </span>
          )}
        </div>
        {etf && (
          <p className="hypo-prices__meta">
            USD/KRW {etf.usdKrw.toFixed(0)} · {formatAsOf(etf.asOf)}
          </p>
        )}
        {priceFailed && (
          <p className="hypo-prices__warn" role="alert">
            시세를 불러오지 못했습니다. 로컬:{' '}
            <code className="hypo-inline-code">npm run fetch-etf-prices</code>
          </p>
        )}
      </div>

      <div className="hypo-calc">
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

        <h3 className="hypo-calc__buy-heading">추가 주</h3>
        {showGpix && (
          <label className="field hypo-field">
            <span>GPIX</span>
            <div className="hypo-field__row">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder={gpix ? `주당 ${formatKrw(gpix.krwPerShare, 0)}` : '시세 로딩 후 입력'}
                value={gpixSharesInputValue}
                onChange={(e) => {
                  const raw = e.target.value
                  setGpixSharesDraft(raw)
                  const v = num(raw)
                  if (raw === '') {
                    if (gpixSharesDraft !== '') {
                      setGpixHideDerivedShares(false)
                      setHypo((h) => ({ ...h, extraGpixKrw: 0, gpixLedByKrw: false }))
                    } else if (hypo.gpixLedByKrw === true && hypo.extraGpixKrw > 0) {
                      setGpixHideDerivedShares(true)
                    } else {
                      setGpixHideDerivedShares(false)
                      setHypo((h) => ({ ...h, extraGpixKrw: 0, gpixLedByKrw: false }))
                    }
                    return
                  }
                  if (v > 0 && gpix && gpix.krwPerShare > 0) {
                    setExtraGpixFromShares(v)
                  }
                }}
                onBlur={(e) => {
                  const raw = e.target.value
                  const v = num(raw)
                  if (raw !== '' && v > 0) return
                  setGpixSharesDraft('')
                  if (raw === '' && hypo.gpixLedByKrw === true && hypo.extraGpixKrw > 0) return
                  setGpixHideDerivedShares(false)
                  setHypo((h) => ({ ...h, extraGpixKrw: 0, gpixLedByKrw: false }))
                }}
              />
              {gpix && gpix.krwPerShare > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost hypo-field__chip"
                  onClick={() => {
                    const next = (num(gpixSharesInputValue) > 0 ? num(gpixSharesInputValue) : 0) + 1
                    setGpixSharesDraft(String(next))
                    setExtraGpixFromShares(next)
                  }}
                >
                  +1주
                </button>
              )}
            </div>
          </label>
        )}
        {showGpiq && (
          <label className="field hypo-field">
            <span>GPIQ</span>
            <div className="hypo-field__row">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder={gpiq ? `주당 ${formatKrw(gpiq.krwPerShare, 0)}` : '시세 로딩 후 입력'}
                value={gpiqSharesInputValue}
                onChange={(e) => {
                  const raw = e.target.value
                  setGpiqSharesDraft(raw)
                  const v = num(raw)
                  if (raw === '') {
                    if (gpiqSharesDraft !== '') {
                      setGpiqHideDerivedShares(false)
                      setHypo((h) => ({ ...h, extraGpiqKrw: 0, gpiqLedByKrw: false }))
                    } else if (hypo.gpiqLedByKrw === true && hypo.extraGpiqKrw > 0) {
                      setGpiqHideDerivedShares(true)
                    } else {
                      setGpiqHideDerivedShares(false)
                      setHypo((h) => ({ ...h, extraGpiqKrw: 0, gpiqLedByKrw: false }))
                    }
                    return
                  }
                  if (v > 0 && gpiq && gpiq.krwPerShare > 0) {
                    setExtraGpiqFromShares(v)
                  }
                }}
                onBlur={(e) => {
                  const raw = e.target.value
                  const v = num(raw)
                  if (raw !== '' && v > 0) return
                  setGpiqSharesDraft('')
                  if (raw === '' && hypo.gpiqLedByKrw === true && hypo.extraGpiqKrw > 0) return
                  setGpiqHideDerivedShares(false)
                  setHypo((h) => ({ ...h, extraGpiqKrw: 0, gpiqLedByKrw: false }))
                }}
              />
              {gpiq && gpiq.krwPerShare > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost hypo-field__chip"
                  onClick={() => {
                    const next = (num(gpiqSharesInputValue) > 0 ? num(gpiqSharesInputValue) : 0) + 1
                    setGpiqSharesDraft(String(next))
                    setExtraGpiqFromShares(next)
                  }}
                >
                  +1주
                </button>
              )}
            </div>
          </label>
        )}

        <details className="hypo-calc__details">
          <summary className="hypo-calc__details-sum">월 세후·장부 분배</summary>
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

        <h3 className="hypo-calc__buy-heading">금액 (KRW, 선택)</h3>

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
                  setGpixHideDerivedShares(false)
                  setHypo((h) => ({
                    ...h,
                    extraGpixKrw: num(e.target.value),
                    gpixLedByKrw: true,
                  }))
                }}
              />
              {gpix && gpix.krwPerShare > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost hypo-field__chip"
                  onClick={() => {
                    setGpixHideDerivedShares(false)
                    setHypo((h) => ({
                      ...h,
                      extraGpixKrw: h.extraGpixKrw + gpix.krwPerShare,
                      gpixLedByKrw: true,
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
                  setGpiqHideDerivedShares(false)
                  setHypo((h) => ({
                    ...h,
                    extraGpiqKrw: num(e.target.value),
                    gpiqLedByKrw: true,
                  }))
                }}
              />
              {gpiq && gpiq.krwPerShare > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost hypo-field__chip"
                  onClick={() => {
                    setGpiqHideDerivedShares(false)
                    setHypo((h) => ({
                      ...h,
                      extraGpiqKrw: h.extraGpiqKrw + gpiq.krwPerShare,
                      gpiqLedByKrw: true,
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
            {extraGpiqShares !== null && hypo.extraGpiqKrw > 0 && (
              <small className="field__meta">≈ {extraGpiqShares.toFixed(3)} 주 (참고 시세)</small>
            )}
          </label>
        )}

        <div
          className="hypo-calc__result hypo-calc__result--forecast"
          aria-live="polite"
        >
          {needsMonthlyMsg && (
            <p className="hypo-calc__warn">
              위에서 <strong>세후 월 현금흐름 (GPIX+GPIQ 합계)</strong>를 먼저 입력해야 월 세후 수익을 볼 수 있습니다.
            </p>
          )}

          {showYieldCard && (
            <div className="hypo-calc__forecast-card">
              <p className="hypo-calc__forecast-label">추가 매수분 · 월 세후 현금 (세후)</p>
              <p className="hypo-calc__forecast-value">
                {focus === 'both' ? (
                  <>
                    {bothForecastBreak ? (
                      <span className="hypo-calc__forecast-break">{bothForecastBreak}</span>
                    ) : null}
                    <span className="hypo-calc__forecast-total">
                      합계{' '}
                      <strong>{formatKrw(Math.round(separateExtra.total))}</strong>
                      <span className="hypo-calc__per-unit"> /월</span>
                    </span>
                  </>
                ) : (
                  <>
                    <strong>{formatKrw(Math.round(highlightKrw))}</strong>
                    <span className="hypo-calc__per-unit"> /월</span>
                  </>
                )}
              </p>
              {monthlyYieldOnBasis !== null && monthlyYieldOnBasis >= 0 && (
                <p className="hypo-calc__yield-rate">
                  추가분 대비 월 수익률 (세후): <strong>{formatPercent(monthlyYieldOnBasis)}</strong>
                </p>
              )}
              {(usesProportionalGpix || usesProportionalGpiq) && (
                <p className="hypo-calc__muted hypo-calc__fineprint">
                  장부가 비어 있는 종목은 월 세후를 (기존 장부+추가매수) 비율로 나눠 계산합니다.
                </p>
              )}
            </div>
          )}

          {gpixGpiqMonthlyAfterTax > 0 && !activeBuy && (
            <p className="hypo-calc__muted hypo-calc__hint-nudge">
              추가 주 또는 금액을 입력하면 월 세후 수익이 표시됩니다.
            </p>
          )}

          <details className="hypo-calc__details hypo-calc__details--sub">
            <summary className="hypo-calc__details-sum">효율</summary>
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
