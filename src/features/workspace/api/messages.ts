import { apiRequest, type ApiRequestConfig } from "@/shared/api"
import type { PlanStep, WorkspaceMessage } from "@/shared/types/workspace"

export type OpenCodeMessageInfo = {
  agent?: string
  error?: { data?: { message?: string }; name?: string }
  id: string
  model?: { modelID?: string; providerID?: string; variant?: string }
  role: "assistant" | "user"
  time?: { completed?: number; created?: number }
  tokens?: {
    cache?: { read?: number; write?: number }
    input?: number
    output?: number
    reasoning?: number
  }
}

export type OpenCodeMessagePart = {
  state?: {
    error?: string
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

export type PromptBody = {
  agent?: string
  model?: { modelID: string; providerID: string; variant?: string }
  text: string
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

export function toWorkspaceMessages(messages: OpenCodeSessionMessage[]): WorkspaceMessage[] {
  return messages.map((message) => {
    const bodyParts = message.parts.flatMap((part) => {
      if (part.type === "text" && part.text?.trim()) return [part.text.trim()]
      if (part.type === "reasoning" && part.text?.trim()) return [`思考\n${part.text.trim()}`]
      if (part.type === "tool") {
        const state = part.state
        const output = state?.output || state?.error
        return [`工具 ${part.tool ?? "unknown"}${state?.title ? ` · ${state.title}` : ""}${output ? `\n${output}` : ""}`]
      }
      if (part.type === "file") return [`檔案：${part.text ?? "已附加檔案"}`]
      if (part.type === "subtask") return [`子任務：${part.text ?? "已啟動子任務"}`]
      return []
    })
    const errorMessage = message.info.error?.data?.message
    const body = bodyParts.join("\n\n") || errorMessage || (message.info.role === "assistant" ? "Agent 正在處理..." : "")

    return {
      body,
      createdAt: message.info.time?.created,
      id: message.info.id,
      modelLabel: message.info.model?.providerID && message.info.model.modelID
        ? `${message.info.model.providerID}/${message.info.model.modelID}`
        : undefined,
      plan: buildPlan(message.parts),
      role: message.info.role === "assistant" ? "agent" : "user",
      status: errorMessage ? "error" : message.info.time?.completed ? "complete" : "streaming",
      title: message.info.role === "user" ? undefined : message.info.agent ?? "OpenCode agent",
    }
  })
}

function buildPlan(parts: OpenCodeMessagePart[]): PlanStep[] | undefined {
  const toolParts = parts.filter((part) => part.type === "tool")
  if (toolParts.length === 0) return undefined

  return toolParts.map((part, index) => ({
    id: `${part.tool ?? "tool"}-${index}`,
    label: part.state?.title || part.tool || "工具呼叫",
    status: part.state?.status === "completed" ? "done" : part.state?.status === "error" ? "pending" : "running",
  }))
}
