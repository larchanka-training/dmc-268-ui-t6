import { RightOutlined } from '@ant-design/icons'
import { Alert, Breadcrumb, Empty, Flex, Spin, Typography } from 'antd'
import type { FC } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { expandContext, fetchRunFileSlice, useRunDiff } from '../../entities/diff'
import type { FileDiff } from '../../entities/diff'
import { isActive, useRunActions, useRunDetail } from '../../entities/run'
import { useRunComments } from '../../entities/review'
import { useFindingFiltersParams } from '../../features/finding-filters'
import { useTranslation } from '../../shared/i18n'
import { PageHeader, PageLoading } from '../../shared/ui'
import { contextChunkLimit, RunDiff, type ContextGap } from '../../widgets/diff-viewer'
import { RunControls, RunInspector } from '../../widgets/run-inspector'
import { runDetailLoadMessage, runDiffLoadMessage } from './lib/runLoadErrors'
import styles from './RunDetailPage.module.css'

const { Text } = Typography

function mergeFileLists(base: FileDiff[], overrides: Map<string, FileDiff>): FileDiff[] {
  return base.map((file) => overrides.get(file.filename) ?? file)
}

const RunDetailPageContent: FC<{ runId: string }> = ({ runId }) => {
  const { t } = useTranslation()
  const now = new Date()
  const runQuery = useRunDetail(runId)
  const diffQuery = useRunDiff(runId)
  const actionsQuery = useRunActions(runId, runQuery.data?.status)
  const commentsQuery = useRunComments(runId)
  const { filters, setFilters, setQuery, resetFilters, navigationKey, subscribeToNavigation } =
    useFindingFiltersParams()
  const [expandedFiles, setExpandedFiles] = useState<Map<string, FileDiff>>(() => new Map())
  const [loadError, setLoadError] = useState<string | null>(null)
  const inflightGapKeyRef = useRef<string | null>(null)

  const handleLoadMore = useCallback(
    (file: FileDiff, gap: ContextGap) => {
      const gapKey = `${file.filename}:${String(gap.startLine)}`
      if (inflightGapKeyRef.current === gapKey) {
        return
      }
      inflightGapKeyRef.current = gapKey
      setLoadError(null)
      void fetchRunFileSlice(runId, {
        path: file.filename,
        offset: gap.startLine - 1,
        limit: contextChunkLimit(gap.count),
      })
        .then((slice) => {
          setExpandedFiles((prev) => {
            const current = prev.get(file.filename) ?? file
            const next = new Map(prev)
            next.set(file.filename, expandContext(current, slice))
            return next
          })
        })
        .catch(() => {
          setLoadError(t('runs.detail.contextLoadFailed'))
        })
        .finally(() => {
          if (inflightGapKeyRef.current === gapKey) {
            inflightGapKeyRef.current = null
          }
        })
    },
    [runId, t],
  )

  const displayFiles = useMemo(() => {
    const base = diffQuery.data ?? []
    return mergeFileLists(base, expandedFiles)
  }, [diffQuery.data, expandedFiles])

  if (runQuery.isLoading) {
    return <PageLoading />
  }

  if (runQuery.isError) {
    return (
      <Empty
        description={runDetailLoadMessage(runQuery.error)}
        data-testid="run-detail-run-error"
      />
    )
  }

  if (!runQuery.data) {
    return <Empty description={t('runs.detail.notFound')} data-testid="run-detail-run-error" />
  }

  const run = runQuery.data
  const actions = actionsQuery.data ?? []
  const comments = commentsQuery.data ?? []
  const diffFiles = diffQuery.data
  const showDiffLoadError = diffQuery.isError && diffFiles === undefined

  return (
    <div className={styles.page} data-testid="run-detail-page">
      <Breadcrumb
        items={[
          { title: <Link to="/runs">{t('runs.title')}</Link> },
          { title: t('runs.detail.breadcrumb', { number: run.pullRequest.number }) },
        ]}
        separator={<RightOutlined />}
      />

      <PageHeader
        actions={<RunControls run={run} />}
        description={run.pullRequest.title}
        title={t('runs.detail.title', { number: run.pullRequest.number })}
      />

      <RunInspector
        actions={actions}
        actionsLoading={actionsQuery.isLoading && actionsQuery.errorUpdateCount === 0}
        actionsUnavailable={actionsQuery.errorUpdateCount > 0 && !actionsQuery.data}
        budget={run.budget}
        droppedFindings={run.droppedFindings}
        now={now}
        run={run}
        severityCounts={run.severityCounts}
        verdict={run.verdict}
      >
        <section aria-label={t('runs.detail.diffAndFindings')} className={styles.diff}>
          <h2 className={styles.label}>{t('runs.detail.diffAndFindings')}</h2>
          {loadError ? <Text type="danger">{loadError}</Text> : null}

          {showDiffLoadError ? (
            <Alert
              data-testid="run-detail-diff-error"
              showIcon
              title={runDiffLoadMessage(diffQuery.error)}
              type="error"
            />
          ) : diffQuery.isPending && diffFiles === undefined ? (
            <Flex align="center" className={styles.loading} justify="center">
              <Spin />
            </Flex>
          ) : (
            <RunDiff
              budgetFiles={diffFiles}
              comments={comments}
              commentsPending={commentsQuery.isPending}
              files={displayFiles}
              filters={filters}
              filtersNavigationKey={navigationKey}
              subscribeToFiltersNavigation={subscribeToNavigation}
              findings={Array.isArray(run.findings) ? run.findings : []}
              findingsPending={isActive(run.status)}
              onFiltersChange={setFilters}
              onFiltersQueryChange={setQuery}
              onFiltersReset={resetFilters}
              onLoadMore={run.summaryOnly ? undefined : handleLoadMore}
              summaryOnly={run.summaryOnly}
            />
          )}
        </section>
      </RunInspector>
    </div>
  )
}

export const RunDetailPage: FC = () => {
  const { runId } = useParams<{ runId: string }>()
  const { t } = useTranslation()
  if (!runId) {
    return <Empty description={t('runs.detail.noId')} />
  }
  return <RunDetailPageContent key={runId} runId={runId} />
}
