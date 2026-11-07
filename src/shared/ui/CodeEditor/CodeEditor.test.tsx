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
  const last = lines.item(lines.length - 1)
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

describe('CodeEditor: syntax by file name', () => {
  function tokens(className: string): string[] {
    return [...document.querySelectorAll(`.${className}`)].map((token) => token.textContent.trim())
  }

  it.each([
    ['app.py', 'def f(): pass', 'tok-keyword', 'def'],
    ['app.ts', 'let x: Foo', 'tok-function', 'Foo'],
    ['app.mts', 'let x: Foo', 'tok-function', 'Foo'],
    ['app.cts', 'let x: Foo', 'tok-function', 'Foo'],
    ['App.tsx', 'let a: Foo = <b />', 'tok-tag', 'b'],
    ['App.tsx', 'let a: Foo = <b />', 'tok-function', 'Foo'],
    ['app.js', 'let a = "s"', 'tok-string', '"s"'],
    ['app.mjs', 'let a = "s"', 'tok-string', '"s"'],
    ['app.cjs', 'let a = "s"', 'tok-string', '"s"'],
    ['App.jsx', 'let a = <b />', 'tok-tag', 'b'],
    ['README.md', '# Title', 'tok-heading', 'Title'],
    ['.review/rules.md', '# Security', 'tok-heading', 'Security'],
    ['notes.markdown', '# Title', 'tok-heading', 'Title'],
    ['fix.diff', '+added', 'tok-inserted', '+added'],
    ['fix.diff', '-removed', 'tok-deleted', '-removed'],
    ['fix.diff', '@@ -1 +1 @@', 'tok-meta', '@@ -1 +1 @@'],
    ['fix.patch', '+added', 'tok-inserted', '+added'],
    ['APP.PY', 'def f(): pass', 'tok-keyword', 'def'],
  ])('%s: "%s" has %s on "%s"', async (fileName, value, className, token) => {
    render(<CodeEditor aria-label={LABEL} value={value} fileName={fileName} />)

    // The parser has a time budget per update and finishes in the background on a busy machine.
    await waitFor(() => {
      expect(tokens(className)).toContain(token)
    })
  })

  it.each([
    ['no file name', undefined],
    ['an unknown extension', 'data.txt'],
    ['a name without an extension', 'Dockerfile'],
    ['a dotfile', '.py'],
    ['a name that is a member of Object', 'a.constructor'],
  ])('leaves %s plain', (_title, fileName) => {
    render(<CodeEditor aria-label={LABEL} value="def f(): pass" fileName={fileName} />)

    expect(renderedLines()).toEqual(['def f(): pass'])
    expect(document.querySelector('[class*="tok-"]')).toBeNull()
  })

  it('follows a changed file name', async () => {
    const { rerender } = render(
      <CodeEditor aria-label={LABEL} value="def f(): pass" fileName="a.txt" />,
    )
    expect(tokens('tok-keyword')).toEqual([])

    rerender(<CodeEditor aria-label={LABEL} value="def f(): pass" fileName="a.py" />)

    await waitFor(() => {
      expect(tokens('tok-keyword')).toContain('def')
    })
  })
})

describe('CodeEditor: highlighted lines', () => {
  function highlighted(): string[] {
    return [...document.querySelectorAll('.cm-rv-line-highlighted')].map((line) => line.textContent)
  }

  it('marks the given lines, counted from 1', () => {
    render(<CodeEditor aria-label={LABEL} value={'one\ntwo\nthree'} highlightedLines={[1, 3]} />)

    expect(highlighted()).toEqual(['one', 'three'])
  })

  it('skips a line the document does not have', () => {
    render(<CodeEditor aria-label={LABEL} value="one" highlightedLines={[0, 2, 99]} />)

    expect(renderedLines()).toEqual(['one'])
    expect(highlighted()).toEqual([])
  })

  it('follows the prop', () => {
    const { rerender } = render(
      <CodeEditor aria-label={LABEL} value={'one\ntwo'} highlightedLines={[1]} />,
    )

    rerender(<CodeEditor aria-label={LABEL} value={'one\ntwo'} highlightedLines={[2]} />)
    expect(highlighted()).toEqual(['two'])

    rerender(<CodeEditor aria-label={LABEL} value={'one\ntwo'} />)
    expect(highlighted()).toEqual([])
  })

  it('stays on the line number when the value changes from outside', () => {
    const lines = [2]
    const { rerender } = render(
      <CodeEditor aria-label={LABEL} value={'one\ntwo'} highlightedLines={lines} />,
    )

    rerender(<CodeEditor aria-label={LABEL} value={'three\nfour'} highlightedLines={lines} />)

    expect(highlighted()).toEqual(['four'])
  })

  it('moves with the text on an edit', () => {
    const lines = [2]
    render(<Controlled value={'one\ntwo'} highlightedLines={lines} />)
    view().dispatch({ selection: { anchor: 0 } })

    pressEnter()

    expect(renderedLines()).toEqual(['', 'one', 'two'])
    expect(highlighted()).toEqual(['two'])
  })
})

