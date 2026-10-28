import { Alert, Button, Flex, Select, Spin, Typography, type TableColumnsType } from 'antd'
import { useCallback, useEffect, useMemo, useRef, type FC } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  errorReason,
  formatDateTime,
  formatDuration,
  runDuration,
  RunStatusSchema,
  useRunList,
  type RunListPage,
  type RunSession,
  type RunStatus,
} from '../../entities/run'
import { useAuditFilterParams } from '../../features/audit-filter'
import { formatUsd, useTranslation } from '../../shared/i18n'
import { DataTable, PageHeader, Tag } from '../../shared/ui'
import styles from './AuditPage.module.css'

const { Text } = Typography

function uniqueRuns(pages: readonly RunListPage[]): RunSession[] {
  const seen = new Set<string>()
  const runs: RunSession[] = []
  for (const page of pages) {
    for (const run of page.items) {
      if (!seen.has(run.id)) {
        seen.add(run.id)
        runs.push(run)
      }
    }
  }
  return runs
}

function reasonTextOf(run: RunSession): string {
  if (run.errorCode === null) {
    return '—'
  }
  return errorReason(run.errorCode) ?? run.errorCode
}

export const AuditPage: FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const now = useMemo(() => new Date(), [])
  const { filter, setFilter, resetFilter } = useAuditFilterParams()
  const {
    data,
    isLoading,
    isError,
    isFetchNextPageError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useRunList({ repo: filter.repo, status: filter.status })
  const runSessions = useMemo(() => uniqueRuns(data?.pages ?? []), [data])

  const titleRef = useRef<HTMLHeadingElement>(null)
  const runLinks = useRef(new Map<string, HTMLAnchorElement>())
  const knownRunIds = useRef<ReadonlySet<string> | null>(null)
  const retryRef = useRef<HTMLButtonElement>(null)
  const retryTakesFocus = useRef(false)
  const moreRef = useRef<HTMLButtonElement>(null)
  const moreTakesFocus = useRef(false)

  const focusHeading = useCallback(() => {
    knownRunIds.current = null
    moreTakesFocus.current = false
    titleRef.current?.focus()
  }, [])

  const focusMoreIfReady = useCallback(() => {
    const more = moreRef.current
    if (!moreTakesFocus.current || more === null) {
      return
    }
    moreTakesFocus.current = false
    if (document.activeElement === document.body) {
      more.focus()
    }
  }, [])

  const resetFilterAndFocus = useCallback(() => {
    resetFilter()
    focusHeading()
  }, [resetFilter, focusHeading])

  const loadMore = async (trigger: HTMLElement): Promise<void> => {
    const hadFocus = document.activeElement === trigger
    const fromRetry = trigger === retryRef.current
    const known = new Set(runSessions.map((run) => run.id))
    knownRunIds.current = known
    retryTakesFocus.current = hadFocus
    const result = await fetchNextPage()
    if (!result.isError) {
      retryTakesFocus.current = false
    }
    const nothingNew = !uniqueRuns(result.data?.pages ?? []).some((run) => !known.has(run.id))
    if (result.isError || nothingNew) {
      knownRunIds.current = null
    }
    const active = document.activeElement
    if (
      hadFocus &&
      !result.isError &&
      nothingNew &&
      !result.hasNextPage &&
      (active === trigger || active === document.body)
    ) {
      focusHeading()
    }
    if (hadFocus && fromRetry && !result.isError && nothingNew && result.hasNextPage) {
      moreTakesFocus.current = true
      focusMoreIfReady()
    }
  }

  useEffect(() => {
    focusMoreIfReady()
  }, [focusMoreIfReady, isFetchNextPageError, hasNextPage])

  useEffect(() => {
    if (!isFetchNextPageError || !retryTakesFocus.current) {
      return
    }
    retryTakesFocus.current = false
    if (document.activeElement === document.body) {
      retryRef.current?.focus()
    }
  }, [isFetchNextPageError])

  useEffect(() => {
    const known = knownRunIds.current
    const firstNew = known === null ? undefined : runSessions.find((run) => !known.has(run.id))
    if (firstNew === undefined) {
      return
    }
    knownRunIds.current = null
    runLinks.current.get(firstNew.id)?.focus()
  }, [runSessions])

  const loadError = isError && !isFetchNextPageError
  const filtered = filter.repo !== undefined || filter.status !== undefined

  const columns: TableColumnsType<RunSession> = [
    {
      title: t('audit.columns.started'),
      key: 'started',
      render: (_, run) => (run.startedAt ? formatDateTime(run.startedAt) : '—'),
    },
    {
      title: t('audit.columns.repository'),
      key: 'repo',
      render: (_, run) => run.pullRequest.repo,
    },
    {
      title: t('audit.columns.pullRequest'),
      key: 'pr',
      render: (_, run) => (
        <div className={styles.pullRequest}>
          <Link
            className={styles.runLink}
            ref={(node) => {
              if (node === null) {
                runLinks.current.delete(run.id)
              } else {
                runLinks.current.set(run.id, node)
              }
            }}
            to={`/runs/${run.id}`}
          >
            {`#${String(run.pullRequest.number)}`}
          </Link>
          <Text type="secondary">{run.pullRequest.title}</Text>
        </div>
      ),
    },
    {
      title: t('audit.columns.trigger'),
      key: 'trigger',
      render: (_, run) => run.trigger,
    },
    {
      title: t('audit.columns.startedBy'),
      key: 'triggeredBy',
      render: (_, run) => run.triggeredBy ?? '—',
    },
    {
      title: t('audit.columns.status'),
      key: 'status',
      render: (_, run) => (
        <span data-testid="audit-reason">
          {run.status} {reasonTextOf(run)}
        </span>
      ),
    },
    {
      title: t('audit.columns.duration'),
      key: 'duration',
      render: (_, run) => {
        const duration = runDuration(run, now)
        return duration === null ? '—' : formatDuration(duration)
      },
    },
    {
      title: t('audit.columns.tokensIn'),
      key: 'tokensIn',
      render: (_, run) => String(run.usage?.tokensIn ?? 0),
    },
    {
      title: t('audit.columns.tokensOut'),
      key: 'tokensOut',
      render: (_, run) => String(run.usage?.tokensOut ?? 0),
    },
    {
      title: t('audit.columns.cost'),
      key: 'cost',
      render: (_, run) => formatUsd(run.usage?.costUsd ?? 0),
    },
  ]

  return (
    <>
      <PageHeader
        actions={
          <div className={styles.filters}>
            <Select
              aria-label={t('audit.statusFilter')}
              onChange={(value: RunStatus | 'all') => {
                setFilter({
                  ...filter,
                  status: value === 'all' ? undefined : value,
                })
              }}
              options={[
                { value: 'all', label: t('audit.statusAll') },
                ...RunStatusSchema.options.map((status) => ({ value: status, label: status })),
              ]}
              value={filter.status ?? 'all'}
            />
            {filtered ? (
              <>
                {filter.repo !== undefined ? <Tag variant="outline">{filter.repo}</Tag> : null}
                <Button onClick={resetFilterAndFocus}>{t('audit.resetFilter')}</Button>
              </>
            ) : null}
          </div>
        }
        description={
          filter.repo !== undefined
            ? t('audit.descriptionForRepo', { repo: filter.repo })
            : t('audit.description')
        }
        title={t('audit.title')}
        titleRef={titleRef}
      />

      {isLoading ? (
        <Flex align="center" className={styles.loading} justify="center">
          <Spin />
        </Flex>
      ) : null}

      {loadError ? (
        <Alert
          description={error instanceof Error ? error.message : t('audit.loadFailed')}
          showIcon
          title={t('audit.loadFailedTitle')}
          type="error"
        />
      ) : null}

      {data !== undefined ? (
        <DataTable<RunSession>
          columns={columns}
          dataSource={runSessions}
          locale={{ emptyText: t('audit.empty') }}
          onRow={(run) => ({
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

      {isFetchNextPageError ? (
        <Alert
          action={
            <Button
              loading={isFetchingNextPage}
              onClick={(event) => {
                void loadMore(event.currentTarget)
              }}
              ref={retryRef}
              size="small"
            >
              {t('audit.retry')}
            </Button>
          }
          className={styles.more}
          showIcon
          title={t('audit.nextPageFailed')}
          type="error"
        />
      ) : null}

      {hasNextPage && !isFetchNextPageError ? (
        <Flex className={styles.more} justify="center">
          <Button
            loading={isFetchingNextPage}
            onClick={(event) => {
              void loadMore(event.currentTarget)
            }}
            ref={moreRef}
          >
            {t('audit.showMore')}
          </Button>
        </Flex>
      ) : null}
    </>
  )
}
