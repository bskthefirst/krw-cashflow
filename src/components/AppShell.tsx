import { useLayoutEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

export function AppShell() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__title">KRW Cashflow</span>
          <span className="app-header__tag">after-tax · pure</span>
        </div>
        <nav className="app-nav" aria-label="메인">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link'
            }
          >
            대시보드
          </NavLink>
          <NavLink
            to="/assets"
            className={({ isActive }) =>
              isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link'
            }
          >
            자산 입력
          </NavLink>
        </nav>
      </header>
      {/* Avoid translate-based animate.css on large surfaces — WebKit can leave opacity:0 */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
