import { useState, type SetStateAction } from "react"
import { AgentConfigPanel } from "@/shared/components/layout/app-sidebar/AgentsToolsModalSections"
import { emptyAgentForm } from "@/shared/components/layout/app-sidebar/config"
import type {
  AgentDefinition,
  AgentConfigMode,
  AgentForm,
  PermissionAction,
  ToolDefinition,
} from "@/shared/types/app-sidebar"
import { agentToYaml, getToolPermissionKey } from "@/shared/utils/app-sidebar"
import type { ResourceNodeData, WorkflowEdge, WorkflowNode } from "@/features/workflows/types"
import type { ModelOption } from "@/shared/types/workspace"
import { buildAgentModelKeys, buildAgentVariantOptions } from "@/shared/utils/openCodeModelUtils"
import { resolveWorkflowAgentRoles } from "@/features/workflows/workflowUtils"

const DEFAULT_PERMISSION: Record<string, PermissionAction> = {
  edit: "allow",
  bash: "ask",
  read: "allow",
  grep: "allow",
  glob: "allow",
}

type WorkflowAgentConfigPanelProps = {
  modelOptions?: ModelOption[]
  node: WorkflowAgentNode
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  onAddDelegation?: (sourceAgentID: string, targetAgentID: string) => void
  onRemoveDelegation?: (edgeID: string) => void
  onOpenPromptWriter?: () => void
  onUpdateNode: (node: WorkflowNode) => void
}

type WorkflowAgentNode = WorkflowNode & { type: "resource.agent"; data: ResourceNodeData }

