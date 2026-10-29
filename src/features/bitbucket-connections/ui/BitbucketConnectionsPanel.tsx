import { Alert, App, Button, Flex, Input, Select, Typography } from 'antd'
import { useRef, useState, type FC } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type { Workspace } from '../../../entities/user'
import { REPOSITORIES_QUERY_KEY } from '../../../entities/repository'
import { useTranslation } from '../../../shared/i18n'
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
import { bitbucketErrorMessage } from '../lib/bitbucketErrorMessage'
import { useFocusHandoff, type FocusTarget } from '../lib/useFocusHandoff'
import {
  BitbucketApiTokenSchema,
  type BitbucketDiscoveredRepository,
  type BitbucketWebhookSetup,
} from '../model/schemas'
import styles from './BitbucketConnectionsPanel.module.css'

const { Text, Title } = Typography

export interface BitbucketConnectionsPanelProps {
  workspaces: Workspace[]
}

interface WebhookSetupEntry {
  id: number
  repositoryId: string
  repositoryName: string
  setup: BitbucketWebhookSetup
  superseded: boolean
  disconnected: boolean
}

export const BitbucketConnectionsPanel: FC<BitbucketConnectionsPanelProps> = ({ workspaces }) => {
  const { t } = useTranslation()
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [bitbucketWorkspace, setBitbucketWorkspace] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [discovered, setDiscovered] = useState<BitbucketDiscoveredRepository[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [setups, setSetups] = useState<WebhookSetupEntry[]>([])
  const [setupHelp, setSetupHelp] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rotationInstallation, setRotationInstallation] = useState<string | null>(null)
  const [replacementToken, setReplacementToken] = useState('')
  const workspaceEpoch = useRef(0)
  const discoveryCriteria = useRef<{ bitbucketWorkspace: string; apiToken: string } | null>(null)
  const setupSequence = useRef(0)
  const credentialOrigin = useRef<string | null>(null)
  const connections = useBitbucketConnections(workspaceId)
  const {
    workspaceInputRef,
    discoverySubmitRef,
    credentialSubmitRef,
    requestFocus,
    clearFocusRequest,
    trackSetupAction,
    trackConnectAction,
    trackBindingAction,
  } = useFocusHandoff({
    busy,
    epoch: workspaceEpoch,
    latestSetupId: setups[setups.length - 1]?.id ?? null,
  })

  const showSetup = (
    repositoryId: string,
    repositoryName: string,
    webhook: BitbucketWebhookSetup,
  ) => {
    const entry: WebhookSetupEntry = {
      id: ++setupSequence.current,
      repositoryId,
      repositoryName,
      setup: webhook,
      superseded: false,
      disconnected: false,
    }
    setSetups((current) => [
      ...current.map((item) =>
        item.repositoryId === repositoryId ? { ...item, superseded: true } : item,
      ),
      entry,
    ])
    setSetupHelp(false)
    return entry.id
  }

  const copySetupValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      void message.success(t('bitbucket.panel.copied'))
    } catch {
      void message.error(t('bitbucket.panel.copyFailed'))
    }
  }

  const dismissSetup = (id: number, trigger: HTMLElement) => {
    const hadFocus = document.activeElement === trigger
    setSetups((current) => current.filter((entry) => entry.id !== id))
    if (hadFocus) {
      requestFocus(workspaceEpoch.current, trigger, { kind: 'latest-setup' })
    }
  }

  const refresh = async (affectedWorkspaceId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [...BITBUCKET_CONNECTIONS_QUERY_KEY, affectedWorkspaceId],
      }),
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
    setSetups([])
    setSetupHelp(false)
    setApiToken('')
    setReplacementToken('')
    setRotationInstallation(null)
    credentialOrigin.current = null
    clearFocusRequest()
    discoveryCriteria.current = null
  }

  const discover = async (cursor?: string | null, trigger?: HTMLElement) => {
    if (!workspaceId) return
    const criteria = cursor
      ? discoveryCriteria.current
      : { bitbucketWorkspace: bitbucketWorkspace.trim(), apiToken: apiToken.trim() }
    if (!criteria?.bitbucketWorkspace || !criteria.apiToken) return
    if (criteria.bitbucketWorkspace.length > 128) {
      void message.error(t('bitbucket.panel.workspaceTooLong'))
      return
    }
    if (!BitbucketApiTokenSchema.safeParse(criteria.apiToken).success) {
      void message.error(t('bitbucket.panel.invalidToken'))
      return
    }
    if (!cursor) {
      discoveryCriteria.current = criteria
      setBitbucketWorkspace(criteria.bitbucketWorkspace)
      setDiscovered([])
      setNextCursor(null)
    }
    const epoch = workspaceEpoch.current
    const hadFocus = trigger !== undefined && document.activeElement === trigger
    setBusy(true)
    try {
      const result = await discoverBitbucketRepositories(workspaceId, {
        ...criteria,
        ...(cursor ? { cursor } : {}),
      })
      if (epoch !== workspaceEpoch.current) return
      setDiscovered(cursor ? (old) => [...old, ...result.repositories] : result.repositories)
      setNextCursor(result.nextCursor)
      if (trigger && hadFocus) {
        const first = result.repositories[0]
        requestFocus(
          epoch,
          trigger,
          first
            ? { kind: 'connect', remoteRepositoryUuid: first.uuid }
            : { kind: 'discover-submit' },
        )
      }
    } catch (error) {
      if (epoch === workspaceEpoch.current) {
        void message.error(bitbucketErrorMessage(error))
        if (trigger && hadFocus) requestFocus(epoch, trigger, { kind: 'discover-submit' })
      }
    } finally {
      if (epoch === workspaceEpoch.current) setBusy(false)
    }
  }

  const connect = async (repository: BitbucketDiscoveredRepository, trigger: HTMLElement) => {
    if (!workspaceId) return
    const token = apiToken.trim()
    if (!token) {
      void message.error(t('bitbucket.panel.tokenRequired'))
      return
    }
    if (!BitbucketApiTokenSchema.safeParse(token).success) {
      void message.error(t('bitbucket.panel.invalidToken'))
      return
    }
    const affectedWorkspaceId = workspaceId
    const epoch = workspaceEpoch.current
    const hadFocus = document.activeElement === trigger
    setBusy(true)
    try {
      const result = await connectBitbucketRepository(affectedWorkspaceId, {
        bitbucketWorkspace: repository.workspaceSlug,
        repositorySlug: repository.slug,
        repositoryUuid: repository.uuid,
        apiToken: token,
      })
      if (epoch === workspaceEpoch.current) {
        if (result.webhook) {
          const setupId = showSetup(
            result.repositoryId,
            `${result.workspaceSlug}/${result.repositorySlug}`,
            result.webhook,
          )
          if (hadFocus) requestFocus(epoch, trigger, { kind: 'setup', setupId })
        } else {
          setSetupHelp(true)
          if (hadFocus) requestFocus(epoch, trigger, { kind: 'workspace' })
        }
        setApiToken('')
        discoveryCriteria.current = null
        setDiscovered([])
        setNextCursor(null)
      }
      await refresh(affectedWorkspaceId)
      if (epoch !== workspaceEpoch.current) return
      void message.success(t('bitbucket.panel.connected'))
    } catch (error) {
      if (epoch === workspaceEpoch.current) {
        void message.error(bitbucketErrorMessage(error))
        if (hadFocus)
          requestFocus(epoch, trigger, {
            kind: 'connect',
            remoteRepositoryUuid: repository.uuid,
          })
      }
    } finally {
      if (epoch === workspaceEpoch.current) setBusy(false)
    }
  }

  const disconnect = async (
    affectedWorkspaceId: string,
    epoch: number,
    installationId: string,
    repositoryId: string,
  ): Promise<boolean> => {
    if (epoch === workspaceEpoch.current) setBusy(true)
    try {
      await disconnectBitbucketRepository(affectedWorkspaceId, installationId, repositoryId)
      await refresh(affectedWorkspaceId)
      if (epoch !== workspaceEpoch.current) return true
      setSetups((current) =>
        current.map((entry) =>
          entry.repositoryId === repositoryId ? { ...entry, disconnected: true } : entry,
        ),
      )
      void message.success(t('bitbucket.panel.disconnected'))
      return true
    } catch (error) {
      if (epoch === workspaceEpoch.current) void message.error(bitbucketErrorMessage(error))
      return false
    } finally {
      if (epoch === workspaceEpoch.current) setBusy(false)
    }
  }

  const confirmDisconnect = (
    installationId: string,
    repositoryId: string,
    repositoryName: string,
    trigger: HTMLElement,
  ) => {
    if (!workspaceId) return
    const affectedWorkspaceId = workspaceId
    const epoch = workspaceEpoch.current
    const workspaceName = workspaces.find((workspace) => workspace.id === workspaceId)?.name
    let focusAfterClose: FocusTarget | null = null
    modal.confirm({
      title: t('bitbucket.panel.confirmDisconnectTitle'),
      content: t('bitbucket.panel.confirmDisconnectContent', {
        workspace: workspaceName ?? affectedWorkspaceId,
        repository: repositoryName,
      }),
      okText: t('bitbucket.panel.disconnect'),
      okButtonProps: { danger: true },
      cancelText: t('bitbucket.panel.cancel'),
      onOk: async () => {
        const confirmButton =
          document.activeElement instanceof HTMLElement ? document.activeElement : trigger
        const removed = await disconnect(affectedWorkspaceId, epoch, installationId, repositoryId)
        focusAfterClose = removed
          ? { kind: 'workspace' }
          : { kind: 'disconnect', portalRepositoryId: repositoryId }
        // Ant Design closes the dialog after onOk resolves. Queue the handoff behind that update;
        // afterClose repeats it if the dialog's own focus restoration runs later.
        setTimeout(() => {
          if (focusAfterClose) requestFocus(epoch, confirmButton, focusAfterClose)
        }, 0)
      },
      afterClose: () => {
        if (focusAfterClose) requestFocus(epoch, trigger, focusAfterClose)
      },
    })
  }

  const rotateCredential = async (trigger: HTMLElement) => {
    if (!workspaceId || !rotationInstallation) return
    const token = replacementToken.trim()
    if (!BitbucketApiTokenSchema.safeParse(token).success) {
      void message.error(t('bitbucket.panel.invalidToken'))
      return
    }
    const affectedWorkspaceId = workspaceId
    const epoch = workspaceEpoch.current
    const hadFocus = document.activeElement === trigger
    const origin = credentialOrigin.current
    setBusy(true)
    try {
      await rotateBitbucketCredential(affectedWorkspaceId, rotationInstallation, token)
      if (epoch === workspaceEpoch.current) {
        setReplacementToken('')
        setRotationInstallation(null)
        if (hadFocus && origin) {
          requestFocus(epoch, trigger, { kind: 'credential', portalRepositoryId: origin })
        }
      }
      await refresh(affectedWorkspaceId)
      if (epoch !== workspaceEpoch.current) return
      void message.success(t('bitbucket.panel.tokenUpdated'))
    } catch (error) {
      if (epoch === workspaceEpoch.current) {
        void message.error(bitbucketErrorMessage(error))
        if (hadFocus) requestFocus(epoch, trigger, { kind: 'credential-submit' })
      }
    } finally {
      if (epoch === workspaceEpoch.current) setBusy(false)
    }
  }

  const rotateSecret = async (
    installationId: string,
    repositoryId: string,
    repositoryName: string,
    trigger: HTMLElement,
  ) => {
    if (!workspaceId) return
    const affectedWorkspaceId = workspaceId
    const epoch = workspaceEpoch.current
    const hadFocus = document.activeElement === trigger
    setBusy(true)
    try {
      const result = await rotateBitbucketWebhookSecret(
        affectedWorkspaceId,
        installationId,
        repositoryId,
      )
      if (epoch === workspaceEpoch.current) {
        const setupId = showSetup(repositoryId, repositoryName, result)
        if (hadFocus) requestFocus(epoch, trigger, { kind: 'setup', setupId })
      }
      await refresh(affectedWorkspaceId)
    } catch (error) {
      if (epoch === workspaceEpoch.current) {
        void message.error(bitbucketErrorMessage(error))
        if (hadFocus)
          requestFocus(epoch, trigger, { kind: 'hook', portalRepositoryId: repositoryId })
      }
    } finally {
      if (epoch === workspaceEpoch.current) setBusy(false)
    }
  }

  return (
    <section aria-label={t('bitbucket.panel.ariaLabel')}>
      <Title level={3}>Bitbucket Cloud</Title>
      <Text>{t('bitbucket.panel.intro')}</Text>
      <div className={styles.workspaceSelect}>
        <Select
          aria-label={t('bitbucket.panel.portalWorkspace')}
          className={styles.workspaceSelectControl}
          disabled={workspaces.length === 0}
          onChange={chooseWorkspace}
          options={workspaces.map((workspace) => ({ label: workspace.name, value: workspace.id }))}
          placeholder={t('bitbucket.panel.workspacePlaceholder')}
          value={workspaceId}
        />
      </div>
      {workspaceId === null ? (
        workspaces.length === 0 ? (
          <Alert
            description={t('bitbucket.panel.noWorkspacesDescription')}
            title={t('bitbucket.panel.noWorkspacesTitle')}
            type="info"
          />
        ) : (
          <Text type="secondary">{t('bitbucket.panel.chooseWorkspace')}</Text>
        )
      ) : (
        <Flex gap="middle" vertical>
          {connections.isError ? (
            <Alert description={bitbucketErrorMessage(connections.error)} showIcon type="error" />
          ) : null}
          {connections.data?.connections.map((connection) => (
            <Flex align="center" gap="small" key={connection.repositoryId} wrap>
              <Text>{`${connection.workspaceSlug}/${connection.repositorySlug}`}</Text>
              <Text type="secondary">
                {connection.status === 'active'
                  ? t('bitbucket.panel.webhookActive')
                  : t('bitbucket.panel.webhookPending')}
              </Text>
              <Button
                aria-label={t('bitbucket.panel.newWebhookSecretFor', {
                  repository: `${connection.workspaceSlug}/${connection.repositorySlug}`,
                })}
                disabled={busy}
                ref={(node) => {
                  trackBindingAction('hook', connection.repositoryId, node)
                }}
                onClick={(event) =>
                  void rotateSecret(
                    connection.id,
                    connection.repositoryId,
                    `${connection.workspaceSlug}/${connection.repositorySlug}`,
                    event.currentTarget,
                  )
                }
              >
                {t('bitbucket.panel.newWebhookSecret')}
              </Button>
              <Button
                aria-label={t('bitbucket.panel.updateTokenFor', {
                  repository: `${connection.workspaceSlug}/${connection.repositorySlug}`,
                })}
                disabled={busy}
                ref={(node) => {
                  trackBindingAction('credential', connection.repositoryId, node)
                }}
                onClick={() => {
                  credentialOrigin.current = connection.repositoryId
                  setRotationInstallation(connection.id)
                  setReplacementToken('')
                }}
              >
                {t('bitbucket.panel.updateToken')}
              </Button>
              <Button
                danger
                disabled={busy}
                ref={(node) => {
                  trackBindingAction('disconnect', connection.repositoryId, node)
                }}
                onClick={(event) => {
                  confirmDisconnect(
                    connection.id,
                    connection.repositoryId,
                    `${connection.workspaceSlug}/${connection.repositorySlug}`,
                    event.currentTarget,
                  )
                }}
              >
                {t('bitbucket.panel.disconnectRepository', {
                  repository: `${connection.workspaceSlug}/${connection.repositorySlug}`,
                })}
              </Button>
            </Flex>
          ))}
          {rotationInstallation ? (
            <Flex gap="small" wrap>
              <Input.Password
                aria-label={t('bitbucket.panel.newToken')}
                autoComplete="new-password"
                onChange={(event) => {
                  setReplacementToken(event.target.value)
                }}
                value={replacementToken}
              />
              <Button
                disabled={!replacementToken.trim() || busy}
                onClick={(event) => void rotateCredential(event.currentTarget)}
                ref={credentialSubmitRef}
              >
                {t('bitbucket.panel.confirmTokenUpdate')}
              </Button>
            </Flex>
          ) : null}
          {setupHelp ? (
            <Alert description={t('bitbucket.panel.secretAlreadyIssued')} showIcon type="info" />
          ) : null}
          {setups.map((entry) => (
            <Alert
              description={
                <Flex gap="small" vertical>
                  <Text>{t('bitbucket.panel.saveSecret')}</Text>
                  {entry.superseded ? (
                    <Text type="warning">{t('bitbucket.panel.previousSecretInvalid')}</Text>
                  ) : null}
                  {entry.disconnected ? (
                    <Text type="warning">{t('bitbucket.panel.disconnectedSecretInvalid')}</Text>
                  ) : null}
                  <Text strong>{t('bitbucket.panel.webhookUrl')}</Text>
                  <Text>{entry.setup.url}</Text>
                  <Button
                    aria-label={t('bitbucket.panel.copyUrlFor', {
                      repository: entry.repositoryName,
                    })}
                    onClick={() => void copySetupValue(entry.setup.url)}
                    ref={(node) => {
                      trackSetupAction(entry.id, node)
                    }}
                  >
                    {t('bitbucket.panel.copyUrl')}
                  </Button>
                  <Text strong>{t('bitbucket.panel.events')}</Text>
                  <Text>{entry.setup.events.join(', ')}</Text>
                  <Button
                    aria-label={t('bitbucket.panel.copyEventsFor', {
                      repository: entry.repositoryName,
                    })}
                    onClick={() => void copySetupValue(entry.setup.events.join(', '))}
                  >
                    {t('bitbucket.panel.copyEvents')}
                  </Button>
                  <Text strong>{t('bitbucket.panel.webhookSecret')}</Text>
                  <Text>{entry.setup.secret}</Text>
                  <Button
                    aria-label={t('bitbucket.panel.copySecretFor', {
                      repository: entry.repositoryName,
                    })}
                    disabled={entry.superseded || entry.disconnected}
                    onClick={() => void copySetupValue(entry.setup.secret)}
                  >
                    {t('bitbucket.panel.copySecret')}
                  </Button>
                  <Button
                    aria-label={t('bitbucket.panel.closeSetupFor', {
                      repository: entry.repositoryName,
                    })}
                    onClick={(event) => {
                      dismissSetup(entry.id, event.currentTarget)
                    }}
                  >
                    {t('bitbucket.panel.close')}
                  </Button>
                </Flex>
              }
              key={entry.id}
              title={t('bitbucket.panel.setupWebhookFor', { repository: entry.repositoryName })}
              type="info"
            />
          ))}
          <Flex gap="small" wrap>
            <Input
              aria-label={t('bitbucket.panel.workspace')}
              ref={(node) => {
                workspaceInputRef.current = node?.input ?? null
              }}
              onChange={(event) => {
                setBitbucketWorkspace(event.target.value)
              }}
              placeholder={t('bitbucket.panel.workspace')}
              value={bitbucketWorkspace}
            />
            <Input.Password
              aria-label={t('bitbucket.panel.apiToken')}
              autoComplete="new-password"
              onChange={(event) => {
                setApiToken(event.target.value)
              }}
              placeholder={t('bitbucket.panel.apiToken')}
              value={apiToken}
            />
            <Button
              disabled={!bitbucketWorkspace.trim() || !apiToken.trim() || busy}
              onClick={(event) => void discover(null, event.currentTarget)}
              ref={discoverySubmitRef}
            >
              {t('bitbucket.panel.findRepositories')}
            </Button>
          </Flex>
          {discovered.map((repository) => (
            <Flex align="center" gap="small" key={repository.uuid} wrap>
              {safeHttpUrl(repository.htmlUrl) ? (
                <a href={repository.htmlUrl} rel="noreferrer" target="_blank">
                  {`${repository.slug}${repository.isPrivate ? ` · ${t('bitbucket.panel.privateSuffix')}` : ''}`}
                </a>
              ) : (
                <Text>{repository.slug}</Text>
              )}
              <Button
                disabled={busy}
                onClick={(event) => void connect(repository, event.currentTarget)}
                ref={(node) => {
                  trackConnectAction(repository.uuid, node)
                }}
              >
                {t('bitbucket.panel.connectRepository', { repository: repository.slug })}
              </Button>
            </Flex>
          ))}
          {nextCursor ? (
            <Button
              disabled={busy}
              onClick={(event) => void discover(nextCursor, event.currentTarget)}
            >
              {t('bitbucket.panel.showMore')}
            </Button>
          ) : null}
        </Flex>
      )}
    </section>
  )
}
