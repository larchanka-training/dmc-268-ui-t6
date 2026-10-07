import { RunUpdatedEventSchema } from '../model/schemas'
import type { RunUpdatedEvent } from '../model/schemas'

export interface ParsedSseEvent {
  event: string
  data: string
  /** The `id:` field of the frame, an opaque string; absent when the frame has none. */
  id?: string
}

export interface ParsedSseBuffer {
  events: ParsedSseEvent[]
  /** Comment lines (`:`-prefixed, e.g. the `: keepalive` frame) in the complete frames of this buffer. */
  comments: number
  /** The last `id:` seen in the complete frames, also on a frame without data; absent when none. */
  lastEventId?: string
  rest: string
}

/**
 * Line endings are CRLF, LF or a lone CR (SSE spec). A trailing lone CR is held back: its LF may
 * arrive in the next chunk, and `rest` carries it into the next call.
 */
function normalizeLineEndings(buffer: string): string {
  const held = buffer.endsWith('\r') ? '\r' : ''
  return buffer.slice(0, buffer.length - held.length).replace(/\r\n?/g, '\n') + held
}

/** Incrementally parse SSE frames from a text buffer (Refs #65, FRONTEND_ARCHITECTURE §2). */
export function parseSseBuffer(buffer: string): ParsedSseBuffer {
  const events: ParsedSseEvent[] = []
  let comments = 0
  let lastEventId: string | undefined
  const blocks = normalizeLineEndings(buffer).split('\n\n')
  const rest = blocks.pop() ?? ''
  for (const block of blocks) {
    const lines = block.split('\n')
    let eventName = 'message'
    let id: string | undefined
    const dataLines: string[] = []
    for (const line of lines) {
      if (line.startsWith(':')) {
        comments += 1
      } else if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).trim()
      } else if (line.startsWith('id:')) {
        id = line.slice('id:'.length).trim()
        lastEventId = id
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trim())
      }
    }
    if (dataLines.length > 0) {
      events.push({
        event: eventName,
        data: dataLines.join('\n'),
        ...(id === undefined ? {} : { id }),
      })
    }
  }
  return { events, comments, ...(lastEventId === undefined ? {} : { lastEventId }), rest }
}

export function parseRunUpdatedEvent(data: string): RunUpdatedEvent | null {
  try {
    const json: unknown = JSON.parse(data)
    const parsed = RunUpdatedEventSchema.safeParse(json)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
