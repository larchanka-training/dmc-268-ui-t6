// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FilePath } from './FilePath'
import styles from './FilePath.module.css'

afterEach(() => {
  cleanup()
})

describe('FilePath', () => {
  it('shows the whole path, nothing is cut', () => {
    const path = 'src/widgets/diff-viewer/ui/a-very-long-file-name-without-spaces.test.tsx'
    render(<FilePath path={path} />)
    expect(screen.getByText(path).textContent).toBe(path)
  })

  it('keeps its own look next to the class of the caller', () => {
    render(<FilePath className="placed-by-screen" path="package.json" />)
    const element = screen.getByText('package.json')
    expect(element.classList.contains('placed-by-screen')).toBe(true)
    expect(styles.path).toBeTruthy()
    expect(element.classList.contains(styles.path ?? '')).toBe(true)
  })
})
