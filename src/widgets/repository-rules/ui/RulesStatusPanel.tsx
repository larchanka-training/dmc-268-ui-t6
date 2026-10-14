import { Alert, Button, Skeleton, Typography } from 'antd'
import type { FC } from 'react'

import { useRepositoryRulesStatus } from '../../../entities/repository'
import { RulesStatusDetails } from './RulesStatusDetails'
import styles from './RulesStatusPanel.module.css'

const { Text } = Typography

export interface RulesStatusPanelProps {
  repoId: string
  /**
   * `false` while the server does not serve the rules status: the block says so in one line and
   * sends no request.
   */
  enabled: boolean
}

/**
 * Status of `.review/rules.md` of a repository. Only a 200 with `status: 'missing'` is "no file":
 * every failure to learn the status (network, 5xx, 401, 404, a body that fails the schema) is a
 * load error, so a broken request is never read as "defaults apply".
 */
export const RulesStatusPanel: FC<RulesStatusPanelProps> = ({ repoId, enabled }) => {
  const query = useRepositoryRulesStatus(repoId, { enabled })

  const retry = (): void => {
    void query.refetch()
  }

  const body = (() => {
    if (!enabled) {
      return <Text type="secondary">Статус правил появится, когда сервер начнёт его отдавать</Text>
    }
    // A failed request wins over data an earlier request left behind: that data may be stale.
    if (query.isError) {
      return (
        <Alert
          action={
            <Button loading={query.isFetching} onClick={retry} size="small">
              Повторить
            </Button>
          }
          showIcon
          title="Не удалось загрузить статус правил"
          type="error"
        />
      )
    }
    if (query.isPending) {
      return <Skeleton active />
    }
    return <RulesStatusDetails onRetry={retry} retrying={query.isFetching} status={query.data} />
  })()

  return (
    <section aria-label="Правила ревью" className={styles.root}>
      <div className={styles.header}>
        <h2 className={styles.label}>Правила ревью</h2>
        {enabled && query.isSuccess ? (
          <Button loading={query.isFetching} onClick={retry}>
            Обновить
          </Button>
        ) : null}
      </div>
      {body}
    </section>
  )
}
