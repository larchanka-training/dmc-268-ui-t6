import type { JSX } from 'react'

import type { RunAction, RunProgressStage, RunSession } from '../../../entities/run'
import { runProgress, runProgressReadsLog } from '../../../entities/run'
import { i18n, useTranslation } from '../../../shared/i18n'
import { ProgressSteps, type ProgressStep } from '../../../shared/ui'

interface RunProgressBarProps {
  run: Pick<RunSession, 'status' | 'errorCode' | 'attempt'>
  actions: RunAction[]
  /** The action log failed to load and there is none to show: the bar must not guess from `[]`. */
  actionsUnavailable?: boolean
}

/** The line under the title: the error code of a failed stage, the stop of a cancelled one. */
function noteOf(stage: RunProgressStage): string | undefined {
  switch (stage.state) {
    case 'error':
      return stage.errorCode ?? undefined
    case 'stopped':
      // Not an error: the run was cancelled, nothing broke.
      return stage.errorCode === null
        ? i18n.t('runs.progress.stopped')
        : i18n.t('runs.progress.stoppedWithCode', { code: stage.errorCode })
    case 'wait':
    case 'process':
    case 'finish':
      return undefined
  }
}

function toStep(stage: RunProgressStage): ProgressStep {
  return {
    key: stage.key,
    // The data attributes carry the progress state for the page and its tests.
    title: (
      <span data-stage-state={stage.state} data-testid={`run-progress-${stage.key}`}>
        {stage.label}
      </span>
    ),
    state: stage.state,
    note: noteOf(stage),
  }
}

export function RunProgressBar(props: RunProgressBarProps): JSX.Element | null {
  const { run, actions, actionsUnavailable = false } = props
  const { t } = useTranslation()
  const progress = runProgress(run, actions)
  if (progress === null || (actionsUnavailable && runProgressReadsLog(run.status))) {
    return null
  }
  return (
    <div aria-label={t('runs.detail.stages')} data-testid="run-progress" role="group">
      <ProgressSteps steps={progress.map(toStep)} />
    </div>
  )
}
