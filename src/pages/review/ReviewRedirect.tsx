import type { FC } from 'react'
import { Navigate } from 'react-router'

import { DEMO_RUN_ID } from '../../shared/config/demoRun'

export const ReviewRedirect: FC = () => {
  if (!__VITE_MOCKS_BUILD__) {
    return <Navigate replace to="/runs" />
  }
  return <Navigate replace to={`/runs/${DEMO_RUN_ID}`} />
}
