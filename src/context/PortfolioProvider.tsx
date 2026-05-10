import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  type AssetInputs,
  DEFAULT_INPUTS,
  startOfMonthISO,
} from '../lib/cashflow'
import { PortfolioContext } from './portfolio-context'

const STORAGE_KEY = 'krw-cashflow-portfolio-v1'
const HYPO_LEGACY_KEY = 'krw-cashflow-hypo-v2'

function loadInputs(): AssetInputs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        ...DEFAULT_INPUTS,
        forecastStartMonth: startOfMonthISO(new Date()),
      }
    }
    const parsed = JSON.parse(raw) as Partial<AssetInputs>
    const gpixBookKrw =
      typeof parsed.gpixBookKrw === 'number' && Number.isFinite(parsed.gpixBookKrw)
        ? parsed.gpixBookKrw
        : DEFAULT_INPUTS.gpixBookKrw
    const gpiqBookKrw =
      typeof parsed.gpiqBookKrw === 'number' && Number.isFinite(parsed.gpiqBookKrw)
        ? parsed.gpiqBookKrw
        : DEFAULT_INPUTS.gpiqBookKrw
    // gpixBookKrw / gpiqBookKrw above are the raw stored values; they may be
    // overridden below by the derived shares × 구매가 values.

    function fin(v: unknown, fallback: number): number {
      return typeof v === 'number' && Number.isFinite(v) ? v : fallback
    }

    const gpixShares = fin(parsed.gpixShares, DEFAULT_INPUTS.gpixShares)
    const gpixPurchaseKrw = fin(parsed.gpixPurchaseKrw, DEFAULT_INPUTS.gpixPurchaseKrw)
    const gpiqShares = fin(parsed.gpiqShares, DEFAULT_INPUTS.gpiqShares)
    const gpiqPurchaseKrw = fin(parsed.gpiqPurchaseKrw, DEFAULT_INPUTS.gpiqPurchaseKrw)

    // Derive book KRW from shares × 구매가 when both are set; otherwise fall back to stored value.
    const derivedGpixBook =
      gpixShares > 0 && gpixPurchaseKrw > 0 ? gpixShares * gpixPurchaseKrw : null
    const derivedGpiqBook =
      gpiqShares > 0 && gpiqPurchaseKrw > 0 ? gpiqShares * gpiqPurchaseKrw : null

    const out: AssetInputs = {
      cmaPretaxPerDay: fin(parsed.cmaPretaxPerDay, DEFAULT_INPUTS.cmaPretaxPerDay),
      cmaTaxRate: fin(parsed.cmaTaxRate, DEFAULT_INPUTS.cmaTaxRate),
      ethPretaxPerDay: fin(parsed.ethPretaxPerDay, DEFAULT_INPUTS.ethPretaxPerDay),
      ethTaxRate: fin(parsed.ethTaxRate, DEFAULT_INPUTS.ethTaxRate),
      gpixGpiqMonthlyAfterTax: fin(parsed.gpixGpiqMonthlyAfterTax, DEFAULT_INPUTS.gpixGpiqMonthlyAfterTax),
      gpixShares,
      gpixPurchaseKrw,
      gpiqShares,
      gpiqPurchaseKrw,
      gpixBookKrw: derivedGpixBook ?? gpixBookKrw,
      gpiqBookKrw: derivedGpiqBook ?? gpiqBookKrw,
      forecastStartMonth:
        typeof parsed.forecastStartMonth === 'string' &&
        /^\d{4}-\d{2}-01$/.test(parsed.forecastStartMonth)
          ? parsed.forecastStartMonth
          : startOfMonthISO(new Date()),
    }

    if (out.gpixBookKrw === 0 && out.gpiqBookKrw === 0) {
      try {
        const hypoRaw = localStorage.getItem(HYPO_LEGACY_KEY)
        if (hypoRaw) {
          const h = JSON.parse(hypoRaw) as {
            gpixBookKrw?: number
            gpiqBookKrw?: number
          }
          if (typeof h.gpixBookKrw === 'number' && Number.isFinite(h.gpixBookKrw) && h.gpixBookKrw > 0) {
            out.gpixBookKrw = h.gpixBookKrw
          }
          if (typeof h.gpiqBookKrw === 'number' && Number.isFinite(h.gpiqBookKrw) && h.gpiqBookKrw > 0) {
            out.gpiqBookKrw = h.gpiqBookKrw
          }
        }
      } catch {
        /* ignore */
      }
    }

    return out
  } catch {
    return {
      ...DEFAULT_INPUTS,
      forecastStartMonth: startOfMonthISO(new Date()),
    }
  }
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [inputs, setInputsState] = useState<AssetInputs>(() => loadInputs())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs))
  }, [inputs])

  const setInputs = useCallback((patch: Partial<AssetInputs>) => {
    setInputsState((prev) => {
      const next = { ...prev, ...patch }
      // Auto-derive book KRW from shares × 구매가 whenever either changes.
      if ('gpixShares' in patch || 'gpixPurchaseKrw' in patch) {
        if (next.gpixShares > 0 && next.gpixPurchaseKrw > 0) {
          next.gpixBookKrw = next.gpixShares * next.gpixPurchaseKrw
        }
      }
      if ('gpiqShares' in patch || 'gpiqPurchaseKrw' in patch) {
        if (next.gpiqShares > 0 && next.gpiqPurchaseKrw > 0) {
          next.gpiqBookKrw = next.gpiqShares * next.gpiqPurchaseKrw
        }
      }
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setInputsState({
      ...DEFAULT_INPUTS,
      forecastStartMonth: startOfMonthISO(new Date()),
    })
  }, [])

  const value = useMemo(
    () => ({ inputs, setInputs, reset }),
    [inputs, setInputs, reset],
  )

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  )
}
