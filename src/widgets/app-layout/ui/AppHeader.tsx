import { RobotOutlined } from '@ant-design/icons'
import { Flex, Layout, Typography, theme } from 'antd'
import type { FC, ReactNode } from 'react'

import { LoginButton, UserMenu, useAuthStore } from '../../../features/auth'
import { ThemeToggle } from '../../../features/theme'
import styles from './AppLayout.module.css'

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
      className={styles.header}
      style={{
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Flex align="center" gap="middle">
        <Flex align="center" gap="small">
          <RobotOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
          <Title className={styles.headerTitle} level={4}>
            AI Code Reviewer
          </Title>
        </Flex>
        <Text className={styles.headerSubtext} type="secondary">
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
