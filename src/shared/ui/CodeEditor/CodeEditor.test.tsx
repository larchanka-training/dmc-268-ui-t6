// @vitest-environment jsdom
import { EditorView } from '@codemirror/view'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode, useState, type JSX } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { CodeEditor, type CodeEditorProps } from './CodeEditor'

const LABEL = 'Код'

// jsdom has no layout, and CodeMirror measures text through `Range`.
beforeAll(() => {
  Range.prototype.getClientRects = () => Object.assign([], { item: () => null })
  Range.prototype.getBoundingClientRect = () => new DOMRect()
})

afterEach(() => {
  cleanup()
})

function textbox(): HTMLElement {
  return screen.getByRole('textbox', { name: LABEL })
}

/** The text of the document as CodeMirror rendered it, one entry per line. */
function renderedLines(): string[] {
  return [...document.querySelectorAll('.cm-line')].map((line) => line.textContent)
}

/**
 * What a browser does on a keystroke: it changes the text in the DOM, and CodeMirror reads the
 * change. Real typing is checked in a browser, see the pull request.
 */
function typeAtEndOfDocument(text: string): void {
  const lines = document.querySelectorAll('.cm-line')
  const last = lines[lines.length - 1]
  last.textContent = `${last.textContent}${text}`
}

function pressEnter(): void {
  fireEvent.keyDown(textbox(), { key: 'Enter', keyCode: 13 })
}

function pressUndo(): void {
  fireEvent.keyDown(textbox(), { key: 'z', code: 'KeyZ', keyCode: 90, ctrlKey: true })
}

function view(): EditorView {
  const found = EditorView.findFromDOM(textbox())
  if (!found) {
    throw new Error('no editor')
  }
  return found
}

/** A parent that keeps the text, as a screen will. */
function Controlled(props: Omit<CodeEditorProps, 'aria-label' | 'onChange'>): JSX.Element {
  const [value, setValue] = useState(props.value)
  return <CodeEditor {...props} aria-label={LABEL} value={value} onChange={setValue} />
}

describe('CodeEditor: text', () => {
  it('is a named multiline textbox showing the value', () => {
    render(<CodeEditor aria-label={LABEL} value={'first\nsecond'} />)

    expect(textbox().getAttribute('aria-multiline')).toBe('true')
    expect(renderedLines()).toEqual(['first', 'second'])
  })

  it('hands typed text to onChange', async () => {
    const onChange = vi.fn()
    render(<CodeEditor aria-label={LABEL} value="" onChange={onChange} />)

    typeAtEndOfDocument('hi')

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith('hi')
    })
  })

  it('breaks the line on Enter, through the keymap', () => {
    const onChange = vi.fn()
    render(<CodeEditor aria-label={LABEL} value="ab" onChange={onChange} />)
    view().dispatch({ selection: { anchor: 1 } })

    pressEnter()

    expect(onChange).toHaveBeenLastCalledWith('a\nb')
  })

  it('undoes an edit with the history keys', () => {
    const onChange = vi.fn()
    render(<CodeEditor aria-label={LABEL} value="ab" onChange={onChange} />)
    pressEnter()
    expect(onChange).toHaveBeenLastCalledWith('\nab')

    pressUndo()

    expect(onChange).toHaveBeenLastCalledWith('ab')
  })

  it('takes a new value from outside without calling onChange', () => {
    const onChange = vi.fn()
    const { rerender } = render(<CodeEditor aria-label={LABEL} value="old" onChange={onChange} />)

    rerender(<CodeEditor aria-label={LABEL} value="new" onChange={onChange} />)

    expect(renderedLines()).toEqual(['new'])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps text that came from outside out of the undo history', () => {
    const onChange = vi.fn()
    const { rerender } = render(<CodeEditor aria-label={LABEL} value="" onChange={onChange} />)
    rerender(<CodeEditor aria-label={LABEL} value="from the server" onChange={onChange} />)

    pressUndo()

    expect(renderedLines()).toEqual(['from the server'])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('leaves the cursor alone when the value it reported comes back', () => {
    render(<Controlled value="ab" />)
    view().dispatch({ selection: { anchor: 1 } })

    pressEnter()

    expect(renderedLines()).toEqual(['a', 'b'])
    expect(view().state.selection.main.head).toBe(2)
  })

  it('renders one editor under StrictMode and calls the latest onChange', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(
      <StrictMode>
        <CodeEditor aria-label={LABEL} value="" onChange={first} />
      </StrictMode>,
    )
    rerender(
      <StrictMode>
        <CodeEditor aria-label={LABEL} value="" onChange={second} />
      </StrictMode>,
    )

    expect(document.querySelectorAll('.cm-editor')).toHaveLength(1)

    pressEnter()

    expect(second).toHaveBeenLastCalledWith('\n')
    expect(first).not.toHaveBeenCalled()
  })
})
