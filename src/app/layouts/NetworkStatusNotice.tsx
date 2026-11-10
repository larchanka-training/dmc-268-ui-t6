import { onlineManager } from '@tanstack/react-query'
import { Alert } from 'antd'
import { useSyncExternalStore, type FC } from 'react'

import { useTranslation } from '../../shared/i18n'
import styles from './NetworkStatusNotice.module.css'

function subscribe(onChange: () => void): () => void {
  return onlineManager.subscribe(onChange)
}

function isOnline(): boolean {
  return onlineManager.isOnline()
}

/**
 * The app-wide sign of a lost network, on every page. It follows TanStack Query's
 * `onlineManager`, the state that pauses queries, so the notice and the paused queries of ui#216
 * agree. Like `navigator.onLine`, the manager learns of the network from the window's `online` and
 * `offline` events: a network without internet access fires neither and is not caught. The notice
 * stands over the page at the bottom of the window, so what is loaded stays in place, and it
 * leaves by itself when the network returns.
 */
export const NetworkStatusNotice: FC = () => {
  const { t } = useTranslation()
  const online = useSyncExternalStore(subscribe, isOnline, () => true)

  if (online) return null

  return (
    <div className={styles.notice}>
      <Alert showIcon title={t('layout.networkOffline')} type="warning" />
    </div>
  )
}
