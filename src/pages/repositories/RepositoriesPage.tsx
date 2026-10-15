import { useMutationState } from '@tanstack/react-query'
import { Alert, App, Button, Flex } from 'antd'
import { useMemo, type FC } from 'react'
import { useNavigate } from 'react-router'

import {
  UPDATE_REPOSITORY_MUTATION_KEY,
  useRepositories,
  useUpdateRepository,
  type UpdateRepositoryVariables,
} from '../../entities/repository'
import { saveAccessRefreshIntent, saveAuthReturnTo, useAuthStore } from '../../features/auth'
import { autoReviewChoiceSaved } from '../../features/repository-settings'
import { RepositoryList } from '../../widgets/repository-list'
import { formatErrorMessage } from './lib/formatError'
import { repositorySettingsPath } from './lib/settingsPath'
import { useRepositoryAccessRefresh } from './lib/useRepositoryAccessRefresh'

export const RepositoriesPage: FC = () => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const loginWithGitHub = useAuthStore((state) => state.loginWithGitHub)

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
      const saved = await updateMutation.mutateAsync({ id, patch: { enabled } })
      // Without GitHub App access the server keeps the choice but serves `enabled: false` (api PR
      // #156): «активен» or «на паузе» would be wrong, whichever way the choice went.
      if (!saved.installationAvailable) {
        void message.info(autoReviewChoiceSaved(enabled))
        return
      }
      void message.success(`Статус репозитория обновлен: ${enabled ? 'активен' : 'на паузе'}`)
    } catch (err) {
      void message.error(formatErrorMessage(err, 'Не удалось изменить статус репозитория'))
    }
  }

  return (
    <Flex gap="middle" vertical>
      {isError ? (
        <Alert
          action={
            <Button
              loading={isFetching}
              onClick={() => void refetch({ cancelRefetch: false })}
              size="small"
              type="primary"
            >
              Повторить попытку
            </Button>
          }
          description={formatErrorMessage(error, 'Не удалось загрузить список репозиториев')}
          showIcon
          title="Ошибка загрузки данных"
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
    </Flex>
  )
}
