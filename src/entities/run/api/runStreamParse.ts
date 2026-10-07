import { RunUpdatedEventSchema } from '../model/schemas'
import type { RunUpdatedEvent } from '../model/schemas'

export interface ParsedSseEvent {
  event: string
  data: string
}

/** Incrementally parse SSE frames from a text buffer (Refs #65, FRONTEND_ARCHITECTURE §2). */
export function parseSseBuffer(buffer: string): { events: ParsedSseEvent[]; rest: string } {
  const events: ParsedSseEvent[] = []
  const blocks = buffer.split('\n\n')
  const rest = blocks.pop() ?? ''
  for (const block of blocks) {
    const lines = block.split('\n')
    let eventName = 'message'
    const dataLines: string[] = []
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).trim()
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trim())
      }
    }
    if (dataLines.length > 0) {
      events.push({ event: eventName, data: dataLines.join('\n') })
    }
  }
  return { events, rest }
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
