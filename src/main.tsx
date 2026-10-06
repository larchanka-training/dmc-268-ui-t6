import 'antd/dist/reset.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { isMockMode } from './shared/config/env'

async function bootstrap() {
  // Static env check so prod builds without VITE_USE_MOCKS omit the mock chunk (Refs #65, AC 3.3).
  if (import.meta.env.VITE_USE_MOCKS === 'true' || import.meta.env.VITE_USE_MOCKS === '1') {
    const { initMockTransport } = await import('./app/mocks/mockTransport')
    initMockTransport()
  } else if (import.meta.env.DEV && isMockMode()) {
    const { initMockTransport } = await import('./app/mocks/mockTransport')
    initMockTransport()
  }

  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Не найден корневой элемент #root')
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

void bootstrap()
