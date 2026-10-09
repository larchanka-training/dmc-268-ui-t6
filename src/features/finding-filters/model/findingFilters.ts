import { z } from 'zod'

import {
  SEVERITY_BADGE_GROUPS,
  severityBadgeGroup,
  type FindingView,
  type SeverityBadgeGroup,
} from '../../../entities/review'

export interface FindingFilters {
  files: string[]
  severities: SeverityBadgeGroup[]
  query: string
}

export const EMPTY_FINDING_FILTERS: FindingFilters = { files: [], severities: [], query: '' }

const FILE_PARAM = 'file'
const SEVERITY_PARAM = 'severity'
const QUERY_PARAM = 'q'

const FILE_MAX_LENGTH = 1024
const QUERY_MAX_LENGTH = 200

// URL params are external input: every value is checked on its own and a bad one is dropped.
const FileParamSchema = z.string().min(1).max(FILE_MAX_LENGTH)
const SeverityParamSchema = z.enum(SEVERITY_BADGE_GROUPS)
const QueryParamSchema = z.string().transform((value) => value.slice(0, QUERY_MAX_LENGTH))

export function parseFindingFilters(params: URLSearchParams): FindingFilters {
  const files = new Set<string>()
  for (const value of params.getAll(FILE_PARAM)) {
    const parsed = FileParamSchema.safeParse(value)
    if (parsed.success) {
      files.add(parsed.data)
    }
  }

  const severities = new Set<SeverityBadgeGroup>()
  for (const value of params.getAll(SEVERITY_PARAM)) {
    const parsed = SeverityParamSchema.safeParse(value)
    if (parsed.success) {
      severities.add(parsed.data)
    }
  }

  const query = QueryParamSchema.safeParse(params.get(QUERY_PARAM) ?? '')

  return {
    files: [...files],
    severities: SEVERITY_BADGE_GROUPS.filter((group) => severities.has(group)),
    query: query.success ? query.data : '',
  }
}

/** Replaces only `file`, `severity` and `q`; every other param is kept. Empty values are omitted. */
export function writeFindingFilters(prev: URLSearchParams, next: FindingFilters): URLSearchParams {
  const params = new URLSearchParams(prev)
  params.delete(FILE_PARAM)
  params.delete(SEVERITY_PARAM)
  params.delete(QUERY_PARAM)
  for (const file of next.files) {
    if (file !== '') {
      params.append(FILE_PARAM, file)
    }
  }
  for (const severity of next.severities) {
    params.append(SEVERITY_PARAM, severity)
  }
  if (next.query !== '') {
    params.set(QUERY_PARAM, next.query)
  }
  return params
}

/** A severity group or a non-blank query is selected: files without a passing finding drop out. */
export function hasContentFilter(filters: FindingFilters): boolean {
  return filters.severities.length > 0 || filters.query.trim() !== ''
}

export function hasActiveFindingFilters(filters: FindingFilters): boolean {
  return filters.files.length > 0 || hasContentFilter(filters)
}

/**
 * The files of the filter that the run really has. Read-time only: the result is never written
 * back to the URL, otherwise `file=` would be wiped while `/diff` is still loading.
 */
export function effectiveFileFilter(
  files: readonly string[],
  runFiles: readonly string[],
): string[] {
  const inRun = new Set(runFiles)
  return files.filter((file) => inRun.has(file))
}

/** AND of the three filters; `effectiveFiles` comes from `effectiveFileFilter`, not from `filters.files`. */
export function matchesFindingFilters(
  finding: FindingView,
  filters: FindingFilters,
  effectiveFiles: readonly string[],
): boolean {
  if (effectiveFiles.length > 0 && !effectiveFiles.includes(finding.file)) {
    return false
  }
  if (
    filters.severities.length > 0 &&
    !filters.severities.includes(severityBadgeGroup(finding.severity))
  ) {
    return false
  }
  const query = filters.query.trim().toLowerCase()
  if (query === '') {
    return true
  }
  return [finding.title, finding.body, finding.ruleName].some(
    (text) => text?.toLowerCase().includes(query) === true,
  )
}
