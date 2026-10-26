import { i18n } from '../../../shared/i18n'

export function accessRefreshLoadingText(): string {
  return i18n.t('repositories.accessRefresh.loading')
}
export function accessRefreshTimeoutPrompt(): string {
  return i18n.t('repositories.accessRefresh.timeoutPrompt')
}
export function accessRefreshTimeoutActionText(): string {
  return i18n.t('repositories.accessRefresh.timeoutAction')
}

export function resolveAccessRefreshPresentation(
  status: 'idle' | 'waiting' | 'timedOut',
  refreshing: boolean,
) {
  if (status === 'timedOut') {
    return {
      kind: 'timedOut',
      announcement: i18n.t('repositories.accessRefresh.timeoutAnnouncement'),
    } as const
  }
  if (status === 'waiting' && refreshing) {
    return { kind: 'loading', announcement: accessRefreshLoadingText() } as const
  }
  return { kind: 'empty', announcement: '' } as const
}
