import { CheckCircleOutlined, RobotOutlined } from '@ant-design/icons'
import { Card, Flex, Layout, List, Typography, theme } from 'antd'
import type { FC } from 'react'

import { LoginButton, useAuthStore } from '../../features/auth'
import { ThemeToggle } from '../../features/theme'

const { Title, Paragraph, Text } = Typography

export interface LoginPageProps {
  onLoginSuccess?: () => void
}

export const LoginPage: FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { token } = theme.useToken()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)

  const features = [
    'Автоматический триггер ревью по назначению бота и успешному CI',
    'Два движка анализа: быстрый DiffEngine и изолированный SandboxEngine',
    'Публикация концентрированных замечаний прямо в pull request',
    'Инспектор трейса действий LLM и интерактивный просмотрщик диффа',
  ]

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
      <div style={{ position: 'absolute', top: 20, right: 24 }}>
        <ThemeToggle size="large" />
      </div>

      <Card
        style={{
          width: '100%',
          maxWidth: 520,
          boxShadow: token.boxShadowSecondary,
          borderRadius: token.borderRadiusLG,
        }}
      >
        <Flex align="center" gap="middle" style={{ marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: token.colorPrimaryBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RobotOutlined style={{ fontSize: 32, color: token.colorPrimary }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              AI Code Reviewer
            </Title>
            <Text type="secondary">Платформа инспекции кода — Команда 6</Text>
          </div>
        </Flex>

        <Paragraph type="secondary">
          Интеллектуальное ревью кода для ваших репозиториев с глубоким контекстным анализом и
          проверкой качества перед мержем.
        </Paragraph>

        <List
          dataSource={features}
          renderItem={(item) => (
            <List.Item style={{ padding: '8px 0', border: 'none' }}>
              <Flex align="center" gap="small">
                <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                <Text style={{ fontSize: 13 }}>{item}</Text>
              </Flex>
            </List.Item>
          )}
          style={{ marginBottom: 32 }}
        />

        {isAuthenticated ? (
          <Flex vertical gap="small">
            <Text strong>Вы уже авторизованы как {user?.login ?? 'пользователь'}</Text>
            <div style={{ marginTop: 8 }}>
              <button
                className="ant-btn ant-btn-primary ant-btn-lg"
                onClick={() => {
                  if (onLoginSuccess) {
                    onLoginSuccess()
                  } else if (typeof window !== 'undefined') {
                    window.location.href = '/repositories'
                  }
                }}
                style={{ width: '100%' }}
                type="button"
              >
                Перейти в панель управления
              </button>
            </div>
          </Flex>
        ) : (
          <Flex vertical align="center" gap="middle">
            <LoginButton showMockButton={true} size="large" />
            <Text style={{ fontSize: 12 }} type="secondary">
              Авторизуясь через GitHub, вы предоставляете доступ к чтению профиля и репозиториев
            </Text>
          </Flex>
        )}
      </Card>
    </Layout>
  )
}
