import { Button, Card, Flex, Layout, Result, Spin, Typography, theme } from 'antd'
import { useEffect, useRef, useState, type FC } from 'react'

import { STATE_STORAGE_KEY, useAuthStore } from '../../features/auth'

const { Text } = Typography

export interface CallbackPageProps {
  onSuccess?: () => void
  onError?: (err: Error) => void
  onBackToLogin?: () => void
}

export const CallbackPage: FC<CallbackPageProps> = ({ onSuccess, onError, onBackToLogin }) => {
  const { token } = theme.useToken()
  const handleCallback = useAuthStore((state) => state.handleCallback)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    async function processCode() {
      if (typeof window === 'undefined') return

      const urlParams = new URLSearchParams(window.location.search)
      const oauthError = urlParams.get('error')
      const oauthErrorDesc = urlParams.get('error_description')
      const code = urlParams.get('code')
      const state = urlParams.get('state')

      // Clean query parameters from address bar immediately
      try {
        window.history.replaceState(null, '', window.location.pathname)
      } catch {
        // Ignore replaceState errors in restricted environments
      }

      if (oauthError) {
        try {
          sessionStorage.removeItem(STATE_STORAGE_KEY)
        } catch {
          // Ignore storage errors
        }
        setStatus('error')
        const msg =
          oauthErrorDesc ??
          (oauthError === 'access_denied'
            ? 'Доступ отклонён пользователем на стороне GitHub'
            : `Ошибка авторизации GitHub: ${oauthError}`)
        setErrorMessage(msg)
        return
      }

      if (!code) {
        try {
          sessionStorage.removeItem(STATE_STORAGE_KEY)
        } catch {
          // Ignore storage errors
        }
        setStatus('error')
        setErrorMessage('Отсутствует код авторизации (параметр code не найден)')
        return
      }

      try {
        await handleCallback(code, state)
        setStatus('success')
        if (onSuccess) {
          onSuccess()
        } else {
          window.location.href = '/repositories'
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Не удалось завершить авторизацию'
        setStatus('error')
        setErrorMessage(msg)
      }
    }

    void processCode()
  }, [handleCallback, onSuccess])

  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: token.colorBgLayout,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 480,
          textAlign: 'center',
          boxShadow: token.boxShadowSecondary,
        }}
      >
        {status === 'loading' ? (
          <Flex vertical align="center" gap="middle" style={{ padding: '32px 0' }}>
            <Spin size="large" />
            <Text strong style={{ fontSize: token.fontSizeLG }}>
              Авторизация через GitHub...
            </Text>
            <Text type="secondary">Обмениваем код подтверждения на сессионный токен</Text>
          </Flex>
        ) : status === 'error' ? (
          <Result
            extra={[
              <Button
                key="back"
                onClick={() => {
                  if (onBackToLogin) {
                    onBackToLogin()
                  } else if (onError) {
                    onError(new Error(errorMessage ?? 'Auth error'))
                  } else {
                    window.location.href = '/login'
                  }
                }}
                type="primary"
              >
                Вернуться к экрану входа
              </Button>,
            ]}
            status="error"
            subTitle={errorMessage}
            title="Ошибка авторизации"
          />
        ) : (
          <Result
            status="success"
            subTitle="Перенаправляем в панель управления..."
            title="Авторизация успешна!"
          />
        )}
      </Card>
    </Layout>
  )
}
