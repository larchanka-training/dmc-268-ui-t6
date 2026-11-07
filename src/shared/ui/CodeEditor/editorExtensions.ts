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
import { tagHighlighter, tags as t } from '@lezer/highlight'

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

// Stable class names instead of `HighlightStyle`, which generates them: the theme colours these, and
// the tests read what a token is. The same split as `diff-theme.css`, so a token looks alike there.
export const syntaxClasses = syntaxHighlighting(
  tagHighlighter([
    { tag: [t.keyword, t.operator], class: 'tok-keyword' },
    { tag: [t.string, t.monospace], class: 'tok-string' },
    { tag: [t.number, t.bool, t.atom, t.null], class: 'tok-number' },
    {
      tag: [
        t.function(t.variableName),
        t.function(t.propertyName),
        t.typeName,
        t.className,
        t.namespace,
      ],
      class: 'tok-function',
    },
    { tag: t.tagName, class: 'tok-tag' },
    { tag: t.propertyName, class: 'tok-attribute' },
    { tag: [t.regexp, t.escape, t.annotation], class: 'tok-special' },
    { tag: [t.comment, t.quote], class: 'tok-comment' },
    { tag: t.meta, class: 'tok-meta' },
    { tag: t.heading, class: 'tok-heading' },
    { tag: t.strong, class: 'tok-strong' },
    { tag: t.emphasis, class: 'tok-emphasis' },
    { tag: [t.link, t.url], class: 'tok-link' },
    { tag: t.inserted, class: 'tok-inserted' },
    { tag: t.deleted, class: 'tok-deleted' },
    { tag: t.invalid, class: 'tok-invalid' },
  ]),
)

const CODE_COLOURS: Record<string, string> = {
  keyword: '--rv-code-keyword',
  string: '--rv-code-string',
  number: '--rv-code-number',
  function: '--rv-code-function',
  tag: '--rv-code-tag',
  attribute: '--rv-code-attribute',
  special: '--rv-code-special',
  comment: '--rv-text-2',
  meta: '--rv-text-2',
  link: '--rv-link',
}

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
    padding: '0 2px 0 6px',
    backgroundColor: 'var(--rv-danger-bg)',
    color: 'var(--rv-text)',
    whiteSpace: 'pre-wrap',
  },
  ...Object.fromEntries(
    Object.entries(CODE_COLOURS).map(([name, token]) => [
      `.tok-${name}`,
      { color: `var(${token})` },
    ]),
  ),
  '.tok-heading': { color: 'var(--rv-code-keyword)', fontWeight: 600 },
  '.tok-strong': { fontWeight: 600 },
  '.tok-emphasis': { fontStyle: 'italic' },
  // Mixed with the text as a tinted `Tag` is: the status colours alone are under 4.5:1 here.
  '.tok-inserted': { color: 'color-mix(in srgb, var(--rv-success) 85%, var(--rv-text))' },
  '.tok-deleted, .tok-invalid': {
    color: 'color-mix(in srgb, var(--rv-danger) 85%, var(--rv-text))',
  },
})

/** A problem in the text. Line and column count from 1; null when the problem has no position. */
export interface EditorDiagnostic {
  line: number | null
  column?: number | null
  message: string
}

export interface LineMarks {
  highlightedLines: readonly number[]
  diagnostics: readonly EditorDiagnostic[]
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

function diagnosticText({ line, column, message }: EditorDiagnostic): string {
  if (line === null) {
    return message
  }
  const hasColumn = column !== null && column !== undefined
  return `${String(line)}${hasColumn ? `:${String(column)}` : ''} ${message}`
}

function diagnosticDecorations(doc: Text, diagnostic: EditorDiagnostic): Range<Decoration>[] {
  // A message must not be lost: a position past the end means a text the server read and the user
  // changed, and an empty document is a rules file with no text. `doc.line` throws out of range.
  const number = Math.min(Math.max(diagnostic.line ?? 1, 1), doc.lines)
  const line = doc.line(number)
  const ranges = [
    errorLine.range(line.from),
    Decoration.widget({
      widget: new DiagnosticWidget(diagnosticText(diagnostic)),
      block: true,
      side: 1,
    }).range(line.to),
  ]
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
