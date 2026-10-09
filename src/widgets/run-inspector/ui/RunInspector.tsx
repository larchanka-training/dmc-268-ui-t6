import type { JSX, ReactNode } from 'react'

import type { RunAction, RunSession, SeverityCounts, Verdict } from '../../../entities/run'
import { ActionTree } from './ActionTree'
import { RunHeader } from './RunHeader'
import { RunProgressBar } from './RunProgressBar'

interface RunInspectorProps {
  run: RunSession
  actions: RunAction[]
  now: Date
  verdict?: Verdict | null
  severityCounts?: SeverityCounts | null
  droppedFindings?: number
  headerExtra?: ReactNode
}

export function RunInspector(props: RunInspectorProps): JSX.Element {
  const {
    run,
    actions,
    now,
    verdict = null,
    severityCounts = null,
    droppedFindings = 0,
    headerExtra = null,
  } = props
  return (
    <section>
      <RunHeader
        droppedFindings={droppedFindings}
        now={now}
        run={run}
        severityCounts={severityCounts ?? undefined}
        verdict={verdict}
      />
      <RunProgressBar actions={actions} run={run} />
      {headerExtra}
      <ActionTree actions={actions} runId={run.id} />
    </section>
  )
}
