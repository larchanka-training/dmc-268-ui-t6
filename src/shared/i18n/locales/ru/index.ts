import type { en } from '../en'
import type { Translation } from '../types'
import { common } from './common'
import { layout } from './layout'

/** The Russian dictionary: the same keys as the English one, checked by the type. */
export const ru: Translation<typeof en> = {
  common,
  layout,
}
