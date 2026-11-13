import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, List, Modal, Typography } from 'antd'
import { useCallback, type FC } from 'react'

import { formatDateTime, useTranslation } from '../../../shared/i18n'
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
  const focusContent = useCallback((element: HTMLDivElement | null) => {
    element?.focus()
  }, [])
  const queryClient = useQueryClient()
  const [modal, contextHolder] = Modal.useModal()
  const tokens = useQuery({ queryKey: AGENT_TOKENS_QUERY_KEY, queryFn: listAgentTokens })
  const revoke = useMutation({
    mutationFn: revokeAgentToken,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: AGENT_TOKENS_QUERY_KEY })
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
          {revoke.isError ? (
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
                      disabled={revoke.isPending}
                      loading={revoke.variables === token.id && revoke.isPending}
                      onClick={() => {
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
