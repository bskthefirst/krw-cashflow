import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PortfolioProvider } from './context/PortfolioProvider'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { AssetsPage } from './pages/AssetsPage'

export default function App() {
  return (
    <PortfolioProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="assets" element={<AssetsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </PortfolioProvider>
  )
}
