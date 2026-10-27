'use client'

/* The runs list, after src/pages/runs/RunsPage.tsx. */
import { Button, Flex, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { VCS_PROVIDER_LABEL, type VcsProvider } from '../../../src/shared/model/provider'
import { DataTable, PageHeader, Tag, type TagProps } from '../../../src/shared/ui'
import styles from '../../../src/pages/runs/RunsPage.module.css'
import { AppShell } from './app-shell'

const { Text } = Typography

type Status = 'queued' | 'running' | 'publishing' | 'succeeded' | 'failed' | 'cancelled' | 'skipped'

// Same as statusTone in src/entities/run/lib/status.ts.
const TONE: Record<Status, NonNullable<TagProps['tone']>> = {
  queued: 'neutral',
  running: 'info',
  publishing: 'info',
  succeeded: 'success',
  failed: 'danger',
  cancelled: 'warning',
  skipped: 'neutral',
}
const ACTIVE = new Set<Status>(['queued', 'running', 'publishing'])

interface Row {
  id: number
  title: string
  repo: string
  provider: VcsProvider
  status: Status
  summaryOnly?: boolean
}

const ROWS: Row[] = [
  {
    id: 142,
    title: 'feat: add user lookup endpoint',
    repo: 'acme/api',
    provider: 'github',
    status: 'running',
  },
  {
    id: 141,
    title: 'fix: close the db session on cancel',
    repo: 'acme/api',
    provider: 'github',
    status: 'succeeded',
  },
  {
    id: 140,
    title: 'feat: add rate limiting',
    repo: 'acme/platform',
    provider: 'gitlab',
    status: 'publishing',
  },
  {
    id: 139,
    title: 'refactor: split the webhook handler',
    repo: 'acme/private',
    provider: 'bitbucket',
    status: 'failed',
  },
  {
    id: 58,
    title: 'feat: paginate the runs list',
    repo: 'acme/web',
    provider: 'github',
    status: 'succeeded',
  },
  {
    id: 57,
    title: 'chore: bump dependencies',
    repo: 'acme/web',
    provider: 'github',
    status: 'cancelled',
  },
  {
    id: 56,
    title: 'feat: large cross-cutting refactor',
    repo: 'acme/web',
    provider: 'github',
    status: 'succeeded',
    summaryOnly: true,
  },
  {
    id: 55,
    title: 'docs: update the readme',
    repo: 'acme/web',
    provider: 'github',
    status: 'skipped',
  },
  {
    id: 138,
    title: 'feat: queue retries with backoff',
    repo: 'acme/api',
    provider: 'github',
    status: 'queued',
  },
]

export function RunsScreen() {
  return (
    <AppShell active="/runs">
      <PageHeader
        actions={<Button icon={<ReloadOutlined />}>Refresh</Button>}
        description="Pull requests that were reviewed or are being reviewed"
        title="Runs"
      />
      <DataTable<Row>
        columns={[
          {
            title: 'PR',
            key: 'pr',
            render: (_, run) => (
              <div className={styles.pullRequest}>
                <a className={styles.runLink} href="#">{`#${String(run.id)}`}</a>
                <Text type="secondary">{run.title}</Text>
              </div>
            ),
          },
          { title: 'Repository', dataIndex: 'repo', key: 'repo' },
          {
            title: 'Source',
            key: 'provider',
            render: (_, run) => VCS_PROVIDER_LABEL[run.provider],
          },
          {
            title: 'Review status',
            key: 'status',
            render: (_, run) => (
              <Flex gap={8} wrap>
                <Tag pulse={ACTIVE.has(run.status)} tone={TONE[run.status]}>
                  {run.status}
                </Tag>
                {ACTIVE.has(run.status) ? <Tag variant="outline">in progress</Tag> : null}
                {run.summaryOnly ? <Tag variant="outline">summary-only</Tag> : null}
              </Flex>
            ),
          },
          { title: 'Engine', key: 'engine', render: () => <Text type="secondary">fast</Text> },
        ]}
        dataSource={ROWS}
        rowKey="id"
      />
    </AppShell>
  )
}
