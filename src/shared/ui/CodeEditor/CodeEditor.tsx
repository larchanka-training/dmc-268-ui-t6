import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { Compartment, EditorState, Transaction } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { useLayoutEffect, useRef, type JSX } from 'react'

import { cx } from '../lib/cx'
import styles from './CodeEditor.module.css'
import {
  completionsExtension,
  editorTheme,
  languageForFile,
  lineMarks,
  setLineMarks,
  syntaxClasses,
  type CodeEditorCompletion,
  type CodeEditorDiagnostic,
} from './editorExtensions'

export type { CodeEditorCompletion, CodeEditorDiagnostic } from './editorExtensions'

export interface CodeEditorProps {
  /**
   * The text. A new value replaces the text in the editor, without `onChange`. An edit is shown at
   * once and reported through `onChange`: keep it in state and pass it back. Unlike a controlled
   * `<textarea>`, the editor does not undo an edit the parent did not take; it stays until `value`
   * changes.
   */
  value: string
  onChange?: (value: string) => void
  /** Picks the syntax by extension; `.diff` and `.patch` are a unified diff. */
  fileName?: string
  /**
   * Lines to mark, counted from 1; a line the document does not have is skipped. This and
   * `diagnostics` are compared by content: the same marks again stay where an edit moved them.
   */
  highlightedLines?: readonly number[]
  /**
   * Each message is shown under its line, which is marked; one past the end of the document, under
   * the last. One with `line: null` stands under the first line and marks no line.
   */
  diagnostics?: readonly CodeEditorDiagnostic[]
  /** The text can be read, selected and copied, and stays in the Tab order. */
  readOnly?: boolean
  /**
   * Offered at the start of a line, as the user types (Ctrl-Space on an empty line); Enter takes
   * one, Escape closes the list, Tab still leaves the editor. None while `readOnly`.
   */
  completions?: readonly CodeEditorCompletion[]
  'aria-label': string
  className?: string
}

const NO_LINES: readonly number[] = []
const NO_DIAGNOSTICS: readonly CodeEditorDiagnostic[] = []
const NO_COMPLETIONS: readonly CodeEditorCompletion[] = []

const attributes = new Compartment()
const language = new Compartment()
const readOnlyMode = new Compartment()
const completion = new Compartment()

/**
 * A code editor on CodeMirror 6. Not exported from `shared/ui/index.ts`: the barrel is in the first
 * chunk of every screen, so a lazy page imports this file directly (DESIGN_SYSTEM §10).
 */
export function CodeEditor(props: CodeEditorProps): JSX.Element {
  const {
    value,
    onChange,
    fileName,
    highlightedLines = NO_LINES,
    diagnostics = NO_DIAGNOSTICS,
    readOnly = false,
    completions = NO_COMPLETIONS,
    'aria-label': ariaLabel,
    className,
  } = props
  const invalid = diagnostics.length > 0
  const parentRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)

  useLayoutEffect(() => {
    onChangeRef.current = onChange
  })

  useLayoutEffect(() => {
    const view = new EditorView({
      parent: parentRef.current ?? undefined,
      state: EditorState.create({
        extensions: [
          lineNumbers(),
          history(),
          // No Tab key here: Tab leaves the editor, as everywhere else on a page (UI checklist §3b).
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          editorTheme,
          syntaxClasses,
          lineMarks,
          attributes.of([]),
          language.of([]),
          readOnlyMode.of([]),
          completion.of([]),
          EditorView.updateListener.of((update) => {
            const fromOutside = update.transactions.some((tr) => tr.annotation(Transaction.remote))
            if (update.docChanged && !fromOutside) {
              onChangeRef.current?.(update.state.doc.toString())
            }
          }),
        ],
      }),
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useLayoutEffect(() => {
    viewRef.current?.dispatch({
      effects: attributes.reconfigure(
        EditorView.contentAttributes.of({
          'aria-label': ariaLabel,
          ...(invalid ? { 'aria-invalid': 'true' } : {}),
        }),
      ),
    })
  }, [ariaLabel, invalid])

  useLayoutEffect(() => {
    viewRef.current?.dispatch({ effects: language.reconfigure(languageForFile(fileName)) })
  }, [fileName])

  useLayoutEffect(() => {
    viewRef.current?.dispatch({
      effects: readOnlyMode.reconfigure(EditorState.readOnly.of(readOnly)),
    })
  }, [readOnly])

  // None while read only: a completion is applied by a transaction, which `readOnly` does not stop.
  useLayoutEffect(() => {
    viewRef.current?.dispatch({
      effects: completion.reconfigure(
        completionsExtension(readOnly ? NO_COMPLETIONS : completions),
      ),
    })
  }, [completions, readOnly])

  // A layout effect: a passive one could run after the next keystroke and put the older text back.
  useLayoutEffect(() => {
    const view = viewRef.current
    if (!view || value === view.state.doc.toString()) {
      return
    }
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      annotations: [Transaction.remote.of(true), Transaction.addToHistory.of(false)],
    })
  }, [value])

  useLayoutEffect(() => {
    viewRef.current?.dispatch({ effects: setLineMarks.of({ highlightedLines, diagnostics }) })
  }, [highlightedLines, diagnostics])

  return (
    <div
      ref={parentRef}
      className={cx(
        styles.field,
        readOnly && styles.readOnly,
        invalid && styles.invalid,
        className,
      )}
    />
  )
}
