import {
  autocompletion,
  pickedCompletion,
  type Completion,
  type CompletionSource,
} from '@codemirror/autocomplete'
import { javascript } from '@codemirror/lang-javascript'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { StreamLanguage, syntaxHighlighting } from '@codemirror/language'
import { diff } from '@codemirror/legacy-modes/mode/diff'
import {
  findClusterBreak,
  StateEffect,
  StateField,
  Transaction,
  type Extension,
  type Range,
  type Text,
} from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'
import { tagHighlighter, tags as t, type Tag } from '@lezer/highlight'

// A table of its own: `languageFromFilename` is in `entities/diff`, which `shared` cannot import, and
// it names refractor grammars, not CodeMirror languages.
const LANGUAGES = new Map<string, () => Extension>([
  ['py', () => python()],
  ['ts', () => javascript({ typescript: true })],
  ['mts', () => javascript({ typescript: true })],
  ['cts', () => javascript({ typescript: true })],
  ['tsx', () => javascript({ typescript: true, jsx: true })],
  ['js', () => javascript()],
  ['mjs', () => javascript()],
  ['cjs', () => javascript()],
  ['jsx', () => javascript({ jsx: true })],
  ['md', () => markdown()],
  ['markdown', () => markdown()],
  ['diff', () => StreamLanguage.define(diff)],
  ['patch', () => StreamLanguage.define(diff)],
])

/** The language of a file by its name; a name it does not know gets plain text. */
export function languageForFile(fileName: string | undefined): Extension {
  const base = fileName?.split('/').pop() ?? ''
  const dot = base.lastIndexOf('.')
  const extension = dot > 0 ? base.slice(dot + 1).toLowerCase() : ''
  return LANGUAGES.get(extension)?.() ?? []
}

interface SyntaxToken {
  /** The class is `tok-<name>`. */
  name: string
  tags: readonly Tag[]
  style: Record<string, string | number>
}

// Mixed with the text as a tinted `Tag` is: the status colours alone are under 4.5:1 here.
const INSERTED = 'color-mix(in srgb, var(--rv-success) 85%, var(--rv-text))'
const DELETED = 'color-mix(in srgb, var(--rv-danger) 85%, var(--rv-text))'

// One table for the class of a token and its look: the highlighter and the theme are both built
// from it, so a class cannot lose its colour. Stable class names instead of `HighlightStyle`, which
// generates them: the tests read what a token is. The same split as `diff-theme.css`, so a token
// looks alike there.
const SYNTAX: readonly SyntaxToken[] = [
  { name: 'keyword', tags: [t.keyword, t.operator], style: { color: 'var(--rv-code-keyword)' } },
  { name: 'string', tags: [t.string, t.monospace], style: { color: 'var(--rv-code-string)' } },
  {
    name: 'number',
    tags: [t.number, t.bool, t.atom, t.null],
    style: { color: 'var(--rv-code-number)' },
  },
  {
    name: 'function',
    tags: [
      t.function(t.variableName),
      t.function(t.propertyName),
      t.typeName,
      t.className,
      t.namespace,
    ],
    style: { color: 'var(--rv-code-function)' },
  },
  { name: 'tag', tags: [t.tagName], style: { color: 'var(--rv-code-tag)' } },
  { name: 'attribute', tags: [t.propertyName], style: { color: 'var(--rv-code-attribute)' } },
  {
    name: 'special',
    tags: [t.regexp, t.escape, t.annotation],
    style: { color: 'var(--rv-code-special)' },
  },
  { name: 'comment', tags: [t.comment, t.quote], style: { color: 'var(--rv-text-2)' } },
  { name: 'meta', tags: [t.meta], style: { color: 'var(--rv-text-2)' } },
  { name: 'link', tags: [t.link, t.url], style: { color: 'var(--rv-link)' } },
  {
    name: 'heading',
    tags: [t.heading],
    style: { color: 'var(--rv-code-keyword)', fontWeight: 600 },
  },
  { name: 'strong', tags: [t.strong], style: { fontWeight: 600 } },
  { name: 'emphasis', tags: [t.emphasis], style: { fontStyle: 'italic' } },
  { name: 'inserted', tags: [t.inserted], style: { color: INSERTED } },
  { name: 'deleted', tags: [t.deleted], style: { color: DELETED } },
  { name: 'invalid', tags: [t.invalid], style: { color: DELETED } },
]

