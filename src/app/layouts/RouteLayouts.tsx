import { Button, Flex, Result } from 'antd'
import { Suspense, type FC } from 'react'
import { Navigate, Outlet, useLocation, useNavigate, useRouteError } from 'react-router'

import { useAuthStore, saveAuthReturnTo } from '../../features/auth'
import { PageLoading } from '../../shared/ui'
import { useTranslation } from '../../shared/i18n'
import { AppLayout } from '../../widgets/app-layout'
import styles from './RouteLayouts.module.css'

export const PageFallback: FC = () => <PageLoading />

export const RouteErrorFallback: FC = () => {
  const error = useRouteError()
  const { t } = useTranslation()
  const msg = error instanceof Error ? error.message : t('layout.routeError.fallbackMessage')

  return (
    <Flex align="center" className={styles.errorContainer} justify="center">
      <Result
        extra={
          <Button onClick={() => (window.location.href = '/repositories')} type="primary">
            {t('layout.routeError.backToDashboard')}
          </Button>
        }
        status="500"
        subTitle={msg}
        title={t('layout.routeError.title')}
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
    return <PageFallback />
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
