import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Flex, Spin, Typography } from 'antd'
import type { FC } from 'react'
import { useNavigate, useParams } from 'react-router'

import { useRunDiff } from '../../entities/diff/api'
import { useRunDetail } from '../../entities/run/api'
import { RunDiff } from '../../widgets/diff-viewer'
import { RunHeader } from '../../widgets/run-inspector'

const { Title, Text } = Typography

export const RunDetailPage: FC = () => {
  const navigate = useNavigate()
  const { runId } = useParams<{ runId: string }>()
  const now = new Date()
  const runQuery = useRunDetail(runId)
  const diffQuery = useRunDiff(runId)

  if (!runId) {
    return <Empty description="Не указан id прогона" />
  }

  if (runQuery.isLoading || diffQuery.isLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin size="large" />
      </Flex>
    )
  }

  if (runQuery.isError || !runQuery.data) {
    return <Empty description="Прогон не найден или ошибка загрузки" />
  }

  const run = runQuery.data
  const files = diffQuery.data ?? []

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
            <Text type="secondary">Метаданные прогона, дифф и замечания AI</Text>
          </div>
          <div style={{ width: '100%' }}>
            <RunHeader
              now={now}
              run={run}
              severityCounts={run.severityCounts}
              verdict={run.verdict}
            />
          </div>
        </Flex>
      </Card>
      <RunDiff files={files} findings={run.findings} summaryOnly={run.summaryOnly} />
    </Flex>
  )
}
