import { Button, Spin } from 'antd'
import { useEffect, useRef, useState, type FC } from 'react'

import {
  activateAccessRefreshIntent,
  clearAccessRefreshIntent,
  STATE_STORAGE_KEY,
  useAuthStore,
} from '../../features/auth'
import { i18n, useTranslation } from '../../shared/i18n'
import { oauthCallbackErrorMessage } from './oauthErrors'
import styles from './CallbackPage.module.css'

export interface CallbackPageProps {
  onSuccess?: () => void
  onError?: (err: Error) => void
  onBackToLogin?: () => void
}

export const CallbackPage: FC<CallbackPageProps> = ({ onSuccess, onError, onBackToLogin }) => {
  const handleCallback = useAuthStore((state) => state.handleCallback)
  const markInitialized = useAuthStore((state) => state.markInitialized)
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const processedRef = useRef(false)
  const { t } = useTranslation()

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    async function processCode() {
      if (typeof window === 'undefined') return

      const urlParams = new URLSearchParams(window.location.search)
      const oauthError = urlParams.get('error')
      const code = urlParams.get('code')
      const state = urlParams.get('state')

      // Clean query parameters from address bar immediately
      try {
        window.history.replaceState(null, '', window.location.pathname)
      } catch {
        // Ignore replaceState errors in restricted environments
      }

      if (oauthError) {
        clearAccessRefreshIntent()
        try {
          sessionStorage.removeItem(STATE_STORAGE_KEY)
        } catch {
          // Ignore storage errors
        }
        markInitialized()
        setStatus('error')
        setErrorMessage(oauthCallbackErrorMessage(oauthError))
        return
      }

      if (!code) {
        clearAccessRefreshIntent()
        try {
          sessionStorage.removeItem(STATE_STORAGE_KEY)
        } catch {
          // Ignore storage errors
        }
        markInitialized()
        setStatus('error')
        setErrorMessage(i18n.t('auth.callback.missingCode'))
        return
      }

      try {
        await handleCallback(code, state)
        activateAccessRefreshIntent()
        if (onSuccess) {
          onSuccess()
        } else {
          window.location.href = '/repositories'
        }
      } catch (err) {
        clearAccessRefreshIntent()
        const msg = err instanceof Error ? err.message : i18n.t('auth.callback.failed')
        setStatus('error')
        setErrorMessage(msg)
      }
    }

    void processCode()
  }, [handleCallback, markInitialized, onSuccess])

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        {status === 'loading' ? (
          <>
            <Spin size="large" />
            <h1 className={styles.title}>{t('auth.callback.loadingTitle')}</h1>
            <p className={styles.text}>{t('auth.callback.loadingText')}</p>
          </>
        ) : (
          <>
            <h1 className={styles.title}>{t('auth.callback.failedTitle')}</h1>
            <p className={styles.text} role="alert">
              {errorMessage}
            </p>
            <Button
              className={styles.action}
              onClick={() => {
                if (onBackToLogin) {
                  onBackToLogin()
                } else if (onError) {
                  onError(new Error(errorMessage ?? 'Auth error'))
                } else {
                  window.location.href = '/login'
                }
              }}
            >
              {t('auth.callback.backToLogin')}
            </Button>
          </>
        )}
      </div>
    </main>
  )
}
