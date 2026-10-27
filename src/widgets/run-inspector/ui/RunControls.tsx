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
import { useTranslation } from '../../../shared/i18n'
import { useDisabledButtonClass } from '../../../shared/ui'

interface RunControlsProps {
  run: RunSession
}

export function RunControls(props: RunControlsProps): JSX.Element {
  const { run } = props
  const { t } = useTranslation()
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
    children: run.cancelRequested ? t('runs.controls.cancelRequested') : t('runs.controls.cancel'),
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
    children: t('runs.controls.restart'),
  }

  const buttonProps = canCancel ? cancelButtonProps : canRerun ? rerunButtonProps : null

  return (
    <>
      {contextHolder}
      <Space wrap>
        {/* One button in one slot: the node must survive a terminal transition so the focus
            stays on it instead of falling to the body (frontend.md §3b item 3). */}
        {buttonProps ? (
          <Button
            {...buttonProps}
            // A held Enter repeats keydown into clicks and the browser would click the button
            // again: after a cancel that ended the run that is "Restart" (frontend.md §3b
            // item 4). Only Enter: Space clicks on keyup, and a held Tab or arrow must still
            // move on.
            onKeyDown={(event) => {
              if (event.key === 'Enter' && event.repeat) {
                event.preventDefault()
              }
            }}
          />
        ) : null}
      </Space>
    </>
  )
}
