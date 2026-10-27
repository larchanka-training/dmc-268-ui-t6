import type { en } from '../en'
import type { Translation } from '../types'
import { auth } from './auth'
import { common } from './common'
import { layout } from './layout'
import { repositories } from './repositories'
import { rules } from './rules'
import { runs } from './runs'
import { settings } from './settings'

/** The Russian dictionary: the same keys as the English one, checked by the type. */
export const ru: Translation<typeof en> = {
  common,
  auth,
  layout,
  repositories,
  settings,
  rules,
  runs,
}
