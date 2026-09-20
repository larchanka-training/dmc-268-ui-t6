import type { JSX } from 'react'
import { Descriptions, Tag } from 'antd'

import type { RunSession } from '../../../entities/run'
import { isStaleRunning, statusColor } from '../../../entities/run'
import { formatDateTime, formatDuration, runDuration } from '../lib/format'

interface RunHeaderProps {
  run: RunSession
  now: Date
}

export function RunHeader(props: RunHeaderProps): JSX.Element {
  const { run, now } = props
  const duration = runDuration(run, now)

  const items = [
    { key: 'engine', label: 'Движок', children: run.engine },
    { key: 'model', label: 'Модель', children: run.model ?? '—' },
    {
      key: 'status',
      label: 'Статус',
      children: (
        <>
          <Tag color={statusColor(run.status)}>{run.status}</Tag>
          {isStaleRunning(run, now) ? <Tag color="warning">нет ответа &gt; 10 мин</Tag> : null}
        </>
      ),
    },
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
    {
      key: 'pullRequest',
      label: 'PR',
      children: (
        <a href={run.pullRequest.url} target="_blank" rel="noreferrer">
          {`#${String(run.pullRequest.number)} ${run.pullRequest.title}`}
        </a>
      ),
    },
    { key: 'attempt', label: 'Попытка', children: String(run.attempt) },
    { key: 'actionCount', label: 'Действий', children: String(run.actionCount) },
    { key: 'errorCode', label: 'Ошибка', children: run.errorCode ?? '—' },
  ]

  return <Descriptions size="small" column={4} items={items} />
}
