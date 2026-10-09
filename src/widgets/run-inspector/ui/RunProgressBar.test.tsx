// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { ConfigProvider, theme } from 'antd'
import type { ReactElement } from 'react'
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

// What a colour is stored as once the DOM has normalised it: a token and an inline style compare.
function normalised(color: string): string {
  const probe = document.createElement('span')
  probe.style.color = color
  return probe.style.color
}

function renderThemed(ui: ReactElement, algorithm: typeof theme.defaultAlgorithm) {
  return render(<ConfigProvider theme={{ algorithm }}>{ui}</ConfigProvider>)
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

  // antd paints the error text #ff4d4f and the waiting text #8c8c8c, which are 3.27 and 3.35 on white;
  // the text of a failed or stopped stage uses the normal text token, the icon still marks the state.
  describe('the text colour of a failed or stopped stage', () => {
    const failedActions = build('vcs.fetch_diff', 'llm.repo_conventions', 'context.build', [
      'llm.call',
      FAILURE,
    ])

    it.each([
      ['light', theme.defaultAlgorithm],
      ['dark', theme.darkAlgorithm],
    ])('is the colorText token for the errorCode of a failed stage, %s', (_name, algorithm) => {
      renderThemed(
        <RunProgressBar
          actions={failedActions}
          run={{ status: 'failed', errorCode: 'llm_timeout' }}
        />,
        algorithm,
      )
      const { colorText, colorError } = theme.getDesignToken({ algorithm })
      const note = screen.getByText('llm_timeout')
      expect(note.style.color).toBe(normalised(colorText))
      expect(note.style.color).not.toBe(normalised(colorError))
    })

    it.each([
      ['light', theme.defaultAlgorithm],
      ['dark', theme.darkAlgorithm],
    ])(
      'is the colorText token for the title and the note of a stopped stage, %s',
      (_name, algorithm) => {
        renderThemed(
          <RunProgressBar
            actions={[]}
            run={{ status: 'cancelled', errorCode: 'cancelled_by_user' }}
          />,
          algorithm,
        )
        const { colorText } = theme.getDesignToken({ algorithm })
        expect(screen.getByTestId('run-progress-context').style.color).toBe(normalised(colorText))
        expect(screen.getByText('Остановлено: cancelled_by_user').style.color).toBe(
          normalised(colorText),
        )
      },
    )

    it('takes a different colour in the dark theme than in the light one', () => {
      const light = theme.getDesignToken({ algorithm: theme.defaultAlgorithm }).colorText
      const dark = theme.getDesignToken({ algorithm: theme.darkAlgorithm }).colorText
      expect(normalised(light)).not.toBe(normalised(dark))
    })

    it('leaves the titles of waiting, finished and failed stages to antd', () => {
      renderBar('failed', failedActions, 'llm_timeout')
      expect(screen.getByTestId('run-progress-context').style.color).toBe('')
      expect(screen.getByTestId('run-progress-analysis').style.color).toBe('')
      expect(screen.getByTestId('run-progress-publishing').style.color).toBe('')
    })

    it('keeps the stop icon and the error class that mark the state', () => {
      const failed = renderBar('failed', failedActions, 'llm_timeout')
      expect(stageItem('analysis').className).toContain('ant-steps-item-error')
      failed.unmount()
      renderBar('cancelled', [], null)
      expect(within(stageItem('context')).getByRole('img', { name: 'stop' })).toBeTruthy()
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
