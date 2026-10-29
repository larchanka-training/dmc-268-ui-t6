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
import { useTranslation } from '../../../shared/i18n'
import { safeHttpUrl } from '../../../shared/lib/safeHttpUrl'
import { VCS_ACCESS_NAME, VCS_PROVIDER_LABEL } from '../../../shared/model/provider'
import { DataTable, IconSettings, PageHeader, Segmented, Tag } from '../../../shared/ui'
import {
  accessRefreshLoadingText,
  accessRefreshTimeoutActionText,
  accessRefreshTimeoutPrompt,
  resolveAccessRefreshPresentation,
} from '../lib/accessRefreshPresentation'
import { useViewportAtLeast } from '../lib/useViewportAtLeast'
import styles from './RepositoryList.module.css'

const { Text, Link } = Typography

/**
 * The window width from which the table shows every column (D16). The full set is 1027.2px wide
 * with the names of the mock repositories (33 characters); the table's scroller is the window minus
 * the 232px sidebar, the 64px page margins and the table's 2px frame (982px at 1280px), so the set
 * fits from 1326px (under 1px to spare) and not at 1280px. 1366px leaves 41px for longer names.
 * Below it, branch, engine, CI wait and limit move to a line under the name. Not an Ant Design
 * breakpoint (1200px, 1600px): neither fits.
 */
const FULL_TABLE_MIN_WIDTH = 1366

