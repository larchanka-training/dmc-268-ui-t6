import { GithubOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Badge,
  Button,
  Card,
  Empty,
  Flex,
  Input,
  Radio,
  type RadioChangeEvent,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd'
import { useMemo, useState, type FC } from 'react'

import type { Repository } from '../../../entities/repository'

const { Text, Link } = Typography

export interface RepositoryListProps {
  repositories: Repository[]
  loading?: boolean
  onToggleEnabled?: (id: string, enabled: boolean) => void
  onConnectClick?: () => void
  onRefresh?: () => void
}

export const RepositoryList: FC<RepositoryListProps> = ({
  repositories,
  loading = false,
  onToggleEnabled,
  onConnectClick,
  onRefresh,
}) => {
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active'>('all')

  const filteredRepositories = useMemo(() => {
    return repositories.filter((repo) => {
      const matchesSearch =
        repo.fullName.toLowerCase().includes(search.toLowerCase()) ||
        repo.name.toLowerCase().includes(search.toLowerCase())
      const matchesFilter = filterActive === 'all' || repo.enabled
      return matchesSearch && matchesFilter
    })
  }, [repositories, search, filterActive])

  const columns = [
    {
      title: 'Репозиторий',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (fullName: string, record: Repository) => (
        <Flex align="center" gap="small">
          <GithubOutlined style={{ fontSize: 18 }} />
          <Flex vertical>
            <Link href={record.url} rel="noopener noreferrer" strong target="_blank">
              {fullName}
            </Link>
            <Text style={{ fontSize: 12 }} type="secondary">
              ID: {record.id}
            </Text>
          </Flex>
        </Flex>
      ),
    },
    {
      title: 'Ветка',
      dataIndex: 'defaultBranch',
      key: 'defaultBranch',
      render: (branch: string) => <Tag color="blue">{branch}</Tag>,
    },
    {
      title: 'Движок',
      dataIndex: 'defaultEngine',
      key: 'defaultEngine',
      render: (engine: string) => (
        <Tag color={engine === 'deep' ? 'purple' : 'cyan'}>
          {engine === 'deep' ? 'SandboxEngine (Deep)' : 'DiffEngine (Fast)'}
        </Tag>
      ),
    },
    {
      title: 'CI Gate',
      dataIndex: 'waitForCi',
      key: 'waitForCi',
      render: (wait: boolean) =>
        wait ? (
          <Badge status="success" text="Ждёт CI" />
        ) : (
          <Badge status="default" text="Без ожидания" />
        ),
    },
    {
      title: 'Лимит замечаний',
      dataIndex: 'maxComments',
      key: 'maxComments',
      render: (count: number) => <Text>{count}</Text>,
    },
    {
      title: 'Статус',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: Repository) => (
        <Switch
          checked={enabled}
          checkedChildren="Активен"
          onChange={(checked) => onToggleEnabled?.(record.id, checked)}
          unCheckedChildren="Пауза"
        />
      ),
    },
  ]

  return (
    <Card
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            Обновить
          </Button>
          <Button icon={<PlusOutlined />} onClick={onConnectClick} type="primary">
            Подключить репозиторий
          </Button>
        </Space>
      }
      title={
        <Flex align="center" gap="small">
          <span>Подключенные репозитории</span>
          <Badge
            count={repositories.length}
            overflowCount={999}
            style={{ backgroundColor: '#1677ff' }}
          />
        </Flex>
      }
    >
      <Flex gap="middle" justify="space-between" style={{ marginBottom: 16 }} wrap="wrap">
        <Input
          allowClear
          onChange={(e) => {
            setSearch(e.target.value)
          }}
          placeholder="Поиск по названию..."
          prefix={<SearchOutlined />}
          style={{ maxWidth: 320 }}
          value={search}
        />
        <Radio.Group
          onChange={(e: RadioChangeEvent) => {
            setFilterActive(e.target.value as 'all' | 'active')
          }}
          value={filterActive}
        >
          <Radio.Button value="all">Все</Radio.Button>
          <Radio.Button value="active">Только активные</Radio.Button>
        </Radio.Group>
      </Flex>

      {filteredRepositories.length === 0 && !loading ? (
        <Empty description="Репозитории не найдены" image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <Button icon={<PlusOutlined />} onClick={onConnectClick} type="primary">
            Подключить репозиторий
          </Button>
        </Empty>
      ) : (
        <Table<Repository>
          columns={columns}
          dataSource={filteredRepositories}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          rowKey="id"
        />
      )}
    </Card>
  )
}
