import { buildApiUrl } from "./client"

export type OpenCodeEvent = {
  directory?: string
  id?: string
  payload?: {
    id?: string
    properties?: Record<string, unknown>
    type?: string
  }
  properties?: Record<string, unknown>
  type?: string
}

export async function consumeOpenCodeEvents(
  directory: string,
  onEvent: (event: OpenCodeEvent) => void,
  signal: AbortSignal,
) {
  let lastEventID = ""
  let retryDelay = 500

  while (!signal.aborted) {
    const headers = new Headers({ Accept: "text/event-stream" })
    if (lastEventID) headers.set("Last-Event-ID", lastEventID)

    let response: Response
    try {
      response = await fetch(buildApiUrl("/bff/events", { directory }), {
        cache: "no-store",
        headers,
        signal,
      })
    } catch {
      if (signal.aborted) return
      await waitForRetry(retryDelay, signal)
      retryDelay = Math.min(retryDelay * 2, 5_000)
      continue
    }

    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`OpenCode event stream failed (${response.status})`)
      }
      await waitForRetry(retryDelay, signal)
      retryDelay = Math.min(retryDelay * 2, 5_000)
      continue
    }

    if (!response.body) {
      await waitForRetry(retryDelay, signal)
      continue
    }

    retryDelay = 500
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (!signal.aborted) {
        let result: ReadableStreamReadResult<Uint8Array>
        try {
          result = await reader.read()
        } catch {
          if (signal.aborted) return
          break
        }
        if (result.done) break

        buffer += decoder.decode(result.value, { stream: true })
        const chunks = buffer.split(/\r?\n\r?\n/)
        buffer = chunks.pop() ?? ""

        for (const chunk of chunks) {
          const frame = parseEventFrame(chunk)
          if (frame.id) lastEventID = frame.id
          if (frame.retry !== undefined) retryDelay = frame.retry
          if (!frame.data) continue

          try {
            onEvent(JSON.parse(frame.data) as OpenCodeEvent)
          } catch (error) {
            if (error instanceof SyntaxError) continue
            throw error
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (!signal.aborted) await waitForRetry(retryDelay, signal)
  }
}

function parseEventFrame(frame: string): { data: string; id?: string; retry?: number } {
  const data: string[] = []
  let id: string | undefined
  let retry: number | undefined

  for (const line of frame.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart())
    else if (line.startsWith("id:")) id = line.slice(3).trim()
    else if (line.startsWith("retry:")) {
      const value = Number(line.slice(6).trim())
      if (Number.isFinite(value)) retry = Math.min(Math.max(value, 250), 30_000)
    }
  }

  return { data: data.join("\n"), ...(id ? { id } : {}), ...(retry !== undefined ? { retry } : {}) }
}

function waitForRetry(delay: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve()
  return new Promise((resolve) => {
    const timeoutID = window.setTimeout(finish, delay)
    signal.addEventListener("abort", finish, { once: true })

    function finish() {
      window.clearTimeout(timeoutID)
      signal.removeEventListener("abort", finish)
      resolve()
    }
  })
}
