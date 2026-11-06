import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { Compartment, EditorState, Transaction } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { useLayoutEffect, useRef, type JSX } from 'react'

export interface CodeEditorProps {
  /** The text, the source of truth as in a controlled `<textarea>`. */
  value: string
  onChange?: (value: string) => void
  'aria-label': string
}

const attributes = new Compartment()

/**
 * A code editor on CodeMirror 6. Not exported from `shared/ui/index.ts`: the barrel is in the first
 * chunk of every screen, so a lazy page imports this file directly (DESIGN_SYSTEM §10).
 */
export function CodeEditor(props: CodeEditorProps): JSX.Element {
  const { value, onChange, 'aria-label': ariaLabel } = props
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
          keymap.of([...defaultKeymap, ...historyKeymap]),
          attributes.of([]),
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
      effects: attributes.reconfigure(EditorView.contentAttributes.of({ 'aria-label': ariaLabel })),
    })
  }, [ariaLabel])

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

  return <div ref={parentRef} />
}
