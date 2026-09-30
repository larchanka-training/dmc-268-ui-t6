import { Button, Card, Empty, Flex, Select, Space, Tag, Typography } from 'antd'
import { useState, type FC } from 'react'
import { Link } from 'react-router'

import type { RunAction, RunSession, RunStatus } from '../../entities/run'
import { RunInspector } from '../../widgets/run-inspector'

const { Title, Text } = Typography

export interface RunsPageProps {
  onNavigate?: (path: string) => void
  runSessions?: RunSession[]
  runActions?: RunAction[]
}

const statusColorMap: Record<RunStatus, string> = {
  queued: 'default',
  running: 'processing',
  publishing: 'warning',
  succeeded: 'success',
  failed: 'error',
  cancelled: 'default',
  skipped: 'default',
}

export const RunsPage: FC<RunsPageProps> = ({ runSessions = [], runActions = [] }) => {
  const [selectedRunId, setSelectedRunId] = useState<string>(
    runSessions[3]?.id ?? runSessions[0]?.id ?? '',
  )

  const currentRun = runSessions.find((r) => r.id === selectedRunId) ?? runSessions[0]

  return (
    <Flex vertical gap="large">
      <Card>
        <Flex align="center" justify="space-between" wrap="wrap" gap="middle">
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Инспектор прогонов AI Review
            </Title>
            <Text type="secondary">
              Просмотр трейса выполнения, шагов агента и вызовов инструментов
            </Text>
          </div>

          {runSessions.length > 0 ? (
            <Space>
              <Text strong>Выбрать прогон:</Text>
              <Select
                onChange={(val) => {
                  setSelectedRunId(val)
                }}
                options={runSessions.map((r) => ({
                  value: r.id,
                  label: (
                    <Space>
                      <Tag color={statusColorMap[r.status]}>{r.status}</Tag>
                      <span>
                        PR #{r.pullRequest.number}: {r.pullRequest.title}
                      </span>
                    </Space>
                  ),
                }))}
                style={{ minWidth: 320 }}
                value={currentRun?.id}
              />
              {currentRun ? (
                <Link to={`/runs/${currentRun.id}`}>
                  <Button type="primary">Экран PR</Button>
                </Link>
              ) : null}
            </Space>
          ) : null}
        </Flex>
      </Card>

      {currentRun ? (
        <RunInspector actions={runActions} now={new Date()} run={currentRun} />
      ) : (
        <Card>
          <Empty description="Нет доступных прогонов для инспекции" />
        </Card>
      )}
    </Flex>
  )
}
