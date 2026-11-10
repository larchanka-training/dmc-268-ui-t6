import { Alert } from 'antd'
import { Component, type ReactNode } from 'react'

import { useTranslation } from '../../i18n'

export interface ErrorBoundaryProps {
  children: ReactNode
  /** What replaces the children after one of them throws while rendering. Default: the block stub. */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

function BlockFailed() {
  const { t } = useTranslation()

  return <Alert showIcon title={t('common.errors.blockFailed')} type="error" />
}

/**
 * Keeps an exception thrown while rendering its children inside them: the fallback takes their
 * place and the rest of the page keeps working. React itself reports the caught error to the
 * console. There is no reset: the stub asks to refresh the page. It is a class, the one in the app
 * (`.agents/rules/frontend.md` §4): React catches render errors only in a class component.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return this.props.fallback ?? <BlockFailed />
    }
    return this.props.children
  }
}
