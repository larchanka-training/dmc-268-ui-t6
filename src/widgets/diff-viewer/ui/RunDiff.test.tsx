// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { diffApi, fromPatch } from '../../../entities/diff'
import { RunSessionSchema } from '../../../entities/run'
import { SAMPLE_PATCH_A, SAMPLE_PATCHES } from '../../../shared/fixtures/sample.patch'
import { useDiffViewerStore } from '../model/store'
import { RunDiff } from './RunDiff'

const PULL_REQUEST = {
  repo: 'larchanka-training/dmc-268-ui-t6',
  number: 40,
  title: 'feat: huge refactor',
  url: 'https://github.com/larchanka-training/dmc-268-ui-t6/pull/40',
  headSha: 'ffff9999ffff9999ffff9999ffff9999ffff9999',
}

const SUMMARY_ONLY_RUN_WIRE = {
  id: '33333333-3333-4333-8333-000000000001',
  engine: 'deep',
  model: 'claude-sonnet-5',
  status: 'succeeded',
  startedAt: '2026-09-18T07:00:00.000Z',
  finishedAt: '2026-09-18T07:20:00.000Z',
  attempt: 1,
  cancelRequested: false,
  summaryOnly: true,
  pullRequest: PULL_REQUEST,
  actionCount: 20,
  errorCode: null,
}

const SUMMARY_ONLY_DIFF_WIRE = [
  { filename: 'src/big-one.ts', patch: null },
  { filename: 'src/big-two.ts', patch: null },
]

beforeEach(() => {
  useDiffViewerStore.setState({ viewType: 'unified', selectedFile: null })
})

afterEach(() => {
  cleanup()
})

describe('RunDiff', () => {
  it('AC2: summary-only run shows the message and file list, no hunks', () => {
    const run = RunSessionSchema.parse(SUMMARY_ONLY_RUN_WIRE)
    const files = diffApi.diff.response.parse(SUMMARY_ONLY_DIFF_WIRE).map(fromPatch)

    const { container } = render(
      <RunDiff summaryOnly={run.summaryOnly} files={files} comments={[]} />,
    )

    expect(screen.getByText('Дифф слишком большой')).toBeTruthy()
    expect(
      screen.getByText('Больше 3 000 строк — показан только список файлов, построчного ревью нет.'),
    ).toBeTruthy()
    expect(screen.getByText('src/big-one.ts')).toBeTruthy()
    expect(screen.getByText('src/big-two.ts')).toBeTruthy()
    expect(screen.queryByText('Без диффа')).toBeNull()
    expect(container.querySelectorAll('.diff-line')).toHaveLength(0)
  })

  it('renders filenames and full diff content for a normal (non-summary) run', () => {
    const run = RunSessionSchema.parse({
      ...SUMMARY_ONLY_RUN_WIRE,
      id: '33333333-3333-4333-8333-000000000002',
      summaryOnly: false,
    })
    const files = diffApi.diff.response.parse(SAMPLE_PATCHES).map(fromPatch)

    const { container } = render(
      <RunDiff summaryOnly={run.summaryOnly} files={files} comments={[]} />,
    )

    expect(screen.getAllByText('src/a.ts').length).toBeGreaterThan(0)
    expect(screen.getAllByText('README.md').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.diff-line').length).toBeGreaterThan(0)
    expect(screen.queryByText('Дифф слишком большой')).toBeNull()
  })

  it('renders a per-file "no diff" placeholder alongside full diffs in the same normal run', () => {
    const run = RunSessionSchema.parse({
      ...SUMMARY_ONLY_RUN_WIRE,
      id: '33333333-3333-4333-8333-000000000003',
      summaryOnly: false,
    })
    const files = diffApi.diff.response
      .parse([SAMPLE_PATCH_A, { filename: 'docs/huge.md', patch: null }])
      .map(fromPatch)

    const { container } = render(
      <RunDiff summaryOnly={run.summaryOnly} files={files} comments={[]} />,
    )

    expect(screen.getByText('docs/huge.md')).toBeTruthy()
    expect(screen.getByText('Без диффа')).toBeTruthy()
    expect(screen.getAllByText('src/a.ts').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.diff-line').length).toBeGreaterThan(0)
    expect(screen.queryByText('Дифф слишком большой')).toBeNull()
  })
})
