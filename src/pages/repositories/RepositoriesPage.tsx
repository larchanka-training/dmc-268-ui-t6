import { message } from 'antd'
import { useCallback, useEffect, useState, type FC } from 'react'

import { mockRepositories } from '../../app/mocks/app-state'
import { fetchRepositories, updateRepository, type Repository } from '../../entities/repository'
import { ConnectRepositoryModal } from '../../features/connect-repository'
import { AppLayout } from '../../widgets/app-layout'
import { RepositoryList } from '../../widgets/repository-list'

export interface RepositoriesPageProps {
  onNavigate?: (path: string) => void
}

export const RepositoriesPage: FC<RepositoriesPageProps> = ({ onNavigate }) => {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [connectModalOpen, setConnectModalOpen] = useState(false)

  const loadRepositories = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchRepositories()
      setRepositories(data.length > 0 ? data : mockRepositories)
    } catch {
      // Fallback to mock repositories for development/demo
      setRepositories(mockRepositories)
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
          setRepositories(data.length > 0 ? data : mockRepositories)
        }
      } catch {
        if (!ignore) {
          setRepositories(mockRepositories)
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
    } catch {
      // Mock update already applied optimistically
    }
  }

  const handleRepositoryConnected = (newRepo: Repository) => {
    setRepositories((prev) => [newRepo, ...prev])
  }

  return (
    <AppLayout currentPath="/repositories" onNavigate={onNavigate}>
      <RepositoryList
        loading={loading}
        onConnectClick={() => {
          setConnectModalOpen(true)
        }}
        onRefresh={() => {
          void loadRepositories()
        }}
        onToggleEnabled={(id, enabled) => {
          void handleToggleEnabled(id, enabled)
        }}
        repositories={repositories}
      />

      <ConnectRepositoryModal
        onClose={() => {
          setConnectModalOpen(false)
        }}
        onSuccess={handleRepositoryConnected}
        open={connectModalOpen}
      />
    </AppLayout>
  )
}
