import { GithubOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Flex, Tooltip } from 'antd'
import type { FC } from 'react'

import { GITHUB_CLIENT_ID, isMockMode } from '../../../shared/config/env'
import { VITE_MOCKS_BUILD, mocksEnabledAtRuntime } from '../../../shared/config/buildFlags'
import { useAuthStore } from '../model/store'

export interface LoginButtonProps {
  showMockButton?: boolean
  size?: 'small' | 'middle' | 'large'
}

const showDemoLogin = mocksEnabledAtRuntime(isMockMode)

export const LoginButton: FC<LoginButtonProps> = ({
  showMockButton = showDemoLogin,
  size = 'middle',
}) => {
  const loginWithGitHub = useAuthStore((state) => state.loginWithGitHub)
  const loginAsMockUser = useAuthStore((state) => state.loginAsMockUser)
  const isLoading = useAuthStore((state) => state.isLoading)

  const isConfigured = Boolean(GITHUB_CLIENT_ID || isMockMode())

  const githubBtn = (
    <Button
      aria-label="Войти через GitHub"
      disabled={!isConfigured}
      icon={<GithubOutlined />}
      loading={isLoading}
      onClick={loginWithGitHub}
      size={size}
      type="primary"
    >
      Войти через GitHub
    </Button>
  )

  return (
    <Flex align="center" gap="middle" wrap="wrap">
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
