import { Alert, Button, Card, Flex, Skeleton, Typography } from 'antd'
import type { ParseKeys } from 'i18next'
import type { FC, JSX, ReactNode } from 'react'

import { useMe, type WorkspaceRole } from '../../entities/user'
import { useCurrentWorkspace } from '../../features/workspace'
import { useTranslation } from '../../shared/i18n'
import { PageHeader, Tag, type TagProps } from '../../shared/ui'
import styles from './WorkspaceSettingsPage.module.css'

const { Paragraph, Text } = Typography

function Field({
  label,
  align,
  children,
}: {
  label: string
  align?: 'start'
  children: ReactNode
}): JSX.Element {
  return (
    <Flex align={align} className={styles.field} gap={4} vertical>
      <Text type="secondary">{label}</Text>
      {children}
    </Flex>
  )
}

const ROLE_META = {
  owner: { labelKey: 'settings.workspace.general.roleOwner', tone: 'warning' },
  admin: { labelKey: 'settings.workspace.general.roleAdmin', tone: 'info' },
  billing: { labelKey: 'settings.workspace.general.roleBilling', tone: 'success' },
  member: { labelKey: 'settings.workspace.general.roleMember', tone: 'neutral' },
} as const satisfies Record<
  WorkspaceRole,
  { labelKey: ParseKeys; tone: NonNullable<TagProps['tone']> }
>

const READ_ONLY_ROLE_META = {
  labelKey: 'settings.workspace.general.roleReadOnly',
  tone: 'neutral',
} as const satisfies { labelKey: ParseKeys; tone: NonNullable<TagProps['tone']> }

interface PermissionSectionConfig {
  key: 'team' | 'billing'
  allowedRoles: readonly WorkspaceRole[]
  titleKey: ParseKeys
  descriptionKey: ParseKeys
  placeholderKey: ParseKeys
  noAccessKey?: ParseKeys
}

// ADR 0002 §11, §11.1 permissions: team management is restricted to owner and admin;
// view access for balance and plan is open to all workspace roles (owner, admin, billing, member).
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
    allowedRoles: ['owner', 'admin', 'billing', 'member'],
    titleKey: 'settings.workspace.billing.title',
    descriptionKey: 'settings.workspace.billing.description',
    placeholderKey: 'settings.workspace.billing.placeholder',
    // ADR 0002 §11.1: viewing balance/plan is open to all roles (owner, admin, billing, member);
    // noAccessKey is reserved for ui#208 when role-restricted mutating actions (recharge, plan changes) are added.
    noAccessKey: 'settings.workspace.billing.noAccess',
  },
]

export const WorkspaceSettingsPage: FC = () => {
  const { t } = useTranslation()
  const { current } = useCurrentWorkspace()
  const { data, isPending, isError, isFetching, refetch } = useMe()

  let content: ReactNode

  if (isPending) {
    content = <Skeleton active />
  } else if (isError && data === undefined) {
    content = (
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
    )
  } else if (!current) {
    content = <Alert showIcon title={t('settings.workspace.noWorkspace')} type="info" />
  } else {
    const role = current.role ?? null
    const roleMeta = role ? ROLE_META[role] : READ_ONLY_ROLE_META

    content = (
      <>
        {!role && <Alert type="warning" showIcon title={t('settings.workspace.readOnlyNotice')} />}

        <Card title={t('settings.workspace.general.title')}>
          <div className={styles.generalGrid}>
            <Field label={t('settings.workspace.general.name')}>
              <Text strong>{current.name}</Text>
            </Field>
            <Field label={t('settings.workspace.general.id')}>
              <Text code copyable className={styles.codeValue}>
                {current.id}
              </Text>
            </Field>
            <Field label={t('settings.workspace.general.installationId')}>
              <Text code>{String(current.installationId)}</Text>
            </Field>
            <Field align="start" label={t('settings.workspace.general.role')}>
              <Tag tone={roleMeta.tone} variant={role ? 'dot' : 'outline'}>
                {t(roleMeta.labelKey)}
              </Tag>
            </Field>
          </div>
        </Card>

        {PERMISSION_SECTIONS.map((section) => {
          const effectiveRole: WorkspaceRole = role ?? 'member'
          const hasAccess = section.allowedRoles.includes(effectiveRole)
          return (
            <Card key={section.key} title={t(section.titleKey)}>
              <Paragraph type="secondary">{t(section.descriptionKey)}</Paragraph>
              {hasAccess ? (
                <Alert type="info" title={t(section.placeholderKey)} />
              ) : (
                section.noAccessKey && (
                  <Alert type="warning" showIcon title={t(section.noAccessKey)} />
                )
              )}
            </Card>
          )
        })}
      </>
    )
  }

  return (
    <Flex vertical gap="large">
      <PageHeader title={t('settings.workspace.title')} />
      {content}
    </Flex>
  )
}
