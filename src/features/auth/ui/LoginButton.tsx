import { GithubOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Flex, Tooltip } from 'antd'
import type { FC } from 'react'

import { GITHUB_CLIENT_ID, isMockMode } from '../../../shared/config/env'
import { VITE_MOCKS_BUILD, mocksEnabledAtRuntime } from '../../../shared/config/buildFlags'
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

  const isConfigured = Boolean(GITHUB_CLIENT_ID || isMockMode())

  const githubBtn = (
    <Button
      aria-label="Войти через GitHub"
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
      Войти через GitHub
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
        <Tooltip title="Вход не настроен (VITE_GITHUB_CLIENT_ID)">
          <span>{githubBtn}</span>
        </Tooltip>
      ) : (
        githubBtn
      )}

      {VITE_MOCKS_BUILD && showDemoLogin && showMockButton ? (
        <Button
          aria-label="Войти как демо-пользователь"
          block={block}
          icon={<UserOutlined />}
          onClick={loginAsMockUser}
          size={size}
        >
          Демо-вход (Mock)
        </Button>
      ) : null}
    </Flex>
  )
}
