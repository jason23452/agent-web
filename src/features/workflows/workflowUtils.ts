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
import { WORKFLOW_SCHEMA_VERSION, WORKFLOW_V2_SCHEMA_VERSION } from "@/features/workflows/types"

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

const STATIC_PALETTE_TYPES: Array<{ type: Extract<WorkflowNodeType, `resource.${string}`>; disabled?: boolean }> = [
  { type: "resource.command" },
  { type: "resource.agent" },
  { type: "resource.skill" },
  { type: "resource.tool" },
  { type: "resource.mcp" },
  { type: "resource.plugin" },
]

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
  const agentData = createManagedResourceData("resource.agent", "new-agent", scope)
  const commandData = createManagedResourceData("resource.command", "new-command", scope)
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
        data: {
          ...commandData,
          content: syncCommandContentWithAgent(commandData.content, agentData.name, workflowFrontmatterValue(agentData.content, "model")),
        },
      },
      {
        id: "agent",
        type: "resource.agent",
        position: { x: 430, y: 120 },
        data: agentData,
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
    key: `create:${type}`,
    type,
    label: `新增 ${WORKFLOW_NODE_META[type].label}`,
    description: `建立 managed ${WORKFLOW_NODE_META[type].label} draft，完成設定後才會在 Publish 時同步。`,
    category: WORKFLOW_NODE_META[type].category,
    disabled,
    resourceMode: "managed" as const,
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
  if (sourceHandle === "delegation" && sourceNode.type === "resource.agent" && targetNode.type === "resource.agent" && targetHandle === "subagent") {
    return "delegation"
  }
  if (sourceHandle === "capability" && sourceNode.type.startsWith("resource.") && targetNode.type.startsWith("resource.") && targetHandle === capabilityTargetHandle(targetNode.type)) {
    if (sourceNode.type === "resource.command" && targetNode.type === "resource.agent") return "capability"
    if (sourceNode.type === "resource.agent" && ["resource.skill", "resource.tool", "resource.mcp", "resource.plugin"].includes(targetNode.type)) return "capability"
    return null
  }
  return null
}

export function capabilityTargetHandle(type: WorkflowNodeType): string | null {
  const handles: Partial<Record<WorkflowNodeType, string>> = {
    "resource.agent": "agent",
    "resource.skill": "skill",
    "resource.tool": "tool",
    "resource.mcp": "mcp",
    "resource.plugin": "plugin",
  }
  return handles[type] ?? null
}

export function createCapabilityEdge(source: WorkflowNode, target: WorkflowNode, id = `edge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`): WorkflowEdge | null {
  const kind = resolveConnectionKind(source, target, "capability", capabilityTargetHandle(target.type))
  if (!kind) return null
  return {
    id,
    source: source.id,
    target: target.id,
    kind,
    sourceHandle: "capability",
    targetHandle: capabilityTargetHandle(target.type) ?? undefined,
  }
}

export function createDelegationEdge(source: WorkflowNode, target: WorkflowNode, id = `edge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`): WorkflowEdge | null {
  if (source.type !== "resource.agent" || target.type !== "resource.agent" || source.id === target.id) return null
  return {
    id,
    source: source.id,
    target: target.id,
    kind: "delegation",
    sourceHandle: "delegation",
    targetHandle: "subagent",
  }
}

export function workflowFrontmatterValue(content: string | undefined, key: string): string | undefined {
  if (!content) return undefined
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/)
  const line = match?.[1]?.split(/\r?\n/).find((item) => item.match(new RegExp(`^${key}:`)))
  const value = line?.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, "")
  return value || undefined
}

export function syncCommandContentWithAgent(content: string | undefined, agentName: string, model?: string): string {
  const source = content ?? ""
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/)
  const frontmatter = match?.[1]?.split(/\r?\n/) ?? []
  const body = match ? source.slice(match[0].length) : source
  setFrontmatterValue(frontmatter, "agent", agentName)
  setFrontmatterValue(frontmatter, "model", model)
  return `---\n${frontmatter.filter(Boolean).join("\n")}\n---\n${body}`
}

