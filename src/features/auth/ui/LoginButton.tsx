import { GithubOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Flex } from 'antd'
import type { FC } from 'react'

import { USE_MOCKS } from '../../../shared/config/env'
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

  return (
    <Flex align="center" gap="middle" wrap="wrap">
      <Button
        aria-label="Войти через GitHub"
        icon={<GithubOutlined />}
        loading={isLoading}
        onClick={loginWithGitHub}
        size={size}
        type="primary"
      >
        Войти через GitHub
      </Button>

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
