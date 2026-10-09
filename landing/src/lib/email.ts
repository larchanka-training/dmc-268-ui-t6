// Проверка формы, а не RFC 5322: локальная часть, `@`, домен с точкой и без пробелов.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidEmail(value: string): boolean {
  const email = normalizeEmail(value)
  return email.length <= 254 && EMAIL_PATTERN.test(email)
}
