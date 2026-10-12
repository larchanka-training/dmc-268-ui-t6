import spec from '../../../../docs/DESIGN_SYSTEM.md?raw'

const REPO_DOCS = 'https://github.com/larchanka-training/dmc-268-ui-t6/blob/main/docs/'

/**
 * The specification as shown in Storybook. The document links to its neighbours in `docs/` by a
 * relative path, which does not exist inside Storybook, so those links point at the repository.
 */
export const specText = spec.replace(/\]\((?!https?:|#)([^)]+\.md)\)/g, `](${REPO_DOCS}$1)`)
