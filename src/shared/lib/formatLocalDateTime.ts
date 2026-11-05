export function formatLocalDateTime(iso: string): string {
  const date = new Date(iso)
  const twoDigits = (value: number): string => String(value).padStart(2, '0')
  return `${String(date.getFullYear()).padStart(4, '0')}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())} ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}:${twoDigits(date.getSeconds())}`
}