export function WorkflowAgentConfigPanel({ edges, modelOptions = [], node, nodes, onAddDelegation, onRemoveDelegation, onOpenPromptWriter, onUpdateNode }: WorkflowAgentConfigPanelProps) {
  const data = node.data as ResourceNodeData
  const workflowAgents = nodes.filter((item): item is WorkflowAgentNode => item.type === "resource.agent")
  const roles = resolveWorkflowAgentRoles({ nodes, edges })
  const derivedMode: AgentDefinition["mode"] = roles.primaryIDs.has(node.id) ? "primary" : "subagent"
  const delegatedAgentNodes = edges
    .filter((edge) => edge.kind === "delegation" && edge.source === node.id)
    .flatMap((edge) => workflowAgents.filter((candidate) => candidate.id === edge.target))
  const initialForm = mergeConnectedCapabilities(agentFormFromContent(data.content ?? "", data.name, data.scope), {
    tool: connectedCapabilityNames(node, edges, nodes, "resource.tool"),
    skill: connectedCapabilityNames(node, edges, nodes, "resource.skill"),
  })
  const connectedPluginNames = connectedCapabilityNames(node, edges, nodes, "resource.plugin")
  const connectedMcpNames = connectedCapabilityNames(node, edges, nodes, "resource.mcp")
  const initialFormWithDelegations = {
    ...initialForm,
    mode: derivedMode,
    subagents: delegatedAgentNodes.map((candidate) => (candidate.data as ResourceNodeData).name),
  }
  const workflowAgentDefinitions = workflowAgents.map((candidate): AgentDefinition => {
    const candidateData = candidate.data as ResourceNodeData
    return {
      id: candidate.id,
      name: candidateData.name,
      description: "Workflow Agent",
      scope: "custom",
      installTarget: candidateData.scope,
      mode: roles.primaryIDs.has(candidate.id) ? "primary" : "subagent",
      model: readFrontmatterValue(candidateData.content ?? "", "model") ?? "",
      tools: [],
      skills: [],
      subagents: [],
      permission: {},
      systemPrompt: "",
    }
  })
  const availableSkillNames = nodes
    .filter((item) => item.type === "resource.skill")
    .map((item) => (item.data as ResourceNodeData).name)
    .filter(Boolean)
  const toolDefinitions = nodes
    .filter((item) => item.type === "resource.tool")
    .map((item): ToolDefinition => {
      const toolData = item.data as ResourceNodeData
      return {
        id: item.id,
        name: toolData.name,
        description: "Workflow capability tool",
        category: "Workflow",
        source: "custom",
      }
    })
  const availableModels = [...new Set([...buildAgentModelKeys(modelOptions), initialForm.model].filter(Boolean))]
  const [agentConfigMode, setAgentConfigMode] = useState<AgentConfigMode>("interface")
  const [agentForm, setAgentForm] = useState<AgentForm>(initialFormWithDelegations)
  const [agentYaml, setAgentYaml] = useState(() =>
    data.content?.trim() ? data.content : agentToYaml(agentFromForm(initialFormWithDelegations, node)),
  )
  const [toolToAdd, setToolToAdd] = useState(toolDefinitions[0]?.name ?? "")
  const [skillToAdd, setSkillToAdd] = useState(availableSkillNames[0] ?? "")
  const [subagentToAdd, setSubagentToAdd] = useState("")
  const [guidanceTool, setGuidanceTool] = useState<string | null>(null)
  const [guidanceSkill, setGuidanceSkill] = useState<string | null>(null)
  const [guidanceSubagent, setGuidanceSubagent] = useState<string | null>(null)
  const variantOptions = [...new Set([...buildAgentVariantOptions(agentForm.model, modelOptions), agentForm.variant])]

  function updateAgentForm(update: SetStateAction<AgentForm>) {
    setAgentForm((current) => {
      const next = typeof update === "function" ? update(current) : update
      if (next.model === current.model) return next
      const variants = buildAgentVariantOptions(next.model, modelOptions)
      return next.variant && !variants.includes(next.variant) ? { ...next, variant: "" } : next
    })
  }

  function changeConfigMode(mode: AgentConfigMode) {
    if (mode === agentConfigMode) return
    if (mode === "yaml") {
      setAgentYaml(agentToYaml(agentFromForm({ ...agentForm, mode: derivedMode }, node)))
    } else {
      updateAgentForm(mergeConnectedCapabilities(agentFormFromContent(agentYaml, data.name, data.scope), {
        tool: connectedCapabilityNames(node, edges, nodes, "resource.tool"),
        skill: connectedCapabilityNames(node, edges, nodes, "resource.skill"),
      }))
    }
    setAgentConfigMode(mode)
  }

  function submitConfig() {
    const content = agentConfigMode === "yaml"
      ? syncAgentYamlCapabilities(agentYaml, data.name, data.scope, {
          tool: connectedCapabilityNames(node, edges, nodes, "resource.tool"),
          skill: connectedCapabilityNames(node, edges, nodes, "resource.skill"),
        })
      : agentToYaml(agentFromForm({ ...agentForm, mode: derivedMode }, node))
    const yamlName = readFrontmatterValue(content, "name")
    const name = (agentConfigMode === "yaml" ? yamlName : agentForm.name).trim() || data.name
    onUpdateNode({
      ...node,
      data: {
        ...data,
        name,
        mode: data.mode,
        content,
      },
    })
  }

  function addSubagent() {
    if (!subagentToAdd) return
    const target = workflowAgents.find((candidate) => candidate.id === subagentToAdd || (candidate.data as ResourceNodeData).name === subagentToAdd)
    const targetName = target ? (target.data as ResourceNodeData).name : subagentToAdd
    if (target) onAddDelegation?.(node.id, target.id)
    setAgentForm((current) => current.subagents.includes(targetName)
      ? current
      : { ...current, subagents: [...current.subagents, targetName] },
    )
  }

  function removeSubagent(subagentID: string) {
    const target = workflowAgents.find((candidate) => candidate.id === subagentID || (candidate.data as ResourceNodeData).name === subagentID)
    const edge = target && edges.find((candidate) => candidate.kind === "delegation" && candidate.source === node.id && candidate.target === target.id)
    if (edge) onRemoveDelegation?.(edge.id)
    setAgentForm((current) => ({
      ...current,
      subagents: current.subagents.filter((item) => item !== subagentID),
      subagentGuidance: withoutKey(current.subagentGuidance, subagentID),
    }))
  }

  function updateToolGuidance(tool: string, value: string) {
    setAgentForm((current) => ({ ...current, toolGuidance: { ...current.toolGuidance, [tool]: value } }))
  }

  function updateSkillGuidance(skill: string, value: string) {
    setAgentForm((current) => ({ ...current, skillGuidance: { ...current.skillGuidance, [skill]: value } }))
  }

  function updateSubagentGuidance(subagent: string, value: string) {
    setAgentForm((current) => ({ ...current, subagentGuidance: { ...current.subagentGuidance, [subagent]: value } }))
  }

  return (
    <AgentConfigPanel
      agentModeOverride={derivedMode}
      agentModeReadOnly
      agentModeReadOnlyReason="Workflow graph 會決定 primary / subagent；請使用 Command、primary-link 或 delegation 來調整角色。"
      onOpenPromptWriter={onOpenPromptWriter}
      agentConfigMode={agentConfigMode}
      agentEditMode="edit"
      agentForm={agentForm}
      agentYaml={agentYaml}
      agents={workflowAgentDefinitions}
      availableModels={availableModels}
      modelOptions={modelOptions}
      availableSkillNames={availableSkillNames}
      connectedMcpNames={connectedMcpNames}
      connectedPluginNames={connectedPluginNames}
      editingAgentId={node.id}
      guidanceSkill={guidanceSkill}
      guidanceSubagent={guidanceSubagent}
      guidanceTool={guidanceTool}
      isCustomToolName={(toolName) => toolDefinitions.some((tool) => tool.name === toolName && tool.source === "custom")}
      onAddFormSubagent={addSubagent}
      onAgentConfigModeChange={changeConfigMode}
      onAgentFormChange={updateAgentForm}
      onAgentYamlChange={setAgentYaml}
       onGetCallableSubagentOptions={(_agentID, assignedSubagents) => workflowAgentDefinitions.filter((candidate) => candidate.id !== node.id && !assignedSubagents.includes(candidate.name))}
      onGuidanceSkillChange={setGuidanceSkill}
      onGuidanceSubagentChange={setGuidanceSubagent}
      onGuidanceToolChange={setGuidanceTool}
      onRemoveFormSubagent={removeSubagent}
      onSkillToAddChange={setSkillToAdd}
      onSubagentToAddChange={setSubagentToAdd}
      onSubmitAgentConfig={submitConfig}
      onToolToAddChange={setToolToAdd}
      onUpdateSkillGuidance={updateSkillGuidance}
      onUpdateSubagentGuidance={updateSubagentGuidance}
      onUpdateToolGuidance={updateToolGuidance}
      skillToAdd={skillToAdd}
      subagentToAdd={subagentToAdd}
      toolDefinitions={toolDefinitions}
      toolToAdd={toolToAdd}
      variantOptions={variantOptions}
    />
  )
}

