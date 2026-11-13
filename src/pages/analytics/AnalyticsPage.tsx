import { Alert, Button, Empty, Select, Spin } from 'antd'
import type { JSX, ReactNode } from 'react'
import { useHref, useLinkClickHandler } from 'react-router'

import { useMetricsSummary, type MetricsSummary } from '../../entities/metrics'
import { useRepositories } from '../../entities/repository'
import { useAnalyticsFilterParams } from '../../features/analytics-filter'
import { formatDuration, formatNumber, formatUsd, useTranslation } from '../../shared/i18n'
import { DataTable, ErrorBoundary, PageHeader, Segmented } from '../../shared/ui'
import styles from './AnalyticsPage.module.css'
import { DurationByDay } from './ui/DurationByDay'
import { FindingsByDay } from './ui/FindingsByDay'
import { MetricTooltip } from './ui/MetricTooltip'
import { TodayBudget } from './ui/TodayBudget'

function finishedRuns(summary: MetricsSummary): number {
  const counts = summary.totals.runsByStatus
  return counts.succeeded + counts.failed + counts.cancelled + counts.skipped
}

function Tile(props: { label: string; value: string; tooltip: string }): JSX.Element {
  return (
    <MetricTooltip title={props.tooltip}>
      <div
        aria-label={`${props.label}: ${props.value}`}
        className={styles.tile}
        role="group"
        tabIndex={0}
      >
        <dt>{props.label}</dt>
        <dd>{props.value}</dd>
      </div>
    </MetricTooltip>
  )
}

