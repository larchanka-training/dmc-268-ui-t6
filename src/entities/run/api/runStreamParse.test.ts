import { describe, expect, it } from 'vitest'

import { parseRunUpdatedEvent, parseSseBuffer } from './runStreamParse'

const RUN_ID = '11111111-1111-4111-8111-000000000001'
const DATA = `data: {"runId":"${RUN_ID}","status":"running"}`

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

  it('parses a frame with CRLF line endings', () => {
    const { events, rest, comments } = parseSseBuffer(`event: run.updated\r\n${DATA}\r\n\r\n`)
    expect(rest).toBe('')
    expect(comments).toBe(0)
    expect(events).toStrictEqual([{ event: 'run.updated', data: DATA.slice('data: '.length) }])
  })

  it('parses a frame with lone CR line endings', () => {
    const { events, rest } = parseSseBuffer(`event: run.updated\r${DATA}\r\rid: 5`)
    expect(events).toHaveLength(1)
    expect(events[0]?.event).toBe('run.updated')
    expect(rest).toBe('id: 5')
  })

  it('keeps a trailing lone CR in rest and treats it as a line ending once no LF follows', () => {
    const first = parseSseBuffer(`event: run.updated\r${DATA}\r\r`)
    expect(first.events).toHaveLength(0)

    const second = parseSseBuffer(`${first.rest}id: 5`)
    expect(second.events).toHaveLength(1)
    expect(second.rest).toBe('id: 5')
  })

  it('keeps a trailing CR in rest, so a CRLF split between CR and LF at the end of a frame still yields the event', () => {
    const first = parseSseBuffer(`event: run.updated\r\n${DATA}\r\n\r`)
    expect(first.events).toHaveLength(0)
    expect(first.rest.endsWith('\r')).toBe(true)

    const second = parseSseBuffer(`${first.rest}\n`)
    expect(second.rest).toBe('')
    expect(second.events).toHaveLength(1)
    expect(second.events[0]?.event).toBe('run.updated')
    const payload = parseRunUpdatedEvent(second.events[0]?.data ?? '')
    expect(payload?.runId).toBe(RUN_ID)
  })

  it('keeps a trailing CR in rest, so a CRLF split between CR and LF inside a frame keeps the event name', () => {
    const first = parseSseBuffer('event: run.updated\r')
    expect(first.events).toHaveLength(0)

    const second = parseSseBuffer(`${first.rest}\n${DATA}\r\n\r\n`)
    expect(second.rest).toBe('')
    expect(second.events).toHaveLength(1)
    expect(second.events[0]?.event).toBe('run.updated')
  })

  it('parses the id field into the event and reports it as lastEventId', () => {
    const { events, lastEventId } = parseSseBuffer(`event: run.updated\nid: 42\n${DATA}\n\n`)
    expect(events).toHaveLength(1)
    expect(events[0]?.id).toBe('42')
    expect(lastEventId).toBe('42')
  })

  it('leaves id off an event without an id field and reports no lastEventId', () => {
    const { events, lastEventId } = parseSseBuffer(`event: run.updated\n${DATA}\n\n`)
    expect(events).toStrictEqual([{ event: 'run.updated', data: DATA.slice('data: '.length) }])
    expect(lastEventId).toBeUndefined()
  })

  it('reports the last id seen, including one on a frame that carries no data', () => {
    const { events, lastEventId } = parseSseBuffer(
      `id: 7\nevent: run.updated\n${DATA}\n\nid: 9\n\n`,
    )
    expect(events).toHaveLength(1)
    expect(events[0]?.id).toBe('7')
    expect(lastEventId).toBe('9')
  })

  it('counts a keep-alive comment frame and yields no event for it', () => {
    const { events, rest, comments } = parseSseBuffer(': keepalive\n\n')
    expect(events).toStrictEqual([])
    expect(rest).toBe('')
    expect(comments).toBe(1)
  })

  it('counts a CRLF keep-alive comment frame', () => {
    const { events, comments } = parseSseBuffer(': keepalive\r\n\r\n')
    expect(events).toStrictEqual([])
    expect(comments).toBe(1)
  })

  it('still yields the event of a frame that follows a keep-alive comment', () => {
    const { events, comments } = parseSseBuffer(`: keepalive\n\nevent: run.updated\n${DATA}\n\n`)
    expect(comments).toBe(1)
    expect(events).toHaveLength(1)
    expect(events[0]?.event).toBe('run.updated')
  })

  it('does not count a comment frame that is still incomplete', () => {
    const { events, rest, comments } = parseSseBuffer(': keepal')
    expect(events).toStrictEqual([])
    expect(rest).toBe(': keepal')
    expect(comments).toBe(0)
  })
})
