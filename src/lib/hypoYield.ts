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
 * Extra monthly after-tax from incremental (or fresh) buys.
 *
 * Priority for yield rate per leg:
 *   1. Book-based: (그 종목 월 세후 ÷ 장부) — most accurate when holdings exist.
 *   2. Annual-rate fallback: (annualYieldRate / 12) × (1 − withholdingRate) — used
 *      when 장부 = 0, enabling a clean fresh-buy simulation with no existing holdings.
 *   3. Portfolio-weighted fallback: used only when one leg has book = 0 and the other does not.
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
  /** Annual dividend yield rate for GPIX (e.g. 0.0748). Used when gpixBookKrw = 0. */
  gpixAnnualYieldRate?: number
  /** Annual dividend yield rate for GPIQ (e.g. 0.0892). Used when gpiqBookKrw = 0. */
  gpiqAnnualYieldRate?: number
  /** Withholding tax rate (e.g. 0.154). Applied to annual rate when computing fresh-buy yield. */
  withholdingRate?: number
}): SeparateExtraResult {
  const {
    portfolioMonthlyAfterTax,
    gpixMonthlyAfterTax,
    gpiqMonthlyAfterTax,
    gpixBookKrw,
    gpiqBookKrw,
    extraGpixKrw,
    extraGpiqKrw,
    gpixAnnualYieldRate = 0,
    gpiqAnnualYieldRate = 0,
    withholdingRate = 0.154,
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

  // Monthly rate derived from annual yield rate + withholding tax (fresh-buy fallback).
  const freshRateGpix = gpixAnnualYieldRate > 0 ? (gpixAnnualYieldRate / 12) * (1 - withholdingRate) : null
  const freshRateGpiq = gpiqAnnualYieldRate > 0 ? (gpiqAnnualYieldRate / 12) * (1 - withholdingRate) : null

  // Portfolio-weighted proportional fallback is only valid when at least one
  // leg has a real book value (bG > 0 || bQ > 0); when both are 0 this fallback
  // would incorrectly attribute 100 % of existing cash flow to the new purchase.
  const canUsePortfolioFallback = bG > 0 || bQ > 0

  let fromGpix = 0
  if (xG > 0) {
    if (bG > 0 && Number.isFinite(gpixMonthlyAfterTax)) {
      // Best: use actual yield-on-book rate from existing holdings.
      fromGpix = (gpixMonthlyAfterTax / bG) * xG
    } else if (freshRateGpix !== null) {
      // Fresh-buy: no book value — use stored annual yield rate.
      fromGpix = freshRateGpix * xG
    } else if (canUsePortfolioFallback && totalM > 0) {
      // One leg has book data, other doesn't — use portfolio-weighted rate.
      fromGpix = (totalM * xG) / denom
    }
  }

  let fromGpiq = 0
  if (xQ > 0) {
    if (bQ > 0 && Number.isFinite(gpiqMonthlyAfterTax)) {
      fromGpiq = (gpiqMonthlyAfterTax / bQ) * xQ
    } else if (freshRateGpiq !== null) {
      fromGpiq = freshRateGpiq * xQ
    } else if (canUsePortfolioFallback && totalM > 0) {
      fromGpiq = (totalM * xQ) / denom
    }
  }

  return {
    fromGpix,
    fromGpiq,
    total: fromGpix + fromGpiq,
  }
}
