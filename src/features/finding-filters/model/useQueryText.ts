import { useCallback, useEffect, useRef, useState } from 'react'

/** Pause after the last keystroke before the query is written to the URL. */
const QUERY_WRITE_DEBOUNCE_MS = 250

/**
 * The text of the search box. The box is controlled by this local state, not by the URL: the router
 * commits a navigation in a transition, and until it lands React would put the old value back into
 * the input, dropping characters and throwing the caret to the end.
 *
 * The URL query is written `QUERY_WRITE_DEBOUNCE_MS` after the last keystroke through `writeQuery`.
 * The text follows the URL again when the URL query becomes a value this hook did not write (back and
 * forward, a link); the URL catching up with what was typed does not touch it. A change of
 * `navigationKey` (a navigation the owner of the URL did not make) does the same even when the query
 * is the same: the pending text and its write belong to a page state that is gone.
 */
export function useQueryText(
  urlQuery: string,
  writeQuery: (query: string) => void,
  navigationKey = 0,
): {
  text: string
  /** The user edited the text: it shows at once, the write follows after the pause. */
  type: (next: string) => void
  /** For a navigation that carries the query itself (a select): cancels the pending write, returns the text. */
  takePending: () => string
  /** Reset: empties the text and cancels the pending write. */
  clear: () => void
} {
  const [text, setText] = useState(urlQuery)
  const textRef = useRef(urlQuery)
  // What the URL query will be once every write has landed.
  const requestedRef = useRef(urlQuery)
  // Values written since the URL last caught up with `requestedRef`: an earlier one may land late.
  const writtenRef = useRef(new Set<string>())
  const timerRef = useRef<number | undefined>(undefined)
  const writeRef = useRef(writeQuery)
  const navigationKeyRef = useRef(navigationKey)

  useEffect(() => {
    writeRef.current = writeQuery
  })

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current)
    },
    [],
  )

  useEffect(() => {
    if (urlQuery === requestedRef.current) {
      writtenRef.current.clear()
      return
    }
    if (writtenRef.current.has(urlQuery)) {
      return
    }
    window.clearTimeout(timerRef.current)
    timerRef.current = undefined
    textRef.current = urlQuery
    requestedRef.current = urlQuery
    writtenRef.current.clear()
    setText(urlQuery)
  }, [urlQuery])

  useEffect(() => {
    if (navigationKey === navigationKeyRef.current) {
      return
    }
    navigationKeyRef.current = navigationKey
    window.clearTimeout(timerRef.current)
    timerRef.current = undefined
    textRef.current = urlQuery
    requestedRef.current = urlQuery
    writtenRef.current.clear()
    setText(urlQuery)
  }, [navigationKey, urlQuery])

  const request = useCallback((query: string) => {
    if (query !== requestedRef.current) {
      requestedRef.current = query
      writtenRef.current.add(query)
    }
  }, [])

  const type = useCallback(
    (next: string) => {
      textRef.current = next
      setText(next)
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        timerRef.current = undefined
        const query = textRef.current
        if (query !== requestedRef.current) {
          request(query)
          writeRef.current(query)
        }
      }, QUERY_WRITE_DEBOUNCE_MS)
    },
    [request],
  )

  const takePending = useCallback(() => {
    window.clearTimeout(timerRef.current)
    timerRef.current = undefined
    request(textRef.current)
    return textRef.current
  }, [request])

  const clear = useCallback(() => {
    window.clearTimeout(timerRef.current)
    timerRef.current = undefined
    textRef.current = ''
    requestedRef.current = ''
    writtenRef.current.clear()
    setText('')
  }, [])

  return { text, type, takePending, clear }
}
