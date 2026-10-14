import { ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Empty, Flex, Spin, Typography, type TableColumnsType } from 'antd'
import { useCallback, useEffect, useMemo, useRef, type FC } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  isActive,
  statusTone,
  useRunList,
  type RunListPage,
  type RunSession,
} from '../../entities/run'
import { useRunListFilterParams } from '../../features/run-list-filter'
import { DataTable, PageHeader, Tag } from '../../shared/ui'
import styles from './RunsPage.module.css'

const { Text } = Typography

/** Rows of all loaded pages. A run can come twice when the list shifts between two requests. */
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

export const RunsPage: FC = () => {
  const navigate = useNavigate()
  const { filter, resetFilter } = useRunListFilterParams()
  const {
    data,
    isLoading,
    isError,
    isFetchNextPageError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useRunList({ repo: filter.repo })
  const runSessions = useMemo(() => uniqueRuns(data?.pages ?? []), [data])

  // Focus follows the action. A control that is gone (the filter reset, the last page loaded)
  // would drop focus to <body>: the heading takes it after a reset, and the link of the first
  // run a page brought takes it after «Показать ещё».
  const titleRef = useRef<HTMLHeadingElement>(null)
  const runLinks = useRef(new Map<string, HTMLAnchorElement>())
  // The first run of a page just loaded, until its link is in the DOM.
  const focusRunId = useRef<string | null>(null)

  const resetFilterAndFocus = useCallback(() => {
    resetFilter()
    titleRef.current?.focus()
  }, [resetFilter])

  const loadMore = async (): Promise<void> => {
    const known = new Set(runSessions.map((run) => run.id))
    const result = await fetchNextPage()
    const firstNew = uniqueRuns(result.data?.pages ?? []).find((run) => !known.has(run.id))
    if (result.isError || firstNew === undefined) {
      return
    }
    // The rows are drawn after this: TanStack Query tells React about the new page on a later
    // tick than it settles `fetchNextPage`. The effect below focuses the link once it is there.
    focusRunId.current = firstNew.id
  }

  useEffect(() => {
    const id = focusRunId.current
    if (id === null) {
      return
    }
    focusRunId.current = null
    runLinks.current.get(id)?.focus()
  }, [runSessions])

  // A failed next page keeps the rows already loaded; only the other failures replace the list.
  const loadError = isError && !isFetchNextPageError

  const columns: TableColumnsType<RunSession> = [
    {
      title: 'PR',
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
          <>
            {filter.repo !== undefined ? (
              <>
                <Tag variant="outline">{filter.repo}</Tag>
                <Button onClick={resetFilterAndFocus}>Сбросить фильтр</Button>
              </>
            ) : null}
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                void refetch()
              }}
            >
              Обновить
            </Button>
          </>
        }
        description={
          filter.repo !== undefined
            ? `Pull request'ы репозитория ${filter.repo}, по которым выполнялось или выполняется ревью`
            : "Pull request'ы, по которым выполнялось или выполняется ревью"
        }
        title="Прогоны"
        titleRef={titleRef}
      />

      {isLoading ? (
        <Flex align="center" className={styles.loading} justify="center">
          <Spin />
        </Flex>
      ) : null}

      {loadError ? (
        <Alert
          description={error instanceof Error ? error.message : 'Не удалось загрузить список'}
          showIcon
          title="Ошибка загрузки"
          type="error"
        />
      ) : null}

      {data !== undefined ? (
        <DataTable<RunSession>
          columns={columns}
          dataSource={runSessions}
          locale={{
            emptyText:
              filter.repo !== undefined ? (
                <Empty
                  description={`Для репозитория ${filter.repo} прогонов ещё нет`}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button onClick={resetFilterAndFocus}>Показать все прогоны</Button>
                </Empty>
              ) : (
                'Нет прогонов ревью'
              ),
          }}
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

      {isFetchNextPageError ? (
        <Alert
          action={
            <Button
              loading={isFetchingNextPage}
              onClick={() => {
                void loadMore()
              }}
              size="small"
            >
              Повторить
            </Button>
          }
          className={styles.more}
          showIcon
          title="Не удалось загрузить следующую страницу"
          type="error"
        />
      ) : null}

      {hasNextPage && !isFetchNextPageError ? (
        <Flex className={styles.more} justify="center">
          <Button
            loading={isFetchingNextPage}
            onClick={() => {
              void loadMore()
            }}
          >
            Показать ещё
          </Button>
        </Flex>
      ) : null}
    </>
  )
}
