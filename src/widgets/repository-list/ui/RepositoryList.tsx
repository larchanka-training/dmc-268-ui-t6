import {
  BranchesOutlined,
  DownOutlined,
  GithubOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Dropdown,
  Empty,
  Flex,
  Input,
  Segmented,
  Spin,
  Switch,
  Tooltip,
  Typography,
  type MenuProps,
  type TableColumnsType,
} from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState, type FC, type MouseEvent } from 'react'

import type {
  Repository,
  RepositoryEngine,
  ReviewEvent,
  WaitForCi,
} from '../../../entities/repository'
import {
  ENABLE_AUTO_REVIEW_LABEL,
  KEEP_AUTO_REVIEW_OFF_LABEL,
} from '../../../features/repository-settings'
import { GITHUB_APP_SLUG, GITHUB_CLIENT_ID, isMockMode } from '../../../shared/config/env'
import { safeHttpUrl } from '../../../shared/lib/safeHttpUrl'
import { DataTable, IconSettings, PageHeader, Tag } from '../../../shared/ui'
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
  /** Address of the settings page of a repository; «Настроить» is a link to it. */
  settingsHref: (repository: Repository) => string
  /**
   * Opens the settings page without a page load. When nobody handles navigation, or the click
   * carries a modifier key, the link simply works (new tab, copy address).
   */
  onOpenSettings?: (repository: Repository) => void
  onRefresh?: () => void
  onSyncAccess: () => void
}

const CHOICE_ITEMS: MenuProps['items'] = [
  { key: 'enable', label: ENABLE_AUTO_REVIEW_LABEL },
  { key: 'keepOff', label: KEEP_AUTO_REVIEW_OFF_LABEL },
]

interface StatusCellProps {
  repository: Repository
  updating: boolean
  onToggleEnabled?: (id: string, enabled: boolean) => Promise<void> | void
}

/**
 * The status of a row: a switch with its label. While the GitHub App has no access to the
 * repository the api serves `enabled: false` whatever was stored (api PR #156, SD §6.9), so the
 * row has no switch (D13) and reads «Нет доступа» on one line with a trigger whose menu holds the
 * two choices (D10, as on the settings page): the stored preference is write-only and never shown.
 */
