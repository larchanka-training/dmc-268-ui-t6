import {
  BranchesOutlined,
  GithubOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Spin,
  Switch,
  Tooltip,
  Typography,
  type TableColumnsType,
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
import { DataTable, IconSettings, PageHeader, Segmented, Tag } from '../../../shared/ui'
import {
  ACCESS_REFRESH_LOADING_TEXT,
  ACCESS_REFRESH_TIMEOUT_ACTION_TEXT,
  ACCESS_REFRESH_TIMEOUT_PROMPT,
  resolveAccessRefreshPresentation,
} from '../lib/accessRefreshPresentation'
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
  accessRefreshStatus?: 'idle' | 'waiting' | 'timedOut'
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
  accessRefreshStatus = 'idle',
  updatingRepoIds,
  onToggleEnabled,
  onUpdateRepository,
  onRefresh,
  onSyncAccess,
}) => {
  const accessRefreshPresentation = resolveAccessRefreshPresentation(
    accessRefreshStatus,
    refreshing,
  )
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

  const WAIT_FOR_CI_LABEL: Record<WaitForCi, string> = {
    auto: 'Авто',
    always: 'Всегда',
    never: 'Никогда',
  }
  // deep (SandboxEngine) is phase 3; the api returns only fast until then.
  const ENGINE_LABEL: Record<RepositoryEngine, string> = { fast: 'DiffEngine (быстрый)' }
  const activeCount = repositories.filter((r) => r.enabled).length

  const columns: TableColumnsType<Repository> = [
    {
      title: 'Репозиторий',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (fullName: string, record: Repository) => {
        const shortName = fullName.split('/')[1] ?? fullName
        const href = safeHttpUrl(record.url)
        return (
          <Flex align="center" gap={10}>
            <GithubOutlined className={styles.repoIcon} />
            <div className={styles.repoName}>
              {href ? (
                <Link href={href} rel="noopener noreferrer" strong target="_blank">
                  {fullName}
                </Link>
              ) : (
                <Text strong>{fullName}</Text>
              )}
              <Text className={styles.repoMeta} type="secondary">
                {shortName} • {record.id}
              </Text>
            </div>
          </Flex>
        )
      },
    },
    {
      title: 'Ветка',
      dataIndex: 'defaultBranch',
      key: 'defaultBranch',
      render: (branch: string) => (
        <Tag icon={<BranchesOutlined />} variant="outline">
          {branch}
        </Tag>
      ),
    },
    {
      title: 'Движок',
      dataIndex: 'defaultEngine',
      key: 'defaultEngine',
      render: (engine: RepositoryEngine) => <Text type="secondary">{ENGINE_LABEL[engine]}</Text>,
    },
    {
      title: 'Ожидание CI',
      dataIndex: 'waitForCi',
      key: 'waitForCi',
      render: (wait: WaitForCi) => <Text type="secondary">{WAIT_FOR_CI_LABEL[wait]}</Text>,
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
      render: (event: ReviewEvent) =>
        event === 'REQUEST_CHANGES' ? (
          <Tag tone="high" variant="solid">
            Запрос изменений
          </Tag>
        ) : (
          <Tag>Комментарий</Tag>
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
          <Flex align="center" gap={10}>
            <Switch
              aria-label={`Ревью для ${record.fullName}`}
              checked={enabled}
              disabled={updating}
              loading={updating}
              onChange={(checked) => void onToggleEnabled?.(record.id, checked)}
            />
            <Text className={styles.switchLabel} type="secondary">
              {enabled ? 'Активен' : 'Пауза'}
            </Text>
          </Flex>
        )
      },
    },
    {
      title: '',
      key: 'actions',
      onHeaderCell: () => ({ 'aria-label': 'Настройки' }),
      align: 'right',
      render: (_: unknown, record: Repository) => (
        <Button
          aria-label={`Настройки ${record.fullName}`}
          icon={<IconSettings height={14} width={14} />}
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
    <div className={styles.root}>
      <PageHeader
        actions={
          <>
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
          </>
        }
        description={
          repositories.length > 0
            ? `Подключено: ${String(repositories.length)}, ревью включено в ${String(activeCount)}`
            : 'Пока ничего не подключено'
        }
        title="Репозитории"
      />

      {accessRefreshStatus !== 'idle' ? (
        <div className={styles.accessRefreshStatus}>
          {accessRefreshPresentation.kind === 'loading' ? (
            <span className={styles.accessRefreshLoading}>
              <Spin aria-hidden="true" size="small" />
              <Text type="secondary">{ACCESS_REFRESH_LOADING_TEXT}</Text>
            </span>
          ) : accessRefreshPresentation.kind === 'timedOut' ? (
            <>
              <Text type="secondary">{ACCESS_REFRESH_TIMEOUT_PROMPT}</Text>
              <Button loading={refreshing} onClick={onRefresh} size="small">
                {ACCESS_REFRESH_TIMEOUT_ACTION_TEXT}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {repositories.length === 0 && !loading ? (
        <div className={styles.empty}>
          <Empty
            description={<span className={styles.emptyText}>{EMPTY_REPOSITORIES_DESCRIPTION}</span>}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {!isAppConfigured ? (
              <Tooltip title="Инсталляция недоступна: не задан VITE_GITHUB_APP_SLUG">
                <span>{emptyConnectButton}</span>
              </Tooltip>
            ) : (
              <Tooltip title={APP_INSTALL_TOOLTIP}>{emptyConnectButton}</Tooltip>
            )}
          </Empty>
        </div>
      ) : (
        <>
          <Flex align="center" gap="middle" justify="space-between" wrap="wrap">
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

            <Segmented<'all' | 'active'>
              aria-label="Фильтр репозиториев"
              onChange={setFilterActive}
              options={[
                { value: 'all', label: `Все (${String(repositories.length)})` },
                { value: 'active', label: `Активные (${String(activeCount)})` },
              ]}
              value={filterActive}
            />
          </Flex>

          <DataTable<Repository>
            columns={columns}
            dataSource={filteredRepositories}
            loading={loading}
            locale={{ emptyText: 'Ничего не найдено' }}
            pagination={{ pageSize: 10 }}
            rowKey="id"
            scroll={{ x: 900 }}
          />
        </>
      )}

      <Modal
        cancelText="Отмена"
        confirmLoading={saving}
        okText="Сохранить"
        onCancel={() => {
          setEditingRepo(null)
        }}
        onOk={() => void handleSaveSettings()}
        open={Boolean(editingRepo)}
        title={`Настройки репозитория ${editingRepo?.fullName ?? ''}`}
        width={520}
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
    </div>
  )
}
