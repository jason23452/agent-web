import type {
  ResourceNodeData,
  WorkflowEdge,
  WorkflowEdgeKind,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowPaletteItem,
  WorkflowPosition,
  WorkflowRelationshipProjection,
  WorkflowResource,
  WorkflowScope,
  WorkflowV1,
} from "@/features/workflows/types"
import { WORKFLOW_SCHEMA_VERSION } from "@/features/workflows/types"

export const WORKFLOW_NODE_META: Record<WorkflowNodeType, { label: string; category: string; description: string }> = {
  "trigger.manual": { label: "手動啟動", category: "觸發器", description: "由使用者手動開始 workflow" },
  "trigger.schedule": { label: "排程啟動", category: "觸發器", description: "依排程自動執行（未來支援）" },
  "trigger.webhook": { label: "Webhook", category: "觸發器", description: "接收外部事件（未來支援）" },
  "resource.agent": { label: "Agent", category: "Agent", description: "綁定 OpenCode agent" },
  "resource.command": { label: "Command", category: "Command", description: "綁定 OpenCode command" },
  "resource.skill": { label: "Skill", category: "Skill", description: "綁定可發布的技能" },
  "resource.tool": { label: "Tool", category: "Tool", description: "綁定 OpenCode tool" },
  "resource.mcp": { label: "MCP Server", category: "MCP", description: "綁定 MCP server" },
  "resource.plugin": { label: "Plugin", category: "Plugin", description: "綁定 OpenCode plugin" },
  "action.prompt": { label: "執行 Prompt", category: "動作", description: "建立或重用 session 並送出 prompt" },
  "action.command": { label: "執行 Command", category: "動作", description: "在 session 中執行 command" },
  "action.restart": { label: "重啟 Runtime", category: "動作", description: "重啟目前選定的 target runtime" },
  "action.approval": { label: "人工核准", category: "流程", description: "人工審核節點（未來支援）" },
  "action.shell": { label: "Shell", category: "流程", description: "基於安全政策不開放" },
  "flow.condition": { label: "條件分支", category: "流程", description: "依輸出建立分支（未來支援）" },
  "flow.merge": { label: "合併流程", category: "流程", description: "合併多個分支（未來支援）" },
}

const STATIC_PALETTE_TYPES: Array<{ type: WorkflowNodeType; disabled?: boolean }> = []

const RESOURCE_TYPE_BY_KIND = {
  agents: "resource.agent",
  tools: "resource.tool",
  skills: "resource.skill",
  plugins: "resource.plugin",
  mcp: "resource.mcp",
  commands: "resource.command",
} as const

export function createWorkflowDraft(project?: string, input?: Partial<Pick<WorkflowV1, "id" | "name" | "description" | "scope">>): WorkflowV1 {
  const now = new Date().toISOString()
  const scope = input?.scope ?? (project ? "project" : "global")
  const name = input?.name?.trim() || "未命名 Workflow"
  return {
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    id: input?.id?.trim() || slugifyWorkflowID(name),
    name,
    description: input?.description?.trim() || "",
    scope,
    ...(scope === "project" && project ? { project } : {}),
    nodes: [
      {
        id: "command",
        type: "resource.command",
        position: { x: 80, y: 120 },
        data: createManagedResourceData("resource.command", "new-command", scope),
      },
      {
        id: "agent",
        type: "resource.agent",
        position: { x: 430, y: 120 },
        data: createManagedResourceData("resource.agent", "new-agent", scope),
      },
    ],
    edges: [{ id: "command-agent", source: "command", target: "agent", kind: "capability", sourceHandle: "capability", targetHandle: "agent" }],
    variables: {},
    createdAt: now,
    updatedAt: now,
  }
}

export function slugifyWorkflowID(value: string) {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "")
  return slug || `workflow-${Date.now().toString(36)}`
}

export function touchWorkflow(workflow: WorkflowV1, changes: Partial<WorkflowV1>): WorkflowV1 {
  return { ...workflow, ...changes, updatedAt: new Date().toISOString() }
}

export function buildPaletteItems(resources?: Record<string, WorkflowResource[]>): WorkflowPaletteItem[] {
  const staticItems = STATIC_PALETTE_TYPES.map(({ type, disabled }) => ({
    key: type,
    type,
    label: WORKFLOW_NODE_META[type].label,
    description: WORKFLOW_NODE_META[type].description,
    category: WORKFLOW_NODE_META[type].category,
    disabled,
  }))
  const resourceItems = Object.entries(RESOURCE_TYPE_BY_KIND).flatMap(([kind, type]) =>
    (resources?.[kind] ?? []).map((resource) => ({
      key: `${type}:${resource.scope ?? "runtime"}:${resource.name}`,
      type,
      label: resource.name,
      description: `${WORKFLOW_NODE_META[type].description} · ${resource.sources.join(" / ")}${resource.status ? ` · ${resource.status}` : ""}`,
      category: WORKFLOW_NODE_META[type].category,
      resource,
    })),
  )
  return [...staticItems, ...resourceItems]
}