export const syntaxClasses = syntaxHighlighting(
  tagHighlighter(SYNTAX.map(({ name, tags }) => ({ tag: tags, class: `tok-${name}` }))),
)

/**
 * What is inside the field. In a theme and not the CSS Module: CodeMirror scopes these rules itself,
 * above its own base theme, and they only name `--rv-*` tokens, so they follow the theme switch.
 */
export const editorTheme = EditorView.theme({
  '&': {
    maxHeight: '480px',
    backgroundColor: 'transparent',
    color: 'var(--rv-text)',
    fontSize: 'var(--rv-fs-xs)',
  },
  // The field draws the focus (DESIGN_SYSTEM §7).
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'var(--rv-font-mono)',
    lineHeight: '21px',
  },
  // The height of an empty field, a multiple of the 4px grid (DESIGN_SYSTEM §10).
  '.cm-content, .cm-gutter': { minHeight: '160px' },
  '.cm-content': { caretColor: 'var(--rv-text)' },
  '.cm-content ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--rv-link) 30%, transparent)',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--rv-text-3)',
    borderRight: '1px solid var(--rv-border)',
  },
  '.cm-rv-line-highlighted': { backgroundColor: 'var(--rv-selected)' },
  '.cm-rv-line-error': { backgroundColor: 'var(--rv-danger-bg)' },
  '.cm-rv-column-error': { textDecoration: 'underline wavy var(--rv-danger)' },
  '.cm-rv-diagnostic': {
    // Off the 4px grid on purpose: the padding of `.cm-line` in the CodeMirror base theme, so the
    // message starts where the code of its line does.
    padding: '0 2px 0 6px',
    backgroundColor: 'var(--rv-danger-bg)',
    color: 'var(--rv-text)',
    whiteSpace: 'pre-wrap',
  },
  // The list of completions: a pop-up layer, so the one shadow of DESIGN_SYSTEM §6.
  '.cm-tooltip': {
    border: 'none',
    borderRadius: 'var(--rv-radius-md)',
    backgroundColor: 'var(--rv-pop-bg)',
    boxShadow: 'var(--rv-pop-shadow)',
    color: 'var(--rv-text)',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    fontFamily: 'var(--rv-font-mono)',
    fontSize: 'var(--rv-fs-xs)',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': { padding: '2px 8px', lineHeight: '20px' },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'var(--rv-selected)',
    color: 'var(--rv-text)',
  },
  '.cm-completionDetail': { color: 'var(--rv-text-3)' },
  ...Object.fromEntries(SYNTAX.map(({ name, style }) => [`.tok-${name}`, style])),
})

/** A completion offered at the start of a line. */
export interface CodeEditorCompletion {
  /** What the list shows; what the user typed is matched against it. */
  label: string
  /** The text that replaces what the user typed on the line. */
  insert: string
  /** Where the cursor lands, as an offset in `insert`; the end of it by default. */
  cursor?: number
  /** A short note next to the label. */
  detail?: string
}

// What the line holds, up to the cursor, while the user may be typing a completion: one word, or a
// `#` heading with a word after it. Anything else (a sentence, an indented line) gets none.
const LINE_START = /^[#`\w-]*(?: [\w-]*)?$/

/**
 * Offers `completions` while the line, up to the cursor, can still become one of them: typing
 * `# S` or `` ```rev `` at the start of a line opens the list. On an empty line only when asked
 * (Ctrl-Space).
 */
export function lineStartCompletions(
  completions: readonly CodeEditorCompletion[],
): CompletionSource {
  const options = completions.map(
    ({ label, insert, cursor = insert.length, detail }): Completion => ({
      label,
      detail,
      apply: (view, completion, from, to) => {
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + cursor },
          scrollIntoView: true,
          userEvent: 'input.complete',
          annotations: pickedCompletion.of(completion),
        })
      },
    }),
  )
  return (context) => {
    const typed = context.matchBefore(LINE_START)
    if (typed === null || (typed.from === typed.to && !context.explicit)) {
      return null
    }
    return { from: typed.from, options, validFor: LINE_START }
  }
}

