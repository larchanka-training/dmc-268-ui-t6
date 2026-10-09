import type { RunListPage } from '../../entities/run'

import { mockRunSessions, mockSummaryOnlyRun } from './app-state'
import { mockVerdictVariantRuns } from './mockRunReview'
import { mockFailedRun, walkingRunAt } from './mockRunTimeline'

/** Wire payload for `GET /api/runs` (used by mock transport and fixture tests). */
export const mockRunsListPage: RunListPage = {
  items: [
    ...mockRunSessions,
    mockSummaryOnlyRun,
    ...mockVerdictVariantRuns,
    // The walking run is listed as it is before it starts; the transport serves its live status.
    walkingRunAt(0).session,
    mockFailedRun,
  ],
  nextCursor: null,
}
