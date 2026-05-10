/**
 * KRW passive cashflow — after-tax · monthly · pure.
 * Mirrors spreadsheet logic: pretax/day × (1 − tax) for CMA & ETH; GPIX/GPIQ as monthly after-tax control.
 */

export type AssetInputs = {
  /** 발행어음 CMA pretax KRW per day */
  cmaPretaxPerDay: number
  /** Withholding rate (e.g. 0.154 for 15.4%) */
  cmaTaxRate: number
  /** ETH staking pretax KRW per day */
  ethPretaxPerDay: number
  ethTaxRate: number
  /** GPIX/GPIQ total monthly after-tax KRW (control cell) */
  gpixGpiqMonthlyAfterTax: number
  /** GPIX only: cost / book basis in KRW (for yield-on-book sim; optional) */
  gpixBookKrw: number
  /** GPIQ only: cost / book basis in KRW (for yield-on-book sim; optional) */
  gpiqBookKrw: number
  /** First day of month (YYYY-MM-DD) — anchors the 24-month projection */
  forecastStartMonth: string
}

export type MonthlyProjectionRow = {
  /** ISO date string YYYY-MM-DD (first of month) */
  monthKey: string
  label: string
  daysInMonth: number
  cmaPureMonthly: number
  ethPureMonthly: number
  gpixMonthly: number
  totalPureMonthly: number
}

export function pureDailyFromPretax(
  pretaxPerDay: number,
  taxRate: number,
): number {
  return pretaxPerDay * (1 - taxRate)
}

export function daysInCalendarMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

/** Parse YYYY-MM-DD as first local calendar day of that month */
export function parseMonthStart(isoDate: string): Date {
  const [y, m] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

export function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
  })
}

export function addMonthsLocal(d: Date, delta: number): Date {
  const y = d.getFullYear()
  const m = d.getMonth() + delta
  return new Date(y, m, 1)
}

export function startOfMonthISO(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}-01`
}

export function getPureDailies(inputs: AssetInputs) {
  const cmaPureDay = pureDailyFromPretax(
    inputs.cmaPretaxPerDay,
    inputs.cmaTaxRate,
  )
  const ethPureDay = pureDailyFromPretax(
    inputs.ethPretaxPerDay,
    inputs.ethTaxRate,
  )
  return { cmaPureDay, ethPureDay }
}

/** One calendar month row using variable days (spreadsheet Monthly Tracker). */
export function monthlyBreakdownForMonth(
  inputs: AssetInputs,
  monthStart: Date,
): Omit<MonthlyProjectionRow, 'monthKey' | 'label'> & {
  monthKey: string
  label: string
} {
  const y = monthStart.getFullYear()
  const m0 = monthStart.getMonth()
  const days = daysInCalendarMonth(y, m0)
  const { cmaPureDay, ethPureDay } = getPureDailies(inputs)
  const gpix = inputs.gpixGpiqMonthlyAfterTax
  const cmaPureMonthly = cmaPureDay * days
  const ethPureMonthly = ethPureDay * days
  const totalPureMonthly = cmaPureMonthly + ethPureMonthly + gpix
  const monthKey = `${y}-${String(m0 + 1).padStart(2, '0')}-01`
  return {
    monthKey,
    label: formatMonthLabel(monthStart),
    daysInMonth: days,
    cmaPureMonthly,
    ethPureMonthly,
    gpixMonthly: gpix,
    totalPureMonthly,
  }
}

/** Dashboard “current month”: calendar month containing `asOf` (local). */
export function currentMonthMetrics(inputs: AssetInputs, asOf: Date = new Date()) {
  const monthStart = new Date(asOf.getFullYear(), asOf.getMonth(), 1)
  const row = monthlyBreakdownForMonth(inputs, monthStart)
  const days = row.daysInMonth
  const { cmaPureDay, ethPureDay } = getPureDailies(inputs)
  const gpixDaily = row.gpixMonthly / days
  const totalPureDaily = cmaPureDay + ethPureDay + gpixDaily
  return {
    ...row,
    cmaPureDaily: cmaPureDay,
    ethPureDaily: ethPureDay,
    gpixPureDaily: gpixDaily,
    totalPureDaily,
    monthlyTotal: row.totalPureMonthly,
  }
}

/** 24-month projection from forecast anchor (first row = forecastStartMonth). */
export function buildMonthlyProjection(
  inputs: AssetInputs,
  monthCount: number = 24,
): MonthlyProjectionRow[] {
  const start = parseMonthStart(inputs.forecastStartMonth)
  const out: MonthlyProjectionRow[] = []
  for (let i = 0; i < monthCount; i++) {
    const ms = addMonthsLocal(start, i)
    const row = monthlyBreakdownForMonth(inputs, ms)
    out.push(row)
  }
  return out
}

export function projectionTotals(rows: MonthlyProjectionRow[]) {
  const sum = rows.reduce((a, r) => a + r.totalPureMonthly, 0)
  const avg = rows.length ? sum / rows.length : 0
  return { sum24: sum, avgMonthly: avg }
}

export const DEFAULT_INPUTS: AssetInputs = {
  cmaPretaxPerDay: 363,
  cmaTaxRate: 0.154,
  ethPretaxPerDay: 340,
  ethTaxRate: 0.1,
  gpixGpiqMonthlyAfterTax: 8500,
  gpixBookKrw: 0,
  gpiqBookKrw: 0,
  forecastStartMonth: '2026-05-01',
}