function agentFromForm(form: AgentForm, node: WorkflowAgentNode) {
  return {
    ...form,
    id: node.id,
    name: form.name.trim() || node.data.name,
    scope: "custom" as const,
    permission: form.permission,
  }
}

function mergeConnectedCapabilities(form: AgentForm, connected: { tool: string[]; skill: string[] }): AgentForm {
  const tools = mergeNames(form.tools, connected.tool)
  const permission = { ...form.permission }
  for (const tool of connected.tool) {
    const permissionKey = getToolPermissionKey(tool)
    if (permission[permissionKey] === undefined) permission[permissionKey] = "ask"
  }
  return {
    ...form,
    tools,
    skills: mergeNames(form.skills, connected.skill),
    permission,
  }
}

function mergeNames(current: string[], additions: string[]) {
  return [...new Set([...current, ...additions])]
}

function connectedCapabilityNames(
  agent: WorkflowAgentNode,
  edges: WorkflowEdge[],
  nodes: WorkflowNode[],
  type: "resource.skill" | "resource.tool" | "resource.mcp" | "resource.plugin",
) {
  const byID = new Map(nodes.map((item) => [item.id, item]))
  return edges.flatMap((edge) => {
    if (edge.kind !== "capability") return []
    const resourceID = edge.target === agent.id && edge.targetHandle === "capability"
      ? edge.source
      : edge.source === agent.id && edge.targetHandle === type.replace("resource.", "")
        ? edge.target
        : undefined
    const resource = resourceID ? byID.get(resourceID) : undefined
    if (!resource || resource.type !== type) return []
    const name = (resource.data as ResourceNodeData).name.trim()
    return name ? [name] : []
  })
}

function syncAgentYamlCapabilities(
  content: string,
  fallbackName: string,
  scope: ResourceNodeData["scope"],
  connected: { tool: string[]; skill: string[] },
) {
  const form = mergeConnectedCapabilities(agentFormFromContent(content, fallbackName, scope), connected)
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/)
  if (!match) return agentToYaml({ ...form, id: "workflow-agent", scope: "custom", name: form.name || fallbackName })
  const lines = match[1].split(/\r?\n/)
  replaceFrontmatterSection(lines, "tools", form.tools.map((tool) => `${tool}: true`))
  replaceFrontmatterSection(lines, "skills", form.skills.map((skill) => `- ${skill}`))
  return `---\n${lines.join("\n")}\n---\n${content.slice(match[0].length)}`
}

