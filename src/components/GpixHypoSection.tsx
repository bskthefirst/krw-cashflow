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

type HypoPersist = {
  gpixMonthlyAfterTax: number
  gpiqMonthlyAfterTax: number
  extraGpixKrw: number
  extraGpiqKrw: number
}

function finite(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

/** First paint only: if 시뮬 월 세후가 비어 있으면 자산 합계를 50:50으로 채움 (저장된 값이 있으면 유지) */
function seedMonthlyIfBlank(h: HypoPersist, portfolioTotal: number): HypoPersist {
  if (h.gpixMonthlyAfterTax !== 0 || h.gpiqMonthlyAfterTax !== 0) {
    return h
  }
  if (portfolioTotal <= 0) {
    return h
  }
  const half = portfolioTotal / 2
  return {
    ...h,
    gpixMonthlyAfterTax: half,
    gpiqMonthlyAfterTax: half,
  }
}

function loadHypo(): HypoPersist {
  const empty: HypoPersist = {
    gpixMonthlyAfterTax: 0,
    gpiqMonthlyAfterTax: 0,
    extraGpixKrw: 0,
    extraGpiqKrw: 0,
  }
  try {
    const rawV2 = localStorage.getItem(HYPO_STORAGE_KEY_V2)
    if (rawV2) {
      const p = JSON.parse(rawV2) as Partial<HypoPersist & { gpixBookKrw?: number; gpiqBookKrw?: number }>
      return {
        gpixMonthlyAfterTax: finite(p.gpixMonthlyAfterTax),
        gpiqMonthlyAfterTax: finite(p.gpiqMonthlyAfterTax),
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
  /** From 자산 입력 — single source of truth */
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
  const [hypo, setHypo] = useState<HypoPersist>(() =>
    seedMonthlyIfBlank(loadHypo(), gpixGpiqMonthlyAfterTax),
  )

  useEffect(() => {
    try {
      localStorage.setItem(HYPO_FOCUS_KEY, focus)
    } catch {
      /* ignore */
    }
  }, [focus])

  const showGpix = focus === 'both' || focus === 'gpix'
  const showGpiq = focus === 'both' || focus === 'gpiq'

  const applyPrices = useCallback((payload: EtfPricesPayload | null) => {
    if (!payload) {
      setPriceFailed(true)
      setEtf(null)
      return
    }
    setPriceFailed(false)
    setEtf(payload)
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

  const monthlySimSum = hypo.gpixMonthlyAfterTax + hypo.gpiqMonthlyAfterTax
  const portfolioMismatch =
    gpixGpiqMonthlyAfterTax > 0 &&
    Math.abs(monthlySimSum - gpixGpiqMonthlyAfterTax) > 0.5

  const separateExtra = useMemo(
    () =>
      extraMonthlyAfterTaxSeparate({
        gpixMonthlyAfterTax: hypo.gpixMonthlyAfterTax,
        gpiqMonthlyAfterTax: hypo.gpiqMonthlyAfterTax,
        gpixBookKrw,
        gpiqBookKrw,
        extraGpixKrw: hypo.extraGpixKrw,
        extraGpiqKrw: hypo.extraGpiqKrw,
      }),
    [hypo, gpixBookKrw, gpiqBookKrw],
  )

  const marginalGpix = useMemo(
    () => marginalMonthlyPerKrw(hypo.gpixMonthlyAfterTax, gpixBookKrw),
    [hypo.gpixMonthlyAfterTax, gpixBookKrw],
  )
  const marginalGpiq = useMemo(
    () => marginalMonthlyPerKrw(hypo.gpiqMonthlyAfterTax, gpiqBookKrw),
    [hypo.gpiqMonthlyAfterTax, gpiqBookKrw],
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

  useLayoutEffect(() => {
    const el = highlightRef.current
    if (!el || !showHighlight) {
      return
    }
    el.classList.remove('hypo-calc__highlight--pop')
    requestAnimationFrame(() => {
      void el.offsetWidth
      el.classList.add('hypo-calc__highlight--pop')
    })
  }, [highlightKrw, showHighlight])

  function applyHalfSplitFromPortfolio() {
    if (gpixGpiqMonthlyAfterTax <= 0) return
    const half = gpixGpiqMonthlyAfterTax / 2
    setHypo((h) => ({
      ...h,
      gpixMonthlyAfterTax: half,
      gpiqMonthlyAfterTax: half,
    }))
  }

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

  return (
    <section
      className="hypo-section animate__animated animate__fadeInUp animate__faster"
      style={animateDelayMs(320)}
      aria-labelledby="hypo-section-heading"
    >
      <div className="hypo-section__head">
        <h2 id="hypo-section-heading" className="section-title hypo-section__title animate__animated animate__fadeInLeft animate__faster">
          GPIX · GPIQ 시세 &amp; 가정 계산
        </h2>
        <span
          className="hypo-pill animate__animated animate__bounceIn animate__faster"
          style={animateDelayMs(90)}
          title="대시보드와 무관한 시뮬레이션"
        >
          시뮬
        </span>
      </div>

      <p className="asset-editor__note hypo-section__note animate__animated animate__fadeIn animate__faster" style={animateDelayMs(40)}>
        미국 상장 ETF <strong>GPIX</strong>와 <strong>GPIQ</strong>는 서로 다른 상품입니다. 아래에서 종목만 골라도 됩니다. 순서:{' '}
        <strong>① 장부·이 종목 월 세후</strong> → <strong>② 추가 매수 (금액 또는 주)</strong> →{' '}
        <strong>③ 예상 월 세후 증가</strong>. 대시보드에는 반영되지 않습니다.
      </p>

      <div
        className="hypo-etf-bar animate__animated animate__zoomIn animate__faster"
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
              className="hypo-etf-card hypo-etf-card--gpix animate__animated animate__fadeInUp animate__faster"
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
              className="hypo-etf-card hypo-etf-card--gpiq animate__animated animate__fadeInUp animate__faster"
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
        className="hypo-calc animate__animated animate__slideInUp animate__faster"
        style={animateDelayMs(200)}
      >
        <div className="hypo-focus-tabs" role="tablist" aria-label="시뮬에서 보여 줄 종목">
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

        <div className="hypo-calc__linked-books" role="region" aria-label="연결된 장부 금액">
          <p className="hypo-calc__linked-books__title">매수·장부 금액 (위 «GPIX / GPIQ» 입력과 연결됨)</p>
          {showGpix && (
            <p className="hypo-calc__linked-books__row">
              GPIX: <strong>{formatKrw(gpixBookKrw)}</strong>
            </p>
          )}
          {showGpiq && (
            <p className="hypo-calc__linked-books__row">
              GPIQ: <strong>{formatKrw(gpiqBookKrw)}</strong>
            </p>
          )}
          <p className="hypo-calc__linked-books__hint">
            숫자를 바꾸려면 이 페이지 <strong>위쪽</strong> GPIX/GPIQ 섹션의 «매수·장부 금액» 칸을 수정하세요.
          </p>
        </div>

        <p className="hypo-calc__ref">
          자산 입력의 GPIX+GPIQ 월 세후 합계:{' '}
          <strong className="hypo-calc__ref-strong">{formatKrw(gpixGpiqMonthlyAfterTax)}</strong>
          {gpixGpiqMonthlyAfterTax > 0 && (
            <button
              type="button"
              className="hypo-calc__sync-btn"
              onClick={applyHalfSplitFromPortfolio}
            >
              시뮬 월 세후를 합계 기준 50:50으로 맞추기
            </button>
          )}
        </p>

        {showGpix && (
          <label className="field hypo-field">
            <span>GPIX 월 세후 (시뮬, KRW)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={100}
              value={hypo.gpixMonthlyAfterTax}
              onChange={(e) =>
                setHypo((h) => ({ ...h, gpixMonthlyAfterTax: num(e.target.value) }))
              }
            />
            <small className="field__meta">이 종목만의 월 세후 현금.</small>
          </label>
        )}

        {showGpiq && (
          <label className="field hypo-field">
            <span>GPIQ 월 세후 (시뮬, KRW)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={100}
              value={hypo.gpiqMonthlyAfterTax}
              onChange={(e) =>
                setHypo((h) => ({ ...h, gpiqMonthlyAfterTax: num(e.target.value) }))
              }
            />
            <small className="field__meta">이 종목만의 월 세후 현금.</small>
          </label>
        )}

        {showGpix && showGpiq && portfolioMismatch && (
          <p className="hypo-calc__portfolio-warn animate__animated animate__fadeIn animate__faster" role="status">
            시뮬 월 세후 합계 {formatKrw(monthlySimSum)} ≠ 자산 입력 합계 {formatKrw(gpixGpiqMonthlyAfterTax)} — 의도한 경우 무시해도 됩니다.
          </p>
        )}

        {showGpix && showGpiq && (
          <p className="hypo-calc__hint-rule field__meta">
            종목별 월 세후 ÷ 해당 종목 장부 = 그 종목만의 보유 KRW당 월 세후 효율(추정).
          </p>
        )}

        {showGpix && (
          <>
            <label className="field hypo-field">
              <span>GPIX 추가 매수 (KRW)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={10000}
                value={hypo.extraGpixKrw}
                onChange={(e) =>
                  setHypo((h) => ({ ...h, extraGpixKrw: num(e.target.value) }))
                }
              />
              {hypo.extraGpixKrw > 0 && gpixBookKrw <= 0 && (
                <small className="field__meta hypo-calc__field-warn">
                  위 GPIX 매수·장부 금액을 넣어야 예상 월 세후 증가가 나옵니다.
                </small>
              )}
              {extraGpixShares !== null && hypo.extraGpixKrw > 0 && (
                <small className="field__meta animate__animated animate__fadeIn animate__faster">
                  ≈ {extraGpixShares.toFixed(3)} 주 (참고 시세 기준)
                </small>
              )}
            </label>
            <label className="field hypo-field">
              <span>GPIX 추가 매수 (주)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder={gpix ? `참고 주당 ${formatKrw(gpix.krwPerShare, 0)}` : '시세 로딩 후 입력'}
                value={
                  gpix && gpix.krwPerShare > 0 && hypo.extraGpixKrw > 0
                    ? hypo.extraGpixKrw / gpix.krwPerShare
                    : ''
                }
                onChange={(e) => {
                  const v = num(e.target.value)
                  if (e.target.value === '' || v === 0) {
                    setHypo((h) => ({ ...h, extraGpixKrw: 0 }))
                    return
                  }
                  setExtraGpixFromShares(v)
                }}
              />
              <small className="field__meta">
                주 수 × 참고 시세(KRW/주)로 금액이 맞춰집니다. 금액을 바꿔도 주 칸이 따라갑니다.
              </small>
            </label>
          </>
        )}

        {showGpiq && (
          <>
            <label className="field hypo-field">
              <span>GPIQ 추가 매수 (KRW)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={10000}
                value={hypo.extraGpiqKrw}
                onChange={(e) =>
                  setHypo((h) => ({ ...h, extraGpiqKrw: num(e.target.value) }))
                }
              />
              {hypo.extraGpiqKrw > 0 && gpiqBookKrw <= 0 && (
                <small className="field__meta hypo-calc__field-warn">
                  위 GPIQ 매수·장부 금액을 넣어야 예상 월 세후 증가가 나옵니다.
                </small>
              )}
              {extraGpiqShares !== null && hypo.extraGpiqKrw > 0 && (
                <small className="field__meta animate__animated animate__fadeIn animate__faster">
                  ≈ {extraGpiqShares.toFixed(3)} 주 (참고 시세 기준)
                </small>
              )}
            </label>
            <label className="field hypo-field">
              <span>GPIQ 추가 매수 (주)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder={gpiq ? `참고 주당 ${formatKrw(gpiq.krwPerShare, 0)}` : '시세 로딩 후 입력'}
                value={
                  gpiq && gpiq.krwPerShare > 0 && hypo.extraGpiqKrw > 0
                    ? hypo.extraGpiqKrw / gpiq.krwPerShare
                    : ''
                }
                onChange={(e) => {
                  const v = num(e.target.value)
                  if (e.target.value === '' || v === 0) {
                    setHypo((h) => ({ ...h, extraGpiqKrw: 0 }))
                    return
                  }
                  setExtraGpiqFromShares(v)
                }}
              />
              <small className="field__meta">
                주 수 × 참고 시세(KRW/주)로 금액이 맞춰집니다.
              </small>
            </label>
          </>
        )}

        <div className="hypo-calc__result">
          {showGpix && marginalGpix !== null && gpixBookKrw > 0 && (
            <p className="hypo-calc__line animate__animated animate__fadeIn animate__faster">
              GPIX 추정 효율: 월 세후 <strong>{marginalGpix.toFixed(6)}</strong> KRW / 보유 KRW / 월
            </p>
          )}
          {showGpiq && marginalGpiq !== null && gpiqBookKrw > 0 && (
            <p className="hypo-calc__line animate__animated animate__fadeIn animate__faster">
              GPIQ 추정 효율: 월 세후 <strong>{marginalGpiq.toFixed(6)}</strong> KRW / 보유 KRW / 월
            </p>
          )}

          {needsBookMsg && (
            <p className="hypo-calc__warn animate__animated animate__fadeIn animate__faster">
              위 «GPIX / GPIQ» 블록에서 해당 종목의 매수·장부 금액을 입력하세요.
            </p>
          )}

          {showHighlight && (
            <p ref={highlightRef} className="hypo-calc__highlight">
              {focus === 'both' ? (
                <>
                  <span className="hypo-calc__breakdown">
                    {hypo.extraGpixKrw > 0 && gpixBookKrw > 0 && (
                      <span>
                        GPIX +{formatKrw(Math.round(separateExtra.fromGpix))}{' '}
                      </span>
                    )}
                    {hypo.extraGpiqKrw > 0 && gpiqBookKrw > 0 && (
                      <span>
                        GPIQ +{formatKrw(Math.round(separateExtra.fromGpiq))}{' '}
                      </span>
                    )}
                  </span>
                  <span className="hypo-calc__highlight-sum">
                    → 월 세후 합계 약{' '}
                    <strong className="hypo-calc__money">{formatKrw(Math.round(separateExtra.total))}</strong>{' '}
                    증가 (추정)
                  </span>
                </>
              ) : (
                <span className="hypo-calc__highlight-sum">
                  <strong>{focus === 'gpix' ? 'GPIX' : 'GPIQ'}</strong> 월 세후 예상 증가:{' '}
                  <strong className="hypo-calc__money">{formatKrw(Math.round(highlightKrw))}</strong> (추정)
                </span>
              )}
            </p>
          )}

          {((focus === 'both' && extraTotal > 0) ||
            (focus === 'gpix' && hypo.extraGpixKrw > 0) ||
            (focus === 'gpiq' && hypo.extraGpiqKrw > 0)) &&
            !hasBookForExtra && (
              <p className="hypo-calc__muted hypo-calc__hint-nudge">
                추정을 보려면 위에서 그 종목의 매수·장부 금액을 입력하세요.
              </p>
            )}

          {((focus === 'both' && extraTotal <= 0 && (gpixBookKrw > 0 || gpiqBookKrw > 0)) ||
            (focus === 'gpix' && hypo.extraGpixKrw <= 0 && gpixBookKrw > 0) ||
            (focus === 'gpiq' && hypo.extraGpiqKrw <= 0 && gpiqBookKrw > 0)) && (
              <p className="hypo-calc__muted hypo-calc__hint-nudge">
                추가 매수 (KRW 또는 주)를 입력하면 예상 월 세후 증가가 계산됩니다.
              </p>
            )}
        </div>
      </div>
    </section>
  )
}
