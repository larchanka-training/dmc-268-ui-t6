import type { JSX, ReactNode } from 'react'

import type { RunAction, RunSession, SeverityCounts, Verdict } from '../../../entities/run'
import { ActionTree } from './ActionTree'
import { RunHeader } from './RunHeader'

interface RunInspectorProps {
  run: RunSession
  actions: RunAction[]
  now: Date
  verdict?: Verdict | null
  severityCounts?: SeverityCounts | null
  headerExtra?: ReactNode
}

export function RunInspector(props: RunInspectorProps): JSX.Element {
  const { run, actions, now, verdict = null, severityCounts = null, headerExtra = null } = props
  return (
    <section>
      <RunHeader now={now} run={run} severityCounts={severityCounts} verdict={verdict} />
      {headerExtra}
      <ActionTree actions={actions} runId={run.id} />
    </section>
  )
}
