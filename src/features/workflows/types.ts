export const WORKFLOW_SCHEMA_VERSION = "agent-system.workflow.v1" as const
export const WORKFLOW_V2_SCHEMA_VERSION = "agent-system.workflow.v2" as const

export type WorkflowSchemaVersion = typeof WORKFLOW_SCHEMA_VERSION | typeof WORKFLOW_V2_SCHEMA_VERSION
export type WorkflowScope = "project" | "global"
export type WorkflowTarget = "workflow-test" | "main"
export type WorkflowSessionMode = "create" | "reuse-or-create"
export type WorkflowResourceMode = "reference" | "managed"
export type WorkflowEdgeKind = "control" | "binding" | "capability" | "delegation" | "data" | "condition.true" | "condition.false"
export type WorkflowCapabilityKind = "skill" | "tool" | "mcp" | "plugin"
export type WorkflowNodeType =
  | "trigger.manual"
  | "trigger.schedule"
  | "trigger.webhook"
  | "resource.agent"
  | "resource.command"
  | "resource.skill"
  | "resource.tool"
  | "resource.mcp"
  | "resource.plugin"
  | "action.prompt"
  | "action.command"
  | "action.restart"
  | "action.approval"
  | "action.shell"
  | "flow.condition"
  | "flow.merge"

export type WorkflowPosition = { x: number; y: number }

export type WorkflowNodeLock = {
  enabled: boolean
  mode: "last-success"
}

export type ManualTriggerData = {
  [key: string]: never
}

export type ResourceNodeData = {
  mode: WorkflowResourceMode
  name: string
  scope: WorkflowScope
  content?: string
  config?: Record<string, unknown>
}

export type PromptActionData = {
  text: string
  sessionMode: WorkflowSessionMode
  model?: {
    providerID?: string
    modelID?: string
  }
}

export type CommandActionData = {
  arguments: string
  sessionMode: WorkflowSessionMode
}

export type RestartActionData = {
  [key: string]: never
}

export type FutureNodeData = {
  label?: string
}

type WorkflowNodeBase<TType extends WorkflowNodeType, TData> = {
  id: string
  type: TType
  position: WorkflowPosition
  data: TData
  lock?: WorkflowNodeLock
}

export type WorkflowNode =
  | WorkflowNodeBase<"trigger.manual", ManualTriggerData>
  | WorkflowNodeBase<"trigger.schedule" | "trigger.webhook", FutureNodeData>
  | WorkflowNodeBase<
      | "resource.agent"
      | "resource.command"
      | "resource.skill"
      | "resource.tool"
      | "resource.mcp"
      | "resource.plugin",
      ResourceNodeData
    >
  | WorkflowNodeBase<"action.prompt", PromptActionData>
  | WorkflowNodeBase<"action.command", CommandActionData>
  | WorkflowNodeBase<"action.restart", RestartActionData>
  | WorkflowNodeBase<"action.approval" | "action.shell" | "flow.condition" | "flow.merge", FutureNodeData>

export type WorkflowEdge = {
  id: string
  source: string
  target: string
  kind: WorkflowEdgeKind
  sourceHandle?: string
  targetHandle?: string
}

