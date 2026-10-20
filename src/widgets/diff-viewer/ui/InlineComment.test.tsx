// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { fromPatch } from '../../../entities/diff'
import { SAMPLE_PATCH_A } from '../../../shared/fixtures/sample.patch'
import type { FindingView } from '../../../entities/review'
import { InlineComment } from './InlineComment'

const FILE = fromPatch(SAMPLE_PATCH_A)

const finding: FindingView = {
  id: '33333333-3333-4333-8333-000000000099',
  file: FILE.filename,
  oldLine: null,
  newLine: 2,
  endLine: null,
  side: 'RIGHT',
  severity: 'high',
  category: 'security',
  title: 'XSS probe',
  body: '<img src=x onerror=alert(1)>',
  suggestion: '<script>alert(1)</script>',
  confidence: 0.5,
  ruleName: null,
}

afterEach(() => {
  cleanup()
})

describe('InlineComment', () => {
  it('keeps one native finding button with title and range layout hooks', () => {
    render(
      <InlineComment
        file={FILE}
        finding={{
          ...finding,
          severity: 'info',
          newLine: 4,
          endLine: 5,
          title: 'Variable rename looks correct',
        }}
      />,
    )
    const button = screen.getByRole('button', {
      name: /Info\s*Variable rename looks correct\s*L4–5/,
    })
    expect(button.tagName).toBe('BUTTON')
    expect(button.classList.contains('inline-comment-row')).toBe(true)
    expect(
      screen.getByText('Variable rename looks correct').closest('.inline-comment-title'),
    ).not.toBeNull()
    expect(screen.getByText('L4–5').classList.contains('inline-comment-range')).toBe(true)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    button.focus()
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(button)
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button)
  })

  it('keeps a complete long title and the native expanded button when no range is available', () => {
    const { container } = render(
      <InlineComment
        defaultExpanded
        finding={{
          ...finding,
          severity: 'critical',
          newLine: null,
          title:
            'Variable rename looks correct while preserving a detailed explanation of the surrounding review context',
        }}
      />,
    )
    const button = screen.getByRole('button', {
      name: /Variable rename looks correct while preserving a detailed explanation of the surrounding review context/,
    })
    expect(button.tagName).toBe('BUTTON')
    expect(container.querySelector('.inline-comment-range')).toBeNull()
    expect(button.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('renders HTML in body and suggestion as plain text', () => {
    render(<InlineComment file={FILE} finding={finding} />)
    fireEvent.click(screen.getByText('XSS probe'))
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy()
    const suggestion = screen.getByTestId('diff-suggestion')
    expect(suggestion.querySelector('script')).toBeNull()
    expect(suggestion.querySelector('.diff-code-insert')?.textContent).toBe(
      '<script>alert(1)</script>',
    )
  })

  it('highlights the suggestion by the filename of the file diff', () => {
    render(
      <InlineComment
        file={FILE}
        finding={{ ...finding, suggestion: 'const safe = "yes" // fixed' }}
      />,
    )
    fireEvent.click(screen.getByText('XSS probe'))
    const suggestion = screen.getByTestId('diff-suggestion')
    expect(suggestion.querySelector('.diff-code-insert span.token.keyword')).not.toBeNull()
    expect(suggestion.querySelector('.diff-code-insert span.token.string')).not.toBeNull()
  })

  it('falls back to finding.file for the suggestion language when no file diff is given', () => {
    render(
      <InlineComment
        finding={{
          ...finding,
          file: 'app/totals.py',
          suggestion: 'def total(items):\n    return 1',
        }}
      />,
    )
    fireEvent.click(screen.getByText('XSS probe'))
    const suggestion = screen.getByTestId('diff-suggestion')
    expect(suggestion.querySelector('.diff-code-insert span.token.keyword')).not.toBeNull()
  })

  it.each([
    ['critical', 'Critical', 'critical', 'solid'],
    ['high', 'High', 'critical', 'dot'],
    ['medium', 'Medium', 'high', 'dot'],
    ['low', 'Low', 'warning', 'dot'],
    ['info', 'Info', 'info', 'dot'],
  ] as const)(
    'labels the %s finding "%s" with its exact-level tone %s and variant %s',
    (severity, label, tone, variant) => {
      render(<InlineComment finding={{ ...finding, severity }} />)
      const badge = screen.getByText(label)
      expect(badge.getAttribute('data-tone')).toBe(tone)
      expect(badge.getAttribute('data-variant')).toBe(variant)
    },
  )

  it('is collapsed by default: the body is not rendered', () => {
    render(<InlineComment finding={finding} />)
    expect(screen.queryByText('<img src=x onerror=alert(1)>')).toBeNull()
  })

  it('defaultExpanded renders the body at once and the header still collapses it', () => {
    render(<InlineComment defaultExpanded finding={finding} />)
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy()
    expect(screen.getByText('security')).toBeTruthy()

    fireEvent.click(screen.getByText('XSS probe'))
    expect(screen.queryByText('<img src=x onerror=alert(1)>')).toBeNull()
  })
})
