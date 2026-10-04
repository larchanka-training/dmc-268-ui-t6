import type { JSX } from 'react'
import { Button, Space, message } from 'antd'
import { useNavigate } from 'react-router'

import {
  ACTIVE_RUN_STATUSES,
  TERMINAL_RUN_STATUSES,
  runMutationErrorMessage,
  useCancelRun,
  useRerunRun,
  type RunSession,
} from '../../../entities/run'

interface RunControlsProps {
  run: RunSession
}

export function RunControls(props: RunControlsProps): JSX.Element {
  const { run } = props
  const navigate = useNavigate()
  const cancelMutation = useCancelRun(run.id)
  const rerunMutation = useRerunRun(run.id)
  const [messageApi, contextHolder] = message.useMessage()

  const canCancel = ACTIVE_RUN_STATUSES.some((status) => status === run.status)
  const canRerun = TERMINAL_RUN_STATUSES.some((status) => status === run.status)

  const showError = (error: unknown): void => {
    void messageApi.error(runMutationErrorMessage(error))
  }

  return (
    <>
      {contextHolder}
      <Space wrap>
        {canCancel ? (
          <Button
            danger
            loading={cancelMutation.isPending}
            onClick={() => {
              cancelMutation.mutate(undefined, { onError: showError })
            }}
          >
            Отменить
          </Button>
        ) : null}
        {canRerun ? (
          <Button
            loading={rerunMutation.isPending}
            onClick={() => {
              rerunMutation.mutate(undefined, {
                onError: showError,
                onSuccess: (session) => {
                  void navigate(`/runs/${session.id}`)
                },
              })
            }}
            type="primary"
          >
            Перезапустить
          </Button>
        ) : null}
      </Space>
    </>
  )
}