export function createNodeFromPalette(
  item: WorkflowPaletteItem,
  position: WorkflowPosition,
  existingNodes: WorkflowNode[],
  defaultScope: WorkflowScope,
): WorkflowNode {
  const baseID = item.resource?.name || item.type.replace(".", "-")
  const id = uniqueID(slugifyWorkflowID(baseID), new Set(existingNodes.map((node) => node.id)))
  if (item.type.startsWith("resource.")) {
    const resource = item.resource
    const resourceType = item.type as Extract<WorkflowNodeType, `resource.${string}`>
    const resourceName = item.resourceMode === "managed"
      ? uniqueID(`new-${resourceType.split(".")[1]}`, new Set(existingNodes.filter((node) => node.type === resourceType).map((node) => (node.data as ResourceNodeData).name)))
      : resource?.name || "new-resource"
    const scope = resource?.scope ?? defaultScope
    return {
      id,
      type: resourceType,
      position,
      data: item.resourceMode === "managed"
        ? createManagedResourceData(resourceType, resourceName, scope)
        : { mode: "reference", name: resourceName, scope },
    } as WorkflowNode
  }
  if (item.type === "action.prompt") {
    return { id, type: item.type, position, data: { text: "", sessionMode: "reuse-or-create" } }
  }
  if (item.type === "action.command") {
    return { id, type: item.type, position, data: { arguments: "", sessionMode: "reuse-or-create" } }
  }
  if (item.type === "action.restart") {
    return { id, type: item.type, position, data: {} }
  }
  return { id, type: item.type, position, data: { label: item.label } } as WorkflowNode
}

export function duplicateWorkflowNode(node: WorkflowNode, existingNodes: WorkflowNode[]): WorkflowNode {
  return {
    ...structuredClone(node),
    id: uniqueID(`${node.id}-copy`, new Set(existingNodes.map((item) => item.id))),
    position: { x: node.position.x + 48, y: node.position.y + 48 },
  }
}

export function getWorkflowNodeTitle(node: WorkflowNode) {
  if (node.type.startsWith("resource.")) return (node.data as ResourceNodeData).name || WORKFLOW_NODE_META[node.type].label
  return WORKFLOW_NODE_META[node.type].label
}

export function getWorkflowNodeSummary(node: WorkflowNode) {
  if (node.type.startsWith("resource.")) {
    const data = node.data as ResourceNodeData
    return `${data.mode === "reference" ? "參照" : "受管"} · ${data.scope === "global" ? "全域" : "專案"}`
  }
  if (node.type === "action.prompt") return node.data.text.trim() || "尚未設定 prompt"
  if (node.type === "action.command") return node.data.arguments.trim() || "等待 command 綁定"
  if (node.type === "action.restart") return "重啟執行時選定的 runtime"
  return WORKFLOW_NODE_META[node.type].description
}

export function resolveConnectionKind(
  sourceNode: WorkflowNode | undefined,
  targetNode: WorkflowNode | undefined,
  sourceHandle?: string | null,
  targetHandle?: string | null,
): WorkflowEdgeKind | null {
  if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) return null
  if (sourceHandle === "capability-output" && sourceNode.type.startsWith("resource.") && targetNode.type.startsWith("resource.") && targetHandle === capabilityTargetHandle(targetNode.type)) {
    if (sourceNode.type === "resource.command" && targetNode.type === "resource.agent") return "capability"
    if (sourceNode.type === "resource.agent" && ["resource.skill", "resource.tool", "resource.mcp", "resource.plugin"].includes(targetNode.type)) return "capability"
    return null
  }
  return null
}

export function wouldCreateControlCycle(edges: WorkflowEdge[], source: string, target: string) {
  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    if (edge.kind !== "control") continue
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target])
  }
  adjacency.set(source, [...(adjacency.get(source) ?? []), target])
  const visited = new Set<string>()
  const stack = [target]
  while (stack.length) {
    const current = stack.pop()
    if (!current) continue
    if (current === source) return true
    if (visited.has(current)) continue
    visited.add(current)
    stack.push(...(adjacency.get(current) ?? []))
  }
  return false
}

