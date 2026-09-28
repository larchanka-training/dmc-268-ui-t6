/* eslint-disable react-refresh/only-export-components */
import { Flex, Spin } from 'antd'
import { useEffect, useState, type FC } from 'react'
import { Navigate, Outlet, createBrowserRouter, useNavigate } from 'react-router'

import { useAuthStore } from '../features/auth'
import { CallbackPage } from '../pages/auth/CallbackPage'
import { LoginPage } from '../pages/login/LoginPage'
import { RepositoriesPage } from '../pages/repositories/RepositoriesPage'
import { ReviewPage } from '../pages/review/ReviewPage'
import { RunsPage } from '../pages/runs/RunsPage'
import {
  mockFileDiffs,
  mockReviewComments,
  mockRunActions,
  mockRunSessions,
} from './mocks/app-state'

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

function RoutedRepositoriesPage() {
  const navigate = useNavigate()
  return (
    <RepositoriesPage
      onNavigate={(path) => {
        void navigate(path)
      }}
    />
  )
}

function RoutedRunsPage() {
  const navigate = useNavigate()
  return (
    <RunsPage
      onNavigate={(path) => {
        void navigate(path)
      }}
      runActions={mockRunActions}
      runSessions={mockRunSessions}
    />
  )
}

function RoutedReviewPage() {
  const navigate = useNavigate()
  return (
    <ReviewPage
      fileDiffs={mockFileDiffs}
      onNavigate={(path) => {
        void navigate(path)
      }}
      reviewComments={mockReviewComments}
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
      onError={() => {
        void navigate('/login')
      }}
      onSuccess={() => {
        void navigate('/repositories')
      }}
    />
  )
}

export const routes = [
  {
    path: '/login',
    element: <RoutedLoginPage />,
  },
  {
    path: '/auth/callback',
    element: <RoutedCallbackPage />,
  },
  {
    element: <ProtectedLayout />,
    children: [
      {
        path: '/',
        element: <Navigate replace to="/repositories" />,
      },
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
      {
        path: '*',
        element: <Navigate replace to="/repositories" />,
      },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
