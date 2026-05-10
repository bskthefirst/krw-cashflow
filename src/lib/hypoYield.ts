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
 * Extra monthly after-tax from incremental buys: per ticker,
 * (that ticker’s 월 세후 ÷ that ticker’s 장부) × 추가 매수 KRW.
 */
export function extraMonthlyAfterTaxSeparate(params: {
  gpixMonthlyAfterTax: number
  gpiqMonthlyAfterTax: number
  gpixBookKrw: number
  gpiqBookKrw: number
  extraGpixKrw: number
  extraGpiqKrw: number
}): SeparateExtraResult {
  const {
    gpixMonthlyAfterTax,
    gpiqMonthlyAfterTax,
    gpixBookKrw,
    gpiqBookKrw,
    extraGpixKrw,
    extraGpiqKrw,
  } = params

  const xG = Number.isFinite(extraGpixKrw) ? Math.max(0, extraGpixKrw) : 0
  const xQ = Number.isFinite(extraGpiqKrw) ? Math.max(0, extraGpiqKrw) : 0

  let fromGpix = 0
  if (gpixBookKrw > 0 && Number.isFinite(gpixMonthlyAfterTax)) {
    fromGpix = (gpixMonthlyAfterTax / gpixBookKrw) * xG
  }

  let fromGpiq = 0
  if (gpiqBookKrw > 0 && Number.isFinite(gpiqMonthlyAfterTax)) {
    fromGpiq = (gpiqMonthlyAfterTax / gpiqBookKrw) * xQ
  }

  return {
    fromGpix,
    fromGpiq,
    total: fromGpix + fromGpiq,
  }
}