export type WorkflowV1 = {
  schemaVersion: WorkflowSchemaVersion
  id: string
  name: string
  description?: string
  scope: WorkflowScope
  project?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  variables?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type WorkflowSummary = Pick<
  WorkflowV1,
  "id" | "name" | "description" | "scope" | "project" | "updatedAt"
>

export type WorkflowResourceKind = "agents" | "tools" | "skills" | "plugins" | "mcp" | "commands"

export type WorkflowResource = {
  name: string
  type: Extract<WorkflowNodeType, `resource.${string}`>
  model?: string
  sources: Array<"config" | "registry" | "runtime">
  scope?: WorkflowScope
  inherited?: boolean
  status?: string
}

export type WorkflowResourceCatalog = {
  project?: string
  includeGlobal: boolean
  resources: Record<WorkflowResourceKind, WorkflowResource[]>
  relationships?: WorkflowRelationshipProjection
  warnings: WorkflowValidationIssue[]
}

export type WorkflowCommandAgentRelationship = {
  command: string
  agent: string
  commandNodeID?: string
  agentNodeID?: string
  source: "workflow" | "command-frontmatter" | "registry-metadata"
}

export type WorkflowAgentDelegationRelationship = {
  parent: string
  child: string
  parentNodeID?: string
  childNodeID?: string
  source: "workflow"
}

export type WorkflowAgentCapabilityRelationship = {
  agent: string
  kind: WorkflowCapabilityKind
  name: string
  agentNodeID?: string
  resourceNodeID?: string
  source: "workflow" | "registry-metadata"
}

export type WorkflowAgentAppSummary = {
  id: string
  command: string
  agent: string
  commandNodeID?: string
  agentNodeID?: string
  capabilities: Record<WorkflowCapabilityKind, string[]>
  delegatedAgents: string[]
  source: "workflow"
}

export type WorkflowRelationshipProjection = {
  commandAgents: WorkflowCommandAgentRelationship[]
  agentCapabilities: WorkflowAgentCapabilityRelationship[]
  agentDelegations: WorkflowAgentDelegationRelationship[]
  agentApps: WorkflowAgentAppSummary[]
}

export type WorkflowValidationIssue =
  | string
  | {
      code?: string
      message: string
      nodeID?: string
      edgeID?: string
      path?: string
    }

export type WorkflowValidationResult = {
  valid: boolean
  workflow?: WorkflowV1
  errors: WorkflowValidationIssue[]
  warnings: WorkflowValidationIssue[]
}

export type WorkflowSaveResult = {
  workflow: WorkflowV1
  saved: boolean
  warnings: WorkflowValidationIssue[]
}

export type WorkflowPublishResourceResult = {
  type: string
  name: string
  status: "created" | "updated" | "verified" | "skipped" | "failed"
  path?: string
  message?: string
}

export type WorkflowPublishReport = {
  workflowID: string
  published: boolean
  target: WorkflowTarget
  scope: WorkflowScope
  project?: string
  updates: Array<{
    operation: "config" | "registry"
    nodeID?: string
    resourceType: string
    resourceName: string
    scope: WorkflowScope
    project?: string
    kind?: string
    path?: string
    files?: string[]
  }>
  restart: {
    requested: boolean
    status?: "restarting" | "waiting" | "ready" | "failed"
    operation?: {
      operationID: string
      status: "restarting" | "waiting" | "ready" | "failed"
      reason: string
      startedAt: string
      finishedAt?: string
      error?: string
    }
  }
  verified: {
    agents: string[]
    commands: string[]
    tools: string[]
    skills: string[]
    mcp: string[]
    plugins: string[]
    agentCapabilities: WorkflowAgentCapabilityRelationship[]
    agentDelegations: WorkflowAgentDelegationRelationship[]
    agentApps: WorkflowAgentAppSummary[]
    missing: Array<{ nodeID?: string; type: string; name: string }>
    deferred?: boolean
  }
  warnings: WorkflowValidationIssue[]
}

export type WorkflowRunStatus = "queued" | "running" | "success" | "failed" | "cancelled"
export type WorkflowStepStatus = "pending" | "running" | "success" | "cached" | "failed" | "skipped"

export type WorkflowRunError =
  | string
  | {
      message: string
      code?: string
      details?: unknown
    }

export type WorkflowRunArtifact = {
  type: "session"
  nodeID: string
  sessionID: string
  messageID?: string
}

export type WorkflowRunStep = {
  nodeID: string
  type: WorkflowNodeType
  status: WorkflowStepStatus
  startedAt?: string
  finishedAt?: string
  cache?: {
    sourceRunID?: string
    createdAt?: string
    target?: WorkflowTarget
  }
  output?: unknown
  execution?: {
    command?: string
    agent?: string
    capabilities: Array<{ kind: WorkflowCapabilityKind; name: string }>
  }
  error?: WorkflowRunError
  artifacts?: WorkflowRunArtifact[]
}

export type WorkflowRun = {
  runID: string
  workflowID: string
  target: WorkflowTarget
  scope: WorkflowScope
  project?: string
  status: WorkflowRunStatus
  startedAt?: string
  finishedAt?: string
  steps: WorkflowRunStep[]
  error?: WorkflowRunError
  artifacts: WorkflowRunArtifact[]
}

export type WorkflowCacheClearResult = {
  workflowID: string
  nodeID: string
  target: WorkflowTarget
  scope: WorkflowScope
  project?: string
  deleted: boolean
}

export type WorkflowCacheMetadataResult = Omit<WorkflowCacheClearResult, "deleted"> & {
  cache: {
    sourceRunID: string
    createdAt: string
    status: "success"
  } | null
}

export type WorkflowPaletteItem = {
  key: string
  type: WorkflowNodeType
  label: string
  description: string
  category: string
  disabled?: boolean
  resource?: WorkflowResource
  resourceMode?: WorkflowResourceMode
}
