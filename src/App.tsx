import type { JSX } from 'react'

// Временный демо-стенд: маршрут появится на T15. Сейчас он нужен, чтобы
// посмотреть экран деталей PR на моках до мержа PR #55. Удаляется на T15.
import { RunDetailHarness } from './app/ui/RunDetailHarness'

export function App(): JSX.Element {
  return <RunDetailHarness />
}

export default App
