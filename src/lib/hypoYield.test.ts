import { describe, expect, it } from 'vitest'
import {
  extraMonthlyAfterTax,
  extraMonthlyAfterTaxSeparate,
  marginalMonthlyPerKrw,
  monthlyCashSplitByBook,
} from './hypoYield'

describe('monthlyCashSplitByBook', () => {
  it('splits by book weights', () => {
    const s = monthlyCashSplitByBook({
      totalMonthlyAfterTax: 10000,
      gpixBookKrw: 30_000_000,
      gpiqBookKrw: 70_000_000,
    })
    expect(s.gpixMonthlyAfterTax).toBeCloseTo(3000, 6)
    expect(s.gpiqMonthlyAfterTax).toBeCloseTo(7000, 6)
  })

  it('uses 50/50 when both books are zero', () => {
    const s = monthlyCashSplitByBook({
      totalMonthlyAfterTax: 8000,
      gpixBookKrw: 0,
      gpiqBookKrw: 0,
    })
    expect(s.gpixMonthlyAfterTax).toBe(4000)
    expect(s.gpiqMonthlyAfterTax).toBe(4000)
  })
})

describe('marginalMonthlyPerKrw', () => {
  it('returns monthly / book when book > 0', () => {
    expect(marginalMonthlyPerKrw(8500, 1_000_000)).toBeCloseTo(0.0085, 12)
  })

  it('returns null when book is zero or negative', () => {
    expect(marginalMonthlyPerKrw(8500, 0)).toBeNull()
    expect(marginalMonthlyPerKrw(8500, -1)).toBeNull()
  })
})

describe('extraMonthlyAfterTax (legacy combined)', () => {
  it('scales marginal rate by extra purchase KRW', () => {
    const extra = extraMonthlyAfterTax({
      monthlyAfterTaxTotal: 8500,
      bookValueKrw: 10_000_000,
      extraPurchaseKrw: 1_000_000,
    })
    expect(extra).toBeCloseTo(850, 8)
  })
})

describe('extraMonthlyAfterTaxSeparate', () => {
  it('computes each leg with its own yield × extra buy', () => {
    const r = extraMonthlyAfterTaxSeparate({
      portfolioMonthlyAfterTax: 8500,
      gpixMonthlyAfterTax: 4000,
      gpiqMonthlyAfterTax: 4500,
      gpixBookKrw: 20_000_000,
      gpiqBookKrw: 30_000_000,
      extraGpixKrw: 1_000_000,
      extraGpiqKrw: 3_000_000,
    })
    expect(r.fromGpix).toBeCloseTo((4000 / 20_000_000) * 1_000_000, 8)
    expect(r.fromGpiq).toBeCloseTo((4500 / 30_000_000) * 3_000_000, 8)
    expect(r.total).toBeCloseTo(r.fromGpix + r.fromGpiq, 8)
  })

  it('does not blend unlike yields into one marginal', () => {
    const blendedWrong = extraMonthlyAfterTax({
      monthlyAfterTaxTotal: 8500,
      bookValueKrw: 50_000_000,
      extraPurchaseKrw: 5_000_000,
    })
    /* Same totals (8500 / 50M / 5M) but lumpy books → separate ≠ pooled marginal */
    const separate = extraMonthlyAfterTaxSeparate({
      portfolioMonthlyAfterTax: 8500,
      gpixMonthlyAfterTax: 6000,
      gpiqMonthlyAfterTax: 2500,
      gpixBookKrw: 10_000_000,
      gpiqBookKrw: 40_000_000,
      extraGpixKrw: 3_000_000,
      extraGpiqKrw: 2_000_000,
    })
    expect(blendedWrong).toBeCloseTo(850, 4)
    expect(separate.total).toBeCloseTo(1925, 4)
    expect(separate.total).not.toBeCloseTo(blendedWrong!, 0)
  })

  it('when book is zero on a leg, uses portfolio monthly total when it differs from split sum', () => {
    const r = extraMonthlyAfterTaxSeparate({
      portfolioMonthlyAfterTax: 5000,
      gpixMonthlyAfterTax: 1000,
      gpiqMonthlyAfterTax: 2000,
      gpixBookKrw: 0,
      gpiqBookKrw: 10_000_000,
      extraGpixKrw: 5_000_000,
      extraGpiqKrw: 1_000_000,
    })
    const denom = 10_000_000 + 5_000_000 + 1_000_000
    expect(r.fromGpix).toBeCloseTo((5000 * 5_000_000) / denom, 8)
    expect(r.fromGpiq).toBeCloseTo(200, 8)
    expect(r.total).toBeCloseTo(r.fromGpix + r.fromGpiq, 8)
  })

  it('when book is zero on a leg, allocates portfolio monthly by size (books + extras)', () => {
    const r = extraMonthlyAfterTaxSeparate({
      portfolioMonthlyAfterTax: 3000,
      gpixMonthlyAfterTax: 1000,
      gpiqMonthlyAfterTax: 2000,
      gpixBookKrw: 0,
      gpiqBookKrw: 10_000_000,
      extraGpixKrw: 5_000_000,
      extraGpiqKrw: 1_000_000,
    })
    const totalM = 3000
    const denom = 10_000_000 + 5_000_000 + 1_000_000
    expect(r.fromGpix).toBeCloseTo((totalM * 5_000_000) / denom, 8)
    expect(r.fromGpiq).toBeCloseTo(200, 8)
    expect(r.total).toBeCloseTo(r.fromGpix + r.fromGpiq, 8)
  })

  it('both books zero: returns 0 — cannot estimate yield without any book value', () => {
    const split = monthlyCashSplitByBook({
      totalMonthlyAfterTax: 8000,
      gpixBookKrw: 0,
      gpiqBookKrw: 0,
    })
    const r = extraMonthlyAfterTaxSeparate({
      portfolioMonthlyAfterTax: 8000,
      gpixMonthlyAfterTax: split.gpixMonthlyAfterTax,
      gpiqMonthlyAfterTax: split.gpiqMonthlyAfterTax,
      gpixBookKrw: 0,
      gpiqBookKrw: 0,
      extraGpixKrw: 3_000_000,
      extraGpiqKrw: 1_000_000,
    })
    // Without any book value we have no yield rate; returning existing monthly as
    // "incremental" would be wrong, so the function returns zero for both legs.
    expect(r.fromGpix).toBe(0)
    expect(r.fromGpiq).toBe(0)
    expect(r.total).toBe(0)
  })

  it('ignores negative extra buy (clamped to zero)', () => {
    const r = extraMonthlyAfterTaxSeparate({
      portfolioMonthlyAfterTax: 9000,
      gpixMonthlyAfterTax: 4000,
      gpiqMonthlyAfterTax: 5000,
      gpixBookKrw: 20_000_000,
      gpiqBookKrw: 20_000_000,
      extraGpixKrw: -1_000_000,
      extraGpiqKrw: 1_000_000,
    })
    expect(r.fromGpix).toBe(0)
    expect(r.fromGpiq).toBeCloseTo(250, 8)
  })
})
