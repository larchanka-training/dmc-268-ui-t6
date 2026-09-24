import { RobotOutlined } from '@ant-design/icons'
import { Flex, Layout, Typography, theme } from 'antd'
import type { FC, ReactNode } from 'react'

import { LoginButton, UserMenu, useAuthStore } from '../../../features/auth'
import { ThemeToggle } from '../../../features/theme'

const { Header } = Layout
const { Title, Text } = Typography

export interface AppHeaderProps {
  extra?: ReactNode
}

export const AppHeader: FC<AppHeaderProps> = ({ extra }) => {
  const { token } = theme.useToken()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        height: 64,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Flex align="center" gap="middle">
        <Flex align="center" gap="small">
          <RobotOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
          <Title level={4} style={{ margin: 0, whiteSpace: 'nowrap' }}>
            AI Code Reviewer
          </Title>
        </Flex>
        <Text style={{ fontSize: 12 }} type="secondary">
          Team 6
        </Text>
      </Flex>

      <Flex align="center" gap="middle">
        {extra}
        <ThemeToggle />
        {isAuthenticated ? <UserMenu /> : <LoginButton showMockButton={false} size="small" />}
      </Flex>
    </Header>
  )
}
