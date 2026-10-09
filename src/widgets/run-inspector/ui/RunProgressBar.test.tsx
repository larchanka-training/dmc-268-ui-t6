// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { theme } from 'antd'
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

function renderBar(status: RunStatus, actions: RunAction[] = [], errorCode: string | null = null) {
  return render(<RunProgressBar actions={actions} run={{ status, errorCode }} />)
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

  it('maps the progress states to the antd step statuses', () => {
    renderBar('running', build('vcs.fetch_diff', 'llm.repo_conventions', 'context.build'))
    expect(stageItem('context').className).toContain('ant-steps-item-finish')
    expect(stageItem('analysis').className).toContain('ant-steps-item-process')
    expect(stageItem('publishing').className).toContain('ant-steps-item-wait')
  })

  it.each<[string, RunStatus, Step[], 'context' | 'analysis' | 'publishing']>([
    ['the first stage while queued', 'queued', [], 'context'],
    [
      'the stage in progress while running',
      'running',
      ['vcs.fetch_diff', 'llm.repo_conventions', 'context.build'],
      'analysis',
    ],
    ['the last stage when everything is done', 'succeeded', [], 'publishing'],
  ])('marks %s as the active step', (_label, status, steps, active) => {
    renderBar(status, build(...steps))
    const activeKeys = (['context', 'analysis', 'publishing'] as const).filter((key) =>
      stageItem(key).className.includes('ant-steps-item-active'),
    )
    expect(activeKeys).toEqual([active])
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

    it('uses a stop icon for stopped and none for an error', () => {
      const stopped = renderBar('cancelled', publishing, null)
      expect(within(stageItem('publishing')).getByRole('img', { name: 'stop' })).toBeTruthy()
      stopped.unmount()
      renderBar('failed', publishing, 'publish_failed')
      expect(screen.queryByRole('img', { name: 'stop' })).toBeNull()
    })
  })

  it('tints the stop icon with the warning token, not the error one', () => {
    renderBar('cancelled', [], null)
    const icon = within(stageItem('context')).getByRole('img', { name: 'stop' })
    // Let the DOM normalise each token to the form it stores a colour in.
    const normalised = (color: string): string => {
      const probe = document.createElement('span')
      probe.style.color = color
      return probe.style.color
    }
    const { colorWarning, colorError } = theme.getDesignToken()
    expect(icon.style.color).toBe(normalised(colorWarning))
    expect(icon.style.color).not.toBe(normalised(colorError))
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
