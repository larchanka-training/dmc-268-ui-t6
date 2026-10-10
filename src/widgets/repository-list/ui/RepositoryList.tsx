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
  theme,
} from 'antd'
import { useMemo, useState, type FC } from 'react'

import type {
  Repository,
  RepositoryEngine,
  ReviewEvent,
  UpdateRepositoryInput,
  WaitForCi,
} from '../../../entities/repository'
import { GITHUB_APP_SLUG, GITHUB_CLIENT_ID, isMockMode } from '../../../shared/config/env'
import { safeHttpUrl } from '../../../shared/lib/safeHttpUrl'
import styles from './RepositoryList.module.css'

const { Text, Link } = Typography

const SYNC_ACCESS_TOOLTIP =
  'Повторная авторизация через GitHub обновит список ваших установок GitHub App. Откроется GitHub, затем вы вернётесь на эту страницу'

const REFRESH_TOOLTIP = 'После добавления репозиториев в установку нажмите «Обновить доступ»'

const APP_INSTALL_TOOLTIP =
  'После установки GitHub App на новый аккаунт нажмите «Обновить доступ»: откроется GitHub, затем вы вернётесь сюда. Репозиторий может появиться с задержкой до нескольких минут'

const EMPTY_REPOSITORIES_DESCRIPTION =
  'Репозитории ещё не подключены. После установки GitHub App на новый аккаунт или добавления репозиториев в уже подключённую установку нажмите «Обновить доступ»: откроется GitHub, затем вы вернётесь сюда. Репозиторий может появиться с задержкой до нескольких минут.'

export interface RepositoryListProps {
  repositories: Repository[]
  loading?: boolean
  refreshing?: boolean
  updatingRepoIds?: string[] | ReadonlySet<string>
  onToggleEnabled?: (id: string, enabled: boolean) => Promise<void> | void
  onUpdateRepository?: (id: string, patch: UpdateRepositoryInput) => Promise<void> | void
  onRefresh?: () => void
  onSyncAccess: () => void
}

