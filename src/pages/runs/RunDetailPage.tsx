import { ArrowLeftOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Empty, Flex, Spin, Typography } from 'antd'
import type { FC } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { expandContext, fetchRunFileSlice, useRunDiff } from '../../entities/diff'
import type { FileDiff } from '../../entities/diff'
import { useRunActions, useRunDetail } from '../../entities/run'
import { useRunComments } from '../../entities/review'
import { contextChunkLimit, RunDiff, type ContextGap } from '../../widgets/diff-viewer'
import { RunControls, RunInspector } from '../../widgets/run-inspector'
import { runDetailLoadMessage, runDiffLoadMessage } from './lib/runLoadErrors'

const { Title, Text } = Typography

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
      if (!runId) {
        return
      }
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
    <Flex data-testid="run-detail-page" gap="large" vertical>
      <Card>
        <Flex align="flex-start" gap="middle" vertical>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => {
              void navigate('/runs')
            }}
            type="default"
          >
            К списку прогонов
          </Button>
          <div>
            <Title level={4} style={{ marginTop: 0 }}>
              Прогон PR #{run.pullRequest.number}
            </Title>
            <Text type="secondary">Метаданные прогона, лог действий, дифф и замечания AI</Text>
          </div>
        </Flex>
      </Card>

      <Card title="Сессия ревью">
        {actionsQuery.isLoading ? (
          <Spin />
        ) : (
          <RunInspector
            actions={actions}
            headerExtra={
              <div style={{ marginBottom: 12 }}>
                <RunControls run={run} />
              </div>
            }
            now={now}
            run={run}
            severityCounts={run.severityCounts}
            verdict={run.verdict}
          />
        )}
      </Card>

      {loadError ? <Text type="danger">{loadError}</Text> : null}

      {showDiffLoadError ? (
        <Alert
          data-testid="run-detail-diff-error"
          showIcon
          title={runDiffLoadMessage(diffQuery.error)}
          type="error"
        />
      ) : diffQuery.isPending && diffFiles === undefined ? (
        <Flex align="center" justify="center" style={{ minHeight: 120 }}>
          <Spin />
        </Flex>
      ) : (
        <RunDiff
          comments={comments}
          files={displayFiles}
          findings={Array.isArray(run.findings) ? run.findings : []}
          onLoadMore={run.summaryOnly ? undefined : handleLoadMore}
          summaryOnly={run.summaryOnly}
        />
      )}
    </Flex>
  )
}

export const RunDetailPage: FC = () => {
  const { runId } = useParams<{ runId: string }>()
  if (!runId) {
    return <Empty description="Не указан id прогона" />
  }
  return <RunDetailPageContent key={runId} runId={runId} />
}
