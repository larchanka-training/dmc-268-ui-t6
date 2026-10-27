import { i18n } from '../../../shared/i18n'

// A character the API forbids in a mask besides whitespace: `? [ ] { } ! \ ~ ^ :`.
const FORBIDDEN_CHARACTERS = /[?[\]{}!\\~^:]/

/**
 * Why the API refuses a branch filter mask, as text for the user, or `null` when it accepts it.
 *
 * The rules and their order are those of `_pattern_error` in the api repo
 * (`app/common/application/branch_patterns.py`): the first rule a mask fails names the reason.
 * Two checks of the API are not here. A blank line never reaches this function (the textarea text
 * is cleaned first), and the 255 limit stays on the Zod schema of `Repository.branchFilter`,
 * which counts code points, as the API does.
 *
 * The client mirrors the grammar so a refused mask is named by its line before any request; the
 * 422 of the server stays as the fallback if the two drift.
 */
export function branchMaskError(mask: string): string | null {
  // The API's whitespace is Python `isspace()`: Zs, Zl, Zp and the Cc controls, then Cc and Cs.
  // Not JS `\s`, which also takes U+FEFF (Cf). Paired surrogates are one code point under `u`, so
  // an emoji passes; a lone one does not.
  if (/[\p{Zs}\p{Zl}\p{Zp}\p{Cc}\p{Cs}]/u.test(mask)) {
    return i18n.t('settings.branchMask.whitespace')
  }
  if (mask.includes('***')) {
    return i18n.t('settings.branchMask.stars')
  }
  if (FORBIDDEN_CHARACTERS.test(mask)) {
    return i18n.t('settings.branchMask.characters')
  }
  if (mask.includes('..') || mask.includes('//')) {
    return i18n.t('settings.branchMask.dots')
  }
  if (mask.split('/').some((segment) => segment.startsWith('.'))) {
    return i18n.t('settings.branchMask.segmentDot')
  }
  if (mask.startsWith('/') || mask.startsWith('-')) {
    return i18n.t('settings.branchMask.start')
  }
  if (mask.endsWith('/') || mask.endsWith('.') || mask.endsWith('.lock')) {
    return i18n.t('settings.branchMask.end')
  }
  if (mask === '@') {
    return i18n.t('settings.branchMask.at')
  }
  return null
}
