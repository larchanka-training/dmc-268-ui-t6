import type { en } from '../en'
import type { Translation } from '../types'
import { analytics } from './analytics'
import { audit } from './audit'
import { auth } from './auth'
import { common } from './common'
import { layout } from './layout'
import { limitReasons } from './limitReasons'
import { reasons } from './reasons'
import { repositories } from './repositories'
import { rules } from './rules'
import { runs } from './runs'
import { settings } from './settings'

/** The Russian dictionary: the same keys as the English one, checked by the type. */
export const ru: Translation<typeof en> = {
  common,
  auth,
  layout,
  limitReasons,
  analytics,
  audit,
  repositories,
  settings,
  rules,
  runs,
  reasons,
}
