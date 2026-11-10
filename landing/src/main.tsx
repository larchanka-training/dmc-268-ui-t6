import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './styles/global.css'
import { App } from './App'
import { loadAppUrl } from './lib/appUrl'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root is missing')

// Без фрагмента сбрасываем прежнюю прокрутку до монтирования, чтобы открыть лендинг с Hero.
// App после первого коммита прокручивает к существующему якорю или возвращает к Hero при неизвестном.
history.scrollRestoration = 'manual'
if (!location.hash) window.scrollTo(0, 0)

// Адрес приложения читается из /config.json в рантайме (контракт: lib/appUrl.ts); без файла — дефолт.
// Первая отрисовка ждёт ответа (таймаут 2 с, см. CONFIG_TIMEOUT_MS): так клик не уйдёт на дефолтный
// адрес до прихода конфига. Цена: при зависшем /config.json страница пуста до ~2,4 с.
void loadAppUrl().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
