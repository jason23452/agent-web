import { apiRequest, type ApiRequestConfig } from "@/shared/api"
import type { PlanStep, WorkspaceCommand, WorkspaceMessage } from "@/shared/types/workspace"

export type OpenCodeMessageInfo = {
  agent?: string
  error?: { data?: { message?: string }; name?: string }
  id: string
  model?: { modelID?: string; providerID?: string; variant?: string }
  modelID?: string
  providerID?: string
  role: "assistant" | "user"
  sessionID?: string
  time?: { completed?: number; created?: number }
  tokens?: {
    cache?: { read?: number; write?: number }
    input?: number
    output?: number
    reasoning?: number
  }
}

export type OpenCodeMessagePart = {
  description?: string
  filename?: string
  id?: string
  messageID?: string
  sessionID?: string
  state?: {
    error?: string
    input?: Record<string, unknown>
    metadata?: Record<string, unknown>
    output?: string
    status?: string
    title?: string
  }
  text?: string
  tool?: string
  type: string
}

export type OpenCodeSessionMessage = {
  info: OpenCodeMessageInfo
  parts: OpenCodeMessagePart[]
}

export type OpenCodeMessageEvent = {
  properties?: Record<string, unknown>
  type?: string
}

export type PromptBody = {
  agent?: string
  model?: { modelID: string; providerID: string; variant?: string }
  text: string
}

export type CommandBody = {
  agent?: string
  arguments: string
  command: string
  model?: string
  variant?: string
}

export function listSessionMessages(sessionID: string, directory: string, config?: ApiRequestConfig) {
  return apiRequest<OpenCodeSessionMessage[]>(`/bff/sessions/${encodeURIComponent(sessionID)}/messages`, {
    ...config,
    query: { ...config?.query, directory },
  })
}

export function sendSessionPrompt(sessionID: string, directory: string, body: PromptBody, config?: ApiRequestConfig) {
  return apiRequest<void>(`/bff/sessions/${encodeURIComponent(sessionID)}/prompt`, {
    ...config,
    body,
    method: "POST",
    query: { ...config?.query, directory },
  })
}

export function sendSessionCommand(sessionID: string, directory: string, body: CommandBody, config?: ApiRequestConfig) {
  return apiRequest<OpenCodeSessionMessage>(`/bff/sessions/${encodeURIComponent(sessionID)}/command`, {
    ...config,
    body,
    method: "POST",
    query: { ...config?.query, directory },
  })
}

export function parseSessionCommand(text: string, commands: ReadonlyArray<{ name: string }>): WorkspaceCommand | null {
  const firstLineEnd = text.indexOf("\n")
  const firstLine = firstLineEnd === -1 ? text : text.slice(0, firstLineEnd)
  const match = /^\/([^\s]+)(?:[ \t]+(.*))?$/.exec(firstLine)
  const name = match?.[1]
  if (!name || !commands.some((command) => command.name === name)) return null

  const firstLineArguments = match[2]?.trim() ?? ""
  const rest = firstLineEnd === -1 ? "" : text.slice(firstLineEnd + 1).trim()
  return {
    arguments: [firstLineArguments, rest].filter(Boolean).join("\n"),
    name,
  }
}

export function abortSession(sessionID: string, directory: string, config?: ApiRequestConfig) {
  return apiRequest<boolean>(`/bff/sessions/${encodeURIComponent(sessionID)}/abort`, {
    ...config,
    method: "POST",
    query: { ...config?.query, directory },
  })
}

export function applyOpenCodeMessageEvent(messages: OpenCodeSessionMessage[], event: OpenCodeMessageEvent): OpenCodeSessionMessage[] {
  const properties = event.properties
  if (!properties) return messages

  if (event.type === "message.updated") {
    const info = properties.info
    if (!isOpenCodeMessageInfo(info)) return messages
    const messageIndex = messages.findIndex((message) => message.info.id === info.id)
    if (messageIndex === -1) return [...messages, { info, parts: [] }]
    return replaceAt(messages, messageIndex, { ...messages[messageIndex], info })
  }

  if (event.type === "message.removed" && typeof properties.messageID === "string") {
    return messages.filter((message) => message.info.id !== properties.messageID)
  }

  if (event.type === "message.part.updated") {
    const part = properties.part
    if (!isOpenCodeMessagePart(part)) return messages
    const messageIndex = messages.findIndex((message) => message.info.id === part.messageID)
    if (messageIndex === -1) return messages
    const message = messages[messageIndex]
    const partIndex = message.parts.findIndex((currentPart) => currentPart.id === part.id)
    const parts = partIndex === -1 ? [...message.parts, part] : replaceAt(message.parts, partIndex, part)
    return replaceAt(messages, messageIndex, { ...message, parts })
  }

  if (event.type === "message.part.delta"
    && typeof properties.partID === "string"
    && typeof properties.delta === "string"
    && properties.field === "text") {
    const messageID = typeof properties.messageID === "string" ? properties.messageID : undefined
    const messageIndex = messageID
      ? messages.findIndex((message) => message.info.id === messageID)
      : messages.findIndex((message) => message.parts.some((part) => part.id === properties.partID))
    if (messageIndex === -1) {
      if (!messageID) return messages
      return [...messages, {
        info: {
          id: messageID,
          role: "assistant",
          sessionID: typeof properties.sessionID === "string" ? properties.sessionID : undefined,
        },
        parts: [{ id: properties.partID, messageID, text: properties.delta, type: "text" }],
      }]
    }
    const message = messages[messageIndex]
    const partIndex = message.parts.findIndex((part) => part.id === properties.partID)
    if (partIndex === -1) {
      return replaceAt(messages, messageIndex, {
        ...message,
        parts: [...message.parts, { id: properties.partID, messageID: message.info.id, text: properties.delta, type: "text" }],
      })
    }
    const part = message.parts[partIndex]
    const parts = replaceAt(message.parts, partIndex, { ...part, text: `${part.text ?? ""}${properties.delta}` })
    return replaceAt(messages, messageIndex, { ...message, parts })
  }

  if (event.type === "message.part.removed" && typeof properties.partID === "string") {
    const messageIndex = typeof properties.messageID === "string"
      ? messages.findIndex((message) => message.info.id === properties.messageID)
      : messages.findIndex((message) => message.parts.some((part) => part.id === properties.partID))
    if (messageIndex === -1) return messages
    const message = messages[messageIndex]
    return replaceAt(messages, messageIndex, { ...message, parts: message.parts.filter((part) => part.id !== properties.partID) })
  }

  return messages
}

