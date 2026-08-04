export type AgentStatus = "active" | "idle" | "review"

export type Agent = {
  builtIn?: boolean
  color?: string
  description?: string
  id: string
  mode?: "all" | "primary" | "subagent"
  modelID?: string
  name: string
  provider: string
  providerID?: string
  status: AgentStatus
}

export type Session = {
  id: string
  title: string
  meta: string
}

export type Project = {
  description?: string
  displayName?: string
  id: string
  name: string
  path: string
}

export type FileType = "folder" | "file" | "tsx" | "ts" | "html" | "css" | "md" | "json" | "img"

export type FileNode = {
  id: string
  name: string
  absolute?: string
  path?: string
  type: FileType
  content?: string
  contentType?: "binary" | "text"
  contentError?: string | null
  contentLoading?: boolean
  size?: string
  date?: string
  children?: FileNode[]
  ignored?: boolean
}

export type PlanStep = {
  agentLabel?: string
  childSessionId?: string
  id: string
  kind: "task" | "tool"
  label: string
  status: "done" | "error" | "running" | "pending"
}

export type WorkspaceMessage = {
  id: string
  role: "user" | "agent"
  title?: string
  body: string
  reasoning?: string
  plan?: PlanStep[]
  createdAt?: number
  modelLabel?: string
  status?: "complete" | "error" | "streaming"
}

export type TokenUsage = {
  cacheRead?: number
  cacheWrite?: number
  input?: number
  label: string
  used: number
  limit: number
  modelLabel?: string
  output?: number
  providerLabel?: string
  reasoning?: number
}

export type ModelRateLimitUsage = {
  entries: Array<{
    label: string
    limit?: number
    remaining?: number
    resetAt?: string
    used?: number
    usedPercent?: number
    valueLabel?: string
  }>
  error?: string
  fetchedAt?: string
  providerID?: string
}

export type ModelOption = {
  contextLimit?: number
  id: string
  key: string
  name: string
  providerID: string
  providerName: string
  reasoning?: boolean
  status?: "alpha" | "beta" | "deprecated" | "active"
  variant?: string
  variants?: string[]
}

export type ThinkingVariantOption = {
  key: string
  label: string
}

export type Attachment = {
  id: string
  name: string
  meta: string
  path?: string
  isImage?: boolean
}

export type PinContext = {
  label: string
  meta: string
  text: string
}
