import type { JSX } from 'react'
import { Descriptions, Space, Tag, Typography } from 'antd'

import type { RunSession, SeverityCounts, Verdict } from '../../../entities/run'
import { isStaleRunning, statusColor } from '../../../entities/run'
import { formatDateTime, formatDuration, runDuration } from '../lib/format'

interface RunHeaderProps {
  run: RunSession
  now: Date
  verdict?: Verdict | null
  severityCounts?: SeverityCounts
}

const VERDICT_LABEL: Record<Verdict, string> = {
  blocking: 'Blocking',
  attention: 'Attention',
  clean: 'Clean',
}

const VERDICT_COLOR: Record<Verdict, string> = {
  blocking: 'error',
  attention: 'warning',
  clean: 'success',
}

function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

function formatRefs(
  headRef: string | null | undefined,
  baseRef: string | null | undefined,
): string | null {
  if (headRef && baseRef) {
    return `${headRef} → ${baseRef}`
  }
  if (headRef) {
    return headRef
  }
  if (baseRef) {
    return `→ ${baseRef}`
  }
  return null
}

export function RunHeader(props: RunHeaderProps): JSX.Element {
  const { run, now, verdict = null, severityCounts } = props
  const duration = runDuration(run, now)
  const pr = run.pullRequest
  const refs = formatRefs(pr.headRef, pr.baseRef)

  const items = [
    { key: 'repo', label: 'Репозиторий', children: pr.repo },
    {
      key: 'pullRequest',
      label: 'PR',
      children: (
        <a href={pr.url} rel="noreferrer" target="_blank">
          {`#${String(pr.number)} ${pr.title}`}
        </a>
      ),
    },
    { key: 'headSha', label: 'Commit', children: shortSha(pr.headSha) },
    ...(pr.author ? [{ key: 'author', label: 'Автор', children: pr.author }] : []),
    ...(refs ? [{ key: 'refs', label: 'Ветки', children: refs }] : []),
    { key: 'engine', label: 'Движок', children: run.engine },
    { key: 'model', label: 'Модель', children: run.model ?? '—' },
    {
      key: 'status',
      label: 'Статус',
      children: (
        <>
          <Tag color={statusColor(run.status)}>{run.status}</Tag>
          {isStaleRunning(run, now) ? <Tag color="warning">нет ответа &gt; 10 мин</Tag> : null}
          {verdict !== null ? (
            <Tag color={VERDICT_COLOR[verdict]}>{VERDICT_LABEL[verdict]}</Tag>
          ) : null}
        </>
      ),
    },
    ...(severityCounts && run.status === 'succeeded' && !run.summaryOnly
      ? [
          {
            key: 'severityCounts',
            label: 'Находки',
            children: (
              <Space size={[4, 4]} wrap>
                <Tag>critical: {severityCounts.critical}</Tag>
                <Tag>high: {severityCounts.high}</Tag>
                <Tag>medium: {severityCounts.medium}</Tag>
                <Tag>low: {severityCounts.low}</Tag>
                <Tag>info: {severityCounts.info}</Tag>
              </Space>
            ),
          },
        ]
      : []),
    {
      key: 'startedAt',
      label: 'Запущен',
      children: run.startedAt ? formatDateTime(run.startedAt) : '—',
    },
    {
      key: 'duration',
      label: 'Длительность',
      children: duration !== null ? formatDuration(duration) : '—',
    },
    { key: 'attempt', label: 'Попытка', children: String(run.attempt) },
    { key: 'actionCount', label: 'Действий', children: String(run.actionCount) },
    { key: 'errorCode', label: 'Ошибка', children: run.errorCode ?? '—' },
  ]

  return (
    <div>
      <Descriptions column={4} items={items} size="small" />
      {run.summaryOnly ? (
        <Typography.Text type="secondary">
          Summary-only прогон (дифф &gt; 3000 строк)
        </Typography.Text>
      ) : null}
    </div>
  )
}
