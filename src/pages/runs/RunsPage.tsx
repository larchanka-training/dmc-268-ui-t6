import { Alert, Button, Card, Flex, Space, Spin, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { FC } from 'react'
import { useNavigate } from 'react-router'

import { statusColor, type RunSession, type RunStatus } from '../../entities/run'
import { useRunList } from '../../entities/run/api'

const { Title, Text } = Typography

const ACTIVE_STATUSES: RunStatus[] = ['queued', 'running', 'publishing']

export const RunsPage: FC = () => {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useRunList()
  const runSessions = data?.items ?? []

  const columns: ColumnsType<RunSession> = [
    {
      title: 'PR',
      key: 'pr',
      render: (_, run) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{`#${String(run.pullRequest.number)}`}</Text>
          <Text type="secondary">{run.pullRequest.title}</Text>
        </Space>
      ),
    },
    {
      title: 'Репозиторий',
      dataIndex: ['pullRequest', 'repo'],
      key: 'repo',
    },
    {
      title: 'Статус ревью',
      key: 'status',
      render: (_, run) => (
        <Space wrap>
          <Tag color={statusColor(run.status)}>{run.status}</Tag>
          {ACTIVE_STATUSES.some((s) => s === run.status) ? (
            <Tag color="processing">в процессе</Tag>
          ) : null}
          {run.summaryOnly ? <Tag>summary-only</Tag> : null}
        </Space>
      ),
    },
    {
      title: 'Движок',
      dataIndex: 'engine',
      key: 'engine',
    },
  ]

  return (
    <Flex vertical gap="large">
      <Card>
        <Flex align="center" justify="space-between" wrap="wrap" gap="middle">
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Прогоны AI Review
            </Title>
            <Text type="secondary">
              Pull request'ы, по которым выполнялось или выполняется ревью (GET /api/runs)
            </Text>
          </div>
          <Button
            onClick={() => {
              void refetch()
            }}
          >
            Обновить
          </Button>
        </Flex>
      </Card>

      {isLoading ? (
        <Flex align="center" justify="center" style={{ minHeight: 160 }}>
          <Spin />
        </Flex>
      ) : null}

      {isError ? (
        <Alert
          description={error instanceof Error ? error.message : 'Не удалось загрузить список'}
          showIcon
          title="Ошибка загрузки"
          type="error"
        />
      ) : null}

      {!isLoading && !isError ? (
        <Card title="Pull request'ы с ревью">
          <Table<RunSession>
            columns={columns}
            dataSource={runSessions}
            locale={{ emptyText: 'Нет прогонов ревью' }}
            onRow={(run) => ({
              onClick: () => {
                void navigate(`/runs/${run.id}`)
              },
              style: { cursor: 'pointer' },
            })}
            pagination={false}
            rowKey="id"
            size="middle"
          />
        </Card>
      ) : null}
    </Flex>
  )
}
