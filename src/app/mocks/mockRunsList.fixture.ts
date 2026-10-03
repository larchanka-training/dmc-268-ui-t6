import type { RunListPage } from '../../entities/run'

import { mockRunSessions, mockSummaryOnlyRun } from './app-state'
import { mockVerdictVariantRuns } from './mockRunReview'

/** Wire payload for `GET /api/runs` (used by mock transport and fixture tests). */
export const mockRunsListPage: RunListPage = {
  items: [...mockRunSessions, mockSummaryOnlyRun, ...mockVerdictVariantRuns],
  nextCursor: null,
}