export const RepositoryList: FC<RepositoryListProps> = ({
  repositories,
  loading = false,
  refreshing = false,
  updatingRepoIds,
  onToggleEnabled,
  onUpdateRepository,
  onRefresh,
  onSyncAccess,
}) => {
  const { token } = theme.useToken()
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active'>('all')
  const [editingRepo, setEditingRepo] = useState<Repository | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<UpdateRepositoryInput>()

  const isAppConfigured = Boolean(GITHUB_APP_SLUG)
  const isSyncConfigured = Boolean(GITHUB_CLIENT_ID || isMockMode())
  const appInstallUrl = isAppConfigured
    ? `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`
    : undefined

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
      href={appInstallUrl}
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
      href={appInstallUrl}
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
        const href = safeHttpUrl(record.url)
        return (
          <Flex align="center" gap="small">
            <GithubOutlined style={{ fontSize: token.fontSizeLG }} />
            <Flex vertical>
              {href ? (
                <Link href={href} rel="noopener noreferrer" strong target="_blank">
                  {fullName}
                </Link>
              ) : (
                <Text strong>{fullName}</Text>
              )}
              <Text style={{ fontSize: token.fontSizeSM }} type="secondary">
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
      render: (engine: RepositoryEngine) => {
        // deep (SandboxEngine) is phase 3; the api returns only fast until then.
        const labels: Record<RepositoryEngine, string> = { fast: 'DiffEngine (быстрый)' }
        return <Tag color="cyan">{labels[engine]}</Tag>
      },
    },
    {
      title: 'Ожидание CI',
      dataIndex: 'waitForCi',
      key: 'waitForCi',
      render: (wait: WaitForCi) => {
        const config: Record<WaitForCi, { color: string; label: string }> = {
          auto: { color: 'blue', label: 'Авто' },
          always: { color: 'green', label: 'Всегда' },
          never: { color: 'default', label: 'Никогда' },
        }
        const item = config[wait]
        return <Tag color={item.color}>{item.label}</Tag>
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
        <Tag color={event === 'REQUEST_CHANGES' ? 'volcano' : 'blue'}>
          {event === 'REQUEST_CHANGES' ? 'Запрос изменений' : 'Комментарий'}
        </Tag>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: Repository) => {
        const updating = updatingRepoIds
          ? Array.isArray(updatingRepoIds)
            ? updatingRepoIds.includes(record.id)
            : updatingRepoIds.has(record.id)
          : false
        return (
          <Switch
            aria-label={`Ревью для ${record.fullName}`}
            checked={enabled}
            checkedChildren="Активен"
            disabled={updating}
            loading={updating}
            onChange={(checked) => void onToggleEnabled?.(record.id, checked)}
            unCheckedChildren="Пауза"
          />
        )
      },
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
          <Tooltip title={REFRESH_TOOLTIP}>
            <Button icon={<ReloadOutlined />} loading={refreshing} onClick={onRefresh}>
              Обновить
            </Button>
          </Tooltip>
          <Tooltip
            title={
              isSyncConfigured
                ? SYNC_ACCESS_TOOLTIP
                : 'Обновление доступа недоступно: не задан VITE_GITHUB_CLIENT_ID'
            }
          >
            <span>
              <Button disabled={!isSyncConfigured} onClick={onSyncAccess}>
                Обновить доступ
              </Button>
            </span>
          </Tooltip>
          {!isAppConfigured ? (
            <Tooltip title="Инсталляция недоступна: не задан VITE_GITHUB_APP_SLUG">
              <span>{connectButton}</span>
            </Tooltip>
          ) : (
            <Tooltip title={APP_INSTALL_TOOLTIP}>{connectButton}</Tooltip>
          )}
        </Space>
      }
      title={
        <Flex align="center" gap="small">
          <span>Подключенные репозитории</span>
          <Badge
            count={repositories.length}
            overflowCount={999}
            style={{ backgroundColor: token.colorPrimary }}
          />
        </Flex>
      }
    >
      <Flex className={styles.toolbar} gap="middle" justify="space-between" wrap="wrap">
        <Input
          allowClear
          className={styles.searchInput}
          onChange={(e) => {
            setSearch(e.target.value)
          }}
          placeholder="Поиск по названию..."
          prefix={<SearchOutlined />}
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
        <Empty description={EMPTY_REPOSITORIES_DESCRIPTION} image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <Space>
            {!isAppConfigured ? (
              <Tooltip title="Инсталляция недоступна: не задан VITE_GITHUB_APP_SLUG">
                <span>{emptyConnectButton}</span>
              </Tooltip>
            ) : (
              <Tooltip title={APP_INSTALL_TOOLTIP}>{emptyConnectButton}</Tooltip>
            )}
          </Space>
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

          <Form.Item
            extra="SandboxEngine (глубокий анализ в песочнице) появится в фазе 3"
            label="Движок анализа"
            name="defaultEngine"
          >
            <Select
              options={[{ value: 'fast', label: 'DiffEngine (быстрый синтаксический анализ)' }]}
            />
          </Form.Item>

          <Form.Item label="Ожидание CI" name="waitForCi" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'auto', label: 'Авто (ожидать CI при наличии проверок)' },
                { value: 'always', label: 'Всегда (всегда ждать успешного CI)' },
                { value: 'never', label: 'Никогда (запускать ревью без ожидания CI)' },
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
            <InputNumber className={styles.fullWidth} max={10} min={1} precision={0} />
          </Form.Item>

          <Form.Item label="Публикация вердикта" name="reviewEvent" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'COMMENT', label: 'Комментарий (при любых замечаниях)' },
                {
                  value: 'REQUEST_CHANGES',
                  label: 'Запрос изменений (при блокирующих)',
                },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
