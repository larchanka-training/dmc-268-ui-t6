import { Suspense } from 'react'
import { Navigate, createBrowserRouter } from 'react-router'

import { ReviewRedirect } from '../pages/review/ReviewRedirect'
import {
  AppLayoutRoute,
  PageFallback,
  ProtectedLayout,
  RouteErrorFallback,
  RoutedCallbackPage,
  RoutedLoginPage,
  RoutedRepositoriesPage,
  RoutedRunDetailPage,
  RoutedRunsPage,
} from './layouts'

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
                  path: '/runs/:runId',
                  element: <RoutedRunDetailPage />,
                },
                {
                  path: '/review',
                  element: <ReviewRedirect />,
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

export function createAppRouter() {
  return createBrowserRouter(createRoutes())
}
