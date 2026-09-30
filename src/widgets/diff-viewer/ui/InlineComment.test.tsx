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
  it('renders HTML in body and suggestion as plain text', () => {
    render(<InlineComment file={FILE} finding={finding} />)
    fireEvent.click(screen.getByText('XSS probe'))
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy()
    expect(screen.getByText('<script>alert(1)</script>')).toBeTruthy()
  })

  it('shows D3 Critical badge for high severity', () => {
    render(<InlineComment finding={{ ...finding, severity: 'high' }} />)
    expect(screen.getByText('Critical')).toBeTruthy()
  })
})
