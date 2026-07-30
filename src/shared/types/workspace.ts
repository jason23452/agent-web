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

export type FileType = "folder" | "tsx" | "ts" | "html" | "css" | "md" | "json" | "img"

export type FileNode = {
  id: string
  name: string
  type: FileType
  size?: string
  date?: string
  children?: FileNode[]
}

export type PlanStep = {
  id: string
  label: string
  status: "done" | "running" | "pending"
}

export type WorkspaceMessage = {
  id: string
  role: "user" | "agent"
  title?: string
  body: string
  plan?: PlanStep[]
}

export type TokenUsage = {
  label: string
  used: number
  limit: number
}

export type Attachment = {
  id: string
  name: string
  meta: string
  isImage?: boolean
}

export type PinContext = {
  label: string
  meta: string
  text: string
}
