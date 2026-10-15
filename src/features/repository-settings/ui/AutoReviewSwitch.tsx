import { Alert, Flex, Switch, Typography } from 'antd'
import { useId, useRef, useState, type FC } from 'react'
import { flushSync } from 'react-dom'

import styles from './AutoReviewSwitch.module.css'

const { Text } = Typography

export interface AutoReviewSwitchProps {
  /**
   * What the server says: `enabled AND installationAvailable` (api PR #156, SD §6.9). The switch
   * only shows it: the page owns the data. While the GitHub App cannot reach the repository it
   * reads `false` whatever the user chose, and the choice is write-only.
   */
  enabled: boolean
  /** `false`: the GitHub App cannot reach the repository. */
  installationAvailable: boolean
  /** Saves the choice alone; rejects when the server refuses. */
  onChange: (enabled: boolean) => Promise<void>
  /** Text of an error shown under the switch. */
  describeError: (error: unknown) => string
}

/**
 * Auto-review is `enabled`. It takes effect at once, as a switch does (docs/DESIGN_SYSTEM.md §8),
 * apart from the form below it: its PATCH carries `enabled` and nothing the form holds. The
 * optimistic update and the rollback live in the mutation; a failure only adds a message here.
 *
 * The switch is disabled while it saves (`loading`), and a browser hands the focus of a button
 * that turns disabled to the page: once the request is over the focus goes back, if the switch
 * had it at the click and the user has not moved on.
 */
export const AutoReviewSwitch: FC<AutoReviewSwitchProps> = ({
  enabled,
  installationAvailable,
  onChange,
  describeError,
}) => {
  const labelId = useId()
  const switchRef = useRef<HTMLButtonElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<{ error: unknown } | null>(null)

  const handleChange = async (checked: boolean): Promise<void> => {
    const hadFocus = document.activeElement === switchRef.current
    setError(null)
    setPending(true)
    try {
      await onChange(checked)
    } catch (err) {
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
    <section className={styles.root}>
      <Flex align="center" gap={8}>
        <Switch
          aria-labelledby={labelId}
          checked={enabled}
          loading={pending}
          onChange={(checked) => void handleChange(checked)}
          ref={switchRef}
        />
        <Text id={labelId} strong>
          Автоматическое ревью
        </Text>
      </Flex>
      <Text type="secondary">
        Когда включено, ревью запускается автоматически для pull request этого репозитория.
      </Text>

      {!installationAvailable ? (
        <Alert
          description="У GitHub App нет доступа к этому репозиторию, поэтому автоматическое ревью не запустится. Переключатель сохраняет выбор: он вступит в силу, когда доступ к GitHub App будет восстановлен."
          showIcon
          title="Автоматическое ревью недоступно"
          type="warning"
        />
      ) : null}

      {error !== null ? (
        <Alert
          description={describeError(error.error)}
          showIcon
          title="Не удалось изменить автоматическое ревью"
          type="error"
        />
      ) : null}
    </section>
  )
}
