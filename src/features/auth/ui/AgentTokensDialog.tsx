import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, List, Modal, Typography } from 'antd'
import { useCallback, useRef, type FC } from 'react'

import { ApiError } from '../../../shared/api/client'
import { formatDateTime, useTranslation } from '../../../shared/i18n'
import { useDisabledButtonClass } from '../../../shared/ui'
import {
  AGENT_TOKENS_QUERY_KEY,
  listAgentTokens,
  revokeAgentToken,
  type AgentToken,
} from '../api/agentTokens'

interface AgentTokensDialogProps {
  onClose: () => void
}

export const AgentTokensDialog: FC<AgentTokensDialogProps> = ({ onClose }) => {
  const { t } = useTranslation()
  const focusContentRef = useRef<HTMLDivElement | null>(null)
  const focusContent = useCallback((element: HTMLDivElement | null) => {
    focusContentRef.current = element
    element?.focus()
  }, [])
  const disabledButtonClass = useDisabledButtonClass()
  const queryClient = useQueryClient()
  const [modal, contextHolder] = Modal.useModal()
  const tokens = useQuery({ queryKey: AGENT_TOKENS_QUERY_KEY, queryFn: listAgentTokens })
  const revoke = useMutation({
    mutationFn: revokeAgentToken,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: AGENT_TOKENS_QUERY_KEY })
      window.setTimeout(() => focusContentRef.current?.focus(), 0)
    },
  })

  return (
    <>
      {contextHolder}
      <Modal open title={t('layout.userMenu.agentTokens.title')} onCancel={onClose} footer={null}>
        <div ref={focusContent} tabIndex={-1}>
          {tokens.isError ? (
            <Alert
              type="error"
              title={t('layout.userMenu.agentTokens.loadError')}
              action={
                <Button size="small" onClick={() => void tokens.refetch()}>
                  {t('layout.userMenu.agentTokens.retry')}
                </Button>
              }
            />
          ) : null}
          {revoke.isError && !(revoke.error instanceof ApiError && revoke.error.status === 404) ? (
            <Alert type="error" title={t('layout.userMenu.agentTokens.revokeError')} />
          ) : null}
          {tokens.isError ? null : (
            <List<AgentToken>
              loading={tokens.isPending}
              dataSource={tokens.data ?? []}
              locale={{ emptyText: t('layout.userMenu.agentTokens.empty') }}
              renderItem={(token) => (
                <List.Item
                  actions={[
                    <Button
                      key="revoke"
                      danger
                      aria-disabled={revoke.isPending}
                      className={revoke.isPending ? disabledButtonClass : undefined}
                      loading={revoke.variables === token.id && revoke.isPending}
                      onClick={() => {
                        if (revoke.isPending) return
                        modal.confirm({
                          title: t('layout.userMenu.agentTokens.confirm'),
                          okText: t('layout.userMenu.agentTokens.revoke'),
                          cancelText: t('layout.userMenu.agentTokens.cancel'),
                          okType: 'danger',
                          onOk: () => {
                            revoke.mutate(token.id)
                          },
                        })
                      }}
                    >
                      {t('layout.userMenu.agentTokens.revoke')}
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={token.repository}
                    description={
                      <div>
                        <Typography.Text code>{token.id}</Typography.Text>
                        <br />
                        <Typography.Text type="secondary">
                          {t('layout.userMenu.agentTokens.expires', {
                            date: formatDateTime(token.expiresAt),
                          })}
                        </Typography.Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Modal>
    </>
  )
}
