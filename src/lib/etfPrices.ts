export type EtfQuote = {
  usd: number
  krwPerShare: number
}

export type EtfPricesPayload = {
  asOf: string
  usdKrw: number
  quotes: Record<string, EtfQuote>
  meta?: {
    yahooSymbols?: string[]
    fxSource?: string
  }
}

export const ETF_PRICE_SYMBOLS = ['GPIX', 'GPIQ'] as const

const FETCH_TIMEOUT_MS = 12_000

/** Vite `base` is usually `/` or `/repo/` — normalize so static assets resolve under GH Pages. */
export function normalizeAssetBaseUrl(baseUrl: string): string {
  if (!baseUrl || baseUrl === '/') {
    return '/'
  }
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

function isFinitePositive(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

/**
 * Validates JSON shape and numeric sanity so malformed deploys / caches never drive bogus UI math.
 */
export function parseEtfPricesPayload(raw: unknown): EtfPricesPayload | null {
  if (raw === null || typeof raw !== 'object') {
    return null
  }
  const o = raw as Record<string, unknown>
  if (typeof o.asOf !== 'string' || o.asOf.length < 10) {
    return null
  }
  if (!isFinitePositive(o.usdKrw) || o.usdKrw < 400 || o.usdKrw > 6000) {
    return null
  }
  if (typeof o.quotes !== 'object' || o.quotes === null) {
    return null
  }
  const quotesIn = o.quotes as Record<string, unknown>
  const quotes: Record<string, EtfQuote> = {}

  for (const sym of ETF_PRICE_SYMBOLS) {
    const row = quotesIn[sym]
    if (row === null || typeof row !== 'object') {
      return null
    }
    const q = row as Record<string, unknown>
    if (!isFinitePositive(q.usd) || q.usd > 1e7) {
      return null
    }
    if (!isFinitePositive(q.krwPerShare) || q.krwPerShare > 1e12) {
      return null
    }
    const implied = q.usd * o.usdKrw
    const ratio = q.krwPerShare / implied
    if (!Number.isFinite(ratio) || ratio < 0.995 || ratio > 1.005) {
      return null
    }
    quotes[sym] = { usd: q.usd, krwPerShare: q.krwPerShare }
  }

  const meta =
    o.meta !== undefined && o.meta !== null && typeof o.meta === 'object'
      ? (o.meta as EtfPricesPayload['meta'])
      : undefined

  return {
    asOf: o.asOf,
    usdKrw: o.usdKrw,
    quotes,
    meta,
  }
}

export async function loadEtfPrices(baseUrl: string): Promise<EtfPricesPayload | null> {
  const base = normalizeAssetBaseUrl(baseUrl)
  const url = `${base}etf-prices.json`

  let res: Response
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    try {
      res = await fetch(url, { cache: 'no-store', signal: ctrl.signal })
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return null
  }

  if (!res.ok) {
    return null
  }

  let json: unknown
  try {
    json = await res.json()
  } catch {
    return null
  }

  return parseEtfPricesPayload(json)
}
