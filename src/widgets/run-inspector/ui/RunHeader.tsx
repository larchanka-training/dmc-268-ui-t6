import type { JSX } from 'react'
import { Descriptions, Flex, Typography } from 'antd'

import type { RunSession, SeverityCounts, Verdict } from '../../../entities/run'
import { isActive, isStaleRunning, statusTone } from '../../../entities/run'
import { safeHttpUrl } from '../../../shared/lib/safeHttpUrl'
import { Tag } from '../../../shared/ui'
import { formatDateTime, formatDuration, runDuration } from '../lib/format'

interface RunHeaderProps {
  run: RunSession
  now: Date
  verdict?: Verdict | null
  severityCounts?: SeverityCounts
  /** Findings the client dropped (failed the format check) but `severityCounts` still counts. */
  droppedFindings?: number
}

const VERDICT_LABEL: Record<Verdict, string> = {
  blocking: 'Blocking',
  attention: 'Attention',
  clean: 'Clean',
}

/** Only a blocking verdict is filled: it is the one that needs action. */
const VERDICT_TAG: Record<
  Verdict,
  { tone: 'danger' | 'warning' | 'success'; variant: 'solid' | 'dot' }
> = {
  blocking: { tone: 'danger', variant: 'solid' },
  attention: { tone: 'warning', variant: 'dot' },
  clean: { tone: 'success', variant: 'dot' },
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
  const { run, now, verdict = null, severityCounts, droppedFindings = 0 } = props
  const duration = runDuration(run, now)
  const pr = run.pullRequest
  const refs = formatRefs(pr.headRef, pr.baseRef)
  const prHref = safeHttpUrl(pr.url)

  const items = [
    { key: 'repo', label: 'Репозиторий', children: pr.repo },
    {
      key: 'pullRequest',
      label: 'PR',
      children: prHref ? (
        <a href={prHref} rel="noreferrer" target="_blank">
          {`#${String(pr.number)} ${pr.title}`}
        </a>
      ) : (
        `#${String(pr.number)} ${pr.title}`
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
        <Flex gap={6} wrap>
          <Tag pulse={isActive(run.status)} tone={statusTone(run.status)}>
            {run.status}
          </Tag>
          {isStaleRunning(run, now) ? <Tag tone="warning">нет ответа &gt; 10 мин</Tag> : null}
          {verdict !== null ? (
            <Tag tone={VERDICT_TAG[verdict].tone} variant={VERDICT_TAG[verdict].variant}>
              {VERDICT_LABEL[verdict]}
            </Tag>
          ) : null}
        </Flex>
      ),
    },
    ...(severityCounts && run.status === 'succeeded' && !run.summaryOnly
      ? [
          {
            key: 'severityCounts',
            label: 'Находки',
            children: (
              <Flex gap={4} wrap>
                <Tag variant="outline">critical: {severityCounts.critical}</Tag>
                <Tag variant="outline">high: {severityCounts.high}</Tag>
                <Tag variant="outline">medium: {severityCounts.medium}</Tag>
                <Tag variant="outline">low: {severityCounts.low}</Tag>
                <Tag variant="outline">info: {severityCounts.info}</Tag>
                {droppedFindings > 0 ? (
                  <Typography.Text type="secondary">
                    {`Не показано находок: ${String(droppedFindings)} — не прошли проверку формата`}
                  </Typography.Text>
                ) : null}
              </Flex>
            ),
          },
        ]
      : []),
    ...(run.trigger === 'rerun'
      ? [{ key: 'trigger', label: 'Запуск', children: 'Перезапущен вручную' }]
      : []),
    { key: 'createdAt', label: 'Создан', children: formatDateTime(run.createdAt) },
    {
      key: 'startedAt',
      label: 'Начат',
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
