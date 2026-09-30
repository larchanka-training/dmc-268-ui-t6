import { GithubOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Flex, Tooltip } from 'antd'
import type { FC } from 'react'

import { GITHUB_CLIENT_ID, USE_MOCKS } from '../../../shared/config/env'
import { useAuthStore } from '../model/store'

export interface LoginButtonProps {
  showMockButton?: boolean
  size?: 'small' | 'middle' | 'large'
}

export const LoginButton: FC<LoginButtonProps> = ({
  showMockButton = USE_MOCKS,
  size = 'middle',
}) => {
  const loginWithGitHub = useAuthStore((state) => state.loginWithGitHub)
  const loginAsMockUser = useAuthStore((state) => state.loginAsMockUser)
  const isLoading = useAuthStore((state) => state.isLoading)

  const isConfigured = Boolean(GITHUB_CLIENT_ID || USE_MOCKS)

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

      {showMockButton ? (
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