export function getEdgeLabel(kind: WorkflowEdgeKind) {
  const labels: Record<WorkflowEdgeKind, string> = {
    control: "控制",
    binding: "綁定",
    capability: "能力",
    data: "資料",
    "condition.true": "成立",
    "condition.false": "不成立",
  }
  return labels[kind]
}

export function projectWorkflowRelationships(workflow: WorkflowV1): WorkflowRelationshipProjection {
  const nodes = new Map(workflow.nodes.map((node) => [node.id, node]))
  const commandAgents: WorkflowRelationshipProjection["commandAgents"] = []
  const agentCapabilities: WorkflowRelationshipProjection["agentCapabilities"] = []
  const capabilitiesByAgent = new Map<string, WorkflowRelationshipProjection["agentApps"][number]["capabilities"]>()

  for (const edge of workflow.edges.filter((item) => item.kind === "capability")) {
    const source = nodes.get(edge.source)
    const target = nodes.get(edge.target)
    if (!source?.type.startsWith("resource.") || !target?.type.startsWith("resource.")) continue
    const sourceData = source.data as ResourceNodeData
    const targetData = target.data as ResourceNodeData
    if (source.type === "resource.command" && target.type === "resource.agent") {
      commandAgents.push({ command: sourceData.name, agent: targetData.name, commandNodeID: source.id, agentNodeID: target.id, source: "workflow" })
      continue
    }
    if (source.type !== "resource.agent") continue
    const kind = capabilityKindForNode(target.type)
    if (!kind) continue
    const capabilities = capabilitiesByAgent.get(source.id) ?? emptyCapabilityMap()
    capabilities[kind].push(targetData.name)
    capabilitiesByAgent.set(source.id, capabilities)
    agentCapabilities.push({ agent: sourceData.name, kind, name: targetData.name, agentNodeID: source.id, resourceNodeID: target.id, source: "workflow" })
  }

  return {
    commandAgents,
    agentCapabilities,
    agentApps: commandAgents.map((relationship) => ({
      id: `${relationship.commandNodeID}->${relationship.agentNodeID}`,
      command: relationship.command,
      agent: relationship.agent,
      commandNodeID: relationship.commandNodeID,
      agentNodeID: relationship.agentNodeID,
      capabilities: capabilitiesByAgent.get(relationship.agentNodeID ?? "") ?? emptyCapabilityMap(),
      source: "workflow" as const,
    })),
  }
}

function capabilityTargetHandle(type: WorkflowNodeType): string | null {
  const handles: Partial<Record<WorkflowNodeType, string>> = {
    "resource.agent": "agent",
    "resource.skill": "skill",
    "resource.tool": "tool",
    "resource.mcp": "mcp",
    "resource.plugin": "plugin",
  }
  return handles[type] ?? null
}

function capabilityKindForNode(type: WorkflowNodeType) {
  const kinds = {
    "resource.skill": "skill",
    "resource.tool": "tool",
    "resource.mcp": "mcp",
    "resource.plugin": "plugin",
  } as const
  return type in kinds ? kinds[type as keyof typeof kinds] : undefined
}

function emptyCapabilityMap(): WorkflowRelationshipProjection["agentApps"][number]["capabilities"] {
  return { skill: [], tool: [], mcp: [], plugin: [] }
}

export function issueMessage(issue: string | { message: string }) {
  return typeof issue === "string" ? issue : issue.message
}

export function scopeLabel(scope: WorkflowScope) {
  return scope === "global" ? "全域" : "專案"
}

function uniqueID(base: string, existing: Set<string>) {
  if (!existing.has(base)) return base
  let index = 2
  while (existing.has(`${base}-${index}`)) index += 1
  return `${base}-${index}`
}

function createManagedResourceData(
  type: Extract<WorkflowNodeType, `resource.${string}`>,
  name: string,
  scope: WorkflowScope,
): ResourceNodeData {
  if (type === "resource.mcp") {
    return { mode: "managed", name, scope, config: { type: "remote", url: "https://example.com/mcp", enabled: false } }
  }
  if (type === "resource.skill") {
    return { mode: "managed", name, scope, content: `---\nname: ${name}\ndescription: Managed workflow skill\n---\n\n# Instructions\n\nDescribe the skill here.\n` }
  }
  if (type === "resource.agent" || type === "resource.command") {
    return { mode: "managed", name, scope, content: `---\ndescription: Managed workflow ${type.split(".")[1]}\n---\n\nDescribe the instructions here.\n` }
  }
  return { mode: "managed", name, scope, content: "export default {}\n" }
}
