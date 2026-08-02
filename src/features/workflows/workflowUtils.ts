import type {
  ResourceNodeData,
  WorkflowEdge,
  WorkflowEdgeKind,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowPaletteItem,
  WorkflowPosition,
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

const STATIC_PALETTE_TYPES: Array<{ type: WorkflowNodeType; disabled?: boolean }> = [
  { type: "trigger.manual" },
  { type: "trigger.schedule", disabled: true },
  { type: "trigger.webhook", disabled: true },
  { type: "action.prompt" },
  { type: "action.command" },
  { type: "action.restart" },
  { type: "action.approval", disabled: true },
  { type: "action.shell", disabled: true },
  { type: "flow.condition", disabled: true },
  { type: "flow.merge", disabled: true },
]

const RESOURCE_TYPE_BY_KIND = {
  agents: "resource.agent",
  tools: "resource.tool",
  skills: "resource.skill",
  plugins: "resource.plugin",
  mcp: "resource.mcp",
  commands: "resource.command",
} as const

const MANAGED_RESOURCE_TYPES = Object.values(RESOURCE_TYPE_BY_KIND)

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
        id: "start",
        type: "trigger.manual",
        position: { x: 0, y: 0 },
        data: {},
      },
    ],
    edges: [],
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
  const managedItems = MANAGED_RESOURCE_TYPES.map((type) => ({
    key: `managed:${type}`,
    type,
    label: `建立受管 ${WORKFLOW_NODE_META[type].label}`,
    description: "建立由此 workflow 管理、只在發布時同步的資源",
    category: WORKFLOW_NODE_META[type].category,
    resourceMode: "managed" as const,
  }))
  return [...staticItems, ...managedItems, ...resourceItems]
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

const PROMPT_BINDINGS: Record<string, WorkflowNodeType> = {
  agent: "resource.agent",
  skill: "resource.skill",
  tool: "resource.tool",
  mcp: "resource.mcp",
}
const COMMAND_BINDINGS: Record<string, WorkflowNodeType> = {
  command: "resource.command",
  agent: "resource.agent",
}

export function resolveConnectionKind(
  sourceNode: WorkflowNode | undefined,
  targetNode: WorkflowNode | undefined,
  sourceHandle?: string | null,
  targetHandle?: string | null,
): WorkflowEdgeKind | null {
  if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) return null
  if (sourceHandle === "control-output" && targetHandle === "control-input") {
    if ((sourceNode.type.startsWith("trigger.") || sourceNode.type.startsWith("action.")) && targetNode.type.startsWith("action.")) {
      return "control"
    }
    return null
  }
  if (sourceHandle === "output" && targetHandle === "context" && sourceNode.type.startsWith("action.") && targetNode.type.startsWith("action.")) {
    return "data"
  }
  if (!sourceNode.type.startsWith("resource.")) return null
  const bindings = targetNode.type === "action.prompt" ? PROMPT_BINDINGS : targetNode.type === "action.command" ? COMMAND_BINDINGS : null
  return bindings && targetHandle && bindings[targetHandle] === sourceNode.type ? "binding" : null
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
    data: "資料",
    "condition.true": "成立",
    "condition.false": "不成立",
  }
  return labels[kind]
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
