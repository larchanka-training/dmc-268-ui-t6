import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, List, Modal, Popconfirm, Typography } from 'antd'
import type { FC } from 'react'

import { useTranslation } from '../../../shared/i18n'
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
  const queryClient = useQueryClient()
  const tokens = useQuery({ queryKey: AGENT_TOKENS_QUERY_KEY, queryFn: listAgentTokens })
  const revoke = useMutation({
    mutationFn: revokeAgentToken,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AGENT_TOKENS_QUERY_KEY })
    },
  })

  return (
    <Modal open title={t('layout.userMenu.agentTokens.title')} onCancel={onClose} footer={null}>
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
                <Popconfirm
                  key="revoke"
                  title={t('layout.userMenu.agentTokens.confirm')}
                  okText={t('layout.userMenu.agentTokens.revoke')}
                  cancelText={t('layout.userMenu.agentTokens.cancel')}
                  onConfirm={() => {
                    revoke.mutate(token.id)
                  }}
                >
                  <Button
                    danger
                    disabled={revoke.isPending}
                    loading={revoke.variables === token.id && revoke.isPending}
                  >
                    {t('layout.userMenu.agentTokens.revoke')}
                  </Button>
                </Popconfirm>,
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
                        date: new Date(token.expiresAt).toLocaleDateString(),
                      })}
                    </Typography.Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Modal>
  )
}
