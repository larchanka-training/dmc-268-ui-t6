import type { JSX } from 'react'
import { SearchOutlined } from '@ant-design/icons'
import { Button, Flex, Input, Select, Typography } from 'antd'

import {
  SEVERITY_BADGE_GROUPS,
  SEVERITY_BADGE_LABEL,
  type SeverityBadgeGroup,
} from '../../../entities/review'
import { hasActiveFindingFilters, type FindingFilters } from '../model/findingFilters'
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
  /** Selects push a history entry; typing passes `{ replace: true }`. */
  onChange: (next: FindingFilters, options?: { replace?: boolean }) => void
  onReset: () => void
}

const SEVERITY_OPTIONS = SEVERITY_BADGE_GROUPS.map((group) => ({
  value: group,
  label: SEVERITY_BADGE_LABEL[group],
}))

export function FindingFiltersBar(props: FindingFiltersBarProps): JSX.Element {
  const { filters, fileOptions, shown, total, onChange, onReset } = props

  const fileSelectOptions = fileOptions.map(({ file, count }) => ({
    value: file,
    label: `${file} (${String(count)})`,
  }))
  // A whitespace-only query is not "active" for the filter, but it is in the URL and must be clearable.
  const canReset = hasActiveFindingFilters(filters) || filters.query !== ''

  return (
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
          onChange({ ...filters, files })
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
            ...filters,
            severities: SEVERITY_BADGE_GROUPS.filter((group) => values.includes(group)),
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
        onChange={(event) => {
          onChange({ ...filters, query: event.target.value }, { replace: true })
        }}
        placeholder="Поиск по замечаниям"
        prefix={<SearchOutlined />}
        value={filters.query}
      />
      <Typography.Text type="secondary">
        {`Показано ${String(shown)} из ${String(total)} замечаний`}
      </Typography.Text>
      <Button disabled={!canReset} onClick={onReset}>
        Сбросить фильтры
      </Button>
    </Flex>
  )
}
