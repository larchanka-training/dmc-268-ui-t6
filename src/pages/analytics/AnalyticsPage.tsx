import { Alert, Button, Empty, Select, Spin } from 'antd'
import type { JSX } from 'react'

import { useMetricsSummary, type MetricsSummary } from '../../entities/metrics'
import { useRepositories } from '../../entities/repository'
import { useAnalyticsFilterParams } from '../../features/analytics-filter'
import { formatDuration, useTranslation } from '../../shared/i18n'
import { PageHeader, Segmented } from '../../shared/ui'
import styles from './AnalyticsPage.module.css'
import { DurationByDay } from './ui/DurationByDay'
import { FindingsByDay } from './ui/FindingsByDay'
import { TodayBudget } from './ui/TodayBudget'

function formatUsd(value: number): string {
  if (value === 0) {
    return '$0'
  }
  return `$${value.toFixed(2)}`
}

function finishedRuns(summary: MetricsSummary): number {
  const counts = summary.runsByStatus
  return counts.succeeded + counts.failed + counts.cancelled + counts.skipped
}

function Tile(props: { label: string; value: string }): JSX.Element {
  return (
    <div className={styles.tile}>
      <dt>{props.label}</dt>
      <dd>{props.value}</dd>
    </div>
  )
}

export function AnalyticsPage(): JSX.Element {
  const { t } = useTranslation()
  const { filter, setFilter } = useAnalyticsFilterParams()
  const summaryQuery = useMetricsSummary({ range: filter.range, repo: filter.repo })
  const repositoriesQuery = useRepositories()
  const summary = summaryQuery.data
  const periodEmpty = summary !== undefined && finishedRuns(summary) === 0

  return (
    <>
      <PageHeader description={t('analytics.description')} title={t('analytics.title')} />
      <div className={styles.toolbar}>
        <Segmented
          aria-label={t('analytics.period')}
          onChange={(value) => {
            if (value === '7d' || value === '30d') {
              setFilter({ ...filter, range: value })
            }
          }}
          options={[
            { label: t('analytics.days7'), value: '7d' },
            { label: t('analytics.days30'), value: '30d' },
          ]}
          value={filter.range}
        />
        <Select
          aria-label={t('analytics.repository')}
          onChange={(value: string) => {
            setFilter({ ...filter, repo: value === 'all' ? undefined : value })
          }}
          options={[
            { value: 'all', label: t('analytics.allRepositories') },
            ...(repositoriesQuery.data ?? []).map((repository) => ({
              value: repository.fullName,
              label: repository.fullName,
            })),
          ]}
          value={filter.repo ?? 'all'}
        />
        {filter.repo !== undefined ? (
          <Button
            onClick={() => {
              setFilter({ range: filter.range })
            }}
          >
            {t('analytics.resetRepository')}
          </Button>
        ) : null}
      </div>

      {summaryQuery.isPending ? <Spin /> : null}

      {summaryQuery.isError && summary === undefined ? (
        <Alert
          action={
            <Button
              onClick={() => {
                void summaryQuery.refetch()
              }}
              size="small"
            >
              {t('analytics.retry')}
            </Button>
          }
          showIcon
          title={t('analytics.loadFailedTitle')}
          type="error"
        />
      ) : null}

      {summary !== undefined && periodEmpty ? (
        <Empty description={t('analytics.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : null}

      {summary !== undefined && !periodEmpty ? (
        <>
          <dl className={styles.tiles}>
            <Tile
              label={`${t('analytics.runs')}: succeeded`}
              value={String(summary.runsByStatus.succeeded)}
            />
            <Tile
              label={`${t('analytics.runs')}: failed`}
              value={String(summary.runsByStatus.failed)}
            />
            <Tile
              label={`${t('analytics.runs')}: cancelled`}
              value={String(summary.runsByStatus.cancelled)}
            />
            <Tile
              label={`${t('analytics.runs')}: skipped`}
              value={String(summary.runsByStatus.skipped)}
            />
            <Tile
              label={`${t('analytics.pulls')}: blocking`}
              value={String(summary.pullsByVerdict.blocking)}
            />
            <Tile
              label={`${t('analytics.pulls')}: attention`}
              value={String(summary.pullsByVerdict.attention)}
            />
            <Tile
              label={`${t('analytics.pulls')}: clean`}
              value={String(summary.pullsByVerdict.clean)}
            />
            <Tile
              label={`${t('analytics.pulls')}: ${t('analytics.noVerdict')}`}
              value={String(summary.pullsByVerdict.noVerdict)}
            />
            <Tile label="critical" value={String(summary.findingsBySeverity.critical)} />
            <Tile label="high" value={String(summary.findingsBySeverity.high)} />
            <Tile label="medium" value={String(summary.findingsBySeverity.medium)} />
            <Tile label="low" value={String(summary.findingsBySeverity.low)} />
            <Tile label="info" value={String(summary.findingsBySeverity.info)} />
            <Tile
              label={t('analytics.averageDuration')}
              value={
                summary.averageDurationMs === null ? '—' : formatDuration(summary.averageDurationMs)
              }
            />
            <Tile label={t('analytics.tokensIn')} value={String(summary.tokensIn)} />
            <Tile label={t('analytics.tokensOut')} value={String(summary.tokensOut)} />
            <Tile label={t('analytics.cost')} value={formatUsd(summary.costUsd)} />
          </dl>
          <div className={styles.charts}>
            <FindingsByDay label={t('analytics.findingsByDay')} series={summary.series} />
            <DurationByDay label={t('analytics.durationByDay')} series={summary.series} />
          </div>
          <table className={styles.numbers}>
            <caption>{t('analytics.dailyNumbers')}</caption>
            <thead>
              <tr>
                <th>{t('analytics.day')}</th>
                <th>Security</th>
                <th>Bug</th>
                <th>Performance</th>
                <th>Style</th>
                <th>{t('analytics.durationMs')}</th>
                <th>{t('analytics.cost')}</th>
              </tr>
            </thead>
            <tbody>
              {summary.series.map((point) => (
                <tr key={point.day}>
                  <td>{point.day}</td>
                  <td>{point.findings.security}</td>
                  <td>{point.findings.correctness}</td>
                  <td>{point.findings.performance}</td>
                  <td>{point.findings.readability}</td>
                  <td>{point.averageDurationMs}</td>
                  <td>{formatUsd(point.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {summary !== undefined && summary.workspaces.length > 0 ? (
        <TodayBudget workspaces={summary.workspaces} />
      ) : null}
    </>
  )
}
