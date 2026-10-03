import { lazy, type FC } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { useAuthStore } from '../../features/auth'
import { PageFallback } from './RouteLayouts'

const LoginPage = lazy(() =>
  import('../../pages/login/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const CallbackPage = lazy(() =>
  import('../../pages/auth/CallbackPage').then((m) => ({ default: m.CallbackPage })),
)
const RepositoriesPage = lazy(() =>
  import('../../pages/repositories/RepositoriesPage').then((m) => ({
    default: m.RepositoriesPage,
  })),
)
const RunsPage = lazy(() =>
  import('../../pages/runs/RunsPage').then((m) => ({ default: m.RunsPage })),
)
const RunDetailPage = lazy(() =>
  import('../../pages/runs/RunDetailPage').then((m) => ({ default: m.RunDetailPage })),
)

export const RoutedRepositoriesPage: FC = () => {
  return <RepositoriesPage />
}

export const RoutedRunsPage: FC = () => {
  return <RunsPage />
}

export const RoutedRunDetailPage: FC = () => {
  return <RunDetailPage />
}

export const RoutedLoginPage: FC = () => {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const isLoading = useAuthStore((state) => state.isLoading)

  if (!isInitialized || isLoading) {
    return <PageFallback />
  }

  if (isAuthenticated) {
    return <Navigate replace to="/repositories" />
  }

  return (
    <LoginPage
      onLoginSuccess={() => {
        void navigate('/repositories', { replace: true })
      }}
    />
  )
}

export const RoutedCallbackPage: FC = () => {
  const navigate = useNavigate()

  return (
    <CallbackPage
      onBackToLogin={() => {
        void navigate('/login', { replace: true })
      }}
      onError={() => {
        void navigate('/login', { replace: true })
      }}
      onSuccess={() => {
        void navigate('/repositories', { replace: true })
      }}
    />
  )
}
