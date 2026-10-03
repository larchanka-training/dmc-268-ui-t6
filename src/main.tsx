import 'antd/dist/reset.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

async function bootstrap() {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
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
