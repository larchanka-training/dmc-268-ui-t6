import { useContext, type JSX } from 'react'
import { Button, ConfigProvider, Space, message } from 'antd'
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
  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext)

  const canCancel = ACTIVE_RUN_STATUSES.some((status) => status === run.status)
  const canRerun = TERMINAL_RUN_STATUSES.some((status) => status === run.status)

  const showError = (error: unknown, action: 'rerun' | 'cancel'): void => {
    void messageApi.error(runMutationErrorMessage(error, action))
  }

  return (
    <>
      {contextHolder}
      <Space wrap>
        {canCancel ? (
          // aria-disabled, not disabled: a natively disabled button would drop the focus.
          <Button
            aria-disabled={run.cancelRequested ? true : undefined}
            className={run.cancelRequested ? `${getPrefixCls('btn')}-disabled` : undefined}
            danger={!run.cancelRequested}
            loading={cancelMutation.isPending}
            onClick={
              run.cancelRequested
                ? undefined
                : () => {
                    cancelMutation.mutate(undefined, {
                      onError: (error) => {
                        showError(error, 'cancel')
                      },
                    })
                  }
            }
          >
            {run.cancelRequested ? 'Отмена запрошена' : 'Отменить'}
          </Button>
        ) : null}
        {canRerun ? (
          <Button
            loading={rerunMutation.isPending}
            onClick={() => {
              rerunMutation.mutate(undefined, {
                onError: (error) => {
                  showError(error, 'rerun')
                },
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
