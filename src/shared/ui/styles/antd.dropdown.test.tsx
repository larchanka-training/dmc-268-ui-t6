// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { Dropdown } from 'antd'
import { afterEach, describe, expect, it } from 'vitest'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheet.
// Under jsdom `import.meta.url` is not a file URL, so the path is relative to the project root,
// where Vitest runs.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

// A rule whose selector no longer matches what Ant Design renders goes dead without an error
// (DESIGN_SYSTEM §11), so it is matched against a real dropdown menu.
const GROUP_TITLE =
  '.ant-dropdown .ant-dropdown-menu .ant-dropdown-menu-item-group .ant-dropdown-menu-item-group-title'

const CSS = readFileSync('src/shared/ui/styles/antd.css', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')

function declarations(selector: string): string {
  const start = CSS.indexOf(`${selector} {`)
  expect(start, selector).toBeGreaterThanOrEqual(0)
  return CSS.slice(CSS.indexOf('{', start) + 1, CSS.indexOf('}', start))
}

afterEach(() => {
  cleanup()
})

describe('the Dropdown group title rule of antd.css', () => {
  it('sets the title at 12px, a size of the DS §4 scale, not 11.5px (#239 D12)', () => {
    const rule = declarations(GROUP_TITLE)
    expect(rule).toContain('font-size: var(--rv-fs-xs);')
    expect(rule).not.toContain('11.5px')
  })

  it('matches the group title of a real dropdown menu', () => {
    render(
      <Dropdown
        menu={{
          items: [
            {
              type: 'group',
              key: 'theme',
              label: 'Theme',
              children: [{ key: 'dark', label: 'Dark' }],
            },
          ],
        }}
        open
      >
        <button type="button">menu</button>
      </Dropdown>,
    )
    const title = document.querySelector('.ant-dropdown-menu-item-group-title')
    expect(title?.textContent).toBe('Theme')
    expect(title?.matches(GROUP_TITLE)).toBe(true)
  })
})
