import { Button, Flex, Result, Spin } from 'antd'
import { Suspense, useEffect, useState, type FC } from 'react'
import { Navigate, Outlet, useLocation, useNavigate, useRouteError } from 'react-router'

import { useAuthStore } from '../../features/auth'
import { AppLayout } from '../../widgets/app-layout'
import styles from '../routes.module.css'

export const PageFallback: FC = () => (
  <Flex align="center" className={styles.fallbackContainer} justify="center">
    <Spin size="large" />
  </Flex>
)

export const RouteErrorFallback: FC = () => {
  const error = useRouteError()
  const msg = error instanceof Error ? error.message : 'Непредвиденная ошибка приложения'

  return (
    <Flex align="center" className={styles.errorContainer} justify="center">
      <Result
        extra={
          <Button onClick={() => (window.location.href = '/repositories')} type="primary">
            Вернуться в панель управления
          </Button>
        }
        status="500"
        subTitle={msg}
        title="Произошла непредвиденная ошибка"
      />
    </Flex>
  )
}

export const ProtectedLayout: FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const initAuth = useAuthStore((state) => state.initAuth)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let ignore = false
    async function checkSession() {
      await initAuth()
      if (!ignore) {
        setInitialized(true)
      }
    }
    void checkSession()
    return () => {
      ignore = true
    }
  }, [initAuth])

  if (!initialized || isLoading) {
    return (
      <Flex align="center" className={styles.fullPageContainer} justify="center">
        <Spin size="large" />
      </Flex>
    )
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />
  }

  return <Outlet />
}

export const AppLayoutRoute: FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <AppLayout
      currentPath={location.pathname}
      onNavigate={(path) => {
        void navigate(path)
      }}
    >
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </AppLayout>
  )
}
