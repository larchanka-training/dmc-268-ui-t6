import { Alert, App, Button, Flex, Input, Select, Typography } from 'antd'
import { useRef, useState, type FC } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type { Workspace } from '../../../entities/user'
import { REPOSITORIES_QUERY_KEY } from '../../../entities/repository'
import { safeHttpUrl } from '../../../shared/lib/safeHttpUrl'
import {
  BITBUCKET_CONNECTIONS_QUERY_KEY,
  connectBitbucketRepository,
  discoverBitbucketRepositories,
  disconnectBitbucketRepository,
  rotateBitbucketCredential,
  rotateBitbucketWebhookSecret,
  useBitbucketConnections,
} from '../api'
import type { BitbucketDiscoveredRepository, BitbucketWebhookSetup } from '../model/schemas'

const { Text, Title } = Typography

export interface BitbucketConnectionsPanelProps {
  workspaces: Workspace[]
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Не удалось выполнить операцию Bitbucket'
}

export const BitbucketConnectionsPanel: FC<BitbucketConnectionsPanelProps> = ({ workspaces }) => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [bitbucketWorkspace, setBitbucketWorkspace] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [discovered, setDiscovered] = useState<BitbucketDiscoveredRepository[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [setup, setSetup] = useState<BitbucketWebhookSetup | null>(null)
  const [busy, setBusy] = useState(false)
  const [rotationInstallation, setRotationInstallation] = useState<string | null>(null)
  const [replacementToken, setReplacementToken] = useState('')
  const workspaceEpoch = useRef(0)
  const connections = useBitbucketConnections(workspaceId)

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: BITBUCKET_CONNECTIONS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY }),
    ])
  }

  const chooseWorkspace = (id: string) => {
    workspaceEpoch.current += 1
    setWorkspaceId(id)
    setBusy(false)
    setBitbucketWorkspace('')
    setDiscovered([])
    setNextCursor(null)
    setSetup(null)
    setApiToken('')
    setReplacementToken('')
    setRotationInstallation(null)
  }

  const discover = async (cursor?: string | null) => {
    if (!workspaceId) return
    const epoch = workspaceEpoch.current
    setBusy(true)
    setSetup(null)
    try {
      const result = await discoverBitbucketRepositories(workspaceId, {
        bitbucketWorkspace,
        apiToken,
        cursor,
      })
      if (epoch !== workspaceEpoch.current) return
      setDiscovered(cursor ? (old) => [...old, ...result.repositories] : result.repositories)
      setNextCursor(result.nextCursor)
    } catch (error) {
      if (epoch === workspaceEpoch.current) void message.error(errorText(error))
    } finally {
      if (epoch === workspaceEpoch.current) setBusy(false)
    }
  }

  const connect = async (repository: BitbucketDiscoveredRepository) => {
    if (!workspaceId) return
    const epoch = workspaceEpoch.current
    setBusy(true)
    setSetup(null)
    try {
      const result = await connectBitbucketRepository(workspaceId, {
        bitbucketWorkspace: repository.workspaceSlug,
        repositorySlug: repository.slug,
        repositoryUuid: repository.uuid,
        apiToken,
      })
      if (epoch !== workspaceEpoch.current) return
      setSetup(result.webhook)
      setApiToken('')
      setDiscovered([])
      setNextCursor(null)
      await refresh()
      if (epoch !== workspaceEpoch.current) return
      void message.success('Репозиторий подключён')
    } catch (error) {
      if (epoch === workspaceEpoch.current) void message.error(errorText(error))
    } finally {
      if (epoch === workspaceEpoch.current) setBusy(false)
    }
  }

  const disconnect = async (installationId: string, repositoryId: string) => {
    if (!workspaceId || !window.confirm('Отключить этот репозиторий Bitbucket?')) return
    const epoch = workspaceEpoch.current
    setBusy(true)
    try {
      await disconnectBitbucketRepository(workspaceId, installationId, repositoryId)
      if (epoch !== workspaceEpoch.current) return
      setSetup(null)
      await refresh()
      if (epoch !== workspaceEpoch.current) return
      void message.success('Репозиторий отключён')
    } catch (error) {
      if (epoch === workspaceEpoch.current) void message.error(errorText(error))
    } finally {
      if (epoch === workspaceEpoch.current) setBusy(false)
    }
  }

  const rotateCredential = async () => {
    if (!workspaceId || !rotationInstallation) return
    const epoch = workspaceEpoch.current
    setBusy(true)
    try {
      await rotateBitbucketCredential(workspaceId, rotationInstallation, replacementToken)
      if (epoch !== workspaceEpoch.current) return
      setReplacementToken('')
      setRotationInstallation(null)
      await refresh()
      if (epoch !== workspaceEpoch.current) return
      void message.success('Общий API token обновлён')
    } catch (error) {
      if (epoch === workspaceEpoch.current) void message.error(errorText(error))
    } finally {
      if (epoch === workspaceEpoch.current) setBusy(false)
    }
  }

  const rotateSecret = async (installationId: string, repositoryId: string) => {
    if (!workspaceId) return
    const epoch = workspaceEpoch.current
    setBusy(true)
    setSetup(null)
    try {
      const result = await rotateBitbucketWebhookSecret(workspaceId, installationId, repositoryId)
      if (epoch !== workspaceEpoch.current) return
      setSetup(result)
      await refresh()
    } catch (error) {
      if (epoch === workspaceEpoch.current) void message.error(errorText(error))
    } finally {
      if (epoch === workspaceEpoch.current) setBusy(false)
    }
  }

  return (
    <section aria-label="Подключения Bitbucket">
      <Title level={3}>Bitbucket Cloud</Title>
      <Text>Выберите portal workspace для подключения приватного или публичного репозитория.</Text>
      <Select
        aria-label="Portal workspace"
        onChange={chooseWorkspace}
        options={workspaces.map((workspace) => ({ label: workspace.name, value: workspace.id }))}
        placeholder="Выберите workspace"
        style={{ display: 'block', maxWidth: 360, marginBlock: 12 }}
        value={workspaceId}
      />
      {workspaceId === null ? (
        <Text type="secondary">Выберите workspace перед просмотром подключений.</Text>
      ) : (
        <Flex gap="middle" vertical>
          {connections.isError ? (
            <Alert description={errorText(connections.error)} showIcon type="error" />
          ) : null}
          {connections.data?.pages
            .flatMap((page) => page.connections)
            .map((connection) => (
              <Flex align="center" gap="small" key={connection.repositoryId} wrap>
                <Text>{`${connection.workspaceSlug}/${connection.repositorySlug}`}</Text>
                <Text type="secondary">
                  {connection.status === 'active' ? 'Webhook активен' : 'Ожидает webhook'}
                </Text>
                <Button
                  disabled={busy}
                  onClick={() => void rotateSecret(connection.id, connection.repositoryId)}
                >
                  Новый webhook secret
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => {
                    setRotationInstallation(connection.id)
                    setReplacementToken('')
                  }}
                >
                  Обновить API token
                </Button>
                <Button
                  danger
                  disabled={busy}
                  onClick={() => void disconnect(connection.id, connection.repositoryId)}
                >
                  Отключить {connection.repositorySlug}
                </Button>
              </Flex>
            ))}
          {connections.hasNextPage ? (
            <Button
              disabled={busy || connections.isFetchingNextPage}
              onClick={() => void connections.fetchNextPage()}
            >
              Ещё подключения
            </Button>
          ) : null}
          {rotationInstallation ? (
            <Flex gap="small" wrap>
              <Input.Password
                aria-label="Новый API token"
                onChange={(event) => {
                  setReplacementToken(event.target.value)
                }}
                value={replacementToken}
              />
              <Button disabled={!replacementToken || busy} onClick={() => void rotateCredential()}>
                Подтвердить обновление token
              </Button>
            </Flex>
          ) : null}
          {setup ? (
            <Alert
              description={
                <Flex vertical>
                  <Text>Сохраните секрет сейчас: он показан только один раз.</Text>
                  <Text>{setup.url}</Text>
                  <Text>{setup.events.join(', ')}</Text>
                  <Text>{setup.secret}</Text>
                </Flex>
              }
              title="Настройте webhook в Bitbucket"
              type="info"
            />
          ) : null}
          <Flex gap="small" wrap>
            <Input
              aria-label="Bitbucket workspace"
              onChange={(event) => {
                setBitbucketWorkspace(event.target.value)
              }}
              placeholder="Bitbucket workspace"
              value={bitbucketWorkspace}
            />
            <Input.Password
              aria-label="API token"
              onChange={(event) => {
                setApiToken(event.target.value)
              }}
              placeholder="API token"
              value={apiToken}
            />
            <Button
              disabled={!bitbucketWorkspace.trim() || !apiToken || busy}
              onClick={() => void discover()}
            >
              Найти репозитории
            </Button>
          </Flex>
          {discovered.map((repository) => (
            <Flex align="center" gap="small" key={repository.uuid} wrap>
              {safeHttpUrl(repository.htmlUrl) ? (
                <a href={repository.htmlUrl} rel="noreferrer" target="_blank">
                  {`${repository.slug}${repository.isPrivate ? ' · приватный' : ''}`}
                </a>
              ) : (
                <Text>{repository.slug}</Text>
              )}
              <Button disabled={busy} onClick={() => void connect(repository)}>
                Подключить {repository.slug}
              </Button>
            </Flex>
          ))}
          {nextCursor ? (
            <Button disabled={busy} onClick={() => void discover(nextCursor)}>
              Показать ещё
            </Button>
          ) : null}
        </Flex>
      )}
    </section>
  )
}
