const DEFAULT_FETCH_TIMEOUT_MS = 15000

export function createFetchAbortSignal(parentSignal?: AbortSignal, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  const abort = () => controller.abort()
  parentSignal?.addEventListener('abort', abort, { once: true })

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeoutId)
      parentSignal?.removeEventListener('abort', abort)
    },
  }
}
