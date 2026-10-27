import type { Language } from '../../../shared/i18n'

/**
 * Texts of the demo sign-in button. It exists only in a mock build, so its texts stay out of the
 * dictionaries, which ship in every bundle: `scripts/verify-prod-bundle.sh` fails a production
 * bundle that holds them. Used only behind `VITE_MOCKS_BUILD`, so a production build drops it.
 */
export const DEMO_LOGIN_TEXTS: Record<Language, { label: string; button: string }> = {
  en: { label: 'Sign in as the demo user', button: 'Demo sign-in (Mock)' },
  ru: { label: 'Войти как демо-пользователь', button: 'Демо-вход (Mock)' },
}
