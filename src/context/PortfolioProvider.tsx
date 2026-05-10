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

    const out: AssetInputs = {
      cmaPretaxPerDay:
        typeof parsed.cmaPretaxPerDay === 'number'
          ? parsed.cmaPretaxPerDay
          : DEFAULT_INPUTS.cmaPretaxPerDay,
      cmaTaxRate:
        typeof parsed.cmaTaxRate === 'number'
          ? parsed.cmaTaxRate
          : DEFAULT_INPUTS.cmaTaxRate,
      ethPretaxPerDay:
        typeof parsed.ethPretaxPerDay === 'number'
          ? parsed.ethPretaxPerDay
          : DEFAULT_INPUTS.ethPretaxPerDay,
      ethTaxRate:
        typeof parsed.ethTaxRate === 'number'
          ? parsed.ethTaxRate
          : DEFAULT_INPUTS.ethTaxRate,
      gpixGpiqMonthlyAfterTax:
        typeof parsed.gpixGpiqMonthlyAfterTax === 'number'
          ? parsed.gpixGpiqMonthlyAfterTax
          : DEFAULT_INPUTS.gpixGpiqMonthlyAfterTax,
      gpixBookKrw,
      gpiqBookKrw,
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
    setInputsState((prev) => ({ ...prev, ...patch }))
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
