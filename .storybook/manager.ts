import { addons } from 'storybook/manager-api'
import { create } from 'storybook/theming'

addons.setConfig({
  theme: create({ base: 'dark', brandTitle: 'Reviewer UI' }),
})

// The overview is a page, not a component, so the addon panel under it has nothing to show.
// Hide the panel there and bring it back for component stories, unless the user closed it.
const OVERVIEW_PREFIX = 'reviewer-ui--'

addons.register('reviewer-ui/overview-panel', (api) => {
  let hiddenByUs = false
  const sync = (): void => {
    const onOverview = (api.getUrlState().storyId ?? '').startsWith(OVERVIEW_PREFIX)
    if (onOverview) {
      api.togglePanel(false)
      hiddenByUs = true
    } else if (hiddenByUs) {
      api.togglePanel(true)
      hiddenByUs = false
    }
  }
  for (const event of ['currentStoryWasSet', 'storyChanged', 'storyRendered', 'docsRendered']) {
    api.on(event, sync)
  }
})
