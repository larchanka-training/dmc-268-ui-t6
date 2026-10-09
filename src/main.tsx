import './shared/config/zodJitless'
import 'antd/dist/reset.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { isMockMode } from './shared/config/env'

async function bootstrap() {
  if (__VITE_MOCKS_BUILD__ || import.meta.env.DEV) {
    if (__VITE_MOCKS_BUILD__ || isMockMode()) {
      const { initMockTransport, startMockRunEvents } = await import('./app/mocks/mockTransport')
      initMockTransport()
      startMockRunEvents()
    }
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
