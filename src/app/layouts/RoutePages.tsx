import { useEffect, type FC } from 'react'
import { Navigate, useNavigate } from 'react-router'

import {
  useAuthStore,
  clearAuthReturnTo,
  consumeAuthReturnTo,
  peekAuthReturnTo,
} from '../../features/auth'
import { lazyRoute } from './lazyRoute'
import { PageFallback } from './RouteLayouts'

const LoginPage = lazyRoute(() =>
  import('../../pages/login/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const CallbackPage = lazyRoute(() =>
  import('../../pages/auth/CallbackPage').then((m) => ({ default: m.CallbackPage })),
)
const RepositoriesPage = lazyRoute(() =>
  import('../../pages/repositories/RepositoriesPage').then((m) => ({
    default: m.RepositoriesPage,
  })),
)
const RepositorySettingsPage = lazyRoute(() =>
  import('../../pages/repositories/RepositorySettingsPage').then((m) => ({
    default: m.RepositorySettingsPage,
  })),
)
const RunsPage = lazyRoute(() =>
  import('../../pages/runs/RunsPage').then((m) => ({ default: m.RunsPage })),
)
const RunDetailPage = lazyRoute(() =>
  import('../../pages/runs/RunDetailPage').then((m) => ({ default: m.RunDetailPage })),
)
const ReviewRedirect = lazyRoute(() =>
  import('../../pages/review/ReviewRedirect').then((m) => ({ default: m.ReviewRedirect })),
)
const AuditPage = lazyRoute(() =>
  import('../../pages/audit/AuditPage').then((m) => ({ default: m.AuditPage })),
)
const AnalyticsPage = lazyRoute(() =>
  import('../../pages/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
)
const PlaygroundPage = lazyRoute(() =>
  import('../../pages/playground/PlaygroundPage').then((m) => ({ default: m.PlaygroundPage })),
)
const WorkspaceSettingsPage = lazyRoute(() =>
  import('../../pages/settings/WorkspaceSettingsPage').then((m) => ({
    default: m.WorkspaceSettingsPage,
  })),
)

export const RoutedRepositoriesPage: FC = () => {
  return <RepositoriesPage />
}

export const RoutedRepositorySettingsPage: FC = () => {
  return <RepositorySettingsPage />
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

export const RoutedAuditPage: FC = () => {
  return <AuditPage />
}

export const RoutedAnalyticsPage: FC = () => {
  return <AnalyticsPage />
}

export const RoutedPlaygroundPage: FC = () => {
  return <PlaygroundPage />
}

export const RoutedWorkspaceSettingsPage: FC = () => {
  return <WorkspaceSettingsPage />
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
