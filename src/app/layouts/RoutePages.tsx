import { lazy, useEffect, type FC } from 'react'
import { Navigate, useNavigate } from 'react-router'

import {
  useAuthStore,
  clearAuthReturnTo,
  consumeAuthReturnTo,
  peekAuthReturnTo,
} from '../../features/auth'
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
const ReviewRedirect = lazy(() =>
  import('../../pages/review/ReviewRedirect').then((m) => ({ default: m.ReviewRedirect })),
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

export const RoutedReviewRedirectPage: FC = () => {
  return <ReviewRedirect />
}

export const RoutedLoginPage: FC = () => {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const isLoading = useAuthStore((state) => state.isLoading)
  const isRedirecting = isInitialized && !isLoading && isAuthenticated

  // The target is only peeked while rendering (React StrictMode renders and runs effects twice);
  // the key is removed after the redirect has been issued.
  useEffect(() => {
    if (isRedirecting) {
      clearAuthReturnTo()
    }
  }, [isRedirecting])

  if (!isInitialized || isLoading) {
    return <PageFallback />
  }

  if (isAuthenticated) {
    return <Navigate replace to={peekAuthReturnTo('/repositories')} />
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
        void navigate(consumeAuthReturnTo('/repositories'), { replace: true })
      }}
    />
  )
}
