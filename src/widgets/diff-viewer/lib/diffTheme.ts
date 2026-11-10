import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import { theme } from 'antd'
import type { GlobalToken } from 'antd'

export type DiffThemeVars = Record<string, string>

/**
 * Syntax palette, one entry per slot of `diff-theme.css` (Refs #74, #118). The slots point at the
 * shared code palette of `tokens.css`, the one `CodeEditor` uses, and comments at `--rv-text-2`:
 * code is text, so every slot holds 4.5:1 on the container, insert, delete and selected
 * backgrounds of both themes (DS §3, #239 D1; `diffTheme.test.ts` pins the contrast).
 */
const SYNTAX_PALETTE: DiffThemeVars = {
  '--diff-token-keyword': 'var(--rv-code-keyword)',
  '--diff-token-string': 'var(--rv-code-string)',
  '--diff-token-number': 'var(--rv-code-number)',
  '--diff-token-function': 'var(--rv-code-function)',
  '--diff-token-tag': 'var(--rv-code-tag)',
  '--diff-token-attribute': 'var(--rv-code-attribute)',
  '--diff-token-special': 'var(--rv-code-special)',
  '--diff-token-comment': 'var(--rv-text-2)',
}

/**
 * CSS custom properties that repaint react-diff-view for the active antd theme (Refs #74, Ф-13).
 * The library declares them on `:root` with light-only values, so they are overridden on the diff
 * root. Each `*-text-color` twin is set explicitly: the library resolves it on `:root`
 * (`var(--diff-text-color)` there is the initial value), so overriding only `--diff-text-color`
 * would never reach it.
 */
export function diffThemeVars(token: GlobalToken): DiffThemeVars {
  const text = token.colorText
  return {
    '--diff-background-color': token.colorBgContainer,
    '--diff-text-color': text,
    '--diff-selection-background-color': token.colorPrimaryBgHover,
    '--diff-selection-text-color': text,
    '--diff-gutter-insert-background-color': token.colorSuccessBgHover,
    '--diff-gutter-insert-text-color': text,
    '--diff-gutter-delete-background-color': token.colorErrorBgFilledHover,
    '--diff-gutter-delete-text-color': text,
    '--diff-gutter-selected-background-color': token.colorWarningBgHover,
    '--diff-gutter-selected-text-color': text,
    '--diff-code-insert-background-color': token.colorSuccessBg,
    '--diff-code-insert-text-color': text,
    '--diff-code-delete-background-color': token.colorErrorBg,
    '--diff-code-delete-text-color': text,
    '--diff-code-insert-edit-background-color': token.colorSuccessBgHover,
    '--diff-code-insert-edit-text-color': text,
    '--diff-code-delete-edit-background-color': token.colorErrorBgActive,
    '--diff-code-delete-edit-text-color': text,
    '--diff-code-selected-background-color': token.colorWarningBg,
    '--diff-code-selected-text-color': text,
    ...SYNTAX_PALETTE,
  }
}

/**
 * `className` + inline variables for the root of a rendered diff. The token is read during render,
 * so a theme switch repaints in the same commit (no effect, no flash).
 */
export function useDiffThemeStyle(): { className: string; style: CSSProperties } {
  const { token } = theme.useToken()
  return useMemo(() => ({ className: 'diff-theme', style: diffThemeVars(token) }), [token])
}
