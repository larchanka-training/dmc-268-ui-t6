// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { RunAction, RunStatus } from '../../../entities/run'
import { RunProgressBar } from './RunProgressBar'

const RUN_ID = '11111111-1111-4111-8111-000000000004'
const FAILURE = { error: { type: 'LLMTimeout', message: 'the model call timed out' } }

type Step = string | [tool: string, response: unknown]

function build(...steps: Step[]): RunAction[] {
  return steps.map((step, index) => {
    const [tool, response] = typeof step === 'string' ? [step, { ok: true }] : step
    return {
      id: `22222222-2222-4222-8222-0000000000${String(index).padStart(2, '0')}`,
      runId: RUN_ID,
      index,
      tool,
      request: {},
      response,
      responseRef: null,
      startedAt: new Date(2026, 0, 1, 0, 0, index).toISOString(),
      durationMs: 10,
    }
  })
}

function renderBar(
  status: RunStatus,
  actions: RunAction[] = [],
  errorCode: string | null = null,
  actionsUnavailable = false,
) {
  return render(
    <RunProgressBar
      actions={actions}
      actionsUnavailable={actionsUnavailable}
      run={{ status, errorCode }}
    />,
  )
}

function stages(): { label: string | null; state: string | null }[] {
  const bar = screen.getByTestId('run-progress')
  return Array.from(bar.querySelectorAll('[data-stage-state]')).map((node) => ({
    label: node.textContent,
    state: node.getAttribute('data-stage-state'),
  }))
}

function stageItem(key: 'context' | 'analysis' | 'publishing'): HTMLElement {
  const item = screen.getByTestId(`run-progress-${key}`).closest('.ant-steps-item')
  if (!(item instanceof HTMLElement)) {
    throw new Error(`step item of ${key} not found`)
  }
  return item
}

/** The ring mark `ProgressSteps` draws for the stage. */
function mark(key: 'context' | 'analysis' | 'publishing'): HTMLElement {
  const found = stageItem(key).querySelector('.ant-steps-item-icon [data-state]')
  if (!(found instanceof HTMLElement)) {
    throw new Error(`mark of ${key} not found`)
  }
  return found
}

afterEach(() => {
  cleanup()
})

