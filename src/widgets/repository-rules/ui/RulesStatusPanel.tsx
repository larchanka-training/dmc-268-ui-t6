import { Alert, Button, Skeleton, Typography } from 'antd'
import { useEffect, useRef, type FC, type MouseEvent } from 'react'

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

  // «Обновить» stays on screen whenever the block is enabled, so a refresh that fails does not
  // take the focused button away. The retry button of an error, or of a status the server called
  // retryable, goes away when its request ends well: if it had the focus, «Обновить» takes it
  // then. A retry that fails again keeps its button, and the focus stays on it.
  const refreshRef = useRef<HTMLButtonElement>(null)
  const refocusAfterRetry = useRef(false)

  const refresh = (): void => {
    void query.refetch()
  }
  const retry = (event: MouseEvent<HTMLElement>): void => {
    refocusAfterRetry.current = document.activeElement === event.currentTarget
    refresh()
  }

  // Runs when a request ends. The answer of a fast retry may reach the page without `isFetching`
  // ever being seen true, so the effect also follows what the answer changes.
  useEffect(() => {
    if (query.isFetching || !refocusAfterRetry.current) {
      return
    }
    refocusAfterRetry.current = false
    // On <body> only: the retry button is gone. If it is still there, the retry failed again, and
    // if the focus is elsewhere the user has moved on.
    if (document.activeElement === document.body) {
      refreshRef.current?.focus()
    }
  }, [query.isFetching, query.status, query.dataUpdatedAt, query.errorUpdatedAt])

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
        {enabled ? (
          <Button loading={query.isFetching} onClick={refresh} ref={refreshRef}>
            Обновить
          </Button>
        ) : null}
      </div>
      {body}
    </section>
  )
}
