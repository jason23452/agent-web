import { buildApiUrl } from "./client"

export type OpenCodeEvent = {
  directory?: string
  payload?: {
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
  const response = await fetch(buildApiUrl("/bff/events", { directory }), {
    headers: { Accept: "text/event-stream" },
    signal,
  })

  if (!response.ok) {
    throw new Error(`OpenCode event stream failed (${response.status})`)
  }

  if (!response.body) return

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (!signal.aborted) {
      const result = await reader.read()
      if (result.done) break

      buffer += decoder.decode(result.value, { stream: true })
      const chunks = buffer.split(/\r?\n\r?\n/)
      buffer = chunks.pop() ?? ""

      for (const chunk of chunks) {
        const data = chunk
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n")
        if (!data) continue

        try {
          onEvent(JSON.parse(data) as OpenCodeEvent)
        } catch {
          // Ignore keep-alive or non-JSON SSE frames.
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
