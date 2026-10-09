import type { JSX } from 'react'
import { Alert, List } from 'antd'

import type { FileDiff } from '../../../entities/diff'
import { findingCardKey } from '../lib/findingCardKey'
import { mergeFindings } from '../lib/mergeFindings'
import { highlightBudgetLines } from '../lib/tokensForHunks'
import type { FindingView, ReviewComment } from '../../../entities/review'
import {
  EMPTY_FINDING_FILTERS,
  FindingFiltersBar,
  effectiveFileFilter,
  hasContentFilter,
  matchesFindingFilters,
  type FindingFilters,
  type FindingFiltersChange,
} from '../../../features/finding-filters'
import type { ContextGap } from '../model/types'
import { InlineComment } from './InlineComment'
import { DiffViewer } from './DiffViewer'

interface RunDiffProps {
  summaryOnly: boolean
  files: FileDiff[]
  /** Files as fetched, before context expansion; the total highlight budget counts these. Defaults to `files`. */
  budgetFiles?: FileDiff[]
  findings: FindingView[]
  comments?: ReviewComment[]
  fileTotalLines?: Record<string, number>
  onLoadMore?: (file: FileDiff, gap: ContextGap) => void
  /** Applied only together with `onFiltersChange`; without it the run renders unfiltered. */
  filters?: FindingFilters
  onFiltersChange?: (change: FindingFiltersChange, options?: { replace?: boolean }) => void
  /** Defaults to `onFiltersChange(EMPTY_FINDING_FILTERS)`. */
  onFiltersReset?: () => void
  /** The debounced search text; defaults to `onFiltersChange({ query }, { replace: true })`. */
  onFiltersQueryChange?: (query: string) => void
  /** `/comments` has not answered yet: the set is still incomplete, so "nothing matches" is not shown. */
  commentsPending?: boolean
  /** Changes when the URL was changed by a navigation the page did not make (back, a link). */
  filtersNavigationKey?: number
}

function findingsOutsideVisibleDiff(files: FileDiff[], findings: FindingView[]): FindingView[] {
  const byFilename = new Map(files.map((file) => [file.filename, file]))
  return findings.filter((finding) => {
    const file = byFilename.get(finding.file)
    if (file === undefined) {
      return true
    }
    return !file.hasPatch || file.chunks.length === 0
  })
}

/**
 * Every finding the page shows: the run findings plus the comments of files that render a diff
 * (a summary-only run renders no comments).
 */
function displayedFindings(
  summaryOnly: boolean,
  files: FileDiff[],
  findings: FindingView[],
  comments: ReviewComment[],
): FindingView[] {
  if (summaryOnly) {
    return findings
  }
  const withDiff = new Set(
    files.filter((file) => file.hasPatch && file.chunks.length > 0).map((file) => file.filename),
  )
  return mergeFindings(
    findings,
    comments.filter((comment) => withDiff.has(comment.file)),
  )
}

function outsideCards(findings: FindingView[], searchActive: boolean): JSX.Element[] {
  return findings.map((finding) => (
    <InlineComment
      defaultExpanded={searchActive}
      file={{ filename: finding.file, chunks: [], hasPatch: false }}
      finding={finding}
      key={findingCardKey(finding.id, searchActive)}
    />
  ))
}

export function RunDiff(props: RunDiffProps): JSX.Element {
  const {
    summaryOnly,
    files,
    budgetFiles,
    findings,
    comments = [],
    fileTotalLines,
    onLoadMore,
    filters = EMPTY_FINDING_FILTERS,
    onFiltersChange,
    onFiltersReset,
    onFiltersQueryChange,
    commentsPending = false,
    filtersNavigationKey,
  } = props

  const activeFilters = onFiltersChange === undefined ? EMPTY_FINDING_FILTERS : filters
  const displayed = displayedFindings(summaryOnly, files, findings, comments)
  const runFiles = [
    ...new Set([...files.map((file) => file.filename), ...displayed.map((f) => f.file)]),
  ]
  const effectiveFiles = effectiveFileFilter(activeFilters.files, runFiles)
  const contentFilter = hasContentFilter(activeFilters)
  const filtering = effectiveFiles.length > 0 || contentFilter
  const searchActive = activeFilters.query.trim() !== ''
  const shownFindings = displayed.filter((finding) =>
    matchesFindingFilters(finding, activeFilters, effectiveFiles),
  )
  const filesWithHits = new Set(shownFindings.map((finding) => finding.file))
  const visibleFiles = files.filter(
    (file) =>
      (effectiveFiles.length === 0 || effectiveFiles.includes(file.filename)) &&
      (!contentFilter || filesWithHits.has(file.filename)),
  )

  const outsideFindings = findingsOutsideVisibleDiff(files, shownFindings)
  // The highlight budget is the whole run's, never the visible files'.
  const diffTotalLines = highlightBudgetLines(budgetFiles ?? files)

  const controls = onFiltersChange
    ? {
        onChange: onFiltersChange,
        onQueryChange:
          onFiltersQueryChange ??
          ((query: string) => {
            onFiltersChange({ query }, { replace: true })
          }),
        onReset:
          onFiltersReset ??
          (() => {
            onFiltersChange(EMPTY_FINDING_FILTERS)
          }),
      }
    : undefined
  const filtersBar = controls ? (
    <FindingFiltersBar
      empty={filtering && shownFindings.length === 0 && !commentsPending}
      fileOptions={runFiles.map((file) => ({
        file,
        count: displayed.filter((finding) => finding.file === file).length,
      }))}
      filters={filters}
      navigationKey={filtersNavigationKey}
      onChange={controls.onChange}
      onQueryChange={controls.onQueryChange}
      onReset={controls.onReset}
      shown={shownFindings.length}
      total={displayed.length}
    />
  ) : null

  if (summaryOnly) {
    return (
      <div>
        {filtersBar}
        <Alert
          description="Больше 3 000 строк — показан только список файлов, построчного ревью нет."
          title="Дифф слишком большой"
          type="info"
        />
        {visibleFiles.length > 0 || !filtering ? (
          <List
            dataSource={visibleFiles.map((f) => f.filename)}
            renderItem={(filename) => <List.Item>{filename}</List.Item>}
          />
        ) : null}
        {outsideFindings.length > 0 ? (
          <Alert
            data-testid="findings-outside-diff"
            description={<div>{outsideCards(outsideFindings, searchActive)}</div>}
            style={{ marginTop: 12 }}
            title="Замечания вне диффа"
            type="warning"
          />
        ) : null}
      </div>
    )
  }

  return (
    <div>
      {filtersBar}
      {visibleFiles.map((file) => (
        <div key={file.filename}>
          <DiffViewer
            diffTotalLines={diffTotalLines}
            file={file}
            findings={shownFindings}
            onLoadMore={
              onLoadMore
                ? (gap) => {
                    onLoadMore(file, gap)
                  }
                : undefined
            }
            searchActive={searchActive}
            totalLines={fileTotalLines?.[file.filename]}
          />
        </div>
      ))}
      {outsideFindings.length > 0 ? (
        <Alert
          data-testid="findings-outside-diff"
          description={<div>{outsideCards(outsideFindings, searchActive)}</div>}
          style={{ marginTop: 12 }}
          title="Замечания вне диффа"
          type="warning"
        />
      ) : null}
    </div>
  )
}
