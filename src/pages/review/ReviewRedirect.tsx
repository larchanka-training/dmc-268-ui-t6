import type { FC } from 'react'
import { Navigate } from 'react-router'

import { DEMO_RUN_ID } from '../../shared/config/demoRun'
import { isMockMode } from '../../shared/config/env'

export const ReviewRedirect: FC = () => {
  if (!isMockMode()) {
    return <Navigate replace to="/runs" />
  }
  return <Navigate replace to={`/runs/${DEMO_RUN_ID}`} />
}
