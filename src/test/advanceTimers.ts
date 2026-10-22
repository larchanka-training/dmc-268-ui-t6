import { act } from '@testing-library/react'
import { vi } from 'vitest'

export async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

// A few zero-length rounds let requests, query notifications and React renders drain.
export async function settle(): Promise<void> {
  for (let round = 0; round < 5; round += 1) {
    await advance(0)
  }
}
