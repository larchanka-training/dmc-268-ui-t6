import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import { theme } from 'antd'
import type { GlobalToken } from 'antd'

export type DiffThemeVars = Record<string, string>

/**
 * Syntax palette, one entry per slot of `diff-theme.css` (Refs #74). Preset-palette index 7 is the
 * single step that reads on both backgrounds: dark and saturated under `defaultAlgorithm`, and
 * regenerated brighter under `darkAlgorithm` (`diffTheme.test.ts` pins the contrast).
 */
function syntaxPalette(token: GlobalToken): DiffThemeVars {
  return {
    '--diff-token-keyword': token.magenta7,
    '--diff-token-string': token.orange7,
    '--diff-token-number': token.blue7,
    '--diff-token-function': token.cyan7,
    '--diff-token-tag': token.volcano7,
    '--diff-token-attribute': token.geekblue7,
    '--diff-token-special': token.purple7,
    '--diff-token-comment': token.colorTextTertiary,
  }
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
    '--diff-omit-gutter-line-color': token.colorError,
    ...syntaxPalette(token),
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
