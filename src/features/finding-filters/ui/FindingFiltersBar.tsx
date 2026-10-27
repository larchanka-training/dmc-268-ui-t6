import { useId, useRef, type JSX } from 'react'
import { CloseCircleFilled, SearchOutlined } from '@ant-design/icons'
import { Button, Empty, Flex, Form, Input, Select, Typography, type RefSelectProps } from 'antd'

import {
  SEVERITY_BADGE_GROUPS,
  SEVERITY_BADGE_LABEL,
  type SeverityBadgeGroup,
} from '../../../entities/review'
import { useTranslation } from '../../../shared/i18n'
import {
  effectiveFileFilter,
  hasActiveFindingFilters,
  QUERY_MAX_LENGTH,
  type FindingFilters,
  type FindingFiltersChange,
} from '../model/findingFilters'
import type { SubscribeFilterNavigation } from '../model/useFindingFiltersParams'
import { useQueryText } from '../model/useQueryText'
import styles from './FindingFiltersBar.module.css'

export interface FindingFileOption {
  file: string
  count: number
}

export interface FindingFiltersBarProps {
  filters: FindingFilters
  fileOptions: FindingFileOption[]
  /** Findings that pass the filters. */
  shown: number
  /** Findings of the run before filtering. */
  total: number
  /** The active run is still producing findings, so no final count is shown. */
  findingsPending?: boolean
  /** The filters are in effect and nothing passes: shows the message with its own reset button. */
  empty?: boolean
  /**
   * Selects push a history entry. A select sends only the field it owns plus the typed text (so a
   * pending search write is not lost); the owner merges it over the URL.
   */
  onChange: (change: FindingFiltersChange, options?: { replace?: boolean }) => void
  /** The search text, debounced; the owner writes only `q` and replaces the history entry. */
  onQueryChange: (query: string) => void
  onReset: () => void
  /** Changes when the URL was changed by a navigation the owner did not make (back, a link). */
  navigationKey?: number
  subscribeToNavigation?: SubscribeFilterNavigation
}

const SEVERITY_OPTIONS = SEVERITY_BADGE_GROUPS.map((group) => ({
  value: group,
  label: SEVERITY_BADGE_LABEL[group],
}))

// A longer name is cut with «...» so that its chip and the «+N» chip share one row.
const FILE_TAG_MAX_LENGTH = 11

// rc-select names a clear button "Clear", and antd's ru_RU does not translate it. An `allowClear`
// object gives it a name of the current language but replaces the icon, so Ant Design's own icon
// is passed again. The search's clear button is named by its icon ("close-circle"), so the icon
// carries the name. Built in the component, where the texts of the current language are at hand.

/** The chip for the selected values that do not fit: short, so that the first chip keeps its room. */
function restChip(omitted: readonly unknown[]): string {
  return `+${String(omitted.length)}`
}

/** A chip shows the file name, so the first selected file stays readable in a narrow select. */
function fileName(file: string): string {
  const name = file.slice(file.lastIndexOf('/') + 1)
  return name === '' ? file : name
}

