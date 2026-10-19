import { Alert, Button, Skeleton } from 'antd'
import type { FC } from 'react'

import { useRepositoryRulesStatus } from '../../../entities/repository'
import { RulesStatusDetails } from './RulesStatusDetails'
import styles from './RulesStatusPanel.module.css'

export interface RulesStatusPanelProps {
  repoId: string
}

/**
 * Status of `.review/rules.md` of a repository. Only a 200 with `status: 'missing'` is "no file":
 * every failure to learn the status (network, 5xx, 401, 404, a body that fails the schema) is a
 * load error, so a broken request is never read as "defaults apply". There is no refresh button:
 * the server re-reads the file by itself (on connect, on a push to the default branch, on a GET
 * once its copy is old), reopening the page asks again, and a `pending` status is polled by the
 * hook. «Повторить» is offered only for a load error and for an `unavailable` status the server
 * called retryable.
 */
export const RulesStatusPanel: FC<RulesStatusPanelProps> = ({ repoId }) => {
  const query = useRepositoryRulesStatus(repoId)

  const retry = (): void => {
    void query.refetch()
  }

  const body = (() => {
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
      <h2 className={styles.label}>Правила ревью</h2>
      {body}
    </section>
  )
}