describe('RunProgressBar', () => {
  it('shows exactly the three stage labels, in order', () => {
    renderBar('queued')
    expect(stages().map((stage) => stage.label)).toEqual([
      'Сбор контекста',
      'Анализ LLM',
      'Публикация',
    ])
  })

  it.each<[string, RunStatus, Step[], [string, string, string]]>([
    ['queued', 'queued', [], ['wait', 'wait', 'wait']],
    ['running before context.build', 'running', ['vcs.fetch_diff'], ['process', 'wait', 'wait']],
    [
      'running after context.build',
      'running',
      ['vcs.fetch_diff', 'llm.repo_conventions', 'context.build'],
      ['finish', 'process', 'wait'],
    ],
    ['publishing', 'publishing', [], ['finish', 'finish', 'process']],
    ['succeeded', 'succeeded', [], ['finish', 'finish', 'finish']],
  ])('%s', (_label, status, steps, expected) => {
    renderBar(status, build(...steps))
    expect(stages().map((stage) => stage.state)).toEqual(expected)
  })

  it('is a group named «Этапы прогона» for assistive technology', () => {
    renderBar('queued')
    expect(screen.getByRole('group', { name: 'Этапы прогона' })).toBe(
      screen.getByTestId('run-progress'),
    )
  })

  it('maps the progress states to the antd step statuses', () => {
    renderBar('running', build('vcs.fetch_diff', 'llm.repo_conventions', 'context.build'))
    expect(stageItem('context').className).toContain('ant-steps-item-finish')
    expect(stageItem('analysis').className).toContain('ant-steps-item-process')
    expect(stageItem('publishing').className).toContain('ant-steps-item-wait')
  })

  // antd marks the step at `current` as active, which would pass a waiting or finished stage off as
  // the one in progress: only a stage that is in progress, failed or stopped is the active one.
  describe('the active step', () => {
    function activeKeys(): string[] {
      return (['context', 'analysis', 'publishing'] as const).filter((key) =>
        stageItem(key).className.includes('ant-steps-item-active'),
      )
    }

    it.each<[string, RunStatus, Step[], string[]]>([
      ['none while queued', 'queued', [], []],
      ['the first stage while it is in progress', 'running', ['vcs.fetch_diff'], ['context']],
      [
        'the second stage while it is in progress',
        'running',
        ['vcs.fetch_diff', 'llm.repo_conventions', 'context.build'],
        ['analysis'],
      ],
      ['the third stage while publishing', 'publishing', [], ['publishing']],
      ['none when everything is done', 'succeeded', [], []],
    ])('%s', (_label, status, steps, expected) => {
      const { container } = renderBar(status, build(...steps))
      expect(activeKeys()).toEqual(expected)
      if (expected.length === 0) {
        expect(container.querySelector('.ant-steps-item-active')).toBeNull()
      }
    })

    it('is the stage a failed run stopped on', () => {
      renderBar(
        'failed',
        build('vcs.fetch_diff', 'llm.repo_conventions', 'context.build', ['llm.call', FAILURE]),
        'llm_timeout',
      )
      expect(activeKeys()).toEqual(['analysis'])
    })

    it('is the stage a cancelled run stopped on', () => {
      renderBar('cancelled', [], null)
      expect(activeKeys()).toEqual(['context'])
    })
  })

  describe('without the action log', () => {
    it.each<RunStatus>(['running', 'failed', 'cancelled'])(
      'renders nothing for %s: the stage cannot be told without the log',
      (status) => {
        const { container } = renderBar(status, [], 'llm_timeout', true)
        expect(screen.queryByTestId('run-progress')).toBeNull()
        expect(container.innerHTML).toBe('')
      },
    )

    it.each<[RunStatus, string[]]>([
      ['queued', ['wait', 'wait', 'wait']],
      ['publishing', ['finish', 'finish', 'process']],
      ['succeeded', ['finish', 'finish', 'finish']],
    ])('still renders %s: it does not read the log', (status, expected) => {
      renderBar(status, [], null, true)
      expect(stages().map((stage) => stage.state)).toEqual(expected)
    })

    it('renders nothing for skipped, as with the log', () => {
      renderBar('skipped', [], null, true)
      expect(screen.queryByTestId('run-progress')).toBeNull()
    })

    it('reads the log as before when it is available', () => {
      renderBar('running', build('vcs.fetch_diff', 'context.build'), null, false)
      expect(stages().map((stage) => stage.state)).toEqual(['finish', 'process', 'wait'])
    })
  })

  // Colours and marks come from the design system (DESIGN_SYSTEM §1): the bar draws every stage
  // with `ProgressSteps` and writes no colour of its own.
  describe('colours and marks', () => {
    const failedActions = build('vcs.fetch_diff', 'llm.repo_conventions', 'context.build', [
      'llm.call',
      FAILURE,
    ])

    it('writes no colour inline on the titles or the note of a failed stage', () => {
      const { container } = renderBar('failed', failedActions, 'llm_timeout')
      expect(screen.getByTestId('run-progress-context').style.color).toBe('')
      expect(screen.getByTestId('run-progress-analysis').style.color).toBe('')
      expect(screen.getByTestId('run-progress-publishing').style.color).toBe('')
      expect(screen.getByText('llm_timeout').style.color).toBe('')
      expect(container.querySelector('[style*="color"]')).toBeNull()
    })

    it('writes no colour inline on the title, the note or the mark of a stopped stage', () => {
      const { container } = renderBar('cancelled', [], 'cancelled_by_user')
      expect(screen.getByTestId('run-progress-context').style.color).toBe('')
      expect(screen.getByText('Остановлено: cancelled_by_user').style.color).toBe('')
      expect(mark('context').style.color).toBe('')
      expect(container.querySelector('[style*="color"]')).toBeNull()
    })

    it('draws every stage with the ring mark of its state and no icon of its own', () => {
      const failed = renderBar('failed', failedActions, 'llm_timeout')
      expect(
        (['context', 'analysis', 'publishing'] as const).map((key) => mark(key).dataset.state),
      ).toEqual(['finish', 'error', 'wait'])
      failed.unmount()
      const { container } = renderBar('cancelled', [], null)
      expect(
        (['context', 'analysis', 'publishing'] as const).map((key) => mark(key).dataset.state),
      ).toEqual(['stopped', 'wait', 'wait'])
      expect(container.querySelector('.anticon')).toBeNull()
    })

    it('leaves the spacing around the bar to the layout it sits in', () => {
      renderBar('running')
      expect(screen.getByTestId('run-progress').getAttribute('style')).toBeNull()
    })

    it('keeps the error class of a failed stage and the stopped mark of a cancelled one', () => {
      const failed = renderBar('failed', failedActions, 'llm_timeout')
      expect(stageItem('analysis').className).toContain('ant-steps-item-error')
      failed.unmount()
      renderBar('cancelled', [], null)
      expect(mark('context').dataset.state).toBe('stopped')
      expect(stageItem('context').className).not.toContain('ant-steps-item-error')
    })
  })

  describe('failed', () => {
    const actions = build('vcs.fetch_diff', 'llm.repo_conventions', 'context.build', [
      'llm.call',
      FAILURE,
    ])

    it('marks the failed stage as an error with the errorCode', () => {
      renderBar('failed', actions, 'llm_timeout')
      expect(stages().map((stage) => stage.state)).toEqual(['finish', 'error', 'wait'])
      expect(stageItem('analysis').className).toContain('ant-steps-item-error')
      expect(within(stageItem('analysis')).getByText('llm_timeout')).toBeTruthy()
    })

    it('shows the errorCode once, on the failed stage only', () => {
      renderBar('failed', actions, 'llm_timeout')
      expect(screen.getAllByText('llm_timeout')).toHaveLength(1)
      expect(within(stageItem('context')).queryByText('llm_timeout')).toBeNull()
      expect(within(stageItem('publishing')).queryByText('llm_timeout')).toBeNull()
    })

    it('stops on context when nothing was recorded', () => {
      renderBar('failed', [], 'queue_lost')
      expect(stages().map((stage) => stage.state)).toEqual(['error', 'wait', 'wait'])
      expect(within(stageItem('context')).getByText('queue_lost')).toBeTruthy()
    })

    it('stops on publishing when the publish step failed', () => {
      renderBar(
        'failed',
        build('vcs.fetch_diff', 'context.build', 'llm.call', ['github.publish_review', FAILURE]),
        'github_forbidden',
      )
      expect(stages().map((stage) => stage.state)).toEqual(['finish', 'finish', 'error'])
      expect(within(stageItem('publishing')).getByText('github_forbidden')).toBeTruthy()
    })

    it('renders without a description when the errorCode is null', () => {
      renderBar('failed', actions, null)
      expect(stages().map((stage) => stage.state)).toEqual(['finish', 'error', 'wait'])
      expect(stageItem('analysis').querySelector('.ant-steps-item-content')).toBeNull()
    })
  })

  describe('cancelled', () => {
    const publishing = build(
      'vcs.fetch_diff',
      'llm.repo_conventions',
      'context.build',
      'llm.call',
      'llm.review_output',
      'review.postprocess',
    )

    it('marks the stopped stage as stopped, not as an error', () => {
      const { container } = renderBar('cancelled', publishing, 'cancelled_by_user')
      expect(stages().map((stage) => stage.state)).toEqual(['finish', 'finish', 'stopped'])
      expect(container.querySelector('.ant-steps-item-error')).toBeNull()
      expect(stageItem('publishing').className).not.toContain('ant-steps-item-error')
    })

    it('says «Остановлено» with the errorCode on the stopped stage', () => {
      renderBar('cancelled', publishing, 'cancelled_by_user')
      expect(
        within(stageItem('publishing')).getByText('Остановлено: cancelled_by_user'),
      ).toBeTruthy()
    })

    it('says only «Остановлено» when there is no errorCode', () => {
      renderBar('cancelled', [], null)
      expect(stages().map((stage) => stage.state)).toEqual(['stopped', 'wait', 'wait'])
      expect(within(stageItem('context')).getByText('Остановлено')).toBeTruthy()
    })

    it('marks a stopped stage with the stopped mark and a failed one with the error mark', () => {
      const stopped = renderBar('cancelled', publishing, null)
      expect(mark('publishing').dataset.state).toBe('stopped')
      stopped.unmount()
      renderBar('failed', publishing, 'publish_failed')
      expect(mark('publishing').dataset.state).toBe('error')
      expect(document.querySelector('.ant-steps-item-icon [data-state="stopped"]')).toBeNull()
    })
  })

  it('renders nothing for a skipped run', () => {
    const { container } = renderBar('skipped', build('vcs.fetch_diff'), 'draft_pr')
    expect(screen.queryByTestId('run-progress')).toBeNull()
    expect(container.innerHTML).toBe('')
  })

  it('follows the run as it progresses', () => {
    const { rerender } = renderBar('queued')
    expect(stages().map((stage) => stage.state)).toEqual(['wait', 'wait', 'wait'])
    rerender(<RunProgressBar actions={[]} run={{ status: 'publishing', errorCode: null }} />)
    expect(stages().map((stage) => stage.state)).toEqual(['finish', 'finish', 'process'])
    rerender(<RunProgressBar actions={[]} run={{ status: 'skipped', errorCode: null }} />)
    expect(screen.queryByTestId('run-progress')).toBeNull()
  })
})
