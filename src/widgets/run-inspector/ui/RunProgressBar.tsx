import { StopOutlined } from '@ant-design/icons'
import { Steps, theme } from 'antd'
import type { StepsProps } from 'antd'
import type { JSX } from 'react'

import type { RunAction, RunProgressStage, RunSession } from '../../../entities/run'
import { runProgress } from '../../../entities/run'

interface RunProgressBarProps {
  run: Pick<RunSession, 'status' | 'errorCode'>
  actions: RunAction[]
}

type StepItem = NonNullable<StepsProps['items']>[number]

export function RunProgressBar(props: RunProgressBarProps): JSX.Element | null {
  const { run, actions } = props
  const { token } = theme.useToken()
  const progress = runProgress(run, actions)
  if (progress === null) {
    return null
  }

  function toItem(stage: RunProgressStage): StepItem {
    // The data attribute carries the progress state itself: antd has no `stopped` status.
    const title = (
      <span data-stage-state={stage.state} data-testid={`run-progress-${stage.key}`}>
        {stage.label}
      </span>
    )
    switch (stage.state) {
      case 'error':
        return { title, status: 'error', content: stage.errorCode ?? undefined }
      case 'stopped':
        // Not red: the run was cancelled, nothing broke. A neutral step with a warning stop icon.
        return {
          title,
          status: 'wait',
          icon: <StopOutlined style={{ color: token.colorWarning }} />,
          content: stage.errorCode === null ? 'Остановлено' : `Остановлено: ${stage.errorCode}`,
        }
      case 'wait':
      case 'process':
      case 'finish':
        return { title, status: stage.state }
    }
  }

  // The first stage that is not done is the active one; with everything done, the last.
  const firstOpen = progress.findIndex((stage) => stage.state !== 'finish')

  return (
    <div
      aria-label="Этапы прогона"
      data-testid="run-progress"
      role="group"
      style={{ margin: '12px 0' }}
    >
      <Steps
        current={firstOpen === -1 ? progress.length - 1 : firstOpen}
        items={progress.map(toItem)}
        size="small"
      />
    </div>
  )
}
