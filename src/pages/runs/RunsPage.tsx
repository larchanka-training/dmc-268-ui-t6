import { ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Flex, Spin, Typography, type TableColumnsType } from 'antd'
import type { FC } from 'react'
import { Link, useNavigate } from 'react-router'

import { isActive, statusTone, useRunList, type RunSession } from '../../entities/run'
import { DataTable, PageHeader, Tag } from '../../shared/ui'
import styles from './RunsPage.module.css'

const { Text } = Typography

export const RunsPage: FC = () => {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useRunList()
  const runSessions = data?.items ?? []

  const columns: TableColumnsType<RunSession> = [
    {
      title: 'PR',
      key: 'pr',
      render: (_, run) => (
        <div className={styles.pullRequest}>
          <Link className={styles.runLink} to={`/runs/${run.id}`}>
            {`#${String(run.pullRequest.number)}`}
          </Link>
          <Text type="secondary">{run.pullRequest.title}</Text>
        </div>
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
        <Flex gap={8} wrap>
          <Tag pulse={isActive(run.status)} tone={statusTone(run.status)}>
            {run.status}
          </Tag>
          {isActive(run.status) ? <Tag variant="outline">в процессе</Tag> : null}
          {run.summaryOnly ? <Tag variant="outline">summary-only</Tag> : null}
        </Flex>
      ),
    },
    {
      title: 'Движок',
      dataIndex: 'engine',
      key: 'engine',
      render: (engine: string) => <Text type="secondary">{engine}</Text>,
    },
  ]

  return (
    <>
      <PageHeader
        actions={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              void refetch()
            }}
          >
            Обновить
          </Button>
        }
        description="Pull request'ы, по которым выполнялось или выполняется ревью"
        title="Прогоны"
      />

      {isLoading ? (
        <Flex align="center" className={styles.loading} justify="center">
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
        <DataTable<RunSession>
          columns={columns}
          dataSource={runSessions}
          locale={{ emptyText: 'Нет прогонов ревью' }}
          onRow={(run) => ({
            // The whole row opens the run for the mouse; the link in the first cell does it
            // for the keyboard and for "open in a new tab", and handles its own click.
            onClick: (event) => {
              if (event.target instanceof Element && event.target.closest('a') !== null) {
                return
              }
              void navigate(`/runs/${run.id}`)
            },
            style: { cursor: 'pointer' },
          })}
          rowKey="id"
        />
      ) : null}
    </>
  )
}
