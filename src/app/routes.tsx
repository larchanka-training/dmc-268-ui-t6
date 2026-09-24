/* eslint-disable react-refresh/only-export-components */
import { Navigate, createBrowserRouter, useNavigate } from 'react-router'

import { CallbackPage } from '../pages/auth/CallbackPage'
import { LoginPage } from '../pages/login/LoginPage'
import { RepositoriesPage } from '../pages/repositories/RepositoriesPage'
import { ReviewPage } from '../pages/review/ReviewPage'
import { RunsPage } from '../pages/runs/RunsPage'

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
    />
  )
}

function RoutedReviewPage() {
  const navigate = useNavigate()
  return (
    <ReviewPage
      onNavigate={(path) => {
        void navigate(path)
      }}
    />
  )
}

function RoutedLoginPage() {
  const navigate = useNavigate()
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
    path: '/',
    element: <Navigate replace to="/repositories" />,
  },
  {
    path: '/login',
    element: <RoutedLoginPage />,
  },
  {
    path: '/auth/callback',
    element: <RoutedCallbackPage />,
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
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
