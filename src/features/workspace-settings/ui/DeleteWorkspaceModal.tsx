import { Alert, App, Button, Flex, Input, Modal, Typography } from 'antd'
import { useEffect, useRef, useState, type FC } from 'react'

import type { Workspace } from '../../../entities/user'
import { ApiError } from '../../../shared/api/client'
import { useTranslation } from '../../../shared/i18n'
import { useDisabledButtonClass } from '../../../shared/ui'
import { useDeleteWorkspace } from '../api'
import { WorkspaceNameMismatchErrorSchema } from '../model/schemas'
import styles from './DeleteWorkspaceModal.module.css'

export interface DeleteWorkspaceModalProps {
  open: boolean
  workspace: Workspace
  onClose: () => void
  onDeleted?: () => void
}

function isWorkspaceNameMismatch(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status === 422 &&
    WorkspaceNameMismatchErrorSchema.safeParse(err.data).success
  )
}

export const DeleteWorkspaceModal: FC<DeleteWorkspaceModalProps> = ({
  open,
  workspace,
  onClose,
  onDeleted,
}) => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const disabledButtonClass = useDisabledButtonClass()
  const [confirmationInput, setConfirmationInput] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const wasDeletedRef = useRef(false)

  const deleteMutation = useDeleteWorkspace()
  const isPending = deleteMutation.isPending

  const handleClose = () => {
    setConfirmationInput('')
    setErrorMessage(null)
    onClose()
  }

  const isMatch = confirmationInput === workspace.name
  const confirmBlocked = !isMatch || isPending

  const notifyDeleted = () => {
    if (!wasDeletedRef.current) return
    wasDeletedRef.current = false
    onDeleted?.()
  }

  // After the last workspace is deleted the page drops the danger zone before `afterClose` runs.
  const notifyDeletedRef = useRef(notifyDeleted)
  useEffect(() => {
    notifyDeletedRef.current = notifyDeleted
  })
  useEffect(
    () => () => {
      notifyDeletedRef.current()
    },
    [],
  )

  const handleConfirm = async () => {
    if (confirmBlocked) return
    setErrorMessage(null)

    try {
      await deleteMutation.mutateAsync({
        workspaceId: workspace.id,
        confirmationName: confirmationInput,
      })
      message.success(t('settings.workspace.dangerZone.successNotification'))
      setConfirmationInput('')
      setErrorMessage(null)
      wasDeletedRef.current = true
      onClose()
    } catch (err) {
      if (isWorkspaceNameMismatch(err)) {
        setErrorMessage(t('settings.workspace.dangerZone.nameMismatch'))
      } else {
        setErrorMessage(t('settings.workspace.dangerZone.deleteFailed'))
      }
    }
  }

  const warnings = (
    <ul className={styles.warningList}>
      <li>{t('settings.workspace.dangerZone.warningStripe')}</li>
      <li>{t('settings.workspace.dangerZone.warningBalance')}</li>
      <li>{t('settings.workspace.dangerZone.warningData')}</li>
    </ul>
  )

  return (
    <Modal
      afterClose={notifyDeleted}
      closable={!isPending}
      destroyOnHidden
      // Custom footer layout: keeps confirmation input and action buttons grouped cleanly in document order
      // with custom aria-disabled/loading focus-preservation semantics during in-flight deletion.
      footer={null}
      keyboard={!isPending}
      mask={{ closable: !isPending }}
      onCancel={handleClose}
      open={open}
      title={t('settings.workspace.dangerZone.modalTitle')}
    >
      <Flex gap="middle" vertical>
        <Alert
          description={warnings}
          showIcon
          title={t('settings.workspace.dangerZone.warningsTitle')}
          type="error"
        />

        {errorMessage ? <Alert showIcon title={errorMessage} type="error" /> : null}

        <div>
          <Typography.Paragraph>
            {t('settings.workspace.dangerZone.confirmPrompt', { name: workspace.name })}
          </Typography.Paragraph>
          <Input
            aria-label={t('settings.workspace.dangerZone.confirmInputLabel')}
            autoFocus
            onChange={(e) => {
              setConfirmationInput(e.target.value)
              if (errorMessage) setErrorMessage(null)
            }}
            placeholder={workspace.name}
            readOnly={isPending}
            value={confirmationInput}
          />
        </div>

        <div className={styles.modalFooter}>
          <Button
            aria-disabled={isPending ? true : undefined}
            className={isPending ? disabledButtonClass : undefined}
            onClick={isPending ? undefined : handleClose}
          >
            {t('settings.workspace.dangerZone.cancelButton')}
          </Button>
          <Button
            danger
            aria-disabled={confirmBlocked ? true : undefined}
            className={isPending ? disabledButtonClass : undefined}
            disabled={!isMatch}
            loading={isPending}
            onClick={
              confirmBlocked
                ? undefined
                : () => {
                    void handleConfirm()
                  }
            }
            type="primary"
          >
            {t('settings.workspace.dangerZone.confirmButton')}
          </Button>
        </div>
      </Flex>
    </Modal>
  )
}
