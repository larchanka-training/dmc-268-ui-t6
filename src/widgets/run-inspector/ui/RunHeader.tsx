import type { JSX, ReactNode } from 'react'
import { Flex, Typography } from 'antd'

import type { RunSession, SeverityCounts, Verdict } from '../../../entities/run'
import {
  isActive,
  isKnownReasonCode,
  isStaleRunning,
  reasonText,
  statusTone,
} from '../../../entities/run'
import { useTranslation } from '../../../shared/i18n'
import { safeHttpUrl } from '../../../shared/lib/safeHttpUrl'
import { VCS_PROVIDER_LABEL } from '../../../shared/model/provider'
import { cx, Tag } from '../../../shared/ui'
import { formatDateTime, formatDuration, runDuration } from '../lib/format'
import styles from './RunHeader.module.css'

interface MetadataItem {
  key: string
  label: string
  children: ReactNode
  wide?: boolean
}

interface RunHeaderProps {
  run: RunSession
  now: Date
  verdict?: Verdict | null
  severityCounts?: SeverityCounts
  /** Findings the client dropped (failed the format check) but `severityCounts` still counts. */
  droppedFindings?: number
  /**
   * Length of the action log on screen. The run detail's `actionCount` lags the polled log, so the
   * header shows the larger of the two.
   */
  loggedActions?: number
}

/** The text of a failure or stop code, then the code itself for the docs and support. */
function Reason({ code }: { code: string }): JSX.Element {
  // The fallback text already names an unknown code.
  return isKnownReasonCode(code) ? (
    <>
      {reasonText(code)} <code>{code}</code>
    </>
  ) : (
    <>{reasonText(code)}</>
  )
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
  const { run, now, verdict = null, severityCounts, droppedFindings = 0, loggedActions = 0 } = props
  const { t } = useTranslation()
  const duration = runDuration(run, now)
  const pr = run.pullRequest
  const refs = formatRefs(pr.headRef, pr.baseRef)
  const prHref = safeHttpUrl(pr.url)

  const items: MetadataItem[] = [
    { key: 'repo', label: t('runs.header.repository'), children: pr.repo },
    { key: 'provider', label: t('runs.header.provider'), children: VCS_PROVIDER_LABEL[run.provider] },
    {
      key: 'pullRequest',
      label: t('runs.header.pullRequest'),
      children: prHref ? (
        <a href={prHref} rel="noreferrer" target="_blank">
          {`#${String(pr.number)} ${pr.title}`}
        </a>
      ) : (
        `#${String(pr.number)} ${pr.title}`
      ),
    },
    {
      key: 'headSha',
      label: t('runs.header.commit'),
      children: <code className={styles.commit}>{shortSha(pr.headSha)}</code>,
    },
    ...(pr.author ? [{ key: 'author', label: t('runs.header.author'), children: pr.author }] : []),
    ...(refs ? [{ key: 'refs', label: t('runs.header.branches'), children: refs }] : []),
    { key: 'engine', label: t('runs.header.engine'), children: run.engine },
    { key: 'model', label: t('runs.header.model'), children: run.model ?? '—' },
    {
      key: 'status',
      label: t('runs.header.status'),
      children: (
        <Flex gap={6} wrap>
          <Tag pulse={isActive(run.status)} tone={statusTone(run.status)}>
            {run.status}
          </Tag>
          {isStaleRunning(run, now) ? <Tag tone="warning">{t('runs.header.stale')}</Tag> : null}
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
            label: t('runs.header.findings'),
            wide: true,
            children: (
              <Flex gap={4} wrap>
                <Tag variant="outline">critical: {severityCounts.critical}</Tag>
                <Tag variant="outline">high: {severityCounts.high}</Tag>
                <Tag variant="outline">medium: {severityCounts.medium}</Tag>
                <Tag variant="outline">low: {severityCounts.low}</Tag>
                <Tag variant="outline">info: {severityCounts.info}</Tag>
                {droppedFindings > 0 ? (
                  <Typography.Text type="secondary">
                    {t('runs.header.dropped', { count: droppedFindings })}
                  </Typography.Text>
                ) : null}
              </Flex>
            ),
          },
        ]
      : []),
    ...(run.trigger === 'rerun'
      ? [
          {
            key: 'trigger',
            label: t('runs.header.trigger'),
            children: t('runs.header.rerunManually'),
          },
        ]
      : []),
    { key: 'createdAt', label: t('runs.header.created'), children: formatDateTime(run.createdAt) },
    {
      key: 'startedAt',
      label: t('runs.header.started'),
      children: run.startedAt ? formatDateTime(run.startedAt) : '—',
    },
    {
      key: 'duration',
      label: t('runs.header.duration'),
      children: duration !== null ? formatDuration(duration) : '—',
    },
    { key: 'attempt', label: t('runs.header.attempt'), children: String(run.attempt) },
    {
      key: 'actionCount',
      label: t('runs.header.actions'),
      children: String(Math.max(run.actionCount, loggedActions)),
    },
    {
      key: 'errorCode',
      label: t('runs.header.reason'),
      children: run.errorCode === null ? '—' : <Reason code={run.errorCode} />,
      wide: run.errorCode !== null,
    },
  ]

  return (
    <div>
      <dl className={styles.metadata}>
        {items.map((item) => (
          <div className={cx(styles.item, item.wide && styles.wide)} key={item.key}>
            <dt className={styles.label}>{item.label}</dt>
            <dd className={styles.value}>{item.children}</dd>
          </div>
        ))}
      </dl>
      {run.summaryOnly ? (
        <Typography.Text type="secondary">{t('runs.header.summaryOnly')}</Typography.Text>
      ) : null}
    </div>
  )
}
