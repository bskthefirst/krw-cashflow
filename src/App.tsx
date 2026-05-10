import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PortfolioProvider } from './context/PortfolioProvider'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { AssetsPage } from './pages/AssetsPage'

function routerBasename(): string | undefined {
  const b = import.meta.env.BASE_URL.replace(/\/$/, '')
  return b === '' ? undefined : b
}

export default function App() {
  return (
    <ErrorBoundary>
      <PortfolioProvider>
        <BrowserRouter basename={routerBasename()}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="assets" element={<AssetsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </PortfolioProvider>
    </ErrorBoundary>
  )
}