export function syncCommandNodeToAgent(command: WorkflowNode, agent: WorkflowNode, fallbackModel?: string): WorkflowNode | null {
  if (command.type !== "resource.command" || agent.type !== "resource.agent") return null
  const commandData = command.data as ResourceNodeData
  const agentData = agent.data as ResourceNodeData
  const model = workflowFrontmatterValue(agentData.content, "model") ?? fallbackModel
  return {
    ...command,
    data: {
      ...commandData,
      content: syncCommandContentWithAgent(commandData.content, agentData.name, model),
    },
  }
}

export function syncAgentContentWithDelegations(content: string | undefined, mode: "primary" | "subagent", delegatedAgents: string[]): string {
  const source = content ?? ""
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/)
  const frontmatter = match?.[1]?.split(/\r?\n/) ?? []
  const body = match ? source.slice(match[0].length) : source
  setFrontmatterValue(frontmatter, "mode", mode)
  setPermissionTask(frontmatter, delegatedAgents)
  return `---\n${frontmatter.filter(Boolean).join("\n")}\n---\n${body}`
}

export function syncWorkflowAgentConfigs(workflow: WorkflowV1): WorkflowV1 {
  const command = workflow.nodes.find((node) => node.type === "resource.command")
  const primaryEdge = command && workflow.edges.find((edge) => edge.kind === "capability" && edge.source === command.id && edge.targetHandle === "agent")
  const primaryID = primaryEdge?.target
  const delegatedByAgent = new Map<string, string[]>()
  for (const edge of workflow.edges) {
    if (edge.kind !== "delegation") continue
    const target = workflow.nodes.find((node) => node.id === edge.target && node.type === "resource.agent")
    if (!target) continue
    delegatedByAgent.set(edge.source, [...(delegatedByAgent.get(edge.source) ?? []), (target.data as ResourceNodeData).name])
  }
  return {
    ...workflow,
    nodes: workflow.nodes.map((node) => {
      if (node.type !== "resource.agent") return node
      const data = node.data as ResourceNodeData
      if (data.mode !== "managed") return node
      const mode = node.id === primaryID ? "primary" : "subagent"
      return { ...node, data: { ...data, content: syncAgentContentWithDelegations(data.content, mode, delegatedByAgent.get(node.id) ?? []) } }
    }),
  }
}

export function workflowUsesV2(workflow: WorkflowV1): boolean {
  return workflow.schemaVersion === WORKFLOW_V2_SCHEMA_VERSION
    || workflow.nodes.filter((node) => node.type === "resource.agent").length > 1
    || workflow.edges.some((edge) => edge.kind === "delegation")
}

export function normalizeWorkflowSchemaVersion(workflow: WorkflowV1): WorkflowV1 {
  return workflowUsesV2(workflow) ? { ...workflow, schemaVersion: WORKFLOW_V2_SCHEMA_VERSION } : workflow
}

export function getWorkflowAppReadiness(workflow: WorkflowV1) {
  const commands = workflow.nodes.filter((node) => node.type === "resource.command")
  const agents = workflow.nodes.filter((node) => node.type === "resource.agent")
  const errors: string[] = []
  if (commands.length !== 1) errors.push(commands.length === 0 ? "請建立一個 Command。" : "Agent App 只能有一個 Command。")
  if (agents.length === 0) errors.push("請建立一個 Agent。")
  const command = commands[0]
  const commandAgentEdges = workflow.edges.filter((edge) => edge.kind === "capability" && edge.source === command?.id && edge.sourceHandle === "capability" && edge.targetHandle === "agent" && agents.some((agent) => agent.id === edge.target))
  if (command && commandAgentEdges.length !== 1) errors.push("請將 Command 連到唯一的 primary Agent。")
  return {
    ready: errors.length === 0,
    errors,
    commandNodeID: command?.id,
    agentNodeID: commandAgentEdges[0]?.target,
  }
}

