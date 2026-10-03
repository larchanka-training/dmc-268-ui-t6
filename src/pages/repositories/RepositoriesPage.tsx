import { useMutationState } from '@tanstack/react-query'
import { Alert, App, Button, Flex } from 'antd'
import { useMemo, type FC } from 'react'

import {
  UPDATE_REPOSITORY_MUTATION_KEY,
  useRepositories,
  useUpdateRepository,
  type UpdateRepositoryInput,
  type UpdateRepositoryVariables,
} from '../../entities/repository'
import { RepositoryList } from '../../widgets/repository-list'
import { formatErrorMessage } from './lib/formatError'

export const RepositoriesPage: FC = () => {
  const { message } = App.useApp()

  const { data: repositories = [], isLoading, isError, error, refetch } = useRepositories()

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
      {isError ? (
        <Alert
          action={
            <Button onClick={() => void refetch()} size="small" type="primary">
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
          onRefresh={() => void refetch()}
          onToggleEnabled={handleToggleEnabled}
          onUpdateRepository={handleUpdateRepository}
          repositories={repositories}
          updatingRepoIds={updatingRepoIds}
        />
      ) : null}
    </Flex>
  )
}
