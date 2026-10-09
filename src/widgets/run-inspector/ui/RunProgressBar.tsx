import { StopOutlined } from '@ant-design/icons'
import { Steps, theme } from 'antd'
import type { StepsProps } from 'antd'
import type { JSX } from 'react'

import type { RunAction, RunProgressStage, RunSession } from '../../../entities/run'
import { runProgress, runProgressReadsLog } from '../../../entities/run'

interface RunProgressBarProps {
  run: Pick<RunSession, 'status' | 'errorCode'>
  actions: RunAction[]
  /** The action log failed to load and there is none to show: the bar must not guess from `[]`. */
  actionsUnavailable?: boolean
}

type StepItem = NonNullable<StepsProps['items']>[number]

export function RunProgressBar(props: RunProgressBarProps): JSX.Element | null {
  const { run, actions, actionsUnavailable = false } = props
  const { token } = theme.useToken()
  const progress = runProgress(run, actions)
  if (progress === null || (actionsUnavailable && runProgressReadsLog(run.status))) {
    return null
  }

  function toItem(stage: RunProgressStage): StepItem {
    // The data attribute carries the progress state itself: antd has no `stopped` status.
    // The text of a failed or stopped stage takes the normal text token: antd's error red
    // (3.27 on white) and waiting grey (3.35) fail the contrast check, and the icon marks the state.
    const textStyle = { color: token.colorText }
    const title = (
      <span
        data-stage-state={stage.state}
        data-testid={`run-progress-${stage.key}`}
        style={stage.state === 'stopped' ? textStyle : undefined}
      >
        {stage.label}
      </span>
    )
    switch (stage.state) {
      case 'error':
        return {
          title,
          status: 'error',
          content:
            stage.errorCode === null ? undefined : <span style={textStyle}>{stage.errorCode}</span>,
        }
      case 'stopped':
        // Not red: the run was cancelled, nothing broke. A neutral step with a warning stop icon.
        return {
          title,
          status: 'wait',
          icon: <StopOutlined style={{ color: token.colorWarning }} />,
          content: (
            <span style={textStyle}>
              {stage.errorCode === null ? 'Остановлено' : `Остановлено: ${stage.errorCode}`}
            </span>
          ),
        }
      case 'wait':
      case 'process':
      case 'finish':
        return { title, status: stage.state }
    }
  }

  // antd marks the step at `current` as active. Only a stage in progress, failed or stopped is one;
  // with every stage waiting or finished there is none, so `current` points past the last step.
  const active = progress.findIndex(
    (stage) => stage.state === 'process' || stage.state === 'error' || stage.state === 'stopped',
  )

  return (
    <div
      aria-label="Этапы прогона"
      data-testid="run-progress"
      role="group"
      style={{ margin: '12px 0' }}
    >
      <Steps
        current={active === -1 ? progress.length : active}
        items={progress.map(toItem)}
        size="small"
      />
    </div>
  )
}
