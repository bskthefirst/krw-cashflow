import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }

type State = { error: Error | null }

/**
 * Surfaces render errors instead of a blank page (common when debugging GH Pages).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[cashflow]', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: '2rem 1.5rem',
            maxWidth: '36rem',
            margin: '0 auto',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
            화면을 불러오지 못했습니다
          </h1>
          <p style={{ color: '#555', lineHeight: 1.55, marginBottom: '1rem' }}>
            브라우저 콘솔에 오류가 있는지 확인하거나 페이지를 새로고침 해 보세요.
          </p>
          <pre
            style={{
              fontSize: '0.75rem',
              overflow: 'auto',
              padding: '0.75rem',
              background: '#f3f0f8',
              borderRadius: 8,
            }}
          >
            {this.state.error.message}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