export function wouldCreateDelegationCycle(edges: WorkflowEdge[], source: string, target: string) {
  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    if (edge.kind !== "delegation") continue
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
    delegation: "委派",
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
  const agentDelegations: WorkflowRelationshipProjection["agentDelegations"] = []
  const capabilitiesByAgent = new Map<string, WorkflowRelationshipProjection["agentApps"][number]["capabilities"]>()
  const delegationsByAgent = new Map<string, string[]>()

  for (const edge of workflow.edges.filter((item) => item.kind === "capability" || item.kind === "delegation")) {
    const source = nodes.get(edge.source)
    const target = nodes.get(edge.target)
    if (!source?.type.startsWith("resource.") || !target?.type.startsWith("resource.")) continue
    const sourceData = source.data as ResourceNodeData
    const targetData = target.data as ResourceNodeData
    if (edge.kind === "capability" && source.type === "resource.command" && target.type === "resource.agent") {
      commandAgents.push({ command: sourceData.name, agent: targetData.name, commandNodeID: source.id, agentNodeID: target.id, source: "workflow" })
      continue
    }
    if (edge.kind === "delegation" && source.type === "resource.agent" && target.type === "resource.agent") {
      agentDelegations.push({ parent: sourceData.name, child: targetData.name, parentNodeID: source.id, childNodeID: target.id, source: "workflow" })
      delegationsByAgent.set(source.id, [...(delegationsByAgent.get(source.id) ?? []), targetData.name])
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
    agentDelegations,
    agentApps: commandAgents.map((relationship) => ({
      id: `${relationship.commandNodeID}->${relationship.agentNodeID}`,
      command: relationship.command,
      agent: relationship.agent,
      commandNodeID: relationship.commandNodeID,
      agentNodeID: relationship.agentNodeID,
      capabilities: capabilitiesByAgent.get(relationship.agentNodeID ?? "") ?? emptyCapabilityMap(),
      delegatedAgents: delegationsByAgent.get(relationship.agentNodeID ?? "") ?? [],
      source: "workflow" as const,
    })),
  }
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

function setFrontmatterValue(lines: string[], key: string, value?: string) {
  const index = lines.findIndex((line) => line.match(new RegExp(`^${key}:`)))
  if (!value) {
    if (index >= 0) lines.splice(index, 1)
    return
  }
  const next = `${key}: ${value}`
  if (index >= 0) lines[index] = next
  else lines.push(next)
}

function setPermissionTask(lines: string[], delegatedAgents: string[]) {
  const permissionIndex = lines.findIndex((line) => line.trim() === "permission:")
  const taskLines = ["  task:", ...(delegatedAgents.length > 0 ? ["    \"*\": deny", ...delegatedAgents.map((name) => `    ${JSON.stringify(name)}: allow`)] : ["    \"*\": deny"])]
  if (permissionIndex < 0) {
    lines.push("permission:", ...taskLines)
    return
  }
  let end = permissionIndex + 1
  while (end < lines.length && (lines[end]?.startsWith(" ") || !lines[end]?.trim())) end += 1
  const permissionLines = lines.slice(permissionIndex + 1, end)
  const filtered: string[] = []
  for (let index = 0; index < permissionLines.length; index += 1) {
    const line = permissionLines[index] ?? ""
    if (line.trim() !== "task:") {
      filtered.push(line)
      continue
    }
    index += 1
    while (index < permissionLines.length && (permissionLines[index]?.startsWith(" ") || !permissionLines[index]?.trim())) index += 1
    index -= 1
  }
  lines.splice(permissionIndex + 1, end - permissionIndex - 1, ...filtered.filter(Boolean), ...taskLines)
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
    const mode = type === "resource.agent" ? "mode: primary\n" : ""
    return { mode: "managed", name, scope, content: `---\ndescription: Managed workflow ${type.split(".")[1]}\n${mode}---\n\nDescribe the instructions here.\n` }
  }
  return { mode: "managed", name, scope, content: "export default {}\n" }
}
