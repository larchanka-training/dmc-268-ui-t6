import { Alert, Button, Flex, message } from 'antd'
import { useCallback, useEffect, useState, type FC } from 'react'

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
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRepositories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchRepositories()
      setRepositories(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось загрузить репозитории'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const data = await fetchRepositories()
        if (!ignore) {
          setRepositories(data)
        }
      } catch (err) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Не удалось загрузить репозитории'
          setError(msg)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      ignore = true
    }
  }, [])

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    // Optimistic update
    setRepositories((prev) => prev.map((repo) => (repo.id === id ? { ...repo, enabled } : repo)))
    try {
      await updateRepository(id, { enabled })
      message.success(`Статус репозитория обновлен: ${enabled ? 'активен' : 'на паузе'}`)
    } catch (err) {
      // Revert on error
      setRepositories((prev) =>
        prev.map((repo) => (repo.id === id ? { ...repo, enabled: !enabled } : repo)),
      )
      message.error(err instanceof Error ? err.message : 'Не удалось изменить статус репозитория')
    }
  }

  const handleUpdateRepository = async (id: string, patch: UpdateRepositoryInput) => {
    try {
      const updated = await updateRepository(id, patch)
      setRepositories((prev) => prev.map((repo) => (repo.id === id ? updated : repo)))
      message.success('Настройки репозитория успешно сохранены')
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Не удалось сохранить настройки')
    }
  }

  return (
    <AppLayout currentPath="/repositories" onNavigate={onNavigate}>
      <Flex vertical gap="middle">
        {error ? (
          <Alert
            action={
              <Button onClick={() => void loadRepositories()} size="small" type="primary">
                Повторить попытку
              </Button>
            }
            description={error}
            showIcon
            title="Ошибка загрузки данных"
            type="error"
          />
        ) : null}

        <RepositoryList
          loading={loading}
          onRefresh={() => {
            void loadRepositories()
          }}
          onToggleEnabled={(id, enabled) => {
            void handleToggleEnabled(id, enabled)
          }}
          onUpdateRepository={(id, patch) => {
            void handleUpdateRepository(id, patch)
          }}
          repositories={repositories}
        />
      </Flex>
    </AppLayout>
  )
}
