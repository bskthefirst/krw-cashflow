import { describe, expect, it } from 'vitest'
import {
  buildMonthlyProjection,
  currentMonthMetrics,
  DEFAULT_INPUTS,
  getPureDailies,
  monthlyBreakdownForMonth,
  parseMonthStart,
  projectionTotals,
  pureDailyFromPretax,
} from './cashflow'

describe('pureDailyFromPretax', () => {
  it('matches spreadsheet CMA row', () => {
    expect(pureDailyFromPretax(363, 0.154)).toBeCloseTo(363 * (1 - 0.154), 8)
  })

  it('matches spreadsheet ETH row', () => {
    expect(pureDailyFromPretax(340, 0.1)).toBe(306)
  })
})

describe('monthly totals', () => {
  it('sums daily streams and monthly GPIX for a fixed month', () => {
    const inputs = { ...DEFAULT_INPUTS }
    const may2026 = parseMonthStart('2026-05-01')
    const row = monthlyBreakdownForMonth(inputs, may2026)
    const { cmaPureDay, ethPureDay } = getPureDailies(inputs)
    expect(row.daysInMonth).toBe(31)
    expect(row.cmaPureMonthly).toBeCloseTo(cmaPureDay * 31, 6)
    expect(row.ethPureMonthly).toBeCloseTo(ethPureDay * 31, 6)
    expect(row.gpixMonthly).toBe(8500)
    expect(row.totalPureMonthly).toBeCloseTo(
      row.cmaPureMonthly + row.ethPureMonthly + row.gpixMonthly,
      6,
    )
  })

  it('updates total when GPIX monthly control changes', () => {
    const inputs = { ...DEFAULT_INPUTS, gpixGpiqMonthlyAfterTax: 12000 }
    const row = monthlyBreakdownForMonth(inputs, parseMonthStart('2026-06-01'))
    expect(row.gpixMonthly).toBe(12000)
    expect(row.totalPureMonthly).toBeGreaterThan(
      monthlyBreakdownForMonth(DEFAULT_INPUTS, parseMonthStart('2026-06-01'))
        .totalPureMonthly,
    )
  })
})

describe('projectionTotals', () => {
  it('computes 24-month sum and average', () => {
    const rows = buildMonthlyProjection(DEFAULT_INPUTS, 24)
    const { sum24, avgMonthly } = projectionTotals(rows)
    expect(rows).toHaveLength(24)
    expect(sum24).toBeCloseTo(
      rows.reduce((a, r) => a + r.totalPureMonthly, 0),
      4,
    )
    expect(avgMonthly).toBeCloseTo(sum24 / 24, 4)
  })
})

describe('currentMonthMetrics', () => {
  it('expresses GPIX as daily spread within the month', () => {
    const asOf = new Date(2026, 4, 15) // May 2026 local
    const m = currentMonthMetrics(DEFAULT_INPUTS, asOf)
    expect(m.daysInMonth).toBe(31)
    expect(m.gpixPureDaily).toBeCloseTo(8500 / 31, 8)
    expect(m.totalPureDaily).toBeCloseTo(
      m.cmaPureDaily + m.ethPureDaily + m.gpixPureDaily,
      8,
    )
  })
})
