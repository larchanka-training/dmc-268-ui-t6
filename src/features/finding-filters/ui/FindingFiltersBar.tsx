import type { JSX } from 'react'
import { SearchOutlined } from '@ant-design/icons'
import { Button, Empty, Flex, Input, Select, Typography } from 'antd'

import {
  SEVERITY_BADGE_GROUPS,
  SEVERITY_BADGE_LABEL,
  type SeverityBadgeGroup,
} from '../../../entities/review'
import {
  hasActiveFindingFilters,
  QUERY_MAX_LENGTH,
  type FindingFilters,
  type FindingFiltersChange,
} from '../model/findingFilters'
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
}

const SEVERITY_OPTIONS = SEVERITY_BADGE_GROUPS.map((group) => ({
  value: group,
  label: SEVERITY_BADGE_LABEL[group],
}))

export function FindingFiltersBar(props: FindingFiltersBarProps): JSX.Element {
  const {
    filters,
    fileOptions,
    shown,
    total,
    empty = false,
    onChange,
    onQueryChange,
    onReset,
    navigationKey,
  } = props
  const { text, type, takePending, clear } = useQueryText(
    filters.query,
    onQueryChange,
    navigationKey,
  )

  const fileSelectOptions = fileOptions.map(({ file, count }) => ({
    value: file,
    label: `${file} (${String(count)})`,
  }))
  // A whitespace-only query is not "active" for the filter, but it is in the URL and must be clearable.
  const canReset = hasActiveFindingFilters(filters) || filters.query !== '' || text !== ''
  // Both reset buttons empty the search text here as well: it is local, the URL alone cannot clear it.
  const reset = () => {
    clear()
    onReset()
  }

  return (
    <>
      <Flex
        align="center"
        className={styles.bar}
        data-testid="finding-filters-bar"
        gap="small"
        wrap="wrap"
      >
        <Select
          allowClear
          aria-label="Файлы"
          className={styles.select}
          mode="multiple"
          onChange={(files: string[]) => {
            onChange({ files, query: takePending() })
          }}
          optionLabelProp="value"
          options={fileSelectOptions}
          placeholder="Файлы"
          value={filters.files}
        />
        <Select
          allowClear
          aria-label="Критичность"
          className={styles.select}
          mode="multiple"
          onChange={(values: SeverityBadgeGroup[]) => {
            onChange({
              severities: SEVERITY_BADGE_GROUPS.filter((group) => values.includes(group)),
              query: takePending(),
            })
          }}
          options={SEVERITY_OPTIONS}
          placeholder="Критичность"
          value={filters.severities}
        />
        <Input
          allowClear
          aria-label="Поиск по замечаниям"
          className={styles.search}
          maxLength={QUERY_MAX_LENGTH}
          onChange={(event) => {
            type(event.target.value)
          }}
          placeholder="Поиск по замечаниям"
          prefix={<SearchOutlined />}
          value={text}
        />
        <Typography.Text role="status">
          {`Показано ${String(shown)} из ${String(total)} замечаний`}
        </Typography.Text>
        <Button disabled={!canReset} onClick={reset}>
          Сбросить фильтры
        </Button>
      </Flex>
      {empty ? (
        <div data-testid="findings-filter-empty">
          <Empty
            description="Нет замечаний, подходящих под фильтры"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button onClick={reset}>Сбросить фильтры</Button>
          </Empty>
        </div>
      ) : null}
    </>
  )
}
