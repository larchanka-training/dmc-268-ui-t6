import { Button, Flex, Result, Spin } from 'antd'
import { Suspense, type FC } from 'react'
import { Navigate, Outlet, useLocation, useNavigate, useRouteError } from 'react-router'

import { useAuthStore, saveAuthReturnTo } from '../../features/auth'
import { AppLayout } from '../../widgets/app-layout'
import styles from './RouteLayouts.module.css'

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
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const isInitialized = useAuthStore((state) => state.isInitialized)

  if (!isInitialized || isLoading) {
    return (
      <Flex align="center" className={styles.fullPageContainer} justify="center">
        <Spin size="large" />
      </Flex>
    )
  }

  if (!isAuthenticated) {
    saveAuthReturnTo(location.pathname, location.search)
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
