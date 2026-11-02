import { useMutationState } from '@tanstack/react-query'
import { Alert, App, Button, Flex } from 'antd'
import { useEffect, useMemo, useRef, type FC } from 'react'
import { useNavigate } from 'react-router'

import {
  UPDATE_REPOSITORY_MUTATION_KEY,
  useRepositories,
  useUpdateRepository,
  type UpdateRepositoryVariables,
} from '../../entities/repository'
import { useMe } from '../../entities/user'
import { BitbucketConnectionsPanel } from '../../features/bitbucket-connections'
import { saveAccessRefreshIntent, saveAuthReturnTo, useAuthStore } from '../../features/auth'
import { useTranslation } from '../../shared/i18n'
import { RepositoryList, resolveAccessRefreshPresentation } from '../../widgets/repository-list'
import styles from './RepositoriesPage.module.css'
import { formatErrorMessage } from './lib/formatError'
import { repositorySettingsPath } from './lib/settingsPath'
import { useRepositoryAccessRefresh } from './lib/useRepositoryAccessRefresh'

export const RepositoriesPage: FC = () => {
  const { message } = App.useApp()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const loginWithGitHub = useAuthStore((state) => state.loginWithGitHub)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { data: me } = useMe(isAuthenticated)

  const handleSyncAccess = () => {
    saveAccessRefreshIntent()
    saveAuthReturnTo('/repositories')
    loginWithGitHub()
  }

  const {
    data: repositories = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useRepositories()
  const accessRefreshStatus = useRepositoryAccessRefresh(refetch)
  const statusRef = useRef<HTMLDivElement>(null)
  const { announcement: accessRefreshMessage } = resolveAccessRefreshPresentation(
    accessRefreshStatus,
    isFetching,
  )

  useEffect(() => {
    const status = statusRef.current
    if (!status) return
    status.textContent = ''
    if (!accessRefreshMessage) return

    // Paint the empty region before its first message so assistive technology can register it.
    // This only synchronizes presentation; the query and polling timers remain independent.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        status.textContent = accessRefreshMessage
      })
    })
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [accessRefreshMessage])

  const updateMutation = useUpdateRepository()

  const pendingUpdatingIds = useMutationState<string>({
    filters: { mutationKey: UPDATE_REPOSITORY_MUTATION_KEY, status: 'pending' },
    select: (mutation) =>
      (mutation.state.variables as UpdateRepositoryVariables | undefined)?.id ?? '',
  })

  const updatingRepoIds = useMemo(
    () => new Set(pendingUpdatingIds.filter(Boolean)),
    [pendingUpdatingIds],
  )

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, patch: { enabled } })
      void message.success(
        enabled ? t('repositories.statusUpdatedActive') : t('repositories.statusUpdatedPaused'),
      )
    } catch (err) {
      void message.error(formatErrorMessage(err, t('repositories.statusUpdateFailed')))
    }
  }

  return (
    <Flex gap="middle" vertical>
      <div
        aria-atomic="true"
        ref={statusRef}
        role="status"
        className={styles.accessRefreshStatus}
      />
      {isError ? (
        <Alert
          action={
            <Button
              loading={isFetching}
              onClick={() => void refetch({ cancelRefetch: false })}
              size="small"
              type="primary"
            >
              {t('common.errors.tryAgain')}
            </Button>
          }
          description={formatErrorMessage(error, t('repositories.loadFailed'))}
          showIcon
          title={t('common.errors.loadTitle')}
          type="error"
        />
      ) : null}

      {!isError || repositories.length > 0 || accessRefreshStatus !== 'idle' ? (
        <RepositoryList
          accessRefreshStatus={accessRefreshStatus}
          loading={isLoading}
          onRefresh={() => void refetch({ cancelRefetch: false })}
          onSyncAccess={handleSyncAccess}
          onOpenSettings={(repo) => void navigate(repositorySettingsPath(repo.id))}
          onToggleEnabled={handleToggleEnabled}
          repositories={repositories}
          refreshing={isFetching}
          settingsHref={(repo) => repositorySettingsPath(repo.id)}
          updatingRepoIds={updatingRepoIds}
        />
      ) : null}
      {me ? <BitbucketConnectionsPanel workspaces={me.workspaces} /> : null}
    </Flex>
  )
}
