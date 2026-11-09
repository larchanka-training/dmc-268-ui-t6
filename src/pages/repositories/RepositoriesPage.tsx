import { useMutationState } from '@tanstack/react-query'
import { Alert, App, Button, Flex } from 'antd'
import { useEffect, useMemo, useRef, useState, type FC } from 'react'
import { useNavigate } from 'react-router'

import {
  UPDATE_REPOSITORY_MUTATION_KEY,
  useRepositories,
  useUpdateRepository,
  type UpdateRepositoryVariables,
} from '../../entities/repository'
import { useRunList } from '../../entities/run'
import { useMe } from '../../entities/user'
import { BitbucketConnectionsPanel } from '../../features/bitbucket-connections'
import { saveAccessRefreshIntent, saveAuthReturnTo, useAuthStore } from '../../features/auth'
import { useTranslation } from '../../shared/i18n'
import { RepositoryList, resolveAccessRefreshPresentation } from '../../widgets/repository-list'
import { isOnboardingDismissed, OnboardingChecklist } from '../../widgets/onboarding'
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

  const { data: repositoryData, isLoading, isFetching, isError, error, refetch } = useRepositories()
  const repositories = repositoryData ?? []
  const [dismissedUserId, setDismissedUserId] = useState<number | null>(null)
  const dismissed = useMemo(
    () => me !== undefined && (dismissedUserId === me.id || isOnboardingDismissed(me.id)),
    [me, dismissedUserId],
  )
  const canCheckRuns = me !== undefined && repositoryData !== undefined && !isError && !dismissed
  const successfulRunQuery = useRunList({ status: 'succeeded', enabled: canCheckRuns })
  const successfulRuns = successfulRunQuery.data?.pages.flatMap((page) => page.items)
  const hasSuccessfulRun = successfulRuns !== undefined && successfulRuns.length > 0
  const successfulRunCheckFinished =
    successfulRunQuery.data !== undefined || successfulRunQuery.isError
  const runQuery = useRunList({
    enabled: canCheckRuns && successfulRunQuery.data !== undefined && !hasSuccessfulRun,
  })
  const accessRefreshStatus = useRepositoryAccessRefresh(refetch)
  const statusRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
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
          intro={
            me &&
            repositoryData !== undefined &&
            successfulRunCheckFinished &&
            !dismissed &&
            !hasSuccessfulRun ? (
              <OnboardingChecklist
                hasInstallation={me.workspaces.length > 0}
                key={me.id}
                onDismiss={() => {
                  setDismissedUserId(me.id)
                  headingRef.current?.focus()
                }}
                onRetryRuns={() => {
                  if (successfulRunQuery.isError) {
                    void successfulRunQuery.refetch()
                  } else {
                    void runQuery.refetch()
                  }
                }}
                repositories={repositories}
                runs={runQuery.data?.pages.flatMap((page) => page.items)}
                runsError={successfulRunQuery.isError || runQuery.isError}
                successfulRuns={successfulRuns}
                userId={me.id}
              />
            ) : null
          }
          loading={isLoading}
          onRefresh={() => void refetch({ cancelRefetch: false })}
          onSyncAccess={handleSyncAccess}
          onOpenSettings={(repo) => void navigate(repositorySettingsPath(repo.id))}
          onToggleEnabled={handleToggleEnabled}
          repositories={repositories}
          refreshing={isFetching}
          settingsHref={(repo) => repositorySettingsPath(repo.id)}
          titleRef={headingRef}
          updatingRepoIds={updatingRepoIds}
        />
      ) : null}
      {me ? <BitbucketConnectionsPanel workspaces={me.workspaces} /> : null}
    </Flex>
  )
}