export function toWorkspaceMessages(messages: OpenCodeSessionMessage[], commandExecutions: ReadonlyMap<string, WorkspaceCommand> = new Map()): WorkspaceMessage[] {
  return messages.map((message) => {
    const bodyParts = message.parts.flatMap((part) => {
      if (part.type === "text" && part.text?.trim()) return [part.text]
      if (part.type === "file") return [`檔案：${part.filename ?? part.text ?? "已附加檔案"}`]
      if (part.type === "subtask") return [`子任務：${part.description ?? part.text ?? "已啟動子任務"}`]
      return []
    })
    const reasoning = message.parts
      .filter((part) => part.type === "reasoning" && part.text?.trim())
      .map((part) => part.text?.trim())
      .filter((text): text is string => Boolean(text))
      .join("\n\n") || undefined
    const errorMessage = message.info.error?.data?.message
    const body = bodyParts.join("\n\n") || errorMessage || (message.info.role === "assistant" && !message.info.time?.completed ? "Agent 正在處理..." : "")

    return {
      body,
      command: commandExecutions.get(message.info.id),
      createdAt: message.info.time?.created,
      id: message.info.id,
      modelLabel: (message.info.providerID ?? message.info.model?.providerID) && (message.info.modelID ?? message.info.model?.modelID)
        ? `${message.info.providerID ?? message.info.model?.providerID}/${message.info.modelID ?? message.info.model?.modelID}`
        : undefined,
      plan: buildPlan(message.parts),
      reasoning,
      role: message.info.role === "assistant" ? "agent" : "user",
      status: message.info.role === "user" ? "complete" : errorMessage ? "error" : message.info.time?.completed ? "complete" : "streaming",
      title: message.info.role === "user" ? undefined : message.info.agent ?? "OpenCode agent",
    }
  })
}

function buildPlan(parts: OpenCodeMessagePart[]): PlanStep[] | undefined {
  const toolParts = parts.filter((part) => part.type === "tool")
  if (toolParts.length === 0) return undefined

  return toolParts.map((part, index) => ({
    ...(part.tool === "task" && typeof part.state?.input?.subagent_type === "string"
      ? { agentLabel: part.state.input.subagent_type }
      : {}),
    ...(part.tool === "task" && typeof part.state?.metadata?.sessionId === "string"
      ? { childSessionId: part.state.metadata.sessionId }
      : {}),
    ...(typeof part.state?.input?.command === "string"
      ? { command: part.state.input.command }
      : typeof part.state?.metadata?.command === "string"
        ? { command: part.state.metadata.command }
        : {}),
    id: part.id ?? `${part.tool ?? "tool"}-${index}`,
    kind: part.tool === "task" ? "task" : "tool",
    label: part.state?.title || part.tool || "工具呼叫",
    status: part.state?.status === "completed" ? "done" : part.state?.status === "error" ? "error" : part.state?.status === "pending" ? "pending" : "running",
  }))
}

function isOpenCodeMessageInfo(value: unknown): value is OpenCodeMessageInfo {
  if (!isRecord(value)) return false
  return typeof value.id === "string" && (value.role === "assistant" || value.role === "user")
}

function isOpenCodeMessagePart(value: unknown): value is OpenCodeMessagePart & { id: string; messageID: string } {
  if (!isRecord(value)) return false
  return typeof value.id === "string" && typeof value.messageID === "string" && typeof value.type === "string"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function replaceAt<T>(items: T[], index: number, value: T): T[] {
  return [...items.slice(0, index), value, ...items.slice(index + 1)]
}
