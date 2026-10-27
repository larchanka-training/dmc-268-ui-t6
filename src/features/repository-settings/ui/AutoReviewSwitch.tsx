import { Alert, Button, Flex, Switch, Typography } from 'antd'
import { useCallback, useEffect, useId, useRef, useState, type FC } from 'react'
import { flushSync } from 'react-dom'
import { VCS_ACCESS_NAME, type VcsProvider } from '../../../shared/model/provider'

import { useTranslation } from '../../../shared/i18n'
import { enableAutoReviewLabel, keepAutoReviewOffLabel } from '../lib/autoReviewChoice'
import styles from './AutoReviewSwitch.module.css'

const { Text } = Typography

export interface AutoReviewSwitchProps {
  provider: VcsProvider
  /**
   * What the server says: `enabled AND installationAvailable` (api PR #156, SD §6.9). The switch
   * only shows it: the page owns the data. While the provider cannot reach the repository it
   * reads `false` whatever the user chose, and the choice is write-only.
   */
  enabled: boolean
  /**
   * `false`: the provider cannot reach the repository. The switch is disabled then and reads
   * off, whatever `enabled` says (the optimistic update of `useUpdateRepository` keeps it off
   * too, this is the second guard); the warning carries the two choices instead (D9): the stored
   * preference cannot be read, so it is never shown.
   */
  installationAvailable: boolean
  /** Saves the choice alone; rejects when the server refuses. */
  onChange: (enabled: boolean) => Promise<void>
  /** Text of an error shown under the switch. */
  describeError: (error: unknown) => string
}

interface ButtonSlot {
  current: HTMLButtonElement | null
}

/**
 * Keeps `slot` pointing at a choice button. The button is marked as it leaves the page, while it is
 * still in the document and `activeElement` tells whether it held the focus.
 */
function trackChoiceButton(
  slot: ButtonSlot,
  switchTakesFocus: { current: boolean },
  node: HTMLButtonElement | null,
): void {
  if (node !== null) {
    slot.current = node
    return
  }
  if (document.activeElement === slot.current) {
    switchTakesFocus.current = true
  }
  slot.current = null
}

/**
 * Auto-review is `enabled`. It takes effect at once, as a switch does (docs/DESIGN_SYSTEM.md §8),
 * apart from the form below it: its PATCH carries `enabled` and nothing the form holds. The
 * optimistic update and the rollback live in the mutation; a failure only adds a message here.
 *
 * The switch is disabled while it saves (`loading`), and a browser hands the focus of a button
 * that turns disabled to the page: once the request is over the focus goes back, if the switch
 * had it at the click and the user has not moved on. The same holds for the two choice buttons
 * of the warning, which both turn disabled while one of them saves.
 */
export const AutoReviewSwitch: FC<AutoReviewSwitchProps> = ({
  provider,
  enabled,
  installationAvailable,
  onChange,
  describeError,
}) => {
  const { t } = useTranslation()
  const labelId = useId()
  const switchRef = useRef<HTMLButtonElement>(null)
  const enableRef = useRef<HTMLButtonElement | null>(null)
  const keepOffRef = useRef<HTMLButtonElement | null>(null)
  // The value being saved, or `null` when nothing is.
  const [pending, setPending] = useState<boolean | null>(null)
  const [error, setError] = useState<{ error: unknown } | null>(null)

  // The warning, and its buttons with it, also goes away because of a refetch that says the access
  // is back. If a button held the focus, the switch takes it.
  const switchTakesFocus = useRef(false)
  const trackEnable = useCallback((node: HTMLButtonElement | null) => {
    trackChoiceButton(enableRef, switchTakesFocus, node)
  }, [])
  const trackKeepOff = useCallback((node: HTMLButtonElement | null) => {
    trackChoiceButton(keepOffRef, switchTakesFocus, node)
  }, [])
  useEffect(() => {
    if (!installationAvailable || !switchTakesFocus.current) {
      return
    }
    switchTakesFocus.current = false
    // Not on <body>: the user has moved on, and keeps the focus where it is.
    if (document.activeElement === document.body) {
      switchRef.current?.focus()
    }
  }, [installationAvailable])

  const handleChange = async (choice: boolean, control: ButtonSlot): Promise<void> => {
    const hadFocus = document.activeElement === control.current
    setError(null)
    setPending(choice)
    try {
      await onChange(choice)
    } catch (err) {
      setError({ error: err })
    } finally {
      // The control is enabled again before it can take the focus back.
      flushSync(() => {
        setPending(null)
      })
      if (hadFocus && document.activeElement === document.body) {
        control.current?.focus()
      }
    }
  }

  return (
    <section className={styles.root}>
      <Flex align="center" gap={8}>
        <Switch
          aria-labelledby={labelId}
          checked={enabled && installationAvailable}
          disabled={!installationAvailable}
          loading={installationAvailable && pending !== null}
          onChange={(checked) => void handleChange(checked, switchRef)}
          ref={switchRef}
        />
        <Text id={labelId} strong>
          {t('settings.autoReview.title')}
        </Text>
      </Flex>
      <Text type="secondary">{t('settings.autoReview.hint')}</Text>

      {!installationAvailable ? (
        <Alert
          // The buttons are not in the `action` slot: antd lays an Alert out as a row (icon, text,
          // actions), and beside two buttons the title and the text collapse (at 390px to one
          // letter per line). Under the text they wrap and take the width they need.
          description={
            <Flex gap={8} vertical>
              <span>
                {t('settings.autoReview.unavailableText', { accessName: VCS_ACCESS_NAME[provider] })}
              </span>
              <Flex gap={8} wrap>
                <Button
                  disabled={pending !== null}
                  loading={pending === true}
                  onClick={() => void handleChange(true, enableRef)}
                  ref={trackEnable}
                  size="small"
                >
                  {enableAutoReviewLabel()}
                </Button>
                <Button
                  disabled={pending !== null}
                  loading={pending === false}
                  onClick={() => void handleChange(false, keepOffRef)}
                  ref={trackKeepOff}
                  size="small"
                >
                  {keepAutoReviewOffLabel()}
                </Button>
              </Flex>
            </Flex>
          }
          showIcon
          title={t('settings.autoReview.unavailableTitle')}
          type="warning"
        />
      ) : null}

      {error !== null ? (
        <Alert
          description={describeError(error.error)}
          showIcon
          title={t('settings.autoReview.changeFailed')}
          type="error"
        />
      ) : null}
    </section>
  )
}
