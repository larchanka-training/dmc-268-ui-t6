import type { JSX } from 'react'

import type { RunAction, RunSession } from '../../../entities/run'
import { ActionTree } from './ActionTree'
import { RunHeader } from './RunHeader'

interface RunInspectorProps {
  run: RunSession
  actions: RunAction[]
  now: Date
}

export function RunInspector(props: RunInspectorProps): JSX.Element {
  const { run, actions, now } = props
  return (
    <section>
      <RunHeader run={run} now={now} />
      <ActionTree actions={actions} />
    </section>
  )
}
