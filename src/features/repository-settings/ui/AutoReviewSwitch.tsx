import { Alert, Flex, Switch, Typography } from 'antd'
import { useId, useState, type FC } from 'react'

import styles from './AutoReviewSwitch.module.css'

const { Text } = Typography

export interface AutoReviewSwitchProps {
  /** The stored preference. The switch only shows it: the page owns the data. */
  enabled: boolean
  /** `false`: the GitHub App cannot reach the repository. */
  installationAvailable: boolean
  /** Saves the preference alone; rejects when the server refuses. */
  onChange: (enabled: boolean) => Promise<void>
  /** Text of an error shown under the switch. */
  describeError: (error: unknown) => string
}

/**
 * Auto-review is `enabled`. It takes effect at once, as a switch does (docs/DESIGN_SYSTEM.md §8),
 * apart from the form below it: its PATCH carries `enabled` and nothing the form holds. The
 * optimistic update and the rollback live in the mutation; a failure only adds a message here.
 */
export const AutoReviewSwitch: FC<AutoReviewSwitchProps> = ({
  enabled,
  installationAvailable,
  onChange,
  describeError,
}) => {
  const labelId = useId()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<{ error: unknown } | null>(null)

  const handleChange = async (checked: boolean): Promise<void> => {
    setError(null)
    setPending(true)
    try {
      await onChange(checked)
    } catch (err) {
      setError({ error: err })
    } finally {
      setPending(false)
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
          description="У GitHub App нет доступа к этому репозиторию, поэтому автоматическое ревью не запустится, пока доступ не восстановлен. Переключатель сохраняет только настройку."
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
