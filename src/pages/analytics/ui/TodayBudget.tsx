import { Alert } from 'antd'
import type { JSX } from 'react'

import type { MetricsSummary } from '../../../entities/metrics'
import { useTranslation } from '../../../shared/i18n'

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`
}

/** Today's workspace budgets. `paused` is the flag from the API, not a comparison of the amounts. */
export function TodayBudget(props: { workspaces: MetricsSummary['workspaces'] }): JSX.Element {
  const { workspaces } = props
  const { t } = useTranslation()
  return (
    <section aria-label={t('analytics.budgetTitle')}>
      <h2>{t('analytics.budgetTitle')}</h2>
      {workspaces.map((workspace) => (
        <div key={workspace.name}>
          <p>{workspace.name}</p>
          <p>
            {t('analytics.spent')}: {formatUsd(workspace.spentTodayUsd)}
          </p>
          <p>
            {t('analytics.limit')}:{' '}
            {workspace.dailyBudgetUsd === 0
              ? t('analytics.limitUnset')
              : formatUsd(workspace.dailyBudgetUsd)}
          </p>
          {workspace.paused ? (
            <Alert showIcon title={t('analytics.paused')} type="warning" />
          ) : null}
        </div>
      ))}
    </section>
  )
}
