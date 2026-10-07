import { describe, expect, it } from 'vitest'

import { parseRunUpdatedEvent, parseSseBuffer } from './runStreamParse'

describe('runStreamParse', () => {
  it('parses run.updated SSE frames', () => {
    const chunk =
      'event: run.updated\ndata: {"runId":"11111111-1111-4111-8111-000000000001","status":"running"}\n\n'
    const { events, rest } = parseSseBuffer(chunk)
    expect(rest).toBe('')
    expect(events).toHaveLength(1)
    const payload = parseRunUpdatedEvent(events[0]?.data ?? '')
    expect(payload?.runId).toBe('11111111-1111-4111-8111-000000000001')
    expect(payload?.status).toBe('running')
  })
})