function LinkButton(props: { to: string; children: ReactNode }): JSX.Element {
  const href = useHref(props.to)
  const handleClick = useLinkClickHandler<HTMLAnchorElement | HTMLButtonElement>(props.to)
  return (
    <Button href={href} onClick={handleClick}>
      {props.children}
    </Button>
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
        <Empty
          description={<span className={styles.emptyText}>{t('analytics.empty')}</span>}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <LinkButton to="/repositories">{t('analytics.goToRepositories')}</LinkButton>
        </Empty>
      ) : null}

      {summary !== undefined && !periodEmpty ? (
        <>
          <dl className={styles.tiles}>
            <Tile
              label={`${t('analytics.runs')}: ${t('analytics.statusSucceeded')}`}
              tooltip={t('analytics.runsSucceededTooltip')}
              value={String(summary.totals.runsByStatus.succeeded)}
            />
            <Tile
              label={`${t('analytics.runs')}: ${t('analytics.statusFailed')}`}
              tooltip={t('analytics.runsFailedTooltip')}
              value={String(summary.totals.runsByStatus.failed)}
            />
            <Tile
              label={`${t('analytics.runs')}: ${t('analytics.statusCancelled')}`}
              tooltip={t('analytics.runsCancelledTooltip')}
              value={String(summary.totals.runsByStatus.cancelled)}
            />
            <Tile
              label={`${t('analytics.runs')}: ${t('analytics.statusSkipped')}`}
              tooltip={t('analytics.runsSkippedTooltip')}
              value={String(summary.totals.runsByStatus.skipped)}
            />
            <Tile
              label={`${t('analytics.pulls')}: ${t('analytics.verdictBlocking')}`}
              tooltip={t('analytics.pullsBlockingTooltip')}
              value={String(summary.totals.pullsByVerdict.blocking)}
            />
            <Tile
              label={`${t('analytics.pulls')}: ${t('analytics.verdictAttention')}`}
              tooltip={t('analytics.pullsAttentionTooltip')}
              value={String(summary.totals.pullsByVerdict.attention)}
            />
            <Tile
              label={`${t('analytics.pulls')}: ${t('analytics.verdictClean')}`}
              tooltip={t('analytics.pullsCleanTooltip')}
              value={String(summary.totals.pullsByVerdict.clean)}
            />
            <Tile
              label={`${t('analytics.pulls')}: ${t('analytics.noVerdict')}`}
              tooltip={t('analytics.pullsNoVerdictTooltip')}
              value={String(summary.totals.pullsByVerdict.noVerdict)}
            />
            <Tile
              label={t('analytics.severityCritical')}
              tooltip={t('analytics.severityCriticalTooltip')}
              value={String(summary.totals.findingsBySeverity.critical)}
            />
            <Tile
              label={t('analytics.severityHigh')}
              tooltip={t('analytics.severityHighTooltip')}
              value={String(summary.totals.findingsBySeverity.high)}
            />
            <Tile
              label={t('analytics.severityMedium')}
              tooltip={t('analytics.severityMediumTooltip')}
              value={String(summary.totals.findingsBySeverity.medium)}
            />
            <Tile
              label={t('analytics.severityLow')}
              tooltip={t('analytics.severityLowTooltip')}
              value={String(summary.totals.findingsBySeverity.low)}
            />
            <Tile
              label={t('analytics.severityInfo')}
              tooltip={t('analytics.severityInfoTooltip')}
              value={String(summary.totals.findingsBySeverity.info)}
            />
            <Tile
              label={t('analytics.averageDuration')}
              tooltip={t('analytics.averageDurationTooltip')}
              value={
                summary.totals.succeededAverageDurationSeconds === 0
                  ? '—'
                  : formatDuration(summary.totals.succeededAverageDurationSeconds * 1000)
              }
            />
            <Tile
              label={t('analytics.tokensIn')}
              tooltip={t('analytics.tokensInTooltip')}
              value={formatNumber(summary.totals.tokensIn)}
            />
            <Tile
              label={t('analytics.tokensOut')}
              tooltip={t('analytics.tokensOutTooltip')}
              value={formatNumber(summary.totals.tokensOut)}
            />
            <Tile
              label={t('analytics.cost')}
              tooltip={t('analytics.costTooltip')}
              value={formatUsd(summary.totals.costUsd)}
            />
          </dl>
          <div className={styles.charts}>
            <ErrorBoundary>
              <FindingsByDay label={t('analytics.findingsByDay')} series={summary.series} />
            </ErrorBoundary>
            <ErrorBoundary>
              <DurationByDay label={t('analytics.durationByDay')} series={summary.series} />
            </ErrorBoundary>
          </div>
          <h2 id="analytics-daily-numbers">{t('analytics.dailyNumbers')}</h2>
          <DataTable
            aria-labelledby="analytics-daily-numbers"
            columns={[
              { title: t('analytics.day'), dataIndex: 'day', key: 'day' },
              {
                title: t('analytics.categorySecurity'),
                dataIndex: 'security',
                key: 'security',
              },
              { title: t('analytics.categoryBug'), dataIndex: 'bug', key: 'bug' },
              {
                title: t('analytics.categoryPerformance'),
                dataIndex: 'performance',
                key: 'performance',
              },
              { title: t('analytics.categoryStyle'), dataIndex: 'style', key: 'style' },
              {
                title: t('analytics.durationSeconds'),
                dataIndex: 'duration',
                key: 'duration',
              },
              { title: t('analytics.cost'), dataIndex: 'cost', key: 'cost' },
            ]}
            dataSource={summary.series.map((point) => ({
              key: point.day,
              day: point.day,
              security: point.findingsByCategory.security,
              bug: point.findingsByCategory.correctness,
              performance: point.findingsByCategory.performance,
              style: point.findingsByCategory.readability,
              duration:
                point.averageDurationSeconds === 0
                  ? '—'
                  : formatDuration(point.averageDurationSeconds * 1000),
              cost: formatUsd(point.costUsd),
            }))}
            pagination={false}
            rowKey="key"
          />
        </>
      ) : null}

      {summary !== undefined && summary.workspaces.length > 0 ? (
        <TodayBudget workspaces={summary.workspaces} />
      ) : null}
    </>
  )
}
