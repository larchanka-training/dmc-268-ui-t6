import { BranchesOutlined } from '@ant-design/icons'
import { Alert, Button, Flex, Tooltip, Typography } from 'antd'
import type { FC, ReactNode, Ref } from 'react'

import type { RulesDiagnostic, RulesStatus } from '../../../entities/repository'
import { useTranslation } from '../../../shared/i18n'
import type { VcsProvider } from '../../../shared/model/provider'
import { CodeBlock, Spinner, Tag } from '../../../shared/ui'
import {
  describeDiagnosticLimit,
  describeDiagnosticLocation,
  diagnosticText,
  formatCheckedAt,
  isKnownDiagnosticCode,
  isKnownUnavailableCode,
  shortSha,
  unavailableReason,
} from '../lib/rulesStatusView'
import styles from './RulesStatusPanel.module.css'

const { Text } = Typography

// What the server puts in `defaultsVersion` when the repository has no active rule version.
const UNKNOWN_DEFAULTS_VERSION = 'unknown'

const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className={styles.sublabel}>{title}</h3>
    {children}
  </div>
)

/**
 * The file text as plain text: a string child of `<pre>`, never parsed as Markdown or HTML. The
 * wrapper caps the height and scrolls, so a long file does not push the page down; it takes focus
 * so the keyboard can scroll it.
 */
const FileText: FC<{ text: string | null }> = ({ text }) => {
  const { t } = useTranslation()
  if (text === null) {
    return <Text type="secondary">{t('rules.fileTextUnavailable')}</Text>
  }
  if (text === '') {
    return <Text type="secondary">{t('rules.fileEmpty')}</Text>
  }
  return (
    <div aria-label={t('rules.fileTextLabel')} className={styles.scroll} role="region" tabIndex={0}>
      <CodeBlock>{text}</CodeBlock>
    </div>
  )
}

const DiagnosticList: FC<{ diagnostics: RulesDiagnostic[] }> = ({ diagnostics }) => {
  // Subscribes to the language: the text and the limit below come from the dictionary.
  const { t } = useTranslation()
  return (
    <ul className={styles.list}>
      {diagnostics.map((diagnostic, index) => {
        const location = describeDiagnosticLocation(diagnostic)
        const limit = describeDiagnosticLimit(diagnostic)
        return (
          <li key={`${diagnostic.code}-${String(index)}`}>
            <code>{diagnostic.code}</code>
            {location !== null ? (
              <>
                <span className={styles.positionGap}> </span>
                <span className={styles.position}>{location}</span>
              </>
            ) : null}{' '}
            <span>{diagnosticText(diagnostic)}</span>
            {limit !== null ? <span> ({limit})</span> : null}
            {/* The server message of an unknown code already quotes the mask. */}
            {diagnostic.excerpt !== undefined && isKnownDiagnosticCode(diagnostic.code) ? (
              <span>
                {' '}
                ({t('rules.mask')} <code>{diagnostic.excerpt}</code>)
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

/** What a status that has been read carries: where the file was read from and when. */
const Meta: FC<{ status: Exclude<RulesStatus, { status: 'pending' }>; tag?: ReactNode }> = ({
  status,
  tag,
}) => {
  const { t } = useTranslation()
  return (
    <Flex align="center" className={styles.meta} gap={8} wrap>
      {tag}
      <code>{status.path}</code>
      <Tag icon={<BranchesOutlined />} variant="outline">
        {status.branch}
      </Tag>
      {status.sha !== null ? (
        <Tooltip title={status.sha} trigger={['hover', 'focus']}>
          <code className={styles.sha} tabIndex={0}>
            {shortSha(status.sha)}
          </code>
        </Tooltip>
      ) : null}
      <Text type="secondary">
        {t('rules.checked', { date: formatCheckedAt(status.checkedAt) })}
      </Text>
    </Flex>
  )
}

export interface RulesStatusDetailsProps {
  status: RulesStatus
  provider?: VcsProvider
  /** Asks the server again; offered only where the server said a retry can help. */
  onRetry: () => void
  /** For the owner of the focus: the retry button reports here when it comes and goes. */
  retryRef: Ref<HTMLButtonElement>
  retrying: boolean
}

/** One of the five answers the server gives for `.review/rules.md`. */
export const RulesStatusDetails: FC<RulesStatusDetailsProps> = ({
  status,
  provider = 'github',
  onRetry,
  retryRef,
  retrying,
}) => {
  const { t } = useTranslation()
  switch (status.status) {
    case 'present':
      return (
        <Flex gap={12} vertical>
          <Meta status={status} tag={<Tag tone="success">{t('rules.fileFound')}</Tag>} />
          <Section title={t('rules.fileText')}>
            <FileText text={status.text} />
          </Section>
          <Section title={t('rules.ignoredPaths')}>
            {status.ignoreMasks.length > 0 ? (
              <ul className={styles.list}>
                {status.ignoreMasks.map((mask, index) => (
                  <li key={`${mask}-${String(index)}`}>
                    <code>{mask}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <Text type="secondary">{t('rules.noMasks')}</Text>
            )}
          </Section>
          {status.diagnostics.length > 0 ? (
            <Section title={t('rules.diagnostics')}>
              <DiagnosticList diagnostics={status.diagnostics} />
            </Section>
          ) : null}
        </Flex>
      )
    case 'pending':
      return (
        <Flex align="center" gap={8} role="status">
          <Spinner label={null} size="sm" />
          <Text type="secondary">{t('rules.checking', { branch: status.branch })}</Text>
        </Flex>
      )
    case 'missing':
      return (
        <Flex gap={12} vertical>
          <Alert
            description={
              status.defaultsVersion === UNKNOWN_DEFAULTS_VERSION
                ? undefined
                : t('rules.defaultsVersion', { version: status.defaultsVersion })
            }
            showIcon
            title={t('rules.missing')}
            type="warning"
          />
          <Meta status={status} />
        </Flex>
      )
    case 'invalid':
      return (
        <Flex gap={12} vertical>
          <Alert
            description={<DiagnosticList diagnostics={status.diagnostics} />}
            showIcon
            title={t('rules.invalid')}
            type="error"
          />
          <Meta status={status} />
          <Section title={t('rules.fileText')}>
            <FileText text={status.text} />
          </Section>
        </Flex>
      )
    case 'unavailable':
      return (
        <Flex gap={12} vertical>
          <Alert
            action={
              status.diagnostics.some((diagnostic) => diagnostic.retryable) ? (
                <Button loading={retrying} onClick={onRetry} ref={retryRef} size="small">
                  {t('rules.retry')}
                </Button>
              ) : undefined
            }
            description={
              <ul className={styles.list}>
                {status.diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.code}-${String(index)}`}>
                    <span>{unavailableReason(diagnostic.code, diagnostic.message, provider)}</span>
                    {isKnownUnavailableCode(diagnostic.code) ? null : (
                      <>
                        {' '}
                        <code>{diagnostic.code}</code>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            }
            showIcon
            title={t('rules.unavailable')}
            type="error"
          />
          <Meta status={status} />
        </Flex>
      )
  }
}