describe('CodeEditor: diagnostics', () => {
  function messages(): (string | null)[] {
    return [...document.querySelectorAll('.cm-rv-diagnostic')].map((node) => node.textContent)
  }

  /** The line a message is drawn under: its previous sibling in the document. */
  function lineAbove(message: string): string | null | undefined {
    return screen.getByText(message).previousElementSibling?.textContent
  }

  function errorLines(): string[] {
    return [...document.querySelectorAll('.cm-rv-line-error')].map((line) => line.textContent)
  }

  function columnMarks(): string[] {
    return [...document.querySelectorAll('.cm-rv-column-error')].map((mark) => mark.textContent)
  }

  it('shows the message under its line, with the position', () => {
    render(
      <CodeEditor
        aria-label={LABEL}
        value={'one\ntwo\nthree'}
        diagnostics={[{ line: 2, column: 2, message: 'bad' }]}
      />,
    )

    expect(lineAbove('2:2 bad')).toBe('two')
    expect(errorLines()).toEqual(['two'])
    expect(columnMarks()).toEqual(['w'])
  })

  it('shows the line alone when there is no column', () => {
    render(
      <CodeEditor
        aria-label={LABEL}
        value={'one\ntwo'}
        diagnostics={[{ line: 1, column: null, message: 'bad' }]}
      />,
    )

    expect(lineAbove('1 bad')).toBe('one')
    expect(columnMarks()).toEqual([])
  })

  it('shows a message without a position on the first line', () => {
    render(
      <CodeEditor
        aria-label={LABEL}
        value={'one\ntwo'}
        diagnostics={[{ line: null, column: null, message: 'too large' }]}
      />,
    )

    expect(lineAbove('too large')).toBe('one')
    expect(errorLines()).toEqual(['one'])
  })

  it('keeps a message past the end of the document, with its real position', () => {
    render(
      <CodeEditor
        aria-label={LABEL}
        value={'one\ntwo'}
        diagnostics={[{ line: 12, column: 3, message: 'bad' }]}
      />,
    )

    expect(lineAbove('12:3 bad')).toBe('two')
    expect(columnMarks()).toEqual([])
  })

  it('shows the message in an empty document (rules file with no text)', () => {
    render(
      <CodeEditor
        aria-label={LABEL}
        value=""
        diagnostics={[{ line: null, column: null, message: 'not UTF-8' }]}
      />,
    )

    expect(messages()).toEqual(['not UTF-8'])
  })

  it('does not mark a column past the end of the line or before its start', () => {
    render(
      <CodeEditor
        aria-label={LABEL}
        value={'one\ntwo'}
        diagnostics={[
          { line: 1, column: 4, message: 'at the end' },
          { line: 2, column: 0, message: 'before' },
        ]}
      />,
    )

    expect(lineAbove('1:4 at the end')).toBe('one')
    expect(lineAbove('2:0 before')).toBe('two')
    expect(columnMarks()).toEqual([])
  })

  it('shows every message of one line', () => {
    render(
      <CodeEditor
        aria-label={LABEL}
        value="one"
        diagnostics={[
          { line: 1, message: 'first' },
          { line: 1, message: 'second' },
        ]}
      />,
    )

    expect(messages()).toEqual(['1 first', '1 second'])
  })

  it('tells assistive technology that the text has errors, while it has them', () => {
    const diagnostics = [{ line: 1, message: 'bad' }]
    const { rerender } = render(
      <CodeEditor aria-label={LABEL} value="one" diagnostics={diagnostics} />,
    )
    expect(textbox().getAttribute('aria-invalid')).toBe('true')

    rerender(<CodeEditor aria-label={LABEL} value="one" />)

    expect(textbox().hasAttribute('aria-invalid')).toBe(false)
    expect(messages()).toEqual([])
  })
})