export interface RepositoryListProps {
  repositories: Repository[]
  loading?: boolean
  refreshing?: boolean
  accessRefreshStatus?: 'idle' | 'waiting' | 'timedOut'
  updatingRepoIds?: string[] | ReadonlySet<string>
  onToggleEnabled?: (id: string, enabled: boolean) => Promise<void> | void
  /**
   * Address of the settings page of a repository. Two links lead to it: the icon button
   * "Settings for {fullName}" (tooltip "Configure") and, in a row without GitHub App access, "No access".
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
 * "No access" to the settings page, where the choice lives (D17); the stored preference is
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
  const { t } = useTranslation()

  if (installationAvailable) {
    return (
      <Switch
        aria-label={t('repositories.reviewFor', { name: fullName })}
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
        aria-label={t('repositories.noAccessLabel', {
          name: fullName,
          accessName: VCS_ACCESS_NAME[repository.provider],
        })}
        href={settingsHref}
        onClick={onSettingsClick}
      >
        {t('repositories.noAccess')}
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
  const { t } = useTranslation()
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
      {t('repositories.connect')}
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
      {t('repositories.installApp')}
    </Button>
  )

  const WAIT_FOR_CI_LABEL: Record<WaitForCi, string> = {
    auto: t('repositories.waitForCi.auto'),
    always: t('repositories.waitForCi.always'),
    never: t('repositories.waitForCi.never'),
  }
  // deep (SandboxEngine) is phase 3; the api returns only fast until then.
  const ENGINE_LABEL: Record<RepositoryEngine, string> = { fast: t('repositories.engine.fast') }
  const activeCount = repositories.filter((r) => r.enabled).length

  // On a narrow window these four are not columns: the line under the name shows them instead.
  const detailColumns: TableColumnsType<Repository> = [
    {
      title: t('repositories.columns.branch'),
      dataIndex: 'defaultBranch',
      key: 'defaultBranch',
      render: (branch: string) => (
        <Tag icon={<BranchesOutlined />} variant="outline">
          {branch}
        </Tag>
      ),
    },
    {
      title: t('repositories.columns.engine'),
      dataIndex: 'defaultEngine',
      key: 'defaultEngine',
      render: (engine: RepositoryEngine) => <Text type="secondary">{ENGINE_LABEL[engine]}</Text>,
    },
    {
      title: t('repositories.columns.waitForCi'),
      dataIndex: 'waitForCi',
      key: 'waitForCi',
      render: (wait: WaitForCi) => <Text type="secondary">{WAIT_FOR_CI_LABEL[wait]}</Text>,
    },
    {
      title: t('repositories.columns.limit'),
      dataIndex: 'maxComments',
      key: 'maxComments',
      render: (count: number) => <Text>{t('repositories.comments', { count })}</Text>,
    },
  ]

  const columns: TableColumnsType<Repository> = [
    {
      title: t('repositories.columns.repository'),
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
            <Tag className={styles.providerTag} variant="outline">
              {VCS_PROVIDER_LABEL[record.provider]}
            </Tag>
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
                <span>{t('repositories.limitShort', { count: record.maxComments })}</span>
              </div>
            )}
          </div>
        )
      },
    },
    {
      title: t('repositories.columns.review'),
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
      title: t('repositories.columns.verdict'),
      dataIndex: 'reviewEvent',
      key: 'reviewEvent',
      // Plain text: a repository setting is not an alarm, and solid tags are for what needs action.
      render: (event: ReviewEvent) => (
        <Text>
          {event === 'REQUEST_CHANGES'
            ? t('repositories.verdict.requestChanges')
            : t('repositories.verdict.comment')}
        </Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      onHeaderCell: () => ({ 'aria-label': t('repositories.columns.settings') }),
      align: 'right',
      // D14: the table scrolls under the column, so "Configure" is visible at any width.
      fixed: 'right',
      render: (_: unknown, record: Repository) => (
        <Tooltip title={t('repositories.configure')} trigger={['hover', 'focus']}>
          <Button
            aria-label={t('repositories.settingsFor', { name: record.fullName })}
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
            <Tooltip title={t('repositories.refreshTooltip')}>
              <Button icon={<ReloadOutlined />} loading={refreshing} onClick={onRefresh}>
                {t('repositories.refresh')}
              </Button>
            </Tooltip>
            <Tooltip
              title={
                isSyncConfigured
                  ? t('repositories.refreshAccessTooltip')
                  : t('repositories.refreshAccessUnavailable')
              }
            >
              <span>
                <Button disabled={!isSyncConfigured} onClick={onSyncAccess}>
                  {t('repositories.refreshAccess')}
                </Button>
              </span>
            </Tooltip>
            {!isAppConfigured ? (
              <Tooltip title={t('repositories.installUnavailable')}>
                <span>{connectButton}</span>
              </Tooltip>
            ) : (
              <Tooltip title={t('repositories.installTooltip')}>{connectButton}</Tooltip>
            )}
          </>
        }
        description={
          repositories.length > 0
            ? t('repositories.summary', { total: repositories.length, active: activeCount })
            : t('repositories.summaryEmpty')
        }
        title={t('repositories.title')}
      />

      {accessRefreshStatus !== 'idle' ? (
        <div className={styles.accessRefreshStatus}>
          {accessRefreshPresentation.kind === 'loading' ? (
            <span className={styles.accessRefreshLoading}>
              <Spin aria-hidden="true" size="small" />
              <Text type="secondary">{accessRefreshLoadingText()}</Text>
            </span>
          ) : accessRefreshPresentation.kind === 'timedOut' ? (
            <>
              <Text type="secondary">{accessRefreshTimeoutPrompt()}</Text>
              <Button loading={refreshing} onClick={onRefresh} size="small">
                {accessRefreshTimeoutActionText()}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {repositories.length === 0 && !loading ? (
        <div className={styles.empty}>
          <Empty
            description={<span className={styles.emptyText}>{t('repositories.empty')}</span>}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {!isAppConfigured ? (
              <Tooltip title={t('repositories.installUnavailable')}>
                <span>{emptyConnectButton}</span>
              </Tooltip>
            ) : (
              <Tooltip title={t('repositories.installTooltip')}>{emptyConnectButton}</Tooltip>
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
              placeholder={t('repositories.searchPlaceholder')}
              prefix={<SearchOutlined />}
              value={search}
            />

            <Segmented<'all' | 'active'>
              aria-label={t('repositories.filter.label')}
              onChange={setFilterActive}
              options={[
                {
                  value: 'all',
                  label: t('repositories.filter.all', { count: repositories.length }),
                },
                { value: 'active', label: t('repositories.filter.active', { count: activeCount }) },
              ]}
              value={filterActive}
            />
          </Flex>

          <DataTable<Repository>
            columns={columns}
            dataSource={filteredRepositories}
            loading={loading}
            locale={{ emptyText: t('repositories.nothingFound') }}
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
