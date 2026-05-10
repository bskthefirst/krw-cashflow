import { describe, expect, it } from 'vitest'
import {
  loadEtfPrices,
  normalizeAssetBaseUrl,
  parseEtfPricesPayload,
} from './etfPrices'

describe('normalizeAssetBaseUrl', () => {
  it('preserves trailing slash for GH Pages base', () => {
    expect(normalizeAssetBaseUrl('/krw-cashflow/')).toBe('/krw-cashflow/')
  })

  it('adds trailing slash when missing', () => {
    expect(normalizeAssetBaseUrl('/krw-cashflow')).toBe('/krw-cashflow/')
  })

  it('uses root for empty or slash-only', () => {
    expect(normalizeAssetBaseUrl('')).toBe('/')
    expect(normalizeAssetBaseUrl('/')).toBe('/')
  })
})

describe('parseEtfPricesPayload', () => {
  it('accepts a coherent snapshot', () => {
    const raw = {
      asOf: '2026-05-10T12:00:00.000Z',
      usdKrw: 1400,
      quotes: {
        GPIX: { usd: 50, krwPerShare: 70000 },
        GPIQ: { usd: 55, krwPerShare: 77000 },
      },
      meta: { fxSource: 'test' },
    }
    const p = parseEtfPricesPayload(raw)
    expect(p?.usdKrw).toBe(1400)
    expect(p?.quotes.GPIX.krwPerShare).toBe(70000)
  })

  it('rejects inconsistent krwPerShare vs usd*usdKrw', () => {
    const raw = {
      asOf: '2026-05-10T12:00:00.000Z',
      usdKrw: 1400,
      quotes: {
        GPIX: { usd: 50, krwPerShare: 99999 },
        GPIQ: { usd: 55, krwPerShare: 77000 },
      },
    }
    expect(parseEtfPricesPayload(raw)).toBeNull()
  })

  it('rejects missing symbol', () => {
    const raw = {
      asOf: '2026-05-10T12:00:00.000Z',
      usdKrw: 1400,
      quotes: {
        GPIX: { usd: 50, krwPerShare: 70000 },
      },
    }
    expect(parseEtfPricesPayload(raw)).toBeNull()
  })
})

describe('loadEtfPrices', () => {
  it('returns null on HTTP error', async () => {
    await expect(loadEtfPrices('/')).resolves.toBeNull()
  })
})
