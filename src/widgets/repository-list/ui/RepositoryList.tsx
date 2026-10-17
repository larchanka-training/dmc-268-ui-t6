import {
  BranchesOutlined,
  ExclamationCircleFilled,
  GithubOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Empty,
  Flex,
  Input,
  Spin,
  Switch,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd'
import { useMemo, useState, type FC, type MouseEvent } from 'react'

import type {
  Repository,
  RepositoryEngine,
  ReviewEvent,
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
import { useViewportAtLeast } from '../lib/useViewportAtLeast'
import styles from './RepositoryList.module.css'

const { Text, Link } = Typography

const SYNC_ACCESS_TOOLTIP =
  'Повторная авторизация через GitHub обновит список ваших установок GitHub App. Откроется GitHub, затем вы вернётесь на эту страницу'

const REFRESH_TOOLTIP = 'После добавления репозиториев в установку нажмите «Обновить доступ»'

const APP_INSTALL_TOOLTIP =
  'После установки GitHub App на новый аккаунт нажмите «Обновить доступ»: откроется GitHub, затем вы вернётесь сюда. Репозиторий может появиться с задержкой до нескольких минут'

/**
 * The window width from which the table shows every column (D16). The full set is 1027.2px wide
 * with the names of the mock repositories (33 characters); the table's scroller is the window minus
 * the 232px sidebar, the 64px page margins and the table's 2px frame (982px at 1280px), so the set
 * fits from 1326px (under 1px to spare) and not at 1280px. 1366px leaves 41px for longer names.
 * Below it, branch, engine, CI wait and limit move to a line under the name. Not an Ant Design
 * breakpoint (1200px, 1600px): neither fits.
 */
const FULL_TABLE_MIN_WIDTH = 1366

const EMPTY_REPOSITORIES_DESCRIPTION =
  'Репозитории ещё не подключены. После установки GitHub App на новый аккаунт или добавления репозиториев в уже подключённую установку нажмите «Обновить доступ»: откроется GitHub, затем вы вернётесь сюда. Репозиторий может появиться с задержкой до нескольких минут.'

export interface RepositoryListProps {
  repositories: Repository[]
  loading?: boolean
  refreshing?: boolean
  accessRefreshStatus?: 'idle' | 'waiting' | 'timedOut'
  updatingRepoIds?: string[] | ReadonlySet<string>
  onToggleEnabled?: (id: string, enabled: boolean) => Promise<void> | void
  /**
   * Address of the settings page of a repository. Two links lead to it: the icon button
   * «Настройки {fullName}» (tooltip «Настроить») and, in a row without GitHub App access, «Нет доступа».
   */
  settingsHref: (repository: Repository) => string
  /**
   * Opens the settings page without a page load. When nobody handles navigation, or the click
   * carries a modifier key, the link simply works (new tab, copy address).
   */
  onOpenSettings?: (repository: Repository) => void
  onRefresh?: () => void
  onSyncAccess: () => void
}

interface StatusCellProps {
  repository: Repository
  updating: boolean
  onToggleEnabled?: (id: string, enabled: boolean) => Promise<void> | void
  /** Address of the settings page of the repository. */
  settingsHref: string
  /** The click handler of a link to it, the same as of the settings button. */
  onSettingsClick: (event: MouseEvent) => void
}

/**
 * The review of a row: the switch alone, its accessible name says what it is (D16). While the
 * GitHub App has no access to the repository the api serves `enabled: false` whatever was stored
 * (api PR #156, SD §6.9), so the row has no switch (D13): it shows a warning icon and the link
 * «Нет доступа» to the settings page, where the choice lives (D17); the stored preference is
 * write-only and never shown.
 */
const StatusCell: FC<StatusCellProps> = ({
  repository,
  updating,
  onToggleEnabled,
  settingsHref,
  onSettingsClick,
}) => {
  const { id, fullName, enabled, installationAvailable } = repository

  if (installationAvailable) {
    return (
      <Switch
        aria-label={`Ревью для ${fullName}`}
        checked={enabled}
        disabled={updating}
        loading={updating}
        onChange={(checked) => void onToggleEnabled?.(id, checked)}
      />
    )
  }

  return (
    <Flex align="center" gap={10}>
      <ExclamationCircleFilled aria-hidden="true" className={styles.noAccessIcon} />
      <Link
        aria-label={`Нет доступа у GitHub App к ${fullName}: открыть настройки`}
        href={settingsHref}
        onClick={onSettingsClick}
      >
        Нет доступа
      </Link>
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
  const accessRefreshPresentation = resolveAccessRefreshPresentation(
    accessRefreshStatus,
    refreshing,
  )
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active'>('all')
  const fullTable = useViewportAtLeast(FULL_TABLE_MIN_WIDTH)

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

  // On a narrow window these four are not columns: the line under the name shows them instead.
  const detailColumns: TableColumnsType<Repository> = [
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
  ]

  const columns: TableColumnsType<Repository> = [
    {
      title: 'Репозиторий',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (fullName: string, record: Repository) => {
        const shortName = fullName.split('/')[1] ?? fullName
        const href = safeHttpUrl(record.url)
        return (
          <div className={styles.repoName}>
            {href ? (
              <Link href={href} rel="noopener noreferrer" strong target="_blank">
                {fullName}
              </Link>
            ) : (
              <Text strong>{fullName}</Text>
            )}
            {fullTable ? (
              <Text className={styles.repoMeta} type="secondary">
                {shortName}
              </Text>
            ) : (
              <div className={styles.repoDetails}>
                <Tag icon={<BranchesOutlined />} variant="outline">
                  {record.defaultBranch}
                </Tag>
                <span aria-hidden="true">·</span>
                <span>{ENGINE_LABEL[record.defaultEngine]}</span>
                <span aria-hidden="true">·</span>
                <span>{`CI: ${WAIT_FOR_CI_LABEL[record.waitForCi].toLowerCase()}`}</span>
                <span aria-hidden="true">·</span>
                <span>{`лимит ${String(record.maxComments)}`}</span>
              </div>
            )}
          </div>
        )
      },
    },
    {
      title: 'Ревью',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (_: boolean, record: Repository) => {
        const updating = updatingRepoIds
          ? Array.isArray(updatingRepoIds)
            ? updatingRepoIds.includes(record.id)
            : updatingRepoIds.has(record.id)
          : false
        return (
          <StatusCell
            onSettingsClick={(event) => {
              goToSettings(event, record)
            }}
            onToggleEnabled={onToggleEnabled}
            repository={record}
            settingsHref={settingsHref(record)}
            updating={updating}
          />
        )
      },
    },
    ...(fullTable ? detailColumns : []),
    {
      title: 'Вердикт',
      dataIndex: 'reviewEvent',
      key: 'reviewEvent',
      // Plain text: a repository setting is not an alarm, and solid tags are for what needs action.
      render: (event: ReviewEvent) => (
        <Text>{event === 'REQUEST_CHANGES' ? 'Запрос изменений' : 'Комментарий'}</Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      onHeaderCell: () => ({ 'aria-label': 'Настройки' }),
      align: 'right',
      // D14: the table scrolls under the column, so «Настроить» is visible at any width.
      fixed: 'right',
      render: (_: unknown, record: Repository) => (
        <Tooltip title="Настроить" trigger={['hover', 'focus']}>
          <Button
            aria-label={`Настройки ${record.fullName}`}
            href={settingsHref(record)}
            icon={<IconSettings height={14} width={14} />}
            onClick={(event) => {
              goToSettings(event, record)
            }}
            size="small"
          />
        </Tooltip>
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
            // A pinned column makes Ant Design lay the table out as `fixed`: equal column widths, and
            // the long names run over the next column. `auto` keeps the widths the content asks for.
            tableLayout="auto"
          />
        </>
      )}
    </div>
  )
}
