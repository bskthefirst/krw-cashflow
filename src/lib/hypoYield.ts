/**
 * Hypothetical extra monthly after-tax cash from scaling book value.
 * GPIX and GPIQ are modeled separately — each leg uses its own 월 세후 ÷ 장부 ratio.
 */

/**
 * Split combined monthly after-tax across tickers by book-weight (same units as the portfolio row).
 * If both books are 0, falls back to 50/50 for attribution only.
 */
export function monthlyCashSplitByBook(params: {
  totalMonthlyAfterTax: number
  gpixBookKrw: number
  gpiqBookKrw: number
}): { gpixMonthlyAfterTax: number; gpiqMonthlyAfterTax: number } {
  const { totalMonthlyAfterTax, gpixBookKrw, gpiqBookKrw } = params
  if (!Number.isFinite(totalMonthlyAfterTax) || totalMonthlyAfterTax <= 0) {
    return { gpixMonthlyAfterTax: 0, gpiqMonthlyAfterTax: 0 }
  }
  const sumBook = gpixBookKrw + gpiqBookKrw
  if (!(sumBook > 0)) {
    const half = totalMonthlyAfterTax / 2
    return { gpixMonthlyAfterTax: half, gpiqMonthlyAfterTax: half }
  }
  return {
    gpixMonthlyAfterTax: totalMonthlyAfterTax * (gpixBookKrw / sumBook),
    gpiqMonthlyAfterTax: totalMonthlyAfterTax * (gpiqBookKrw / sumBook),
  }
}

export function marginalMonthlyPerKrw(monthlyAfterTax: number, bookValueKrw: number): number | null {
  if (!(bookValueKrw > 0) || !Number.isFinite(bookValueKrw)) {
    return null
  }
  if (!Number.isFinite(monthlyAfterTax)) {
    return null
  }
  return monthlyAfterTax / bookValueKrw
}

/** @deprecated Prefer extraMonthlyAfterTaxSeparate — combined pool blends unlike yields */
export function extraMonthlyAfterTax(params: {
  monthlyAfterTaxTotal: number
  bookValueKrw: number
  extraPurchaseKrw: number
}): number | null {
  const { monthlyAfterTaxTotal, bookValueKrw, extraPurchaseKrw } = params
  const m = marginalMonthlyPerKrw(monthlyAfterTaxTotal, bookValueKrw)
  if (m === null || !Number.isFinite(extraPurchaseKrw)) {
    return null
  }
  return m * extraPurchaseKrw
}

export type SeparateExtraResult = {
  fromGpix: number
  fromGpiq: number
  total: number
}

/**
 * Extra monthly after-tax from incremental buys.
 * - When a ticker has **장부 > 0**: (그 종목 월 세후 ÷ 그 장부) × 추가 매수 (marginal, per leg).
 * - When **장부가 0**이고 추가 매수만 있는 경우: 포트폴리오 월 세후 합계를
 *   `(장부GPIX+장부GPIQ+추가GPIX+추가GPIQ)` 가중으로 나눠 그 추가분에 비례 배분합니다
 *   (한쪽 장부만 있을 때 다른 종목 추가 매수가 0으로 떨어지는 문제를 막기 위함).
 */
export function extraMonthlyAfterTaxSeparate(params: {
  /** 위 «세후 월 현금흐름» 합계 — 비례 배분 시 이 값을 씁니다 (분할 합과 불일치 방지). */
  portfolioMonthlyAfterTax: number
  gpixMonthlyAfterTax: number
  gpiqMonthlyAfterTax: number
  gpixBookKrw: number
  gpiqBookKrw: number
  extraGpixKrw: number
  extraGpiqKrw: number
}): SeparateExtraResult {
  const {
    portfolioMonthlyAfterTax,
    gpixMonthlyAfterTax,
    gpiqMonthlyAfterTax,
    gpixBookKrw,
    gpiqBookKrw,
    extraGpixKrw,
    extraGpiqKrw,
  } = params

  const bG = Math.max(0, gpixBookKrw)
  const bQ = Math.max(0, gpiqBookKrw)

  const xG = Number.isFinite(extraGpixKrw) ? Math.max(0, extraGpixKrw) : 0
  const xQ = Number.isFinite(extraGpiqKrw) ? Math.max(0, extraGpiqKrw) : 0

  const splitSum = Math.max(0, gpixMonthlyAfterTax + gpiqMonthlyAfterTax)
  const totalM =
    Number.isFinite(portfolioMonthlyAfterTax) && portfolioMonthlyAfterTax > 0
      ? portfolioMonthlyAfterTax
      : splitSum

  const denom = Math.max(bG + bQ + xG + xQ, 1)

  let fromGpix = 0
  if (xG > 0) {
    if (bG > 0 && Number.isFinite(gpixMonthlyAfterTax)) {
      fromGpix = (gpixMonthlyAfterTax / bG) * xG
    } else if (totalM > 0) {
      fromGpix = (totalM * xG) / denom
    }
  }

  let fromGpiq = 0
  if (xQ > 0) {
    if (bQ > 0 && Number.isFinite(gpiqMonthlyAfterTax)) {
      fromGpiq = (gpiqMonthlyAfterTax / bQ) * xQ
    } else if (totalM > 0) {
      fromGpiq = (totalM * xQ) / denom
    }
  }

  return {
    fromGpix,
    fromGpiq,
    total: fromGpix + fromGpiq,
  }
}
