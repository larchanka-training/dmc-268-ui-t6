import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './styles/global.css'
import { App } from './App'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root is missing')

// Лендинг всегда открывается с Hero: без этого браузер при перезагрузке возвращает прежнюю
// прокрутку, и хедер стартует с подложкой. Явный якорь (#waitlist) браузер обработает сам.
history.scrollRestoration = 'manual'
if (!location.hash) window.scrollTo(0, 0)

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
