import type { JSX, ReactNode } from 'react'
import { Card, Spin } from 'antd'

import type { RunAction, RunSession, SeverityCounts, Verdict } from '../../../entities/run'
import { ActionTree } from './ActionTree'
import { RunHeader } from './RunHeader'
import styles from './RunInspector.module.css'
import { RunProgressBar } from './RunProgressBar'

interface RunInspectorProps {
  run: RunSession
  actions: RunAction[]
  now: Date
  verdict?: Verdict | null
  severityCounts?: SeverityCounts | null
  droppedFindings?: number
  /** Shown under the run card, across the whole width. */
  headerExtra?: ReactNode
  /** The action log is still loading: a spinner takes its place. */
  actionsLoading?: boolean
  /** Shown next to the action log: the diff with the findings. */
  children?: ReactNode
}

/** A run on one screen: the card with its metadata, the action log and, next to it, the diff. */
export function RunInspector(props: RunInspectorProps): JSX.Element {
  const {
    run,
    actions,
    now,
    verdict = null,
    severityCounts = null,
    droppedFindings = 0,
    headerExtra = null,
    actionsLoading = false,
    children = null,
  } = props
  return (
    <section className={styles.root}>
      <Card>
        <RunHeader
          droppedFindings={droppedFindings}
          now={now}
          run={run}
          severityCounts={severityCounts ?? undefined}
          verdict={verdict}
        />
      </Card>
      <RunProgressBar actions={actions} run={run} />
      {headerExtra}
      <div className={styles.columns}>
        <section aria-label="Сессия ревью" className={styles.trace}>
          <h2 className={styles.label}>Сессия ревью</h2>
          {actionsLoading ? <Spin /> : <ActionTree actions={actions} runId={run.id} />}
        </section>
        {children}
      </div>
    </section>
  )
}
