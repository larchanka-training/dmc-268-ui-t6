// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { Pagination } from 'antd'
import { afterEach, describe, expect, it } from 'vitest'

// Keep the URL dynamic so Vite does not rewrite it into a browser asset URL in jsdom.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: URL, encoding: 'utf8') => string
}
const STYLESHEET_PATH = './antd.css'
const stylesheet = readFileSync(new URL(STYLESHEET_PATH, import.meta.url), 'utf8')

afterEach(() => {
  cleanup()
})

describe('Pagination focus overrides', () => {
  it('targets the real page, previous/next and jump focus nodes with a 2px link ring', () => {
    const { container } = render(
      <Pagination defaultCurrent={6} showSizeChanger={false} total={150} />,
    )
    const style = document.createElement('style')
    style.textContent = stylesheet
    document.head.append(style)
    try {
      const ringRules = [...(style.sheet?.cssRules ?? [])].filter(
        (rule): rule is CSSStyleRule =>
          rule instanceof CSSStyleRule &&
          rule.style.getPropertyValue('outline') === '2px solid var(--rv-link)',
      )
      expect(ringRules.map((rule) => rule.selectorText)).not.toHaveLength(0)
      for (const className of [
        'ant-pagination-item',
        'ant-pagination-prev',
        'ant-pagination-next',
        'ant-pagination-jump-prev',
        'ant-pagination-jump-next',
      ]) {
        const focusNode = container.querySelector<HTMLElement>(`.${className}`)
        expect(focusNode, className).not.toBeNull()
        focusNode?.focus()
        expect(document.activeElement, className).toBe(focusNode)
        const target =
          className === 'ant-pagination-prev' || className === 'ant-pagination-next'
            ? focusNode?.querySelector('.ant-pagination-item-link')
            : focusNode
        expect(
          ringRules.some((rule) => target?.matches(rule.selectorText)),
          className,
        ).toBe(true)
      }
    } finally {
      style.remove()
    }
  })
})
