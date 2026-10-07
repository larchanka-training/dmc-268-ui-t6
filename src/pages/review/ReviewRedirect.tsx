import type { FC } from 'react'
import { Navigate } from 'react-router'

import { VITE_MOCKS_BUILD } from '../../shared/config/buildFlags'
import { DEMO_RUN_ID } from '../../shared/config/demoRun'

export const ReviewRedirect: FC = () => {
  if (!VITE_MOCKS_BUILD) {
    return <Navigate replace to="/runs" />
  }
  return <Navigate replace to={`/runs/${DEMO_RUN_ID}`} />
}
