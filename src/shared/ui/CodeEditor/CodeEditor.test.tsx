// @vitest-environment jsdom
import { EditorView } from '@codemirror/view'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode, useState, type JSX } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { CodeEditor, type CodeEditorProps } from './CodeEditor'
import styles from './CodeEditor.module.css'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheets.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: URL, encoding: 'utf8') => string
}

// A variable, not a literal: Vite rewrites `new URL('literal', import.meta.url)` into an asset URL.
function sourceText(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

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

  it('keeps an edit the parent did not take until the value changes', () => {
    const onChange = vi.fn()
    const { rerender } = render(<CodeEditor aria-label={LABEL} value="ab" onChange={onChange} />)

    pressEnter()
    expect(renderedLines()).toEqual(['', 'ab'])

    rerender(<CodeEditor aria-label={LABEL} value="ab" onChange={onChange} />)
    expect(renderedLines()).toEqual(['', 'ab'])

    rerender(<CodeEditor aria-label={LABEL} value="cd" onChange={onChange} />)
    expect(renderedLines()).toEqual(['cd'])
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

  it('moves with the text when the parent builds the array on every render', () => {
    function Parent(): JSX.Element {
      const [value, setValue] = useState('one\ntwo')
      return (
        <CodeEditor aria-label={LABEL} value={value} onChange={setValue} highlightedLines={[2]} />
      )
    }
    render(<Parent />)
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

  it('shows a message without a position under the first line, which it does not mark', () => {
    render(
      <CodeEditor
        aria-label={LABEL}
        value={'one\ntwo'}
        diagnostics={[{ line: null, column: null, message: 'too large' }]}
      />,
    )

    expect(lineAbove('too large')).toBe('one')
    expect(errorLines()).toEqual([])
    expect(textbox().getAttribute('aria-invalid')).toBe('true')
  })

  it('marks the last line for a message past the end: it has a position', () => {
    render(
      <CodeEditor
        aria-label={LABEL}
        value={'one\ntwo'}
        diagnostics={[{ line: 12, message: 'bad' }]}
      />,
    )

    expect(errorLines()).toEqual(['two'])
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

  it('keeps a message on its text when the parent builds the array on every render', () => {
    function Parent(): JSX.Element {
      const [value, setValue] = useState('one\ntwo')
      return (
        <CodeEditor
          aria-label={LABEL}
          value={value}
          onChange={setValue}
          diagnostics={[{ line: 2, message: 'bad' }]}
        />
      )
    }
    render(<Parent />)
    view().dispatch({ selection: { anchor: 0 } })

    pressEnter()

    expect(lineAbove('2 bad')).toBe('two')
    expect(errorLines()).toEqual(['two'])
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

describe('CodeEditor: read only', () => {
  it('keeps the text on a key press and on typing, and stays focusable', async () => {
    const onChange = vi.fn()
    render(<CodeEditor aria-label={LABEL} value="ab" readOnly onChange={onChange} />)

    pressEnter()
    typeAtEndOfDocument('c')

    await waitFor(() => {
      expect(renderedLines()).toEqual(['ab'])
    })
    expect(onChange).not.toHaveBeenCalled()
    expect(textbox().getAttribute('aria-readonly')).toBe('true')
    textbox().focus()
    expect(document.activeElement).toBe(textbox())
  })

  it('still takes a new value from outside', () => {
    const { rerender } = render(<CodeEditor aria-label={LABEL} value="old" readOnly />)

    rerender(<CodeEditor aria-label={LABEL} value="new" readOnly />)

    expect(renderedLines()).toEqual(['new'])
  })

  it('follows the prop on the same editor', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <CodeEditor aria-label={LABEL} value="ab" readOnly onChange={onChange} />,
    )
    const editor = view()

    rerender(<CodeEditor aria-label={LABEL} value="ab" onChange={onChange} />)
    pressEnter()

    expect(view()).toBe(editor)
    expect(onChange).toHaveBeenLastCalledWith('\nab')
    expect(textbox().hasAttribute('aria-readonly')).toBe(false)
  })
})

describe('CodeEditor: look', () => {
  function field(): Element | null | undefined {
    return textbox().closest('.cm-editor')?.parentElement
  }

  /** A declared property of one rule of the CSS Module, comments stripped. */
  function moduleRule(selector: string): string {
    const css = sourceText('./CodeEditor.module.css').replace(/\/\*[\s\S]*?\*\//g, '')
    const start = css.indexOf(`${selector} {`)
    expect(start, selector).toBeGreaterThanOrEqual(0)
    return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  }

  it('marks the field as read only or invalid for its stylesheet', () => {
    const diagnostics = [{ line: 1, message: 'bad' }]
    const hasClass = (name: string | undefined): boolean =>
      name !== undefined && field()?.classList.contains(name) === true
    const { rerender } = render(<CodeEditor aria-label={LABEL} value="a" />)
    expect(hasClass(styles.readOnly)).toBe(false)
    expect(hasClass(styles.invalid)).toBe(false)

    rerender(<CodeEditor aria-label={LABEL} value="a" readOnly diagnostics={diagnostics} />)

    expect(hasClass(styles.readOnly)).toBe(true)
    expect(hasClass(styles.invalid)).toBe(true)
  })

  it('keeps its own class next to the class of the caller', () => {
    render(<CodeEditor aria-label={LABEL} value="a" className="mine" />)

    expect(field()?.classList.contains('mine')).toBe(true)
    expect(styles.field !== undefined && field()?.classList.contains(styles.field)).toBe(true)
  })

  it('draws the field focus of DESIGN_SYSTEM §7: link border and a 3px halo', () => {
    const focus = moduleRule('.field:focus-within')
    expect(focus).toContain('border-color: var(--rv-link)')
    expect(focus).toContain('box-shadow: 0 0 0 3px var(--halo)')
  })

  it('keeps the red border in focus with an error, the halo in the focus colour', () => {
    const focus = moduleRule('.invalid:focus-within')
    expect(focus).toContain('border-color: var(--rv-danger)')
    expect(focus).toContain('box-shadow: 0 0 0 3px var(--rv-link)')
  })

  it('takes the numbers of §7 for the halo in both themes', () => {
    expect(moduleRule('.field')).toContain('color-mix(in srgb, var(--rv-link) 25%, transparent)')
    expect(moduleRule(":global([data-rv-theme='light']) .field")).toContain(
      'color-mix(in srgb, var(--rv-link) 20%, transparent)',
    )
  })

  // jsdom cascades the rules CodeMirror injects, so the link from a token to its colour is real here;
  // the values and their rendering are checked in a browser.
  it.each([
    ['app.py', 'def f(): pass', 'tok-keyword', '--rv-code-keyword'],
    ['app.py', 'x = "s"', 'tok-string', '--rv-code-string'],
    ['app.py', 'x = 1', 'tok-number', '--rv-code-number'],
    ['app.py', 'def f(): pass', 'tok-function', '--rv-code-function'],
    ['App.tsx', 'let a = <b />', 'tok-tag', '--rv-code-tag'],
    ['App.tsx', 'let a = <b c="d" />', 'tok-attribute', '--rv-code-attribute'],
    ['app.js', 'let a = /x/', 'tok-special', '--rv-code-special'],
    ['app.py', '# note', 'tok-comment', '--rv-text-2'],
    ['fix.diff', '@@ -1 +1 @@', 'tok-meta', '--rv-text-2'],
  ])('%s: %s colours %s with %s', async (fileName, value, className, token) => {
    render(<CodeEditor aria-label={LABEL} value={value} fileName={fileName} />)

    const node = await waitFor(() => {
      const found = document.querySelector(`.${className}`)
      if (!found) {
        throw new Error(`no ${className} yet`)
      }
      return found
    })
    expect(getComputedStyle(node).color).toBe(`var(${token})`)
  })

  it('has no colour or font literal in the theme', () => {
    const source = sourceText('./editorExtensions.ts')

    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i)
    expect(source).not.toMatch(/fontFamily: '(?!var\(--rv-)/)
  })
})

describe('tokens.css: code colours', () => {
  const css = sourceText('../styles/tokens.css')

  function themeTokens(theme: string): Map<string, string> {
    const start = css.indexOf(`[data-rv-theme='${theme}'] {`)
    const body = css.slice(start, css.indexOf('}', start))
    return new Map(
      [...body.matchAll(/(--rv-[a-z0-9-]+):\s*([^;]+);/g)].map(
        ([, name = '', value = '']): [string, string] => [name, value],
      ),
    )
  }

  type Rgb = readonly [number, number, number]

  function channels(colour: string): Rgb {
    const full = colour.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3')
    if (!/^#[0-9a-f]{6}$/i.test(full)) {
      throw new Error(`not a hex colour: ${colour}`)
    }
    const value = parseInt(full.slice(1), 16)
    return [value >> 16, (value >> 8) & 255, value & 255]
  }

  /** The selected-line tint of §3 laid over a surface. */
  function selectedOver(surface: string, tint: Rgb, alpha: number): Rgb {
    const [r, g, b] = channels(surface)
    return [r + alpha * (tint[0] - r), g + alpha * (tint[1] - g), b + alpha * (tint[2] - b)]
  }

  function luminance([r, g, b]: Rgb): number {
    const linear = (value: number): number => {
      const channel = value / 255
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
  }

  function contrast(a: Rgb, b: Rgb): number {
    const [first, second] = [luminance(a), luminance(b)]
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
  }

  // The literal values of `--rv-selected` in §3: the test does not parse rgb() notation.
  const SELECTED: Record<'dark' | 'light', { tint: Rgb; alpha: number }> = {
    dark: { tint: [248, 250, 252], alpha: 0.08 },
    light: { tint: [15, 23, 42], alpha: 0.06 },
  }

  const NAMES = ['keyword', 'string', 'number', 'function', 'tag', 'attribute', 'special']

  it.each(['dark', 'light'] as const)('hold 4.5:1 on every editor background: %s', (theme) => {
    const tokens = themeTokens(theme)
    const token = (name: string): string => tokens.get(name) ?? ''
    const { tint, alpha } = SELECTED[theme]
    const surface = token('--rv-surface')
    const readOnly = token('--rv-surface-2')
    const backgrounds = [
      channels(surface),
      channels(readOnly),
      channels(token('--rv-danger-bg')),
      selectedOver(surface, tint, alpha),
      selectedOver(readOnly, tint, alpha),
    ]

    for (const name of NAMES) {
      const colour = channels(token(`--rv-code-${name}`))
      for (const background of backgrounds) {
        expect(contrast(colour, background), `${theme} ${name}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
