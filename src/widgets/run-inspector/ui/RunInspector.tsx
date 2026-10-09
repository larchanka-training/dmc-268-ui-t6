import type { JSX, ReactNode } from 'react'

import type { RunAction, RunSession, SeverityCounts, Verdict } from '../../../entities/run'
import { ActionTree } from './ActionTree'
import { RunHeader } from './RunHeader'
import { RunProgressBar } from './RunProgressBar'

interface RunInspectorProps {
  run: RunSession
  actions: RunAction[]
  /** The action log failed to load and there is none: the progress bar is left out where it needs it. */
  actionsUnavailable?: boolean
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
    actionsUnavailable = false,
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
        loggedActions={actions.length}
        now={now}
        run={run}
        severityCounts={severityCounts ?? undefined}
        verdict={verdict}
      />
      <RunProgressBar actions={actions} actionsUnavailable={actionsUnavailable} run={run} />
      {headerExtra}
      <ActionTree actions={actions} runId={run.id} />
    </section>
  )
}
