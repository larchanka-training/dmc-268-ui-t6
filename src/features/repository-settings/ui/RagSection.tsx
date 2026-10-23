import { Alert, Flex, Switch, Tooltip, Typography } from 'antd'
import { useId, useRef, useState, type FC } from 'react'
import { flushSync } from 'react-dom'

import type { RagIndex } from '../../../entities/repository'
import { Tag } from '../../../shared/ui'
import {
  RAG_ERROR_TITLE,
  RAG_HINT,
  RAG_LABEL,
  RAG_LAST_BUILD_FAILED,
  RAG_NO_ACCESS_TEXT,
  RAG_POLL_TIMED_OUT_TEXT,
  ragIndexView,
  type RagIndexView,
} from '../lib/ragIndexView'
import styles from './RagSection.module.css'

const { Text } = Typography

export interface RagSectionProps {
  /** `ragEnabled` of the repository, as the cache holds it (the optimistic update flips it first). */
  ragEnabled: boolean
  /** The read-only state of the index (api#145). */
  ragIndex: RagIndex
  /**
   * `false`: the GitHub App cannot reach the repository. The switch is disabled then and reads
   * off, whatever `ragEnabled` says (the server masks it the same way, this is the second guard),
   * and the status reads «Выключен».
   */
  installationAvailable: boolean
  /**
   * The state of the page's bounded polling after a switch-on or while the index builds. Only
   * `timedOut` shows: the page stops asking, and the section says so.
   */
  polling: 'idle' | 'waiting' | 'timedOut'
  /** Saves the choice alone; rejects when the server refuses. */
  onChange: (ragEnabled: boolean) => Promise<void>
  /** Text of an error shown under the status. */
  describeError: (error: unknown) => string
}

/** The text of an error code with the code after it, or the code alone when it has no text. */
const Reason: FC<{ reason: NonNullable<RagIndexView['reason']> }> = ({ reason }) =>
  reason.text === null ? (
    <code>{reason.code}</code>
  ) : (
    <>
      {reason.text} (<code>{reason.code}</code>)
    </>
  )

/**
 * RAG is `ragEnabled`. Like the auto-review switch, it takes effect at once, apart from the form
 * below it: its PATCH carries `ragEnabled` and nothing the form holds. The optimistic update and
 * the rollback live in the mutation; a failure only adds a message here.
 *
 * The switch is disabled while it saves (`loading`), and a browser hands the focus of a button
 * that turns disabled to the page: once the request is over the focus goes back, if the switch
 * had it at the click and the user has not moved on.
 */
export const RagSection: FC<RagSectionProps> = ({
  ragEnabled,
  ragIndex,
  installationAvailable,
  polling,
  onChange,
  describeError,
}) => {
  const labelId = useId()
  const switchRef = useRef<HTMLButtonElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<{ error: unknown } | null>(null)

  // Without access the server serves RAG off; the status never shows an index nobody uses.
  const effective = ragEnabled && installationAvailable
  const view = ragIndexView(ragIndex, effective)

  const handleChange = async (next: boolean): Promise<void> => {
    const hadFocus = document.activeElement === switchRef.current
    setError(null)
    setPending(true)
    try {
      await onChange(next)
    } catch (err) {
      // The mutation has put the value back; the message is all that is left to do.
      setError({ error: err })
    } finally {
      // The switch is enabled again before it can take the focus back.
      flushSync(() => {
        setPending(false)
      })
      if (hadFocus && document.activeElement === document.body) {
        switchRef.current?.focus()
      }
    }
  }

  return (
    <section aria-label={RAG_LABEL} className={styles.root}>
      <Flex align="center" gap={8}>
        <Switch
          aria-labelledby={labelId}
          checked={effective}
          disabled={!installationAvailable || pending}
          loading={pending}
          onChange={(checked) => void handleChange(checked)}
          ref={switchRef}
        />
        <Text id={labelId} strong>
          {RAG_LABEL}
        </Text>
      </Flex>
      <Text type="secondary">{RAG_HINT}</Text>
      {!installationAvailable ? <Text type="secondary">{RAG_NO_ACCESS_TEXT}</Text> : null}

      <Flex align="center" aria-live="polite" className={styles.status} gap={8} role="status" wrap>
        <Text type="secondary">Статус индекса:</Text>
        <Tag pulse={view.pulse} tone={view.tone}>
          {view.label}
        </Tag>
        {view.publication !== null ? (
          <>
            <Tooltip title={view.publication.sha} trigger={['hover', 'focus']}>
              <code className={styles.sha} tabIndex={0}>
                {view.publication.shortSha}
              </code>
            </Tooltip>
            <Text type="secondary">обновлён {view.publication.indexedAt} UTC</Text>
          </>
        ) : null}
        {view.detail !== null ? <Text type="secondary">{view.detail}</Text> : null}
        {view.reason !== null && ragIndex.status === 'failed' ? (
          <Text type="secondary">
            <Reason reason={view.reason} />
          </Text>
        ) : null}
        {view.reason !== null && ragIndex.status !== 'failed' ? (
          <Text className={styles.wide} type="secondary">
            {RAG_LAST_BUILD_FAILED}: <Reason reason={view.reason} />
          </Text>
        ) : null}
        {polling === 'timedOut' ? (
          <Text className={styles.wide} type="secondary">
            {RAG_POLL_TIMED_OUT_TEXT}
          </Text>
        ) : null}
      </Flex>

      {error !== null ? (
        <Alert
          description={describeError(error.error)}
          showIcon
          title={RAG_ERROR_TITLE}
          type="error"
        />
      ) : null}
    </section>
  )
}
