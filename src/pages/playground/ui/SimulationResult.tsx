import { Alert, Empty, Typography } from 'antd'
import type { JSX } from 'react'

import { SEVERITY_LABEL, SEVERITY_TAG } from '../../../entities/review'
import {
  isFinalSimulationError,
  rejectedRulesDiagnostics,
  simulationFailureMessage,
  simulationReadErrorMessage,
  simulationStartErrorMessage,
  type RulesSimulation,
  type SimulationFinding,
} from '../../../entities/rules-simulation'
import { formatPercent, formatUsd, useTranslation } from '../../../shared/i18n'
import { Spinner, Tag } from '../../../shared/ui'
import { RulesDiagnosticList } from '../../../widgets/repository-rules'
import styles from './SimulationResult.module.css'

const RULES_FILE = '.review/rules.md'
const DEFAULT_CHECK_PREFIX = 'service-defaults:'

/** The simulation the page follows. */
export interface SimulationLaunch {
  id: string
  /** The repository that pays, as it was when sent; null for one taken over from a `409`. */
  repositoryName: string | null
}

export interface SimulationResultProps {
  /** The POST is on its way. */
  starting: boolean
  /** Why the POST was refused; null when it was not, or when the page follows the one a 409 named. */
  startError: Error | null
  launch: SimulationLaunch | null
  simulation: RulesSimulation | undefined
  /** The last failed GET; the asking goes on through a server failure and stops on a final one. */
  readError: Error | null
}

/** A simulation costs a cent or so: below a dollar it keeps four decimals, `formatUsd` two. */
function simulationCost(costUsd: number): string {
  return costUsd === 0 || costUsd >= 1 ? formatUsd(costUsd) : `$${costUsd.toFixed(4)}`
}

function Progress(props: { text: string }): JSX.Element {
  return (
    <div className={styles.progress} role="status">
      <Spinner label={null} size="sm" />
      <span>{props.text}</span>
    </div>
  )
}

function FindingItem({ finding }: { finding: SimulationFinding }): JSX.Element {
  const { t } = useTranslation()
  const tag = SEVERITY_TAG[finding.severity]
  const { line, startLine, ruleName } = finding
  const lines =
    startLine !== null && startLine < line
      ? t('playground.lines', { start: startLine, end: line })
      : t('playground.line', { line })
  const source =
    ruleName === null
      ? t('playground.noRule')
      : ruleName.startsWith(DEFAULT_CHECK_PREFIX)
        ? t('playground.defaultCheck', { id: ruleName.slice(DEFAULT_CHECK_PREFIX.length) })
        : ruleName
  return (
    <li className={styles.finding}>
      <div className={styles.head}>
        <Tag tone={tag.tone} variant={tag.variant}>
          {SEVERITY_LABEL[finding.severity]}
        </Tag>
        <Typography.Text strong>{finding.title}</Typography.Text>
      </div>
      <Typography.Paragraph className={styles.body}>{finding.body}</Typography.Paragraph>
      <div className={styles.meta}>
        <span>{lines}</span>
        <Tag variant="outline">{ruleName === RULES_FILE ? <code>{source}</code> : source}</Tag>
        <span>{t('playground.confidence', { percent: formatPercent(finding.confidence) })}</span>
      </div>
    </li>
  )
}

/** The right column of the playground: the progress, the cost and the findings of a simulation. */
export function SimulationResult(props: SimulationResultProps): JSX.Element {
  const { starting, startError, launch, simulation, readError } = props
  const { t } = useTranslation()

  if (starting) {
    return <Progress text={t('playground.starting')} />
  }
  if (startError !== null) {
    const diagnostics = rejectedRulesDiagnostics(startError)
    return (
      <Alert
        description={
          diagnostics === null ? undefined : <RulesDiagnosticList diagnostics={diagnostics} />
        }
        showIcon
        title={simulationStartErrorMessage(startError)}
        type="error"
      />
    )
  }
  if (launch === null) {
    return <Empty description={t('playground.resultEmpty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }
  if (
    simulation === undefined ||
    simulation.status === 'queued' ||
    simulation.status === 'running'
  ) {
    // The POST answered `queued`: so it is until a GET says otherwise.
    return (
      <>
        {readError === null ? null : (
          <Alert showIcon title={simulationReadErrorMessage(readError)} type="error" />
        )}
        {readError !== null && isFinalSimulationError(readError) ? null : (
          <Progress
            text={
              simulation?.status === 'running' ? t('playground.running') : t('playground.queued')
            }
          />
        )}
      </>
    )
  }

  const cost = simulationCost(simulation.costUsd)
  return (
    <>
      {launch.repositoryName === null ? (
        <Typography.Text type="secondary">{t('playground.earlier')}</Typography.Text>
      ) : null}
      {simulation.status === 'failed' ? (
        <Alert showIcon title={simulationFailureMessage(simulation.errorCode)} type="error" />
      ) : null}
      <Typography.Text type="secondary">
        {launch.repositoryName === null
          ? t('playground.costEarlier', { cost })
          : t('playground.cost', { cost, repository: launch.repositoryName })}
      </Typography.Text>
      {simulation.status === 'failed' ? null : simulation.findings.length === 0 ? (
        <Empty description={t('playground.noFindings')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <ul aria-label={t('playground.findings')} className={styles.findings}>
          {simulation.findings.map((finding, index) => (
            // A finding has no id: the list is replaced whole, never reordered.
            <FindingItem finding={finding} key={index} />
          ))}
        </ul>
      )}
    </>
  )
}
