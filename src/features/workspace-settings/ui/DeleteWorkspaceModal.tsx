import { Alert, App, Button, Flex, Input, Modal, Typography } from 'antd'
import { useState, type FC } from 'react'

import type { Workspace } from '../../../entities/user'
import { ApiError } from '../../../shared/api/client'
import { useTranslation } from '../../../shared/i18n'
import { useDeleteWorkspace } from '../api'
import styles from './WorkspaceDangerZone.module.css'

export interface DeleteWorkspaceModalProps {
  open: boolean
  workspace: Workspace
  onClose: () => void
}

function isWorkspaceNameMismatch(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status === 422 &&
    typeof err.data === 'object' &&
    err.data !== null &&
    'detail' in err.data &&
    err.data.detail === 'workspace_name_mismatch'
  )
}

export const DeleteWorkspaceModal: FC<DeleteWorkspaceModalProps> = ({
  open,
  workspace,
  onClose,
}) => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [confirmationInput, setConfirmationInput] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const deleteMutation = useDeleteWorkspace()

  const handleClose = () => {
    if (deleteMutation.isPending) return
    setConfirmationInput('')
    setErrorMessage(null)
    onClose()
  }

  const isMatch = confirmationInput === workspace.name

  const handleConfirm = async () => {
    if (!isMatch || deleteMutation.isPending) return
    setErrorMessage(null)

    try {
      await deleteMutation.mutateAsync({
        workspaceId: workspace.id,
        confirmationName: confirmationInput,
      })
      message.success(t('settings.workspace.dangerZone.successNotification'))
      setConfirmationInput('')
      onClose()
    } catch (err: unknown) {
      setErrorMessage(
        isWorkspaceNameMismatch(err)
          ? t('settings.workspace.dangerZone.nameMismatch')
          : t('settings.workspace.dangerZone.deleteFailed'),
      )
    }
  }

  const warnings = (
    <ul className={styles.warningList}>
      <li>{t('settings.workspace.dangerZone.warningStripe')}</li>
      <li>{t('settings.workspace.dangerZone.warningBalance')}</li>
      <li>{t('settings.workspace.dangerZone.warningData')}</li>
      <li>{t('settings.workspace.dangerZone.warningAudit')}</li>
    </ul>
  )

  return (
    <Modal
      closable={!deleteMutation.isPending}
      destroyOnHidden
      footer={null}
      keyboard={!deleteMutation.isPending}
      mask={{ closable: !deleteMutation.isPending }}
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

        <div className={styles.confirmSection}>
          <Typography.Paragraph>
            {t('settings.workspace.dangerZone.confirmPrompt', { name: workspace.name })}
          </Typography.Paragraph>
          <Input
            aria-label={t('settings.workspace.dangerZone.confirmInputLabel')}
            autoFocus
            disabled={deleteMutation.isPending}
            onChange={(e) => {
              setConfirmationInput(e.target.value)
              if (errorMessage) setErrorMessage(null)
            }}
            placeholder={workspace.name}
            value={confirmationInput}
          />
        </div>

        <div className={styles.modalFooter}>
          <Button disabled={deleteMutation.isPending} onClick={handleClose}>
            {t('settings.workspace.dangerZone.cancelButton')}
          </Button>
          <Button
            danger
            disabled={!isMatch || deleteMutation.isPending}
            loading={deleteMutation.isPending}
            onClick={() => {
              void handleConfirm()
            }}
            type="primary"
          >
            {t('settings.workspace.dangerZone.confirmButton')}
          </Button>
        </div>
      </Flex>
    </Modal>
  )
}
