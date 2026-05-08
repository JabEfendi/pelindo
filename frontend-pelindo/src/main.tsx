/**
 * Entry point React aplikasi.
 * Saya merender App ke elemen root di index.html.
 */

import { StrictMode, Component } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Error boundary untuk menampilkan error render di layar
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('=== PARKMASTER CRASH ===', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{
          padding: '40px', fontFamily: 'monospace', background: '#1a0000',
          color: '#ff6b6b', minHeight: '100vh'
        }}>
          <h1 style={{ color: '#ff4444', marginBottom: '16px' }}>❌ Runtime Error</h1>
          <pre style={{
            whiteSpace: 'pre-wrap', background: '#0d0000',
            padding: '20px', borderRadius: '8px'
          }}>
            {err.message}{'\n\n'}{err.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
