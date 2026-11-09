import { Alert, Button, Skeleton } from 'antd'
import { useCallback, useEffect, useRef, useState, type FC } from 'react'

import { useRepositoryRulesStatusRetry } from '../../../entities/repository'
import { useTranslation } from '../../../shared/i18n'
import type { VcsProvider } from '../../../shared/model/provider'
import { Checking, RulesStatusDetails } from './RulesStatusDetails'
import styles from './RulesStatusPanel.module.css'

export interface RulesStatusPanelProps {
  repoId: string
  provider: VcsProvider
}

export interface RulesStatusViewProps {
  /** The status and its retry, from `useRepositoryRulesStatusRetry` of the screen that owns it. */
  rules: ReturnType<typeof useRepositoryRulesStatusRetry>
  provider: VcsProvider
  /** False where the file text is shown elsewhere (the rules editor of the playground). */
  showFileText?: boolean
}

/**
 * Status of `.review/rules.md` of a repository. Only a 200 with `status: 'missing'` is "no file":
 * every failure to learn the status (network, 5xx, 401, 404, a body that fails the schema) is a
 * load error, so a broken request is never read as "defaults apply". There is no refresh button:
 * the server re-reads the file by itself (on connect, on a push to the default branch, on a GET
 * once its copy is old), reopening the page asks again, and a `pending` status is polled by the
 * hook. "Retry" is offered for a timed-out `pending`, a load error, and an `unavailable` status
 * the server called retryable; the retry of such an unavailable status waits for the new result
 * for a bounded time
 * (`useRepositoryRulesStatusRetry`), with the button busy and a line that the check is running,
 * also while a failed poll shows the load error. When that button goes away while it has the focus
 * (the retry succeeded, or a poll brought the result under it), the focus goes to the block's
 * other "Retry" if the block has one now (the retry of an `unavailable` status failed with an HTTP
 * error), else to the heading of the block, not to `<body>`.
 */
export const RulesStatusPanel: FC<RulesStatusPanelProps> = ({ repoId, provider }) => {
  const rules = useRepositoryRulesStatusRetry(repoId)
  return <RulesStatusView provider={provider} rules={rules} />
}

/**
 * The panel without its request: a screen that needs the status itself (the playground puts the
 * file text in its editor) owns `useRepositoryRulesStatusRetry` and shows the same texts here.
 */
export const RulesStatusView: FC<RulesStatusViewProps> = ({
  rules,
  provider,
  showFileText = true,
}) => {
  const { t } = useTranslation()
  const { query, awaitingResult, retry: retryRulesStatus } = rules
  // Through the whole wait, not only while a request runs: the wait goes on between the polls.
  const busy = query.isFetching || awaitingResult
  const deadline = query.getPendingPollDeadline()
  const [expiredDeadline, setExpiredDeadline] = useState<number | null>(null)

  useEffect(() => {
    if (deadline === null) return
    const timer = window.setTimeout(
      () => {
        setExpiredDeadline(deadline)
      },
      Math.max(0, deadline - Date.now()),
    )
    return () => {
      window.clearTimeout(timer)
    }
  }, [deadline])

  const retry = (): void => {
    setExpiredDeadline(null)
    retryRulesStatus()
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
    if (deadline !== null && expiredDeadline === deadline) {
      return (
        <Alert
          action={
            <Button onClick={retry} ref={trackRetry} size="small">
              {t('rules.retry')}
            </Button>
          }
          showIcon
          title={t('rules.pendingTimeout')}
          type="warning"
        />
      )
    }
    // A failed request wins over data an earlier request left behind: that data may be stale.
    if (query.isError) {
      return (
        <Alert
          action={
            <Button loading={busy} onClick={retry} ref={trackRetry} size="small">
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
        retrying={busy}
        showFileText={showFileText}
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
      {/* Outside `body`: a failed poll swaps the details for the load error, the check goes on. */}
      {awaitingResult && query.data !== undefined ? <Checking branch={query.data.branch} /> : null}
    </section>
  )
}
