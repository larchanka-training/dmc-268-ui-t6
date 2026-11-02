import { Alert, Button, Skeleton } from 'antd'
import { useCallback, useEffect, useRef, type FC } from 'react'

import { useRepositoryRulesStatus } from '../../../entities/repository'
import { useTranslation } from '../../../shared/i18n'
import type { VcsProvider } from '../../../shared/model/provider'
import { RulesStatusDetails } from './RulesStatusDetails'
import styles from './RulesStatusPanel.module.css'

export interface RulesStatusPanelProps {
  repoId: string
  provider: VcsProvider
}

/**
 * Status of `.review/rules.md` of a repository. Only a 200 with `status: 'missing'` is "no file":
 * every failure to learn the status (network, 5xx, 401, 404, a body that fails the schema) is a
 * load error, so a broken request is never read as "defaults apply". There is no refresh button:
 * the server re-reads the file by itself (on connect, on a push to the default branch, on a GET
 * once its copy is old), reopening the page asks again, and a `pending` status is polled by the
 * hook. "Retry" is offered only for a load error and for an `unavailable` status the server
 * called retryable. When that button goes away while it has the focus (the retry succeeded, or a
 * poll brought the result under it), the focus goes to the block's other "Retry" if the block
 * has one now (the retry of an `unavailable` status failed with an HTTP error), else to the
 * heading of the block, not to `<body>`.
 */
export const RulesStatusPanel: FC<RulesStatusPanelProps> = ({ repoId, provider }) => {
  const { t } = useTranslation()
  const query = useRepositoryRulesStatus(repoId)

  const retry = (): void => {
    void query.refetch()
  }

  // A retry button that held the focus is noted as its ref is released, while it is still in the
  // document: once it is gone the focus is on `<body>` already. The ref is released for a button
  // that stays too (Ant Design composes its own ref on a render), so whether the button really left
  // is judged after the commit, by the effect below. It is the same ref for both retry buttons
  // (the load error here, the retryable `unavailable` status in the details); only one of them is
  // on the page at a time.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const retryNode = useRef<HTMLButtonElement | null>(null)
  const retryWithFocus = useRef<HTMLButtonElement | null>(null)
  const trackRetry = useCallback((node: HTMLButtonElement | null) => {
    if (node !== null) {
      retryNode.current = node
      return
    }
    if (retryNode.current !== null && document.activeElement === retryNode.current) {
      retryWithFocus.current = retryNode.current
    }
    retryNode.current = null
  }, [])

  // After every render: the button can leave with any of them (a retry, a poll, a refocused
  // window). The note is made in the commit that removed the button, before this runs, and every
  // new button is attached by then: `retryNode` is the retry button the block has now, if any.
  useEffect(() => {
    const node = retryWithFocus.current
    if (node === null) {
      return
    }
    retryWithFocus.current = null
    if (!node.isConnected) {
      const target = retryNode.current ?? headingRef.current
      target?.focus()
    }
  })

  const body = (() => {
    // A failed request wins over data an earlier request left behind: that data may be stale.
    if (query.isError) {
      return (
        <Alert
          action={
            <Button loading={query.isFetching} onClick={retry} ref={trackRetry} size="small">
              {t('rules.retry')}
            </Button>
          }
          showIcon
          title={t('rules.loadFailed')}
          type="error"
        />
      )
    }
    if (query.isPending) {
      return <Skeleton active />
    }
    return (
      <RulesStatusDetails
        provider={provider}
        onRetry={retry}
        retryRef={trackRetry}
        retrying={query.isFetching}
        status={query.data}
      />
    )
  })()

  return (
    <section aria-label={t('rules.title')} className={styles.root}>
      <h2 className={styles.label} ref={headingRef} tabIndex={-1}>
        {t('rules.title')}
      </h2>
      {body}
    </section>
  )
}
