export function formatApiErrorMessage(status: number, statusText: string, data: unknown): string {
  if (typeof data === 'object' && data !== null && 'detail' in data) {
    const detail = data.detail
    if (typeof detail === 'string' && detail.length > 0) {
      return detail
    }
  }
  if (typeof data === 'string' && data.length > 0) {
    return data
  }
  return `Ошибка API (${String(status)}${statusText ? `: ${statusText}` : ''})`
}