/** The completion list with only the given completions, or nothing when there are none. */
export function completionsExtension(completions: readonly CodeEditorCompletion[]): Extension {
  return completions.length === 0
    ? []
    : autocompletion({ override: [lineStartCompletions(completions)], icons: false })
}

/** A problem in the text. Line and column count from 1; null when the problem has no position. */
export interface CodeEditorDiagnostic {
  line: number | null
  column?: number | null
  message: string
}

export interface LineMarks {
  highlightedLines: readonly number[]
  diagnostics: readonly CodeEditorDiagnostic[]
}

class DiagnosticWidget extends WidgetType {
  private readonly text: string

  constructor(text: string) {
    super()
    this.text = text
  }

  override eq(other: DiagnosticWidget): boolean {
    return other.text === this.text
  }

  override toDOM(): HTMLElement {
    const node = document.createElement('div')
    node.className = 'cm-rv-diagnostic'
    node.textContent = this.text
    return node
  }
}

const highlightedLine = Decoration.line({ class: 'cm-rv-line-highlighted' })
const errorLine = Decoration.line({ class: 'cm-rv-line-error' })
const errorColumn = Decoration.mark({ class: 'cm-rv-column-error' })

function diagnosticText({ line, column, message }: CodeEditorDiagnostic): string {
  if (line === null) {
    return message
  }
  const hasColumn = column !== null && column !== undefined
  return `${String(line)}${hasColumn ? `:${String(column)}` : ''} ${message}`
}

function diagnosticDecorations(doc: Text, diagnostic: CodeEditorDiagnostic): Range<Decoration>[] {
  // A message must not be lost: a position past the end means a text the server read and the user
  // changed, and an empty document is a rules file with no text. `doc.line` throws out of range.
  const number = Math.min(Math.max(diagnostic.line ?? 1, 1), doc.lines)
  const line = doc.line(number)
  const ranges = [
    Decoration.widget({
      widget: new DiagnosticWidget(diagnosticText(diagnostic)),
      block: true,
      side: 1,
    }).range(line.to),
  ]
  // Without a position the message only stands under the first line: that line is not the error.
  if (diagnostic.line !== null) {
    ranges.push(errorLine.range(line.from))
  }
  const offset = (diagnostic.column ?? 0) - 1
  if (number === diagnostic.line && offset >= 0 && offset < line.length) {
    const to = line.from + findClusterBreak(line.text, offset)
    ranges.push(errorColumn.range(line.from + offset, to))
  }
  return ranges
}

interface MarkedLines {
  marks: LineMarks
  decorations: DecorationSet
}

function markLines(doc: Text, marks: LineMarks): MarkedLines {
  const ranges = marks.diagnostics.flatMap((item) => diagnosticDecorations(doc, item))
  for (const number of marks.highlightedLines) {
    if (number >= 1 && number <= doc.lines) {
      ranges.push(highlightedLine.range(doc.line(number).from))
    }
  }
  return { marks, decorations: Decoration.set(ranges, true) }
}

// By content, not by reference: a parent may build the arrays anew on every render, and each
// keystroke renders it. A false "different" only places the marks anew.
function sameMarks(a: LineMarks, b: LineMarks): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export const setLineMarks = StateEffect.define<LineMarks>()

// A mark is about a piece of text, so it moves with the text on an edit. Text from outside is
// another document, and other marks are another report: the line numbers are applied anew. A state
// field, not a view plugin: a plugin may not provide block decorations.
export const lineMarks = StateField.define<MarkedLines>({
  create: () => ({
    marks: { highlightedLines: [], diagnostics: [] },
    decorations: Decoration.none,
  }),
  update(value, transaction) {
    const effect = transaction.effects.find((item) => item.is(setLineMarks))
    if (effect && !sameMarks(effect.value, value.marks)) {
      return markLines(transaction.newDoc, effect.value)
    }
    if (transaction.annotation(Transaction.remote)) {
      return markLines(transaction.newDoc, value.marks)
    }
    return { marks: value.marks, decorations: value.decorations.map(transaction.changes) }
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
})
