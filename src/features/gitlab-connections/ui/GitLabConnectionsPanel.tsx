import { Alert, App, Button, Flex, Input, Select, Typography } from 'antd'
import { useRef, useState, type FC } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { REPOSITORIES_QUERY_KEY } from '../../../entities/repository'
import type { Workspace } from '../../../entities/user'
import { useTranslation } from '../../../shared/i18n'
import { safeHttpUrl } from '../../../shared/lib/safeHttpUrl'
import {
  GITLAB_CONNECTIONS_QUERY_KEY,
  connectGitLabProject,
  discoverGitLabProjects,
  disconnectGitLabProject,
  useGitLabConnections,
} from '../api'
import { gitlabErrorMessage } from '../lib/gitlabErrorMessage'
import {
  GitLabTokenSchema,
  type GitLabConnectionItem,
  type GitLabDiscoveredProject,
} from '../model/schemas'
import styles from './GitLabConnectionsPanel.module.css'

const { Text, Title } = Typography

export interface GitLabConnectionsPanelProps {
  workspaces: Workspace[]
}

interface ManualWebhook {
  projectName: string
  url: string
  secret: string
}

interface AutomaticNotice {
  projectName: string
  status: GitLabConnectionItem['status']
}

export const GitLabConnectionsPanel: FC<GitLabConnectionsPanelProps> = ({ workspaces }) => {
  const { t } = useTranslation()
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [token, setToken] = useState('')
  const [projects, setProjects] = useState<GitLabDiscoveredProject[]>([])
  const [manualWebhook, setManualWebhook] = useState<ManualWebhook | null>(null)
  const [automaticNotice, setAutomaticNotice] = useState<AutomaticNotice | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const workspaceEpoch = useRef(0)
  const connections = useGitLabConnections(workspaceId)

  const statusText = (status: GitLabConnectionItem['status']) =>
    status === 'active' ? t('gitlab.panel.webhookActive') : t('gitlab.panel.webhookPending')

  const resetWorkspace = (id: string) => {
    workspaceEpoch.current += 1
    setWorkspaceId(id)
    setToken('')
    setProjects([])
    setManualWebhook(null)
    setAutomaticNotice(null)
    setBusy(false)
    setFormError(null)
  }

  const refresh = async (affectedWorkspaceId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [...GITLAB_CONNECTIONS_QUERY_KEY, affectedWorkspaceId],
      }),
      queryClient.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY }),
    ])
  }

  const parsedToken = () => {
    const value = token.trim()
    if (!value) {
      setFormError(t('gitlab.panel.tokenRequired'))
      return null
    }
    if (!GitLabTokenSchema.safeParse(value).success) {
      setFormError(t('gitlab.panel.invalidToken'))
      return null
    }
    return value
  }

  const discover = async () => {
    if (!workspaceId) return
    const value = parsedToken()
    if (!value) return
    const affectedWorkspaceId = workspaceId
    const epoch = workspaceEpoch.current
    setBusy(true)
    setFormError(null)
    try {
      const result = await discoverGitLabProjects(affectedWorkspaceId, { token: value })
      if (epoch !== workspaceEpoch.current) return
      setProjects(result.projects)
    } catch (error) {
      if (epoch === workspaceEpoch.current) setFormError(gitlabErrorMessage(error))
    } finally {
      if (epoch === workspaceEpoch.current) setBusy(false)
    }
  }

  const connect = async (project: GitLabDiscoveredProject) => {
    if (!workspaceId) return
    const value = parsedToken()
    if (!value) return
    const affectedWorkspaceId = workspaceId
    const epoch = workspaceEpoch.current
    setBusy(true)
    setFormError(null)
    try {
      const result = await connectGitLabProject(affectedWorkspaceId, {
        token: value,
        projectId: project.projectId,
      })
      await refresh(affectedWorkspaceId)
      if (epoch !== workspaceEpoch.current) return
      if (result.webhook) {
        setManualWebhook({
          projectName: result.pathWithNamespace,
          url: result.webhook.url,
          secret: result.webhook.secret,
        })
        setAutomaticNotice(null)
      } else {
        setManualWebhook(null)
        setAutomaticNotice({
          projectName: result.pathWithNamespace,
          status: result.status,
        })
      }
      setToken('')
      setProjects([])
      void message.success(t('gitlab.panel.connected'))
    } catch (error) {
      if (epoch === workspaceEpoch.current) setFormError(gitlabErrorMessage(error))
    } finally {
      if (epoch === workspaceEpoch.current) setBusy(false)
    }
  }

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      void message.success(t('gitlab.panel.copied'))
    } catch {
      void message.error(t('gitlab.panel.copyFailed'))
    }
  }

  const disconnect = async (installationId: string) => {
    if (!workspaceId) return
    const affectedWorkspaceId = workspaceId
    setBusy(true)
    setFormError(null)
    try {
      await disconnectGitLabProject(affectedWorkspaceId, installationId)
      setManualWebhook(null)
      setAutomaticNotice(null)
      await refresh(affectedWorkspaceId)
      void message.success(t('gitlab.panel.disconnected'))
    } catch (error) {
      setFormError(gitlabErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const confirmDisconnect = (connection: GitLabConnectionItem) => {
    if (!workspaceId) return
    const workspaceName = workspaces.find((workspace) => workspace.id === workspaceId)?.name
    modal.confirm({
      title: t('gitlab.panel.confirmDisconnectTitle'),
      content: t('gitlab.panel.confirmDisconnectContent', {
        workspace: workspaceName ?? workspaceId,
        project: connection.pathWithNamespace,
      }),
      okText: t('gitlab.panel.disconnect'),
      okButtonProps: { danger: true },
      cancelText: t('gitlab.panel.cancel'),
      onOk: () => disconnect(connection.id),
    })
  }

  return (
    <section aria-label={t('gitlab.panel.ariaLabel')} className={styles.panel}>
      <Title level={3}>{t('gitlab.panel.title')}</Title>
      <Text>{t('gitlab.panel.intro')}</Text>
      <div className={styles.field}>
        <span aria-hidden="true">{t('gitlab.panel.portalWorkspace')}</span>
        <Select
          aria-label={t('gitlab.panel.portalWorkspace')}
          className={styles.workspaceSelect}
          disabled={workspaces.length === 0}
          onChange={resetWorkspace}
          options={workspaces.map((workspace) => ({ label: workspace.name, value: workspace.id }))}
          placeholder={t('gitlab.panel.workspacePlaceholder')}
          value={workspaceId}
        />
      </div>
      {workspaceId === null ? (
        workspaces.length === 0 ? (
          <Alert
            description={t('gitlab.panel.noWorkspacesDescription')}
            title={t('gitlab.panel.noWorkspacesTitle')}
            type="info"
          />
        ) : (
          <Text type="secondary">{t('gitlab.panel.chooseWorkspace')}</Text>
        )
      ) : (
        <Flex gap="middle" vertical>
          {connections.isError ? (
            <Alert description={gitlabErrorMessage(connections.error)} showIcon type="error" />
          ) : null}
          {formError ? <Alert description={formError} showIcon type="error" /> : null}
          {connections.data?.connections.map((connection) => (
            <Flex align="center" gap="small" key={connection.id} wrap>
              <Text>{connection.pathWithNamespace}</Text>
              <Text type="secondary">{statusText(connection.status)}</Text>
              <Button
                danger
                disabled={busy}
                onClick={() => {
                  confirmDisconnect(connection)
                }}
              >
                {t('gitlab.panel.disconnectProject', { project: connection.pathWithNamespace })}
              </Button>
            </Flex>
          ))}
          {automaticNotice ? (
            <Alert
              description={t('gitlab.panel.automaticWebhook', {
                status: statusText(automaticNotice.status),
              })}
              title={automaticNotice.projectName}
              type="success"
            />
          ) : null}
          {manualWebhook ? (
            <Alert
              description={
                <Flex gap="small" vertical>
                  <Text>{t('gitlab.panel.saveSecret')}</Text>
                  <Text>{t('gitlab.panel.manualSteps')}</Text>
                  <Text strong>{t('gitlab.panel.webhookUrl')}</Text>
                  <Text>{manualWebhook.url}</Text>
                  <Button
                    aria-label={t('gitlab.panel.copyUrlFor', {
                      project: manualWebhook.projectName,
                    })}
                    onClick={() => void copyValue(manualWebhook.url)}
                  >
                    {t('gitlab.panel.copyUrl')}
                  </Button>
                  <Text strong>{t('gitlab.panel.webhookSecret')}</Text>
                  <Text>{manualWebhook.secret}</Text>
                  <Button
                    aria-label={t('gitlab.panel.copySecretFor', {
                      project: manualWebhook.projectName,
                    })}
                    onClick={() => void copyValue(manualWebhook.secret)}
                  >
                    {t('gitlab.panel.copySecret')}
                  </Button>
                  <Button
                    aria-label={t('gitlab.panel.closeSetupFor', {
                      project: manualWebhook.projectName,
                    })}
                    onClick={() => {
                      setManualWebhook(null)
                    }}
                  >
                    {t('gitlab.panel.close')}
                  </Button>
                </Flex>
              }
              title={t('gitlab.panel.setupWebhookFor', { project: manualWebhook.projectName })}
              type="info"
            />
          ) : null}
          <div className={styles.field}>
            <label htmlFor="gitlab-access-token">{t('gitlab.panel.token')}</label>
            <Input.Password
              aria-describedby="gitlab-token-hint"
              aria-label={t('gitlab.panel.token')}
              autoComplete="new-password"
              className={styles.tokenField}
              id="gitlab-access-token"
              onChange={(event) => {
                setToken(event.target.value)
              }}
              value={token}
            />
            <Text id="gitlab-token-hint" type="secondary">
              {t('gitlab.panel.tokenHint')}
            </Text>
          </div>
          <Button disabled={!token.trim() || busy} onClick={() => void discover()}>
            {t('gitlab.panel.findProjects')}
          </Button>
          {projects.map((project) => (
            <Flex align="center" gap="small" key={project.projectId} wrap>
              {safeHttpUrl(project.webUrl) ? (
                <a href={project.webUrl} rel="noreferrer" target="_blank">
                  {project.pathWithNamespace}
                </a>
              ) : (
                <Text>{project.pathWithNamespace}</Text>
              )}
              <Button disabled={busy || !token.trim()} onClick={() => void connect(project)}>
                {t('gitlab.panel.connectProject', { project: project.pathWithNamespace })}
              </Button>
            </Flex>
          ))}
        </Flex>
      )}
    </section>
  )
}
