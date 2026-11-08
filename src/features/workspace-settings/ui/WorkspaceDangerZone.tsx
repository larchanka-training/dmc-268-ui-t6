import { Button, Card } from 'antd'
import { useId, useState, type FC } from 'react'

import type { Workspace } from '../../../entities/user'
import { useTranslation } from '../../../shared/i18n'
import { DeleteWorkspaceModal } from './DeleteWorkspaceModal'
import styles from './WorkspaceDangerZone.module.css'

export interface WorkspaceDangerZoneProps {
  workspace: Workspace
}

export const WorkspaceDangerZone: FC<WorkspaceDangerZoneProps> = ({ workspace }) => {
  const { t } = useTranslation()
  const [modalOpen, setModalOpen] = useState(false)
  const reasonId = useId()

  // Fail closed when role is missing or unknown (ADR 0003 / api#373): only explicit Owner can delete.
  const isOwnerAllowed = workspace.role === 'owner'
  const disabledReason =
    workspace.role === null || workspace.role === undefined
      ? t('settings.workspace.dangerZone.deleteDisabledReasonNoRole')
      : t('settings.workspace.dangerZone.deleteDisabledReasonNonOwner')

  return (
    <div className={styles.container}>
      <Card className={styles.dangerCard} title={t('settings.workspace.dangerZone.title')}>
        <div className={styles.cardBody}>
          <div className={styles.cardContent}>
            <p className={styles.description}>{t('settings.workspace.dangerZone.description')}</p>
          </div>
          <div className={styles.action}>
            {isOwnerAllowed ? (
              <Button
                danger
                onClick={() => {
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
                <p className={styles.disabledReason} id={reasonId}>
                  {disabledReason}
                </p>
              </>
            )}
          </div>
        </div>
      </Card>

      <DeleteWorkspaceModal
        onClose={() => {
          setModalOpen(false)
        }}
        open={modalOpen}
        workspace={workspace}
      />
    </div>
  )
}
