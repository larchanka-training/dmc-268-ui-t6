import { Alert, Button, Empty, Form, Input, Select, Skeleton } from 'antd'
import { useId, useState, type JSX, type ReactNode } from 'react'
import { useHref, useLinkClickHandler } from 'react-router'

import {
  useRepositories,
  useRepositoryRulesStatusRetry,
  type Repository,
  type RulesDiagnostic,
  type RulesStatus,
} from '../../entities/repository'
import {
  activeSimulationId,
  isFinalSimulationError,
  rejectedRulesDiagnostics,
  useRulesSimulation,
  useStartRulesSimulation,
} from '../../entities/rules-simulation'
import { useTranslation } from '../../shared/i18n'
import { ErrorBoundary, PageHeader, Segmented } from '../../shared/ui'
import { CodeEditor } from '../../shared/ui/CodeEditor/CodeEditor'
import type {
  CodeEditorCompletion,
  CodeEditorDiagnostic,
} from '../../shared/ui/CodeEditor/editorExtensions'
import { diagnosticText, RulesStatusView } from '../../widgets/repository-rules'
import styles from './PlaygroundPage.module.css'
import { SimulationResult, type SimulationLaunch } from './ui/SimulationResult'

type RulesSource = 'repository' | 'defaults'
type Mode = 'code' | 'diff'

/** The editor picks the syntax by the file name: in Diff mode the text is a unified diff. */
const DIFF_FILE_NAME = 'changes.diff'

const REVIEW_IGNORE_BLOCK = '```review-ignore\n\n```'

/** RULES_FORMAT_SPEC §1: the recommended headings and the one machine block. */
const RULES_COMPLETIONS: readonly CodeEditorCompletion[] = [
  { label: '# Security', insert: '# Security' },
  { label: '# Performance', insert: '# Performance' },
  { label: '# Style', insert: '# Style' },
  {
    label: '```review-ignore',
    insert: REVIEW_IGNORE_BLOCK,
    cursor: REVIEW_IGNORE_BLOCK.indexOf('\n') + 1,
  },
]

const NO_DIAGNOSTICS: readonly CodeEditorDiagnostic[] = []

function LinkButton(props: { to: string; children: ReactNode }): JSX.Element {
  const href = useHref(props.to)
  const handleClick = useLinkClickHandler<HTMLAnchorElement | HTMLButtonElement>(props.to)
  return (
    <Button href={href} onClick={handleClick}>
      {props.children}
    </Button>
  )
}

/** The text of `.review/rules.md` the server read, or nothing while there is none to show. */
function serverRulesText(status: RulesStatus | undefined): string {
  switch (status?.status) {
    case 'present':
      return status.text
    case 'invalid':
      return status.text ?? ''
    default:
      return ''
  }
}

/**
 * Whether the rules a simulation would send are known. With no edit by the user that is the text the
 * server read, or no file (the defaults apply). While the file is not read yet (`pending`), could not
 * be read, or is refused unread, an empty text would run the defaults in its place.
 */
function serverRulesKnown(status: RulesStatus | undefined): boolean {
  switch (status?.status) {
    case 'present':
    case 'missing':
      return true
    case 'invalid':
      return status.text !== null
    default:
      return false
  }
}

function editorDiagnostics(diagnostics: readonly RulesDiagnostic[]): CodeEditorDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    line: diagnostic.line,
    column: diagnostic.column,
    message: diagnosticText(diagnostic),
  }))
}

/** The errors of a refused file, on their lines; a present file's warnings stay in the status. */
function rulesDiagnostics(status: RulesStatus | undefined): readonly CodeEditorDiagnostic[] {
  return status?.status === 'invalid' ? editorDiagnostics(status.diagnostics) : NO_DIAGNOSTICS
}

interface PlaygroundProps {
  repositories: readonly Repository[]
  /** The repository that pays until the user picks another one. */
  fallback: Repository
}

