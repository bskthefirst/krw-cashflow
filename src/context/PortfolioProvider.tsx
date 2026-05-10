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
    return {
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
      forecastStartMonth:
        typeof parsed.forecastStartMonth === 'string' &&
        /^\d{4}-\d{2}-01$/.test(parsed.forecastStartMonth)
          ? parsed.forecastStartMonth
          : startOfMonthISO(new Date()),
    }
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
