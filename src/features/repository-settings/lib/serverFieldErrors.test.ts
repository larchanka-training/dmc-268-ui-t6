import { describe, expect, it } from 'vitest'

import { ApiError } from '../../../shared/api/client'
import { splitServerError } from './serverFieldErrors'

function unprocessable(detail: unknown): ApiError {
  return new ApiError(422, 'Unprocessable Entity', { detail })
}

const ENGLISH_MSG = 'String should match pattern'

describe('splitServerError', () => {
  it('puts a bad threshold under the threshold', () => {
    const error = unprocessable([
      { loc: ['body', 'severityThreshold'], msg: ENGLISH_MSG, type: 'enum' },
    ])

    expect(splitServerError(error)).toEqual({
      fields: { severityThreshold: ['settings.form.serverRejectedThreshold'] },
      general: false,
    })
  })

  it('uses the generic text for the other fields of the form and for a whole list', () => {
    const error = unprocessable([
      { loc: ['body', 'maxComments'], msg: ENGLISH_MSG, type: 'int' },
      { loc: ['body', 'waitForCi'], msg: ENGLISH_MSG, type: 'enum' },
      { loc: ['body', 'reviewEvent'], msg: ENGLISH_MSG, type: 'enum' },
      { loc: ['body', 'branchFilter'], msg: ENGLISH_MSG, type: 'too_long' },
    ])

    expect(splitServerError(error)).toEqual({
      fields: {
        maxComments: ['settings.form.serverRejectedValue'],
        waitForCi: ['settings.form.serverRejectedValue'],
        reviewEvent: ['settings.form.serverRejectedValue'],
        branchFilter: ['settings.form.serverRejectedValue'],
      },
      general: false,
    })
  })

  it('never carries the English message of the server', () => {
    const error = unprocessable([
      { loc: ['body', 'branchFilter', 0], msg: ENGLISH_MSG, type: 'value_error' },
    ])

    expect(JSON.stringify(splitServerError(error))).not.toContain(ENGLISH_MSG)
  })

  it('sends a location that matches no field to the general message', () => {
    for (const loc of [
      ['body', 'defaultEngine'],
      ['body', 'unknownField'],
      ['body'],
      ['query', 'branchFilter', 0],
      [],
    ]) {
      expect(splitServerError(unprocessable([{ loc, msg: ENGLISH_MSG, type: 'x' }]))).toEqual({
        fields: {},
        general: true,
      })
    }
  })

  it('keeps the matched fields and flags the rest when a 422 mixes both', () => {
    const error = unprocessable([
      { loc: ['body', 'branchFilter', 0], msg: ENGLISH_MSG, type: 'value_error' },
      { loc: ['body', 'enabled'], msg: ENGLISH_MSG, type: 'bool' },
    ])

    expect(splitServerError(error)).toEqual({
      fields: { branchFilter: ['settings.form.serverRejectedValue'] },
      general: true,
    })
  })

  it('treats a non-array detail and an empty detail as a general error', () => {
    expect(splitServerError(new ApiError(422, 'Unprocessable Entity', { detail: 'bad' }))).toEqual({
      fields: {},
      general: true,
    })
    expect(splitServerError(unprocessable([]))).toEqual({ fields: {}, general: true })
    expect(splitServerError(new ApiError(422, 'Unprocessable Entity', 'plain text'))).toEqual({
      fields: {},
      general: true,
    })
  })

  it('treats every other error as general, whatever it carries', () => {
    const detail = [{ loc: ['body', 'branchFilter', 0], msg: ENGLISH_MSG, type: 'value_error' }]
    for (const error of [
      new ApiError(500, 'Server Error', { detail }),
      new ApiError(400, 'Bad Request', { detail }),
      new TypeError('Failed to fetch'),
      'boom',
    ]) {
      expect(splitServerError(error)).toEqual({ fields: {}, general: true })
    }
  })
})
