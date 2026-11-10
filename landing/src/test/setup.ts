import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

beforeEach(() => {
  // jsdom has no FontFaceSet; tests can replace this pending promise when needed.
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { ready: Promise.race<FontFaceSet>([]) },
  })
})

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(document, 'fonts')
})
