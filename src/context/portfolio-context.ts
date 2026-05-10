import { createContext } from 'react'
import type { AssetInputs } from '../lib/cashflow'

export type PortfolioContextValue = {
  inputs: AssetInputs
  setInputs: (patch: Partial<AssetInputs>) => void
  reset: () => void
}

export const PortfolioContext = createContext<PortfolioContextValue | null>(
  null,
)
