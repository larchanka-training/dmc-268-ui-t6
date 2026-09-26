import { Card, Flex, Select, Space, Tag, Typography } from 'antd'
import { useState, type FC } from 'react'

import { MOCK_NOW, mockRunActions, mockRunSessions } from '../../app/mocks/app-state'
import { AppLayout } from '../../widgets/app-layout'
import { RunInspector } from '../../widgets/run-inspector'

const { Title, Text } = Typography

export interface RunsPageProps {
  onNavigate?: (path: string) => void
}

export const RunsPage: FC<RunsPageProps> = ({ onNavigate }) => {
  const [selectedRunId, setSelectedRunId] = useState<string>(
    mockRunSessions[3]?.id ?? mockRunSessions[0]?.id ?? '',
  )

  const currentRun = mockRunSessions.find((r) => r.id === selectedRunId) ?? mockRunSessions[0]

  const statusColorMap: Record<string, string> = {
    queued: 'default',
    running: 'processing',
    publishing: 'warning',
    completed: 'success',
    failed: 'error',
    cancelled: 'default',
    skipped: 'default',
  }

  return (
    <AppLayout currentPath="/runs" onNavigate={onNavigate}>
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

            <Space>
              <Text strong>Выбрать прогон:</Text>
              <Select
                onChange={(val) => {
                  setSelectedRunId(val)
                }}
                options={mockRunSessions.map((r) => ({
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
                value={selectedRunId}
              />
            </Space>
          </Flex>
        </Card>

        {currentRun ? (
          <RunInspector actions={mockRunActions} now={new Date(MOCK_NOW)} run={currentRun} />
        ) : null}
      </Flex>
    </AppLayout>
  )
}
