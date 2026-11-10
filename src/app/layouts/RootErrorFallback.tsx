import type { FC } from 'react'

import { useThemeStore } from '../../features/theme'
import { i18n } from '../../shared/i18n'
import styles from './RootErrorFallback.module.css'

/**
 * The 500 screen of the root error boundary in `App`: an exception while rendering outside the
 * routes, in a provider or above them. The routes keep their own `RouteErrorFallback`. This
 * screen stands above `UiProvider`, which may be what failed, so it uses neither Ant Design nor
 * `useTranslation`: plain markup on the `--rv-*` tokens of the static `tokens.css`, and texts
 * read with `i18n.t` at render. The theme is read from the store at render too and set on the
 * screen itself: `UiProvider` sets it on the page in an effect, which never ran if it failed, and
 * the page then stays dark. The error message is not shown: it is developer text, and the reader's
 * one action is the reload; React reports the error to the console.
 */
export const RootErrorFallback: FC = () => (
  <main className={styles.screen} data-rv-theme={useThemeStore.getState().mode}>
    <h1 className={styles.title}>{i18n.t('layout.rootError.title')}</h1>
    <p className={styles.description}>{i18n.t('layout.rootError.description')}</p>
    <button
      className={styles.reload}
      onClick={() => {
        window.location.reload()
      }}
      type="button"
    >
      {i18n.t('layout.rootError.reload')}
    </button>
  </main>
)
