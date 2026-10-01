import { Alert, App, Button, Flex } from 'antd'
import type { FC } from 'react'

import {
  useRepositories,
  useUpdateRepository,
  type UpdateRepositoryInput,
} from '../../entities/repository'
import { RepositoryList } from '../../widgets/repository-list'

export const RepositoriesPage: FC = () => {
  const { message } = App.useApp()

  const { data: repositories = [], isLoading, isError, error, refetch } = useRepositories()

  const updateMutation = useUpdateRepository()

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, patch: { enabled } })
      void message.success(`Статус репозитория обновлен: ${enabled ? 'активен' : 'на паузе'}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось изменить статус репозитория'
      void message.error(msg)
    }
  }

  const handleUpdateRepository = async (id: string, patch: UpdateRepositoryInput) => {
    try {
      await updateMutation.mutateAsync({ id, patch })
      void message.success('Настройки репозитория успешно сохранены')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось сохранить настройки'
      void message.error(msg)
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
          description={
            error instanceof Error ? error.message : 'Не удалось загрузить список репозиториев'
          }
          showIcon
          title="Ошибка загрузки данных"
          type="error"
        />
      ) : null}

      {!isError || repositories.length > 0 ? (
        <RepositoryList
          loading={isLoading}
          onRefresh={() => {
            void refetch()
          }}
          onToggleEnabled={(id, enabled) => {
            void handleToggleEnabled(id, enabled)
          }}
          onUpdateRepository={(id, patch) => handleUpdateRepository(id, patch)}
          repositories={repositories}
          updatingRepoId={updateMutation.isPending ? updateMutation.variables.id : undefined}
        />
      ) : null}
    </Flex>
  )
}
