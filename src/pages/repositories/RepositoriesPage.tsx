import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Flex } from 'antd'
import type { FC } from 'react'

import {
  fetchRepositories,
  updateRepository,
  type Repository,
  type UpdateRepositoryInput,
} from '../../entities/repository'
import { AppLayout } from '../../widgets/app-layout'
import { RepositoryList } from '../../widgets/repository-list'

export interface RepositoriesPageProps {
  onNavigate?: (path: string) => void
}

export const RepositoriesPage: FC<RepositoriesPageProps> = ({ onNavigate }) => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const {
    data: repositories = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['repositories'],
    queryFn: fetchRepositories,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateRepositoryInput }) =>
      updateRepository(id, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData<Repository[]>(['repositories'], (prev) =>
        prev ? prev.map((r) => (r.id === updated.id ? updated : r)) : [updated],
      )
    },
  })

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    const previous = queryClient.getQueryData<Repository[]>(['repositories'])
    queryClient.setQueryData<Repository[]>(['repositories'], (prev) =>
      prev?.map((repo) => (repo.id === id ? { ...repo, enabled } : repo)),
    )
    try {
      await updateMutation.mutateAsync({ id, patch: { enabled } })
      void message.success(`Статус репозитория обновлен: ${enabled ? 'активен' : 'на паузе'}`)
    } catch (err) {
      queryClient.setQueryData(['repositories'], previous)
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
    <AppLayout currentPath="/repositories" onNavigate={onNavigate}>
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
        />
      </Flex>
    </AppLayout>
  )
}
