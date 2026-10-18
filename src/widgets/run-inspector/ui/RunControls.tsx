import type { JSX } from 'react'
import { Button, Space, message, type ButtonProps } from 'antd'
import { useNavigate } from 'react-router'

import {
  ACTIVE_RUN_STATUSES,
  TERMINAL_RUN_STATUSES,
  runMutationErrorMessage,
  useCancelRun,
  useRerunRun,
  type RunSession,
} from '../../../entities/run'
import { useDisabledButtonClass } from '../../../shared/ui'

interface RunControlsProps {
  run: RunSession
}

export function RunControls(props: RunControlsProps): JSX.Element {
  const { run } = props
  const navigate = useNavigate()
  const cancelMutation = useCancelRun(run.id)
  const rerunMutation = useRerunRun(run.id)
  const [messageApi, contextHolder] = message.useMessage()
  const disabledButtonClass = useDisabledButtonClass()

  const canCancel = ACTIVE_RUN_STATUSES.some((status) => status === run.status)
  const canRerun = TERMINAL_RUN_STATUSES.some((status) => status === run.status)

  const showError = (error: unknown, action: 'rerun' | 'cancel'): void => {
    void messageApi.error(runMutationErrorMessage(error, action))
  }

  const cancelButtonProps: ButtonProps = {
    // aria-disabled, not disabled: a natively disabled button would drop the focus.
    'aria-disabled': run.cancelRequested ? true : undefined,
    className: run.cancelRequested ? disabledButtonClass : undefined,
    danger: !run.cancelRequested,
    loading: cancelMutation.isPending,
    onClick: run.cancelRequested
      ? undefined
      : () => {
          cancelMutation.mutate(undefined, {
            onError: (error) => {
              showError(error, 'cancel')
            },
          })
        },
    children: run.cancelRequested ? 'Отмена запрошена' : 'Отменить',
  }
  const rerunButtonProps: ButtonProps = {
    loading: rerunMutation.isPending,
    onClick: () => {
      rerunMutation.mutate(undefined, {
        onError: (error) => {
          showError(error, 'rerun')
        },
        onSuccess: (session) => {
          void navigate(`/runs/${session.id}`)
        },
      })
    },
    type: 'primary',
    children: 'Перезапустить',
  }

  return (
    <>
      {contextHolder}
      <Space wrap>
        {/* One button in one slot: the node must survive a terminal transition so the focus
            stays on it instead of falling to the body (frontend.md §3b item 3). */}
        {canCancel || canRerun ? (
          <Button {...(canCancel ? cancelButtonProps : rerunButtonProps)} />
        ) : null}
      </Space>
    </>
  )
}
