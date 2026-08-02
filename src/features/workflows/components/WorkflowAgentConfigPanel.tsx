import { useState, type SetStateAction } from "react"
import { AgentConfigPanel } from "@/shared/components/layout/app-sidebar/AgentsToolsModalSections"
import { emptyAgentForm } from "@/shared/components/layout/app-sidebar/config"
import type {
  AgentConfigMode,
  AgentForm,
  PermissionAction,
  ToolDefinition,
} from "@/shared/types/app-sidebar"
import { agentToYaml } from "@/shared/utils/app-sidebar"
import type { ResourceNodeData, WorkflowNode } from "@/features/workflows/types"
import type { ModelOption } from "@/shared/types/workspace"
import { buildAgentModelKeys, buildAgentVariantOptions } from "@/shared/utils/openCodeModelUtils"

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
  onUpdateNode: (node: WorkflowNode) => void
}

type WorkflowAgentNode = WorkflowNode & { type: "resource.agent"; data: ResourceNodeData }

export function WorkflowAgentConfigPanel({ modelOptions = [], node, nodes, onUpdateNode }: WorkflowAgentConfigPanelProps) {
  const data = node.data as ResourceNodeData
  const initialForm = agentFormFromContent(data.content ?? "", data.name, data.scope)
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
  const [agentForm, setAgentForm] = useState<AgentForm>(initialForm)
  const [agentYaml, setAgentYaml] = useState(() =>
    data.content?.trim() ? data.content : agentToYaml(agentFromForm(initialForm, node)),
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
      setAgentYaml(agentToYaml(agentFromForm(agentForm, node)))
    } else {
      updateAgentForm(agentFormFromContent(agentYaml, data.name, data.scope))
    }
    setAgentConfigMode(mode)
  }

  function submitConfig() {
    const content = agentConfigMode === "yaml" ? agentYaml : agentToYaml(agentFromForm(agentForm, node))
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
    setAgentForm((current) => current.subagents.includes(subagentToAdd)
      ? current
      : { ...current, subagents: [...current.subagents, subagentToAdd] },
    )
  }

  function removeSubagent(subagentID: string) {
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
      agentConfigMode={agentConfigMode}
      agentEditMode="edit"
      agentForm={agentForm}
      agentYaml={agentYaml}
      agents={[]}
      availableModels={availableModels}
      modelOptions={modelOptions}
      availableSkillNames={availableSkillNames}
      editingAgentId={node.id}
      guidanceSkill={guidanceSkill}
      guidanceSubagent={guidanceSubagent}
      guidanceTool={guidanceTool}
      isCustomToolName={(toolName) => toolDefinitions.some((tool) => tool.name === toolName && tool.source === "custom")}
      onAddFormSubagent={addSubagent}
      onAgentConfigModeChange={changeConfigMode}
      onAgentFormChange={updateAgentForm}
      onAgentYamlChange={setAgentYaml}
      onGetCallableSubagentOptions={() => []}
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

function agentFormFromContent(content: string, fallbackName: string, scope: ResourceNodeData["scope"]): AgentForm {
  const metadata = readFrontmatter(content)
  const tools = readIndentedMapKeys(metadata.frontmatter, "tools")
  const skills = readIndentedList(metadata.frontmatter, "skills")
  const permission = {
    ...DEFAULT_PERMISSION,
    ...readPermission(metadata.frontmatter),
  }
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
    subagents: [],
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
