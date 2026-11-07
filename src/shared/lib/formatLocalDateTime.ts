import { i18n } from '../i18n'

export function formatLocalDateTime(iso: string): string {
  return new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}
