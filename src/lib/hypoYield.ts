/**
 * Hypothetical extra monthly after-tax cash from scaling book value.
 * GPIX and GPIQ are modeled separately — each leg uses its own 월 세후 ÷ 장부 ratio.
 */

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

  let fromGpix = 0
  if (gpixBookKrw > 0 && Number.isFinite(gpixMonthlyAfterTax) && Number.isFinite(extraGpixKrw)) {
    fromGpix = (gpixMonthlyAfterTax / gpixBookKrw) * extraGpixKrw
  }

  let fromGpiq = 0
  if (gpiqBookKrw > 0 && Number.isFinite(gpiqMonthlyAfterTax) && Number.isFinite(extraGpiqKrw)) {
    fromGpiq = (gpiqMonthlyAfterTax / gpiqBookKrw) * extraGpiqKrw
  }

  return {
    fromGpix,
    fromGpiq,
    total: fromGpix + fromGpiq,
  }
}