export function FindingFiltersBar(props: FindingFiltersBarProps): JSX.Element {
  const {
    filters,
    fileOptions,
    shown,
    total,
    findingsPending = false,
    empty = false,
    onChange,
    onQueryChange,
    onReset,
    navigationKey,
    subscribeToNavigation,
  } = props
  const { text, type, takePending, clear } = useQueryText(
    filters.query,
    onQueryChange,
    navigationKey,
    subscribeToNavigation,
  )
  const { t } = useTranslation()
  const filesClear = { clearIcon: <CloseCircleFilled />, label: t('runs.filters.clearFiles') }
  const severityClear = {
    clearIcon: <CloseCircleFilled />,
    label: t('runs.filters.clearSeverity'),
  }
  const searchClear = {
    clearIcon: <CloseCircleFilled aria-label={t('runs.filters.clearSearch')} />,
  }
  const id = useId()
  const filesRef = useRef<RefSelectProps>(null)
  const filesId = `${id}-files`
  const severityId = `${id}-severity`
  const searchId = `${id}-search`

  // The list shows the whole path; the chip's tooltip (`title`) keeps it too.
  const fileSelectOptions = fileOptions.map(({ file, count }) => ({
    value: file,
    label: `${file} (${String(count)})`,
    title: file,
  }))
  const effectiveFiles = effectiveFileFilter(
    filters.files,
    fileOptions.map(({ file }) => file),
  )
  // A whitespace-only query is not "active" for the filter, but it is in the URL and must be clearable.
  const canReset =
    hasActiveFindingFilters({ ...filters, files: effectiveFiles }) ||
    filters.query !== '' ||
    text !== ''
  // Both reset buttons empty the search text here as well: it is local, the URL alone cannot clear it.
  // The focus goes to the start of the bar: the bar's button turns disabled and the empty message
  // with its button goes away, so the focus would otherwise fall back to the page.
  const reset = () => {
    clear()
    onReset()
    filesRef.current?.focus()
  }

  return (
    <>
      <Form className={styles.bar} data-testid="finding-filters-bar" layout="inline">
        <Form.Item className={styles.files} htmlFor={filesId} label={t('runs.filters.files')}>
          <Select
            allowClear={filesClear}
            aria-label={t('runs.filters.files')}
            id={filesId}
            labelRender={({ value }) => fileName(String(value))}
            maxTagCount="responsive"
            maxTagPlaceholder={restChip}
            maxTagTextLength={FILE_TAG_MAX_LENGTH}
            mode="multiple"
            onChange={(files: string[]) => {
              onChange({
                files: [
                  ...files,
                  ...filters.files.filter((file) => !effectiveFiles.includes(file)),
                ],
                query: takePending(),
              })
            }}
            options={fileSelectOptions}
            placeholder={t('runs.filters.allFiles')}
            ref={filesRef}
            value={effectiveFiles}
          />
        </Form.Item>
        <Form.Item
          className={styles.severity}
          htmlFor={severityId}
          label={t('runs.filters.severity')}
        >
          <Select
            allowClear={severityClear}
            aria-label={t('runs.filters.severity')}
            id={severityId}
            maxTagCount="responsive"
            maxTagPlaceholder={restChip}
            mode="multiple"
            onChange={(values: SeverityBadgeGroup[]) => {
              onChange({
                severities: SEVERITY_BADGE_GROUPS.filter((group) => values.includes(group)),
                query: takePending(),
              })
            }}
            options={SEVERITY_OPTIONS}
            placeholder={t('runs.filters.allLevels')}
            value={filters.severities}
          />
        </Form.Item>
        {/* The visible label is short; the accessible name is longer and contains it. */}
        <Form.Item className={styles.search} htmlFor={searchId} label={t('runs.filters.search')}>
          <Input
            allowClear={searchClear}
            aria-label={t('runs.filters.searchLabel')}
            id={searchId}
            maxLength={QUERY_MAX_LENGTH}
            onChange={(event) => {
              type(event.target.value)
            }}
            placeholder={t('runs.filters.searchPlaceholder')}
            prefix={<SearchOutlined />}
            value={text}
          />
        </Form.Item>
        {/* One group: the reset button wraps with the counter, never alone. */}
        <Flex align="center" className={styles.summary} gap="small">
          <Typography.Text role="status" type="secondary">
            {findingsPending
              ? t('runs.filters.pending')
              : t('runs.filters.shown', { shown, count: total })}
          </Typography.Text>
          <Button disabled={!canReset} onClick={reset}>
            {t('runs.filters.reset')}
          </Button>
        </Flex>
      </Form>
      {empty ? (
        <div data-testid="findings-filter-empty">
          <Empty description={t('runs.filters.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button onClick={reset}>{t('runs.filters.reset')}</Button>
          </Empty>
        </div>
      ) : null}
    </>
  )
}
