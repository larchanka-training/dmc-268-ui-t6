import { useMutationState } from '@tanstack/react-query'
import { Alert, App, Button, Flex, Spin } from 'antd'
import { useMemo, type FC } from 'react'

import {
  UPDATE_REPOSITORY_MUTATION_KEY,
  useRepositories,
  useUpdateRepository,
  type UpdateRepositoryInput,
  type UpdateRepositoryVariables,
} from '../../entities/repository'
import { saveAccessRefreshIntent, saveAuthReturnTo, useAuthStore } from '../../features/auth'
import { RepositoryList } from '../../widgets/repository-list'
import { formatErrorMessage } from './lib/formatError'
import { useRepositoryAccessRefresh } from './lib/useRepositoryAccessRefresh'

export const RepositoriesPage: FC = () => {
  const { message } = App.useApp()
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
      await updateMutation.mutateAsync({ id, patch: { enabled } })
      void message.success(`Статус репозитория обновлен: ${enabled ? 'активен' : 'на паузе'}`)
    } catch (err) {
      void message.error(formatErrorMessage(err, 'Не удалось изменить статус репозитория'))
    }
  }

  const handleUpdateRepository = async (id: string, patch: UpdateRepositoryInput) => {
    try {
      await updateMutation.mutateAsync({ id, patch })
      void message.success('Настройки репозитория успешно сохранены')
    } catch (err) {
      void message.error(formatErrorMessage(err, 'Не удалось сохранить настройки'))
      throw err
    }
  }

  return (
    <Flex gap="middle" vertical>
      {accessRefreshStatus === 'waiting' ? (
        <Alert
          icon={<Spin size="small" />}
          showIcon
          title="Обновляем список репозиториев после авторизации через GitHub. Это может занять до двух минут"
          type="info"
        />
      ) : accessRefreshStatus === 'timedOut' ? (
        <Alert
          description={
            <Button
              loading={isFetching}
              onClick={() => void refetch({ cancelRefetch: false })}
              size="small"
            >
              Обновить список
            </Button>
          }
          showIcon
          title="Автоматическое обновление завершено. Если нужный репозиторий ещё не появился, обновите список вручную"
          type="info"
        />
      ) : null}
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

      {!isError || repositories.length > 0 ? (
        <RepositoryList
          loading={isLoading}
          onRefresh={() => void refetch({ cancelRefetch: false })}
          onSyncAccess={handleSyncAccess}
          onToggleEnabled={handleToggleEnabled}
          onUpdateRepository={handleUpdateRepository}
          repositories={repositories}
          refreshing={isFetching}
          updatingRepoIds={updatingRepoIds}
        />
      ) : null}
    </Flex>
  )
}
