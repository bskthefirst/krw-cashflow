/**
 * Fetches US-listed GPIX / GPIQ (Yahoo chart) and USD→KRW (er-api, fallback Yahoo USDKRW=X),
 * writes public/etf-prices.json for static hosting (no browser CORS).
 */
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'etf-prices.json')

const SYMBOLS = ['GPIX', 'GPIQ']

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const FETCH_TIMEOUT_MS = 18_000
const YAHOO_RETRIES = 3
const YAHOO_RETRY_DELAY_MS = 900

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchWithTimeout(url, init = {}, ms = FETCH_TIMEOUT_MS) {
  const ctrl = AbortSignal.timeout(ms)
  const res = await fetch(url, {
    ...init,
    signal: ctrl,
  })
  return res
}

async function retryFetchJson(url, label, attempts = YAHOO_RETRIES) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'application/json',
        },
      })
      if (res.status === 429 || res.status === 503) {
        throw new Error(`${label}: HTTP ${res.status}`)
      }
      if (!res.ok) {
        throw new Error(`${label}: HTTP ${res.status}`)
      }
      return await res.json()
    } catch (e) {
      lastErr = e
      if (i < attempts - 1) {
        await sleep(YAHOO_RETRY_DELAY_MS * (i + 1))
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

/**
 * Yahoo v8 chart — prefer regularMarketPrice; fall back to prior close / last bar close.
 */
function extractUsdFromChart(data, symbol) {
  const err = data?.chart?.error
  if (err) {
    const msg = err.description || err.code || JSON.stringify(err)
    throw new Error(`Yahoo ${symbol}: chart error ${msg}`)
  }
  const result = data?.chart?.result?.[0]
  if (!result) {
    throw new Error(`Yahoo ${symbol}: empty chart.result`)
  }
  const meta = result.meta || {}
  const metaKeys = [
    'regularMarketPrice',
    'postMarketPrice',
    'preMarketPrice',
    'previousClose',
    'chartPreviousClose',
  ]
  for (const key of metaKeys) {
    const v = meta[key]
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      return v
    }
  }
  const closes = result.indicators?.quote?.[0]?.close
  if (Array.isArray(closes)) {
    for (let i = closes.length - 1; i >= 0; i--) {
      const c = closes[i]
      if (typeof c === 'number' && Number.isFinite(c) && c > 0) {
        return c
      }
    }
  }
  throw new Error(`Yahoo ${symbol}: could not resolve a spot/prior price`)
}

async function yahooChartUsd(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`
  const data = await retryFetchJson(url, `Yahoo ${symbol}`)
  return extractUsdFromChart(data, symbol)
}

async function fetchUsdKrwFromErApi() {
  let lastErr
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD')
      if (!res.ok) {
        throw new Error(`FX er-api: HTTP ${res.status}`)
      }
      const data = await res.json()
      if (data?.result !== 'success') {
        throw new Error('FX er-api: result !== success')
      }
      const krw = data?.rates?.KRW
      if (typeof krw !== 'number' || !Number.isFinite(krw) || krw <= 0) {
        throw new Error('FX er-api: invalid rates.KRW')
      }
      if (krw < 500 || krw > 5000) {
        throw new Error('FX er-api: KRW rate out of plausible band')
      }
      return krw
    } catch (e) {
      lastErr = e
      if (i === 0) await sleep(400)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

/** Same units as er-api: KRW per 1 USD */
async function fetchUsdKrwFromYahoo() {
  const krw = await yahooChartUsd('USDKRW=X')
  if (krw < 500 || krw > 5000) {
    throw new Error('FX Yahoo USDKRW=X: rate out of plausible band')
  }
  return krw
}

async function fetchUsdKrw() {
  try {
    const rate = await fetchUsdKrwFromErApi()
    return { usdKrw: rate, fxSource: 'open.er-api.com/v6/latest/USD' }
  } catch (primaryErr) {
    console.warn('[fetch-etf-prices] FX primary failed:', primaryErr?.message || primaryErr)
    const rate = await fetchUsdKrwFromYahoo()
    return { usdKrw: rate, fxSource: 'Yahoo chart USDKRW=X' }
  }
}

async function main() {
  const { usdKrw, fxSource } = await fetchUsdKrw()

  const usdPrices = await Promise.all(SYMBOLS.map((s) => yahooChartUsd(s)))

  const quotes = {}
  for (let i = 0; i < SYMBOLS.length; i++) {
    const sym = SYMBOLS[i]
    const usd = usdPrices[i]
    if (usd <= 0 || usd > 1e6) {
      throw new Error(`${sym}: implausible USD price ${usd}`)
    }
    quotes[sym] = {
      usd,
      krwPerShare: usd * usdKrw,
    }
  }

  const payload = {
    asOf: new Date().toISOString(),
    usdKrw,
    quotes,
    meta: {
      yahooSymbols: SYMBOLS,
      fxSource,
    },
  }

  await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  console.log('Wrote', OUT)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
