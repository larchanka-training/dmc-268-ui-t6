import { CheckCircleOutlined, RobotOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Flex, Layout, List, Typography, theme } from 'antd'
import type { FC } from 'react'

import { useMe } from '../../entities/user'
import { LoginButton, useAuthStore } from '../../features/auth'
import { ThemeToggle } from '../../features/theme'
import styles from './LoginPage.module.css'

const { Title, Paragraph, Text } = Typography

export interface LoginPageProps {
  onLoginSuccess?: () => void
}

export const LoginPage: FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { token } = theme.useToken()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const authError = useAuthStore((state) => state.error)
  const { data: user } = useMe(isAuthenticated)

  const features = [
    'Автоматический триггер ревью по метке ai-review и успешному CI',
    'Два движка анализа: быстрый DiffEngine и изолированный SandboxEngine',
    'Публикация концентрированных замечаний прямо в pull request',
    'Инспектор трейса действий LLM и интерактивный просмотрщик диффа',
  ]

  return (
    <Layout
      className={styles.container}
      style={{
        background: token.colorBgLayout,
      }}
    >
      <div className={styles.themeToggleWrapper}>
        <ThemeToggle size="large" />
      </div>

      <Card
        className={styles.card}
        style={{
          boxShadow: token.boxShadowSecondary,
          borderRadius: token.borderRadiusLG,
        }}
      >
        <Flex align="center" className={styles.headerFlex} gap="middle">
          <div
            className={styles.iconWrapper}
            style={{
              background: token.colorPrimaryBg,
            }}
          >
            <RobotOutlined
              className={styles.headerIcon}
              style={{ fontSize: token.fontSizeHeading1, color: token.colorPrimary }}
            />
          </div>
          <div>
            <Title className={styles.title} level={3}>
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
          className={styles.list}
          dataSource={features}
          renderItem={(item) => (
            <List.Item className={styles.listItem}>
              <Flex align="center" gap="small">
                <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                <Text className={styles.featureText} style={{ fontSize: token.fontSizeSM }}>
                  {item}
                </Text>
              </Flex>
            </List.Item>
          )}
        />

        {authError ? (
          <Alert className={styles.alert} showIcon title={authError} type="error" />
        ) : null}

        {isAuthenticated ? (
          <Flex vertical gap="small">
            <Text strong>Вы уже авторизованы как {user?.login ?? 'пользователь'}</Text>
            <div className={styles.buttonContainer}>
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
                Перейти в панель управления
              </Button>
            </div>
          </Flex>
        ) : (
          <Flex align="center" gap="middle" vertical>
            <LoginButton size="large" />
            <Text
              className={styles.helpText}
              style={{ fontSize: token.fontSizeSM }}
              type="secondary"
            >
              Вход выполняется через GitHub App бота-ревьюера
            </Text>
          </Flex>
        )}
      </Card>
    </Layout>
  )
}
