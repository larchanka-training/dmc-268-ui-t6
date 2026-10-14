import { BranchesOutlined } from '@ant-design/icons'
import { Alert, Button, Flex, Tooltip, Typography } from 'antd'
import type { FC, ReactNode } from 'react'

import type { RulesDiagnostic, RulesStatus } from '../../../entities/repository'
import { CodeBlock, Tag } from '../../../shared/ui'
import {
  describeDiagnosticLimit,
  describeDiagnosticLocation,
  formatCheckedAt,
  shortSha,
  unavailableReason,
} from '../lib/rulesStatusView'
import styles from './RulesStatusPanel.module.css'

const { Text } = Typography

const MISSING_WARNING = 'Используются дефолтные правила, создайте .review/rules.md'

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
  if (text === null) {
    return <Text type="secondary">Текст файла недоступен</Text>
  }
  if (text === '') {
    return <Text type="secondary">Файл пуст</Text>
  }
  return (
    <div aria-label="Текст файла правил" className={styles.scroll} role="region" tabIndex={0}>
      <CodeBlock>{text}</CodeBlock>
    </div>
  )
}

const DiagnosticList: FC<{ diagnostics: RulesDiagnostic[] }> = ({ diagnostics }) => (
  <ul className={styles.list}>
    {diagnostics.map((diagnostic, index) => {
      const location = describeDiagnosticLocation(diagnostic)
      const limit = describeDiagnosticLimit(diagnostic)
      return (
        <li key={`${diagnostic.code}-${String(index)}`}>
          <code>{diagnostic.code}</code>
          {location !== null ? <span className={styles.position}>{location}</span> : null}{' '}
          <span>{diagnostic.message}</span>
          {limit !== null ? <span> ({limit})</span> : null}
        </li>
      )
    })}
  </ul>
)

/** What every status carries: where the file was read from and when. */
const Meta: FC<{ status: RulesStatus; tag?: ReactNode }> = ({ status, tag }) => (
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
    <Text type="secondary">Проверено: {formatCheckedAt(status.checkedAt)}</Text>
  </Flex>
)

export interface RulesStatusDetailsProps {
  status: RulesStatus
  /** Asks the server again; offered only where the server said a retry can help. */
  onRetry: () => void
  retrying: boolean
}

/** One of the four answers the server gives for `.review/rules.md`. */
export const RulesStatusDetails: FC<RulesStatusDetailsProps> = ({ status, onRetry, retrying }) => {
  switch (status.status) {
    case 'present':
      return (
        <Flex gap={12} vertical>
          <Meta status={status} tag={<Tag tone="success">Файл найден</Tag>} />
          <Section title="Текст файла">
            <FileText text={status.text} />
          </Section>
          <Section title="Игнорируемые пути">
            {status.ignoreMasks.length > 0 ? (
              <ul className={styles.list}>
                {status.ignoreMasks.map((mask, index) => (
                  <li key={`${mask}-${String(index)}`}>
                    <code>{mask}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <Text type="secondary">Масок нет</Text>
            )}
          </Section>
          {status.diagnostics.length > 0 ? (
            <Section title="Диагностика">
              <DiagnosticList diagnostics={status.diagnostics} />
            </Section>
          ) : null}
        </Flex>
      )
    case 'missing':
      return (
        <Flex gap={12} vertical>
          <Alert
            description={`Версия дефолтных правил: ${status.defaultsVersion}`}
            showIcon
            title={MISSING_WARNING}
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
            title="Файл правил содержит ошибки"
            type="error"
          />
          <Meta status={status} />
          <Section title="Текст файла">
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
                <Button loading={retrying} onClick={onRetry} size="small">
                  Повторить
                </Button>
              ) : undefined
            }
            description={
              <ul className={styles.list}>
                {status.diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.code}-${String(index)}`}>
                    <span>{unavailableReason(diagnostic.code)}</span> <code>{diagnostic.code}</code>
                  </li>
                ))}
              </ul>
            }
            showIcon
            title="Не удалось прочитать файл правил"
            type="error"
          />
          <Meta status={status} />
        </Flex>
      )
  }
}
