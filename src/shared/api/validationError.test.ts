import { describe, expect, it } from 'vitest'

import { ApiError } from './client'
import { HttpValidationErrorSchema, validationErrorLocations } from './validationError'

describe('HttpValidationErrorSchema', () => {
  it('parses a FastAPI HTTPValidationError', () => {
    const body = {
      detail: [
        {
          loc: ['body', 'branchFilter', 1],
          msg: 'String should have at least 1 character',
          type: 'string_too_short',
          input: '',
          ctx: { min_length: 1 },
        },
        { loc: ['query', 'limit'], msg: 'Input should be a valid integer', type: 'int_parsing' },
      ],
    }

    expect(HttpValidationErrorSchema.parse(body)).toEqual(body)
  })

  it('rejects a detail that is not a list of located errors', () => {
    expect(
      HttpValidationErrorSchema.safeParse({ detail: 'Active run already exists' }).success,
    ).toBe(false)
    expect(
      HttpValidationErrorSchema.safeParse({ detail: [{ msg: 'no loc', type: 'x' }] }).success,
    ).toBe(false)
    expect(
      HttpValidationErrorSchema.safeParse({ detail: [{ loc: [true], msg: 'x', type: 'x' }] })
        .success,
    ).toBe(false)
  })
})

describe('validationErrorLocations', () => {
  it('parses FastAPI detail locations', () => {
    const error = new ApiError(422, 'Unprocessable Entity', {
      detail: [
        { loc: ['body', 'branchFilter', 2], msg: 'bad mask', type: 'value_error' },
        { loc: ['body', 'severityThreshold'], msg: 'bad enum', type: 'enum' },
      ],
    })

    expect(validationErrorLocations(error.data)).toEqual([
      { path: ['body', 'branchFilter', 2] },
      { path: ['body', 'severityThreshold'] },
    ])
  })

  it('does not leak the English msg of the server', () => {
    const [location] = validationErrorLocations({
      detail: [
        { loc: ['body', 'maxComments'], msg: 'Input should be <= 10', type: 'less_than_equal' },
      ],
    })

    expect(location).toEqual({ path: ['body', 'maxComments'] })
  })

  it.each([
    ['a string detail', { detail: 'Active run already exists' }],
    ['an object detail', { detail: { message: 'nope' } }],
    ['a missing detail', {}],
    ['a plain string body', 'Bad Gateway'],
    ['null', null],
    ['undefined', undefined],
    ['a malformed item', { detail: [{ loc: 'body', msg: 'x', type: 'x' }] }],
  ])('returns no locations for %s', (_name, data) => {
    expect(validationErrorLocations(data)).toEqual([])
  })

  it('returns an empty list for an empty detail', () => {
    expect(validationErrorLocations({ detail: [] })).toEqual([])
  })
})
