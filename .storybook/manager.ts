import {
  CURRENT_STORY_WAS_SET,
  DOCS_RENDERED,
  STORY_CHANGED,
  STORY_RENDERED,
} from 'storybook/internal/core-events'
import { addons } from 'storybook/manager-api'
import { create } from 'storybook/theming'

addons.setConfig({
  theme: create({ base: 'dark', brandTitle: 'Reviewer UI' }),
})

// The overview is a page, not a component, so the addon panel under it has nothing to show.
// Hide the panel there and bring it back for component stories. A panel the user closed by hand
// stays closed: we only reopen what we hid ourselves.
const OVERVIEW_PREFIX = 'reviewer-ui--'

addons.register('reviewer-ui/overview-panel', (api) => {
  let hiddenByUs = false
  const sync = (): void => {
    const onOverview = (api.getUrlState().storyId ?? '').startsWith(OVERVIEW_PREFIX)
    if (onOverview) {
      if (api.getIsPanelShown()) {
        api.togglePanel(false)
        hiddenByUs = true
      }
    } else if (hiddenByUs) {
      api.togglePanel(true)
      hiddenByUs = false
    }
  }
  for (const event of [CURRENT_STORY_WAS_SET, STORY_CHANGED, STORY_RENDERED, DOCS_RENDERED]) {
    api.on(event, sync)
  }
})
