import { Alert, Button, ConfigProvider, theme } from 'antd'
import type { FC } from 'react'

import { useMe } from '../../entities/user'
import { LoginButton, useAuthStore } from '../../features/auth'
import { useTranslation } from '../../shared/i18n'
import { buildTheme, Logo } from '../../shared/ui'
import { HeroGlass } from './HeroGlass'
import styles from './LoginPage.module.css'

export interface LoginPageProps {
  onLoginSuccess?: () => void
}

// Darker and wider dimming under the form than the landing hero uses: the button must stay readable.
const FORM_DIM = [0.5, 0.27, 2.1] as const

/**
 * Sign-in. The only screen with the animated glass background of the landing; that background is
 * dark-only, so the screen stays dark whatever theme the user picked: the nested provider themes
 * Ant Design and `data-rv-theme="dark"` switches the `--rv-*` tokens for this subtree. The nested
 * provider keeps the motion setting of the enclosing one, which follows the system.
 */
export const LoginPage: FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const authError = useAuthStore((state) => state.error)
  const { data: user } = useMe(isAuthenticated)
  const { token } = theme.useToken()
  const { t } = useTranslation()

  return (
    <ConfigProvider theme={buildTheme('dark', { reducedMotion: !token.motion })}>
      <main className={styles.container} data-rv-theme="dark">
        <HeroGlass dim={FORM_DIM} textSelector="#login-form" />
        <div className={styles.form} id="login-form">
          <span className={styles.logo}>
            <Logo size={40} />
          </span>
          <h1 className={styles.title}>{t('auth.login.title')}</h1>
          <p className={styles.subtitle}>{t('auth.login.subtitle')}</p>

          {authError ? (
            <Alert className={styles.alert} showIcon title={authError} type="error" />
          ) : null}

          {isAuthenticated ? (
            <div className={styles.actions}>
              <p className={styles.note}>
                {t('auth.login.alreadySignedIn', {
                  login: user?.login ?? t('auth.login.fallbackLogin'),
                })}
              </p>
              <Button
                block
                onClick={() => {
                  if (onLoginSuccess) {
                    onLoginSuccess()
                  } else if (typeof window !== 'undefined') {
                    window.location.href = '/repositories'
                  }
                }}
                size="large"
                type="primary"
              >
                {t('auth.login.goToDashboard')}
              </Button>
            </div>
          ) : (
            <div className={styles.actions}>
              <LoginButton block size="large" />
              <p className={styles.note}>{t('auth.login.note')}</p>
            </div>
          )}
        </div>
      </main>
    </ConfigProvider>
  )
}
