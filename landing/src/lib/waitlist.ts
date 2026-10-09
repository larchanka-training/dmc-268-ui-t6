import { normalizeEmail } from './email'

export type JoinResult = 'joined' | 'already-joined'

const DEMO_LATENCY_MS = 900
const joinedThisSession = new Set<string>()

/**
 * Демо-версия записи в waitlist: имитирует сетевой запрос и помнит адреса только до перезагрузки
 * страницы, никуда их не отправляя. Хранилище заявок ещё не выбрано — при подключении здесь
 * появится `fetch` к API, а форма уже обрабатывает загрузку, успех, повтор и ошибку.
 */
export async function joinWaitlist(email: string): Promise<JoinResult> {
  await new Promise((resolve) => setTimeout(resolve, DEMO_LATENCY_MS))
  const key = normalizeEmail(email)
  if (joinedThisSession.has(key)) return 'already-joined'
  joinedThisSession.add(key)
  return 'joined'
}
