import type { JSX, ReactNode } from 'react'
import { Card, Spin } from 'antd'

import type {
  RunAction,
  RunBudget,
  RunSession,
  SeverityCounts,
  Verdict,
} from '../../../entities/run'
import { useTranslation } from '../../../shared/i18n'
import { ActionTree } from './ActionTree'
import { RunHeader } from './RunHeader'
import styles from './RunInspector.module.css'
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
  /** Shown under the run card, across the whole width. */
  headerExtra?: ReactNode
  /** The action log is still loading: a spinner takes its place. */
  actionsLoading?: boolean
  /** Shown next to the action log: the diff with the findings. */
  children?: ReactNode
  /** Spending and limits from the run detail. `null` is shown as dashes. */
  budget?: RunBudget | null
}

/** A run on one screen: the card with its metadata, the action log and, next to it, the diff. */
export function RunInspector(props: RunInspectorProps): JSX.Element {
  const { t } = useTranslation()
  const {
    run,
    actions,
    actionsUnavailable = false,
    now,
    verdict = null,
    severityCounts = null,
    droppedFindings = 0,
    headerExtra = null,
    actionsLoading = false,
    children = null,
    budget = null,
  } = props
  return (
    <section className={styles.root}>
      <Card>
        <RunHeader
          droppedFindings={droppedFindings}
          budget={budget}
          loggedActions={actions.length}
          now={now}
          run={run}
          severityCounts={severityCounts ?? undefined}
          verdict={verdict}
        />
      </Card>
      <RunProgressBar
        actions={actions}
        actionsUnavailable={actionsUnavailable || actionsLoading}
        run={run}
      />
      {headerExtra}
      <div className={styles.columns}>
        <section aria-label={t('runs.detail.session')} className={styles.trace}>
          <h2 className={styles.label}>{t('runs.detail.session')}</h2>
          {actionsLoading ? <Spin /> : <ActionTree actions={actions} runId={run.id} />}
        </section>
        {children}
      </div>
    </section>
  )
}
