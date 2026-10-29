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

/** The English dictionary: the reference shape every other language follows. */
export const en = {
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
