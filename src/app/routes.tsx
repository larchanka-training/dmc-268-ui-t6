/* eslint-disable react-refresh/only-export-components */
import { Button, Flex, Result, Spin } from 'antd'
import { Suspense, lazy, useEffect, useState, type FC } from 'react'
import {
  Navigate,
  Outlet,
  createBrowserRouter,
  useLocation,
  useNavigate,
  useRouteError,
} from 'react-router'

import { useAuthStore } from '../features/auth'
import { USE_MOCKS } from '../shared/config/env'
import { AppLayout } from '../widgets/app-layout'
import {
  mockFileDiffs,
  mockReviewComments,
  mockRunActions,
  mockRunSessions,
} from './mocks/app-state'

const LoginPage = lazy(() =>
  import('../pages/login/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const CallbackPage = lazy(() =>
  import('../pages/auth/CallbackPage').then((m) => ({ default: m.CallbackPage })),
)
const RepositoriesPage = lazy(() =>
  import('../pages/repositories/RepositoriesPage').then((m) => ({ default: m.RepositoriesPage })),
)
const RunsPage = lazy(() => import('../pages/runs/RunsPage').then((m) => ({ default: m.RunsPage })))
const ReviewPage = lazy(() =>
  import('../pages/review/ReviewPage').then((m) => ({ default: m.ReviewPage })),
)

export const PageFallback: FC = () => (
  <Flex align="center" justify="center" style={{ minHeight: '60vh' }}>
    <Spin size="large" />
  </Flex>
)

export const RouteErrorFallback: FC = () => {
  const error = useRouteError()
  const msg = error instanceof Error ? error.message : 'Непредвиденная ошибка приложения'

  return (
    <Flex align="center" justify="center" style={{ minHeight: '100vh', padding: 24 }}>
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
      <Flex align="center" justify="center" style={{ minHeight: '100vh' }}>
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

function RoutedRepositoriesPage() {
  return <RepositoriesPage />
}

function RoutedRunsPage() {
  return (
    <RunsPage
      runActions={USE_MOCKS ? mockRunActions : []}
      runSessions={USE_MOCKS ? mockRunSessions : []}
    />
  )
}

function RoutedReviewPage() {
  return (
    <ReviewPage
      fileDiffs={USE_MOCKS ? mockFileDiffs : []}
      reviewComments={USE_MOCKS ? mockReviewComments : []}
    />
  )
}

function RoutedLoginPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate replace to="/repositories" />
  }

  return (
    <LoginPage
      onLoginSuccess={() => {
        void navigate('/repositories')
      }}
    />
  )
}

function RoutedCallbackPage() {
  const navigate = useNavigate()
  return (
    <CallbackPage
      onBackToLogin={() => {
        void navigate('/login')
      }}
      onError={() => {
        void navigate('/login')
      }}
      onSuccess={() => {
        void navigate('/repositories')
      }}
    />
  )
}

export function createRoutes() {
  return [
    {
      errorElement: <RouteErrorFallback />,
      children: [
        {
          path: '/login',
          element: (
            <Suspense fallback={<PageFallback />}>
              <RoutedLoginPage />
            </Suspense>
          ),
        },
        {
          path: '/auth/callback',
          element: (
            <Suspense fallback={<PageFallback />}>
              <RoutedCallbackPage />
            </Suspense>
          ),
        },
        {
          element: <ProtectedLayout />,
          children: [
            {
              path: '/',
              element: <Navigate replace to="/repositories" />,
            },
            {
              element: <AppLayoutRoute />,
              children: [
                {
                  path: '/repositories',
                  element: <RoutedRepositoriesPage />,
                },
                {
                  path: '/runs',
                  element: <RoutedRunsPage />,
                },
                {
                  path: '/review',
                  element: <RoutedReviewPage />,
                },
              ],
            },
            {
              path: '*',
              element: <Navigate replace to="/repositories" />,
            },
          ],
        },
      ],
    },
  ]
}

export const routes = createRoutes()

export function createAppRouter() {
  return createBrowserRouter(createRoutes())
}
