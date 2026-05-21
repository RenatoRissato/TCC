const isDev = import.meta.env.DEV

export function logClientDebug(message: string, details?: unknown): void {
  if (!isDev) return
  if (details === undefined) {
    console.debug(message)
    return
  }
  console.debug(message, details)
}

export function logClientError(message: string, details?: unknown): void {
  if (!isDev) return
  if (details === undefined) {
    console.error(message)
    return
  }
  console.error(message, details)
}
