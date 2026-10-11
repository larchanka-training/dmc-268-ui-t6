import { RightOutlined } from '@ant-design/icons'
import { Alert, Breadcrumb, Card, Empty, Flex, Spin, Typography } from 'antd'
import type { FC } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { expandContext, fetchRunFileSlice, useRunDiff } from '../../entities/diff'
import type { FileDiff } from '../../entities/diff'
import { useRunActions, useRunDetail } from '../../entities/run'
import { useRunComments } from '../../entities/review'
import { PageHeader } from '../../shared/ui'
import { contextChunkLimit, RunDiff, type ContextGap } from '../../widgets/diff-viewer'
import { ActionTree, RunControls, RunHeader } from '../../widgets/run-inspector'
import { runDetailLoadMessage, runDiffLoadMessage } from './lib/runLoadErrors'
import styles from './RunDetailPage.module.css'

const { Text } = Typography

function mergeFileLists(base: FileDiff[], overrides: Map<string, FileDiff>): FileDiff[] {
  return base.map((file) => overrides.get(file.filename) ?? file)
}

const RunDetailPageContent: FC<{ runId: string }> = ({ runId }) => {
  const navigate = useNavigate()
  const now = new Date()
  const runQuery = useRunDetail(runId)
  const diffQuery = useRunDiff(runId)
  const actionsQuery = useRunActions(runId)
  const commentsQuery = useRunComments(runId)
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
          setLoadError('Не удалось дочитать контекст файла')
        })
        .finally(() => {
          if (inflightGapKeyRef.current === gapKey) {
            inflightGapKeyRef.current = null
          }
        })
    },
    [runId],
  )

  const displayFiles = useMemo(() => {
    const base = diffQuery.data ?? []
    return mergeFileLists(base, expandedFiles)
  }, [diffQuery.data, expandedFiles])

  if (runQuery.isLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin size="large" />
      </Flex>
    )
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
    return <Empty description="Прогон не найден" data-testid="run-detail-run-error" />
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
          {
            title: (
              <a
                href="/runs"
                onClick={(event) => {
                  event.preventDefault()
                  void navigate('/runs')
                }}
              >
                Прогоны
              </a>
            ),
          },
          { title: `PR #${String(run.pullRequest.number)}` },
        ]}
        separator={<RightOutlined />}
      />

      <PageHeader
        actions={<RunControls run={run} />}
        description={run.pullRequest.title}
        title={`Прогон PR #${String(run.pullRequest.number)}`}
      />

      <Card>
        <RunHeader
          droppedFindings={run.droppedFindings}
          now={now}
          run={run}
          severityCounts={run.severityCounts}
          verdict={run.verdict}
        />
      </Card>

      <div className={styles.columns}>
        <section aria-label="Сессия ревью" className={styles.trace}>
          <h2 className={styles.label}>Сессия ревью</h2>
          {actionsQuery.isLoading ? <Spin /> : <ActionTree actions={actions} runId={run.id} />}
        </section>

        <section aria-label="Дифф и замечания" className={styles.diff}>
          <h2 className={styles.label}>Дифф и замечания</h2>
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
              files={displayFiles}
              findings={Array.isArray(run.findings) ? run.findings : []}
              onLoadMore={run.summaryOnly ? undefined : handleLoadMore}
              summaryOnly={run.summaryOnly}
            />
          )}
        </section>
      </div>
    </div>
  )
}

export const RunDetailPage: FC = () => {
  const { runId } = useParams<{ runId: string }>()
  if (!runId) {
    return <Empty description="Не указан id прогона" />
  }
  return <RunDetailPageContent key={runId} runId={runId} />
}
