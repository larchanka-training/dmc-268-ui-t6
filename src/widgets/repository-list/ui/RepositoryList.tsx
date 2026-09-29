import {
  GithubOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import {
  Badge,
  Button,
  Card,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  type RadioChangeEvent,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { useMemo, useState, type FC } from 'react'

import type {
  Repository,
  RepositoryEngine,
  ReviewEvent,
  UpdateRepositoryInput,
  WaitForCi,
} from '../../../entities/repository'
import { GITHUB_APP_SLUG } from '../../../shared/config/env'

const { Text, Link } = Typography

export interface RepositoryListProps {
  repositories: Repository[]
  loading?: boolean
  onToggleEnabled?: (id: string, enabled: boolean) => void
  onUpdateRepository?: (id: string, patch: UpdateRepositoryInput) => Promise<void> | void
  onRefresh?: () => void
}

export const RepositoryList: FC<RepositoryListProps> = ({
  repositories,
  loading = false,
  onToggleEnabled,
  onUpdateRepository,
  onRefresh,
}) => {
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active'>('all')
  const [editingRepo, setEditingRepo] = useState<Repository | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<UpdateRepositoryInput>()

  const isAppConfigured = Boolean(GITHUB_APP_SLUG)
  const appInstallUrl = isAppConfigured
    ? `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`
    : 'https://github.com/apps'

  const filteredRepositories = useMemo(() => {
    return repositories.filter((repo) => {
      const shortName = repo.fullName.split('/')[1] ?? repo.fullName
      const matchesSearch =
        repo.fullName.toLowerCase().includes(search.toLowerCase()) ||
        shortName.toLowerCase().includes(search.toLowerCase())
      const matchesFilter = filterActive === 'all' || repo.enabled
      return matchesSearch && matchesFilter
    })
  }, [repositories, search, filterActive])

  const openSettings = (repo: Repository) => {
    setEditingRepo(repo)
    form.setFieldsValue({
      enabled: repo.enabled,
      defaultEngine: repo.defaultEngine,
      waitForCi: repo.waitForCi,
      maxComments: repo.maxComments,
      reviewEvent: repo.reviewEvent,
    })
  }

  const handleSaveSettings = async () => {
    if (!editingRepo) return
    try {
      const values = await form.validateFields()
      const patch: UpdateRepositoryInput = {}
      if (values.enabled !== undefined && values.enabled !== editingRepo.enabled) {
        patch.enabled = values.enabled
      }
      if (
        values.defaultEngine !== undefined &&
        values.defaultEngine !== editingRepo.defaultEngine
      ) {
        patch.defaultEngine = values.defaultEngine
      }
      if (values.waitForCi !== undefined && values.waitForCi !== editingRepo.waitForCi) {
        patch.waitForCi = values.waitForCi
      }
      if (values.maxComments !== undefined && values.maxComments !== editingRepo.maxComments) {
        patch.maxComments = values.maxComments
      }
      if (values.reviewEvent !== undefined && values.reviewEvent !== editingRepo.reviewEvent) {
        patch.reviewEvent = values.reviewEvent
      }

      if (Object.keys(patch).length > 0) {
        setSaving(true)
        await onUpdateRepository?.(editingRepo.id, patch)
      }
      setEditingRepo(null)
    } catch {
      // Keep modal open if validation or update fails
    } finally {
      setSaving(false)
    }
  }

  const connectButton = (
    <Button
      disabled={!isAppConfigured}
      href={isAppConfigured ? appInstallUrl : undefined}
      icon={<PlusOutlined />}
      rel="noopener noreferrer"
      target="_blank"
      type="primary"
    >
      Подключить репозиторий
    </Button>
  )

  const emptyConnectButton = (
    <Button
      disabled={!isAppConfigured}
      href={isAppConfigured ? appInstallUrl : undefined}
      icon={<GithubOutlined />}
      rel="noopener noreferrer"
      target="_blank"
      type="primary"
    >
      Установить GitHub App
    </Button>
  )

  const columns = [
    {
      title: 'Репозиторий',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (fullName: string, record: Repository) => {
        const shortName = fullName.split('/')[1] ?? fullName
        return (
          <Flex align="center" gap="small">
            <GithubOutlined style={{ fontSize: 18 }} />
            <Flex vertical>
              <Link href={record.url} rel="noopener noreferrer" strong target="_blank">
                {fullName}
              </Link>
              <Text style={{ fontSize: 12 }} type="secondary">
                {shortName} • {record.id}
              </Text>
            </Flex>
          </Flex>
        )
      },
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
      render: (engine: RepositoryEngine) => (
        <Tag color={engine === 'deep' ? 'purple' : 'cyan'}>
          {engine === 'deep' ? 'SandboxEngine (Deep)' : 'DiffEngine (Fast)'}
        </Tag>
      ),
    },
    {
      title: 'CI Gate',
      dataIndex: 'waitForCi',
      key: 'waitForCi',
      render: (wait: WaitForCi) => {
        switch (wait) {
          case 'auto':
            return <Badge status="processing" text="Auto" />
          case 'always':
            return <Badge status="success" text="Always" />
          case 'never':
            return <Badge status="default" text="Never" />
          default:
            return <Badge status="default" text={wait} />
        }
      },
    },
    {
      title: 'Лимит',
      dataIndex: 'maxComments',
      key: 'maxComments',
      render: (count: number) => <Text>{count} комм.</Text>,
    },
    {
      title: 'Вердикт',
      dataIndex: 'reviewEvent',
      key: 'reviewEvent',
      render: (event: ReviewEvent) => (
        <Tag color={event === 'REQUEST_CHANGES' ? 'volcano' : 'blue'}>{event}</Tag>
      ),
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
    {
      title: 'Настройки',
      key: 'actions',
      render: (_: unknown, record: Repository) => (
        <Button
          aria-label={`Настройки ${record.fullName}`}
          icon={<SettingOutlined />}
          onClick={() => {
            openSettings(record)
          }}
          size="small"
        >
          Настроить
        </Button>
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
          {!isAppConfigured ? (
            <Tooltip title="Инсталляция недоступна: не задан VITE_GITHUB_APP_SLUG">
              <span>{connectButton}</span>
            </Tooltip>
          ) : (
            connectButton
          )}
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
          <Radio.Button value="all">Все ({repositories.length})</Radio.Button>
          <Radio.Button value="active">
            Активные ({repositories.filter((r) => r.enabled).length})
          </Radio.Button>
        </Radio.Group>
      </Flex>

      {repositories.length === 0 && !loading ? (
        <Empty
          description="Репозитории ещё не подключены. Установите GitHub App для предоставления доступа к вашим репозиториям."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          {!isAppConfigured ? (
            <Tooltip title="Инсталляция недоступна: не задан VITE_GITHUB_APP_SLUG">
              <span>{emptyConnectButton}</span>
            </Tooltip>
          ) : (
            emptyConnectButton
          )}
        </Empty>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredRepositories}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          rowKey="id"
          scroll={{ x: 800 }}
        />
      )}

      <Modal
        confirmLoading={saving}
        okText="Сохранить"
        onCancel={() => {
          setEditingRepo(null)
        }}
        onOk={() => void handleSaveSettings()}
        open={Boolean(editingRepo)}
        title={`Настройки репозитория ${editingRepo?.fullName ?? ''}`}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Активность ревью" name="enabled" valuePropName="checked">
            <Switch checkedChildren="Активен" unCheckedChildren="Пауза" />
          </Form.Item>

          <Form.Item label="Движок анализа" name="defaultEngine" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'fast', label: 'DiffEngine (быстрый синтаксический анализ)' },
                { value: 'deep', label: 'SandboxEngine (глубокий анализ в песочнице)' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Ожидание CI (waitForCi)" name="waitForCi" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'auto', label: 'Auto (ожидать CI, если настроен)' },
                { value: 'always', label: 'Always (всегда ждать успешного CI)' },
                { value: 'never', label: 'Never (запускать ревью без ожидания CI)' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Лимит замечаний (1..10)"
            name="maxComments"
            rules={[
              { required: true, message: 'Укажите лимит' },
              { type: 'number', min: 1, max: 10, message: 'Число от 1 до 10' },
            ]}
          >
            <InputNumber max={10} min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Публикация вердикта (reviewEvent)"
            name="reviewEvent"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'COMMENT', label: 'COMMENT (обычный комментарий ревью)' },
                {
                  value: 'REQUEST_CHANGES',
                  label: 'REQUEST_CHANGES (блокирующее ревью при замечаниях)',
                },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
