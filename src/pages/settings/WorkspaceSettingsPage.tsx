import { Alert, Button, Card, Flex, Skeleton, Typography } from 'antd'
import type { FC } from 'react'

import { useMe, type WorkspaceRole } from '../../entities/user'
import { useCurrentWorkspace } from '../../features/workspace'
import { WorkspaceDangerZone } from '../../features/workspace-settings'
import { useTranslation } from '../../shared/i18n'
import { PageHeader, Tag, type TagProps } from '../../shared/ui'
import styles from './WorkspaceSettingsPage.module.css'

const { Paragraph, Text } = Typography

type RoleLabelKey =
  | 'settings.workspace.general.roleOwner'
  | 'settings.workspace.general.roleAdmin'
  | 'settings.workspace.general.roleBilling'
  | 'settings.workspace.general.roleMember'

const ROLE_META: Record<
  WorkspaceRole,
  { labelKey: RoleLabelKey; tone: NonNullable<TagProps['tone']> }
> = {
  owner: { labelKey: 'settings.workspace.general.roleOwner', tone: 'warning' },
  admin: { labelKey: 'settings.workspace.general.roleAdmin', tone: 'info' },
  billing: { labelKey: 'settings.workspace.general.roleBilling', tone: 'success' },
  member: { labelKey: 'settings.workspace.general.roleMember', tone: 'neutral' },
}

const READ_ONLY_ROLE_META = {
  labelKey: 'settings.workspace.general.roleReadOnly' as const,
  tone: 'neutral' as const,
}

interface PermissionSectionConfig {
  key: 'team' | 'billing'
  allowedRoles: readonly WorkspaceRole[]
  titleKey: 'settings.workspace.team.title' | 'settings.workspace.billing.title'
  descriptionKey: 'settings.workspace.team.description' | 'settings.workspace.billing.description'
  placeholderKey: 'settings.workspace.team.placeholder' | 'settings.workspace.billing.placeholder'
  noAccessKey: 'settings.workspace.team.noAccess' | 'settings.workspace.billing.noAccess'
}

// ADR 0002 §11 permissions; Danger Zone (ui#300) is rendered below.
const PERMISSION_SECTIONS: readonly PermissionSectionConfig[] = [
  {
    key: 'team',
    allowedRoles: ['owner', 'admin'],
    titleKey: 'settings.workspace.team.title',
    descriptionKey: 'settings.workspace.team.description',
    placeholderKey: 'settings.workspace.team.placeholder',
    noAccessKey: 'settings.workspace.team.noAccess',
  },
  {
    key: 'billing',
    allowedRoles: ['owner', 'admin', 'billing'],
    titleKey: 'settings.workspace.billing.title',
    descriptionKey: 'settings.workspace.billing.description',
    placeholderKey: 'settings.workspace.billing.placeholder',
    noAccessKey: 'settings.workspace.billing.noAccess',
  },
]

export const WorkspaceSettingsPage: FC = () => {
  const { t } = useTranslation()
  const { current } = useCurrentWorkspace()
  const { isPending, isError, isFetching, refetch } = useMe()

  if (isPending) {
    return (
      <Flex gap="middle" vertical>
        <PageHeader title={t('settings.workspace.title')} />
        <Skeleton active />
      </Flex>
    )
  }

  if (isError) {
    return (
      <Flex gap="middle" vertical>
        <PageHeader title={t('settings.workspace.title')} />
        <Alert
          action={
            <Button loading={isFetching} onClick={() => void refetch()} size="small" type="primary">
              {t('common.errors.tryAgain')}
            </Button>
          }
          description={t('settings.workspace.loadFailed')}
          showIcon
          title={t('common.errors.loadTitle')}
          type="error"
        />
      </Flex>
    )
  }

  if (!current) {
    return (
      <Flex gap="middle" vertical>
        <PageHeader title={t('settings.workspace.title')} />
        <Alert showIcon title={t('settings.workspace.noWorkspace')} type="info" />
      </Flex>
    )
  }

  const role = current.role ?? null
  const roleMeta = role ? ROLE_META[role] : READ_ONLY_ROLE_META

  return (
    <Flex vertical gap="large">
      <PageHeader title={t('settings.workspace.title')} />

      {!role && <Alert type="warning" showIcon title={t('settings.workspace.readOnlyNotice')} />}

      <Card title={t('settings.workspace.general.title')}>
        <div className={styles.generalGrid}>
          <Flex vertical gap={4} className={styles.field}>
            <Text type="secondary">{t('settings.workspace.general.name')}</Text>
            <Text strong>{current.name}</Text>
          </Flex>
          <Flex vertical gap={4} className={styles.field}>
            <Text type="secondary">{t('settings.workspace.general.id')}</Text>
            <Text code copyable className={styles.codeValue}>
              {current.id}
            </Text>
          </Flex>
          <Flex vertical gap={4} className={styles.field}>
            <Text type="secondary">{t('settings.workspace.general.installationId')}</Text>
            <Text code>{String(current.installationId)}</Text>
          </Flex>
          <Flex vertical gap={4} align="start" className={styles.field}>
            <Text type="secondary">{t('settings.workspace.general.role')}</Text>
            <Tag tone={roleMeta.tone} variant={role ? 'dot' : 'outline'}>
              {t(roleMeta.labelKey)}
            </Tag>
          </Flex>
        </div>
      </Card>

      {PERMISSION_SECTIONS.map((section) => {
        const hasAccess = role !== null && section.allowedRoles.includes(role)
        return (
          <Card key={section.key} title={t(section.titleKey)}>
            <Paragraph type="secondary">{t(section.descriptionKey)}</Paragraph>
            {hasAccess ? (
              <Alert type="info" title={t(section.placeholderKey)} />
            ) : (
              <Alert type="warning" showIcon title={t(section.noAccessKey)} />
            )}
          </Card>
        )
      })}

      <WorkspaceDangerZone workspace={current} />
    </Flex>
  )
}