const StatusCell: FC<StatusCellProps> = ({ repository, updating, onToggleEnabled }) => {
  const { id, fullName, enabled, installationAvailable } = repository
  const [menuOpen, setMenuOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const switchRef = useRef<HTMLButtonElement>(null)
  // Whether the trigger held the focus when the menu opened, and whether the focus is to be put
  // back on it once the choice is saved.
  const triggerHadFocus = useRef(false)
  const returnFocus = useRef(false)
  // The trigger leaves the page when a refetch says the access is back. It is marked as it leaves,
  // while it is still in the document and `activeElement` tells whether it held the focus. A node
  // that attaches again (the ref is composed by `Dropdown`) cancels the mark.
  const switchTakesFocus = useRef(false)
  const trackTrigger = useCallback((node: HTMLButtonElement | null) => {
    if (node !== null) {
      switchTakesFocus.current = false
    } else if (document.activeElement === triggerRef.current) {
      switchTakesFocus.current = true
    }
    triggerRef.current = node
  }, [])

  // The menu closes on a choice and takes the focus with it. The pick itself moves the focus to the
  // trigger (below); this is the second guard: once the save is over, the focus goes back to the
  // trigger if it was to return and the user has not moved on.
  useEffect(() => {
    if (updating || !returnFocus.current) {
      return
    }
    returnFocus.current = false
    if (document.activeElement === document.body) {
      triggerRef.current?.focus()
    }
  }, [updating])

  // Access is back while the trigger held the focus: the switch of the row takes it, unless the
  // user has moved on (the focus is not on <body>).
  useEffect(() => {
    if (!installationAvailable || !switchTakesFocus.current) {
      return
    }
    switchTakesFocus.current = false
    if (document.activeElement === document.body) {
      switchRef.current?.focus()
    }
  }, [installationAvailable])

  if (installationAvailable) {
    return (
      <Flex align="center" gap={10}>
        <Switch
          aria-label={`Ревью для ${fullName}`}
          checked={enabled}
          disabled={updating}
          loading={updating}
          onChange={(checked) => void onToggleEnabled?.(id, checked)}
          ref={switchRef}
        />
        <Text className={styles.switchLabel} type="secondary">
          {enabled ? 'Активен' : 'Пауза'}
        </Text>
      </Flex>
    )
  }

  return (
    <Flex align="center" gap={10}>
      {/* No switch: its state would only repeat «Нет доступа» (D13). The spinner of a saving choice
          is the trigger's. */}
      <Text className={styles.switchLabel} type="secondary">
        Нет доступа
      </Text>
      <Dropdown
        menu={{
          items: CHOICE_ITEMS,
          onClick: ({ key, domEvent }) => {
            // An Enter pick arrives here on the `keydown`. The focus moves to the trigger below, and
            // the browser would deliver the same key's `keypress` there: Enter on a button clicks it
            // and the menu opens again. Cancelling the `keydown` stops that; a mouse pick is not
            // affected.
            domEvent.preventDefault()
            setMenuOpen(false)
            returnFocus.current = triggerHadFocus.current
            // The item keeps the focus until the closing motion ends (about 250 ms), and a save
            // can be over sooner: the focus moves to the trigger now, not when the save is done.
            if (triggerHadFocus.current) {
              triggerRef.current?.focus()
            }
            void onToggleEnabled?.(id, key === 'enable')
          },
        }}
        onOpenChange={(open) => {
          setMenuOpen(open)
          if (open) {
            triggerHadFocus.current = document.activeElement === triggerRef.current
          }
        }}
        open={menuOpen}
        trigger={['click']}
      >
        <Button
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Выбрать авто-ревью для ${fullName}, когда доступ вернётся`}
          icon={<DownOutlined />}
          iconPlacement="end"
          loading={updating}
          ref={trackTrigger}
          size="small"
        >
          Выбрать
        </Button>
      </Dropdown>
    </Flex>
  )
}

export const RepositoryList: FC<RepositoryListProps> = ({
  repositories,
  loading = false,
  refreshing = false,
  accessRefreshStatus = 'idle',
  updatingRepoIds,
  onToggleEnabled,
  settingsHref,
  onOpenSettings,
  onRefresh,
  onSyncAccess,
}) => {
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active'>('all')

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

  const goToSettings = (event: MouseEvent, repo: Repository): void => {
    // A click with a modifier belongs to the browser: it opens the link in a new tab.
    // So does any click when nobody handles navigation: the link then simply works.
    if (onOpenSettings === undefined || event.metaKey || event.ctrlKey || event.shiftKey) {
      return
    }
    event.preventDefault()
    onOpenSettings(repo)
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
      render: (_: boolean, record: Repository) => {
        const updating = updatingRepoIds
          ? Array.isArray(updatingRepoIds)
            ? updatingRepoIds.includes(record.id)
            : updatingRepoIds.has(record.id)
          : false
        return (
          <StatusCell onToggleEnabled={onToggleEnabled} repository={record} updating={updating} />
        )
      },
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      // D14: the table scrolls under the column, so «Настроить» is visible at any width.
      fixed: 'right',
      render: (_: unknown, record: Repository) => (
        <Button
          aria-label={`Настройки ${record.fullName}`}
          href={settingsHref(record)}
          icon={<IconSettings height={14} width={14} />}
          onClick={(event) => {
            goToSettings(event, record)
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

      <div aria-atomic="true" className={styles.accessRefreshStatus} role="status">
        {accessRefreshStatus === 'waiting' && refreshing ? (
          <span className={styles.accessRefreshLoading}>
            <Spin aria-hidden="true" size="small" />
            <Text type="secondary">Загрузка репозиториев</Text>
          </span>
        ) : accessRefreshStatus === 'timedOut' ? (
          <>
            <Text type="secondary">Нужного репозитория нет?</Text>
            <Button loading={refreshing} onClick={onRefresh} size="small">
              Обновить список
            </Button>
          </>
        ) : null}
      </div>

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
            // A pinned column makes Ant Design lay the table out as `fixed`: equal column widths, and
            // the long names run over the next column. `auto` keeps the widths the content asks for.
            tableLayout="auto"
          />
        </>
      )}
    </div>
  )
}
