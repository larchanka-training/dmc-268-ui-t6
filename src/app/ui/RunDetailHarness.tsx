// ВРЕМЕННЫЙ демо-стенд экрана деталей PR на моках. Не часть issue #57: роут
// появится на T15, а посмотреть экран глазами нужно до мержа PR #55.
// Удаляется на T15 целиком — вместе с содержимым src/App.tsx.
import { useState } from 'react'
import type { CSSProperties, JSX } from 'react'
import { Select, Typography } from 'antd'

import { fromPatch } from '../../entities/diff'
import type { FileDiff } from '../../entities/diff'
import type { RunSession } from '../../entities/run'
import { RunDiff } from '../../widgets/diff-viewer'
import { RunInspector } from '../../widgets/run-inspector'
import {
  MOCK_NOW,
  mockFileDiffs,
  mockReviewComments,
  mockRunActions,
  mockRunSessions,
  mockSummaryOnlyDiff,
  mockSummaryOnlyRun,
} from '../mocks/app-state'

const HARNESS_RUNS: RunSession[] = [...mockRunSessions, mockSummaryOnlyRun]

const SUCCEEDED_RUN: RunSession =
  HARNESS_RUNS.find((run) => run.status === 'succeeded' && !run.summaryOnly) ?? mockSummaryOnlyRun

const NOW = new Date(MOCK_NOW)

const SUMMARY_ONLY_FILES: FileDiff[] = mockSummaryOnlyDiff.map(fromPatch)

const RUN_OPTIONS = HARNESS_RUNS.map((run) => ({
  value: run.id,
  label: `#${String(run.pullRequest.number)} · ${run.status}${run.summaryOnly ? ' · summary-only' : ''} · ${run.pullRequest.title}`,
}))

const PAGE: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }

const TOOLBAR: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }

const COLUMNS: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(320px, 30%) 1fr',
  gap: 16,
  alignItems: 'start',
}

export function RunDetailHarness(): JSX.Element {
  const [runId, setRunId] = useState<string>(SUCCEEDED_RUN.id)
  const run = HARNESS_RUNS.find((candidate) => candidate.id === runId) ?? SUCCEEDED_RUN
  const files = run.summaryOnly ? SUMMARY_ONLY_FILES : mockFileDiffs

  return (
    <div style={PAGE}>
      <Typography.Title level={4}>
        Демо-стенд экрана деталей PR (временная оснастка, удаляется на T15)
      </Typography.Title>
      <div style={TOOLBAR}>
        <Typography.Text strong>Прогон:</Typography.Text>
        <Select
          options={RUN_OPTIONS}
          value={run.id}
          onChange={(value: string) => {
            setRunId(value)
          }}
          style={{ width: 520 }}
        />
      </div>
      <div style={COLUMNS}>
        <section>
          <Typography.Title level={5}>Шапка и дерево действий</Typography.Title>
          {/* Действия в моках принадлежат прогону PR #34, поэтому дерево одно и то же
              для всех вариантов переключателя. */}
          <RunInspector run={run} actions={mockRunActions} now={NOW} />
        </section>
        <section>
          <Typography.Title level={5}>Дифф и комментарии ревью</Typography.Title>
          <RunDiff summaryOnly={run.summaryOnly} files={files} comments={mockReviewComments} />
        </section>
      </div>
    </div>
  )
}
