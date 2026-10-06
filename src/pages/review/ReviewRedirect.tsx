import type { FC } from 'react'
import { Navigate } from 'react-router'

import { isMockMode } from '../../shared/config/env'

/** Demo run id for mock-only /review redirect (must match `shared/config/demoRun`). */
const MOCK_REVIEW_RUN_ID = '11111111-1111-4111-8111-000000000004'

export const ReviewRedirect: FC = () => {
  if (!__VITE_MOCKS_BUILD__ && !(import.meta.env.DEV && isMockMode())) {
    return <Navigate replace to="/runs" />
  }
  return <Navigate replace to={`/runs/${MOCK_REVIEW_RUN_ID}`} />
}