function replaceFrontmatterSection(lines: string[], name: string, values: string[]) {
  const start = lines.findIndex((line) => line.trim() === `${name}:` && !line.startsWith(" "))
  const nextLines = values.length > 0 ? [`${name}:`, ...values.map((value) => `  ${value}`)] : []
  if (start < 0) {
    if (nextLines.length === 0) return
    const permissionIndex = lines.findIndex((line) => line.trim() === "permission:" && !line.startsWith(" "))
    lines.splice(permissionIndex < 0 ? lines.length : permissionIndex, 0, ...nextLines)
    return
  }
  let end = start + 1
  while (end < lines.length && (!lines[end]?.trim() || lines[end]?.startsWith(" "))) end += 1
  lines.splice(start, end - start, ...nextLines)
}

function agentFormFromContent(content: string, fallbackName: string, scope: ResourceNodeData["scope"]): AgentForm {
  const metadata = readFrontmatter(content)
  const tools = readIndentedMapKeys(metadata.frontmatter, "tools")
  const skills = readIndentedList(metadata.frontmatter, "skills")
  const permission = {
    ...DEFAULT_PERMISSION,
    ...readPermission(metadata.frontmatter),
  }
  const subagents = readTaskAgents(metadata.frontmatter)
  const promptFile = metadata.values.prompt?.match(/^\{file:(.+)\}$/)?.[1]?.trim() ?? ""
  const mode = metadata.values.mode === "primary" || metadata.values.mode === "all" ? metadata.values.mode : "subagent"

  return {
    ...emptyAgentForm,
    name: metadata.values.name?.trim() || fallbackName,
    installTarget: scope,
    description: metadata.values.description ?? "",
    mode,
    model: metadata.values.model ?? "",
    temperature: metadata.values.temperature ?? "0.3",
    top_p: metadata.values.top_p ?? "1",
    variant: metadata.values.variant ?? "",
    steps: metadata.values.steps ?? "",
    disable: metadata.values.disable === "true",
    hidden: metadata.values.hidden === "true",
    color: metadata.values.color ?? "",
    promptSource: promptFile ? "file" : "inline",
    promptFile,
    tools,
    skills,
    permission,
    systemPrompt: metadata.body,
    toolGuidance: {},
    skillGuidance: {},
    subagents,
    subagentGuidance: {},
  }
}

function readFrontmatter(content: string) {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/)
  const frontmatter = match?.[1] ?? ""
  const values: Record<string, string> = {}
  for (const line of frontmatter.split(/\r?\n/)) {
    const separator = line.indexOf(":")
    if (separator < 0 || line.startsWith(" ")) continue
    const key = line.slice(0, separator).trim()
    if (!key) continue
    values[key] = unquote(line.slice(separator + 1).trim())
  }
  return { frontmatter, values, body: (match?.[2] ?? content).trim() }
}

function readFrontmatterValue(content: string, key: string) {
  return readFrontmatter(content).values[key]
}

function readIndentedMapKeys(frontmatter: string, sectionName: string) {
  const section = readSection(frontmatter, sectionName)
  return section
    .map((line) => line.match(/^\s{2}([^:#][^:]*):\s*(true|false)\s*$/))
    .filter((match): match is RegExpMatchArray => Boolean(match && match[2] !== "false"))
    .map((match) => unquote(match[1].trim()))
}

function readIndentedList(frontmatter: string, sectionName: string) {
  return readSection(frontmatter, sectionName)
    .map((line) => line.match(/^\s*-\s*(.+)$/)?.[1])
    .filter((value): value is string => Boolean(value))
    .map((value) => unquote(value.trim()))
}

function readPermission(frontmatter: string): Record<string, PermissionAction> {
  return Object.fromEntries(
    readSection(frontmatter, "permission")
      .map((line) => line.match(/^\s{2}([^:#][^:]*):\s*(allow|ask|deny)\s*$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => [unquote(match[1].trim()), match[2] as PermissionAction]),
  )
}

function readTaskAgents(frontmatter: string): string[] {
  return readSection(frontmatter, "permission")
    .map((line) => line.match(/^\s{4}["']?([^:"']+)["']?:\s*allow\s*$/)?.[1]?.trim())
    .filter((value): value is string => Boolean(value && value !== "*" && value !== "task"))
}

function readSection(frontmatter: string, sectionName: string) {
  const lines = frontmatter.split(/\r?\n/)
  const sectionStart = lines.findIndex((line) => line.trim() === `${sectionName}:`)
  if (sectionStart < 0) return []
  const section: string[] = []
  for (const line of lines.slice(sectionStart + 1)) {
    if (line.trim() && !line.startsWith(" ")) break
    section.push(line)
  }
  return section
}

function unquote(value: string) {
  return value.replace(/^['"]|['"]$/g, "")
}

function withoutKey<T extends Record<string, string>>(value: T, key: string): T {
  const next = { ...value }
  delete next[key]
  return next
}
