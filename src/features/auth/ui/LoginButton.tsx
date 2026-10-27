import { GithubOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Flex, Tooltip } from 'antd'
import type { FC } from 'react'

import { GITHUB_CLIENT_ID, isMockMode } from '../../../shared/config/env'
import { VITE_MOCKS_BUILD, mocksEnabledAtRuntime } from '../../../shared/config/buildFlags'
import { toLanguage, useTranslation } from '../../../shared/i18n'
import { DEMO_LOGIN_TEXTS } from '../mocks/demoLoginTexts'
import { useAuthStore } from '../model/store'
import { clearAccessRefreshIntent } from '../lib/returnTo'

export interface LoginButtonProps {
  showMockButton?: boolean
  size?: 'small' | 'middle' | 'large'
  /** Stretches the buttons to the width of the container and stacks them, for the sign-in form. */
  block?: boolean
}

const showDemoLogin = mocksEnabledAtRuntime(isMockMode)

export const LoginButton: FC<LoginButtonProps> = ({
  showMockButton = showDemoLogin,
  size = 'middle',
  block = false,
}) => {
  const loginWithGitHub = useAuthStore((state) => state.loginWithGitHub)
  const loginAsMockUser = useAuthStore((state) => state.loginAsMockUser)
  const isLoading = useAuthStore((state) => state.isLoading)
  const { t, i18n } = useTranslation()

  const isConfigured = Boolean(GITHUB_CLIENT_ID || isMockMode())

  const githubBtn = (
    <Button
      aria-label={t('auth.button.github')}
      block={block}
      disabled={!isConfigured}
      icon={<GithubOutlined />}
      loading={isLoading}
      onClick={() => {
        clearAccessRefreshIntent()
        loginWithGitHub()
      }}
      size={size}
      type="primary"
    >
      {t('auth.button.github')}
    </Button>
  )

  return (
    <Flex
      align={block ? 'stretch' : 'center'}
      gap="middle"
      style={block ? { width: '100%' } : undefined}
      vertical={block}
      wrap={block ? undefined : 'wrap'}
    >
      {!isConfigured ? (
        <Tooltip title={t('auth.button.notConfigured')}>
          <span>{githubBtn}</span>
        </Tooltip>
      ) : (
        githubBtn
      )}

      {VITE_MOCKS_BUILD && showDemoLogin && showMockButton ? (
        <Button
          aria-label={DEMO_LOGIN_TEXTS[toLanguage(i18n.language)].label}
          block={block}
          icon={<UserOutlined />}
          onClick={loginAsMockUser}
          size={size}
        >
          {DEMO_LOGIN_TEXTS[toLanguage(i18n.language)].button}
        </Button>
      ) : null}
    </Flex>
  )
}
