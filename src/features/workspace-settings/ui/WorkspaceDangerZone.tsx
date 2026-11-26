import { Button, Card, Typography } from 'antd'
import { useId, useState, type FC } from 'react'

import type { Workspace } from '../../../entities/user'
import { useTranslation } from '../../../shared/i18n'
import { DeleteWorkspaceModal } from './DeleteWorkspaceModal'
import styles from './WorkspaceDangerZone.module.css'

const { Paragraph, Text } = Typography

export interface WorkspaceDangerZoneProps {
  workspace: Workspace
  onDeleted?: () => void
}

export const WorkspaceDangerZone: FC<WorkspaceDangerZoneProps> = ({ workspace, onDeleted }) => {
  const { t } = useTranslation()
  const [modalOpen, setModalOpen] = useState(false)
  // The dialog deletes the workspace it was opened for, even when the current one changes meanwhile.
  const [target, setTarget] = useState(workspace)
  const reasonId = useId()

  // Fail closed when role is missing or unknown (ADR 0003 / api#373): only explicit Owner can delete.
  const isOwnerAllowed = workspace.role === 'owner'
  const disabledReason =
    workspace.role === null || workspace.role === undefined
      ? t('settings.workspace.dangerZone.deleteDisabledReasonNoRole')
      : t('settings.workspace.dangerZone.deleteDisabledReasonNonOwner')

  return (
    <>
      <Card title={t('settings.workspace.dangerZone.title')}>
        <div className={styles.cardBody}>
          <div className={styles.cardContent}>
            <Paragraph type="secondary">{t('settings.workspace.dangerZone.description')}</Paragraph>
          </div>
          <div className={styles.action}>
            {isOwnerAllowed ? (
              <Button
                danger
                onClick={() => {
                  setTarget(workspace)
                  setModalOpen(true)
                }}
              >
                {t('settings.workspace.dangerZone.deleteButton')}
              </Button>
            ) : (
              <>
                <Button aria-describedby={reasonId} danger disabled>
                  {t('settings.workspace.dangerZone.deleteButton')}
                </Button>
                <Text id={reasonId} type="secondary">
                  {disabledReason}
                </Text>
              </>
            )}
          </div>
        </div>
      </Card>

      <DeleteWorkspaceModal
        onClose={() => {
          setModalOpen(false)
        }}
        onDeleted={onDeleted}
        open={modalOpen}
        workspace={target}
      />
    </>
  )
}