function Playground({ repositories, fallback }: PlaygroundProps): JSX.Element {
  const { t } = useTranslation()
  const repositoryId = useId()
  const sourceId = useId()
  const fileNameId = useId()
  const resultId = useId()
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [source, setSource] = useState<RulesSource>('repository')
  const [mode, setMode] = useState<Mode>('code')
  const [path, setPath] = useState('')
  const [code, setCode] = useState('')
  // What the user typed into the rules editor, for one repository. The text the server sends, now
  // or after a `pending` poll, is shown only until the user edits it: it never replaces an edit.
  const [rulesDraft, setRulesDraft] = useState<{ repoId: string; text: string } | null>(null)
  const [launch, setLaunch] = useState<SimulationLaunch | null>(null)
  const start = useStartRulesSimulation()
  const simulation = useRulesSimulation(launch?.id ?? null)

  const repository = repositories.find((item) => item.id === chosenId) ?? fallback
  const rules = useRepositoryRulesStatusRetry(repository.id)
  const status = rules.query.data
  const fromRepository = source === 'repository'
  const draft = rulesDraft?.repoId === repository.id ? rulesDraft.text : null
  const rulesText = !fromRepository ? '' : (draft ?? serverRulesText(status))
  // The errors of rules a simulation was refused for point at lines of the text that was sent, and
  // those of an invalid file at lines of the file the server read: once the user edits the text they
  // would mark the wrong lines, so they stay only in the error or the status.
  const sent = start.variables
  const refused = rejectedRulesDiagnostics(start.error)
  const diagnostics =
    refused !== null &&
    fromRepository &&
    sent?.repoId === repository.id &&
    sent.input.rulesMd === rulesText
      ? editorDiagnostics(refused)
      : fromRepository && draft === null
        ? rulesDiagnostics(status)
        : NO_DIAGNOSTICS
  // The 409 that names a running simulation is not an error: the page follows that simulation.
  const startError =
    start.error !== null && activeSimulationId(start.error) === null ? start.error : null

  const finished = simulation.data?.status === 'succeeded' || simulation.data?.status === 'failed'
  const stopped = simulation.isError && isFinalSimulationError(simulation.error)
  const busy = start.isPending || (launch !== null && !finished && !stopped)
  const rulesKnown = !fromRepository || draft !== null || serverRulesKnown(status)
  const canSimulate = !busy && code.trim() !== '' && rulesKnown

  function simulate(): void {
    // The repository that pays is the one selected now, whatever is selected by the answer.
    const paying = repository
    setLaunch(null)
    start.mutate(
      { repoId: paying.id, input: { mode, path, content: code, rulesMd: rulesText } },
      {
        onSuccess: ({ id }) => {
          setLaunch({ id, repositoryName: paying.fullName })
        },
        onError: (error) => {
          // A simulation of this user is still running (say, from before a reload): follow it.
          const id = activeSimulationId(error)
          if (id !== null) {
            setLaunch({ id, repositoryName: null })
          }
        },
      },
    )
  }

  return (
    <>
      <Form className={styles.toolbar} component="div" layout="vertical">
        <Form.Item
          className={styles.field}
          htmlFor={repositoryId}
          label={t('playground.repository')}
        >
          <Select
            id={repositoryId}
            options={repositories.map((item) => ({ value: item.id, label: item.fullName }))}
            value={repository.id}
            onChange={setChosenId}
          />
        </Form.Item>
        <Form.Item className={styles.field} htmlFor={sourceId} label={t('playground.rulesSource')}>
          <Select<RulesSource>
            id={sourceId}
            options={[
              { value: 'repository', label: t('playground.fromRepository') },
              { value: 'defaults', label: t('playground.defaultsOnly') },
            ]}
            value={source}
            onChange={setSource}
          />
        </Form.Item>
      </Form>
      <div className={styles.columns}>
        {/* A column that throws shows the block stub; the other one and what was typed stay. */}
        <ErrorBoundary>
          <div className={styles.inputs}>
            <Form className={styles.codeFields} component="div" layout="vertical">
              <Segmented<Mode>
                aria-label={t('playground.mode')}
                options={[
                  { value: 'code', label: t('playground.modeCode') },
                  { value: 'diff', label: t('playground.modeDiff') },
                ]}
                value={mode}
                onChange={setMode}
              />
              <Form.Item
                className={styles.field}
                htmlFor={fileNameId}
                label={t('playground.fileName')}
              >
                <Input
                  id={fileNameId}
                  placeholder={t('playground.fileNamePlaceholder')}
                  value={path}
                  onChange={(event) => {
                    setPath(event.target.value)
                  }}
                />
              </Form.Item>
            </Form>
            <div className={styles.block}>
              {/* The visible name of the editor; assistive tech reads it from `aria-label`. */}
              <span aria-hidden className={styles.label}>
                {t('playground.code')}
              </span>
              <CodeEditor
                aria-label={t('playground.code')}
                fileName={mode === 'diff' ? DIFF_FILE_NAME : path}
                value={code}
                onChange={setCode}
              />
            </div>
            <div className={styles.block}>
              {fromRepository ? (
                <RulesStatusView
                  provider={repository.provider}
                  rules={rules}
                  showFileText={false}
                />
              ) : null}
              <span aria-hidden className={styles.label}>
                {t('playground.rulesText')}
              </span>
              <CodeEditor
                aria-label={t('playground.rulesText')}
                completions={RULES_COMPLETIONS}
                diagnostics={diagnostics}
                fileName=".review/rules.md"
                readOnly={!fromRepository}
                value={rulesText}
                onChange={(text) => {
                  setRulesDraft({ repoId: repository.id, text })
                }}
              />
              {fromRepository ? null : (
                <span className={styles.note}>{t('playground.defaultsOnlyNote')}</span>
              )}
            </div>
          </div>
        </ErrorBoundary>
        <ErrorBoundary>
          <section aria-labelledby={resultId} className={styles.result}>
            <h2 className={styles.label} id={resultId}>
              {t('playground.result')}
            </h2>
            <Button
              className={styles.simulate}
              disabled={!canSimulate}
              onClick={simulate}
              type="primary"
            >
              {t('playground.simulate')}
            </Button>
            <SimulationResult
              launch={launch}
              readError={simulation.error}
              simulation={simulation.data}
              startError={startError}
              starting={start.isPending}
            />
          </section>
        </ErrorBoundary>
      </div>
    </>
  )
}

/**
 * The rules playground (ui#187): code and rules to try a review on. Nothing here is saved; the
 * selected repository pays for a simulation and lends its `.review/rules.md`.
 */
export function PlaygroundPage(): JSX.Element {
  const { t } = useTranslation()
  const repositories = useRepositories()
  const list = repositories.data
  const [first] = list ?? []

  const body = (() => {
    // A failed refetch keeps the list: the page and what the user typed stay.
    if (list === undefined) {
      if (repositories.isError) {
        return (
          <Alert
            action={
              <Button
                loading={repositories.isFetching}
                onClick={() => {
                  void repositories.refetch()
                }}
                size="small"
              >
                {t('playground.retry')}
              </Button>
            }
            showIcon
            title={t('playground.repositoriesFailed')}
            type="error"
          />
        )
      }
      return <Skeleton active />
    }
    if (first === undefined) {
      return (
        <Empty
          description={<span className={styles.emptyText}>{t('playground.empty')}</span>}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <LinkButton to="/repositories">{t('playground.goToRepositories')}</LinkButton>
        </Empty>
      )
    }
    return <Playground fallback={first} repositories={list} />
  })()

  return (
    <>
      <PageHeader description={t('playground.description')} title={t('playground.title')} />
      {body}
    </>
  )
}
