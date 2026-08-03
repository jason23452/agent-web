import { useState, type SetStateAction } from "react"
import { getApiErrorMessage } from "@/shared/api"
import { testOpenCodeMcpConnection, type OpenCodeMcpTestResult } from "@/shared/api/opencodeMcpTest"
import { testToolScript } from "@/shared/api/opencodeRegistry"
import { Badge } from "@/shared/components/ui/badge"
import { AddPluginForm, AddSkillForm } from "@/shared/components/layout/app-sidebar/PluginSkillModalSections"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { emptyCommandForm, emptyMcpForm, emptyPluginForm, emptySkillForm, emptyToolForm } from "@/shared/components/layout/app-sidebar/config"
import { CommandConfigPanel, ToolConfigPanel } from "@/shared/components/layout/app-sidebar/AgentsToolsModalSections"
import { McpEditor } from "@/shared/components/layout/app-sidebar/McpServersDialog"
import type {
  CommandConfigMode,
  CommandForm,
  InstallResult,
  McpConfigMode,
  McpForm,
  PluginEditorMode,
  PluginForm,
  SkillForm,
  ToolForm,
} from "@/shared/types/app-sidebar"
import type { ResourceNodeData, WorkflowEdge, WorkflowNode } from "@/features/workflows/types"
import type { ModelOption } from "@/shared/types/workspace"
import { buildAgentVariantOptions } from "@/shared/utils/openCodeModelUtils"
import { WorkflowAgentConfigPanel } from "@/features/workflows/components/WorkflowAgentConfigPanel"

type WorkflowResourceConfigPanelProps = {
  availableModels?: string[]
  modelOptions?: ModelOption[]
  node: WorkflowNode
  onClose: () => void
  onAddDelegation?: (sourceAgentID: string, targetAgentID: string) => void
  onRemoveDelegation?: (edgeID: string) => void
  onUpdateNode: (node: WorkflowNode) => void
  edges?: WorkflowEdge[]
  nodes?: WorkflowNode[]
  project?: string
}

export function WorkflowResourceConfigPanel({ availableModels = [], modelOptions = [], node, nodes = [], edges = [], onAddDelegation, onClose, onRemoveDelegation, onUpdateNode, project }: WorkflowResourceConfigPanelProps) {
  if ((node.data as ResourceNodeData).mode === "reference") return <ReferenceResourcePanel node={node} onClose={onClose} />
  switch (node.type) {
    case "resource.agent":
       return <WorkflowAgentConfigPanel edges={edges} modelOptions={modelOptions} nodes={nodes} node={node as WorkflowAgentNode} onAddDelegation={onAddDelegation} onRemoveDelegation={onRemoveDelegation} onUpdateNode={onUpdateNode} />
    case "resource.tool":
      return <WorkflowToolConfigPanel key={node.id} node={node} onUpdateNode={onUpdateNode} project={project} />
    case "resource.command":
      return <WorkflowCommandConfigPanel availableModels={availableModels} key={node.id} modelOptions={modelOptions} node={node} onUpdateNode={onUpdateNode} />
    case "resource.plugin":
      return <WorkflowPluginConfigPanel key={node.id} node={node} onClose={onClose} onUpdateNode={onUpdateNode} project={project} />
    case "resource.skill":
      return <WorkflowSkillConfigPanel key={node.id} node={node} onClose={onClose} onUpdateNode={onUpdateNode} project={project} />
    case "resource.mcp":
      return <WorkflowMcpConfigPanel key={node.id} node={node} onClose={onClose} onUpdateNode={onUpdateNode} project={project} />
    default:
      return null
  }
}

type WorkflowAgentNode = WorkflowNode & { type: "resource.agent"; data: ResourceNodeData }

function ReferenceResourcePanel({ node, onClose }: { node: WorkflowNode; onClose: () => void }) {
  const data = node.data as ResourceNodeData
  return (
    <div className="grid gap-4 p-5">
      <div className="grid gap-1">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">Reference resource</p>
        <h3 className="font-semibold text-base">{data.name}</h3>
        <p className="text-muted-foreground text-xs leading-5">這個節點只引用 target runtime 已存在的 OpenCode resource。若要在 Workflow 內編輯內容，請從節點面板建立 managed draft。</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{node.type.replace("resource.", "")}</Badge>
        <Badge variant="outline">{data.scope === "global" ? "Global" : "Project"}</Badge>
        <Badge variant="info">Publish 時驗證</Badge>
      </div>
      <div className="flex justify-end"><Button onClick={onClose} variant="outline">關閉</Button></div>
    </div>
  )
}

function WorkflowToolConfigPanel({ node, onUpdateNode, project }: Pick<WorkflowResourceConfigPanelProps, "node" | "onUpdateNode" | "project">) {
  const data = resourceData(node)
  const [toolForm, setToolForm] = useState<ToolForm>(() => toolFormFromNode(data))
  const [toolTestResult, setToolTestResult] = useState<InstallResult | null>(null)
  const [toolCallTestLoading, setToolCallTestLoading] = useState(false)

  function submit() {
    const name = toolForm.name.trim() || data.name
    updateResourceNode(node, onUpdateNode, {
      name,
      scope: toolForm.installTarget,
      content: toolForm.code,
      config: {
        ...data.config,
        category: toolForm.category,
        description: toolForm.description,
        entry: toolForm.entry,
        runtime: toolForm.runtime ?? "js-ts",
        testInput: toolForm.testInput,
      },
    })
  }

  async function runToolCallTest() {
    if (!toolForm.name.trim()) {
      setToolTestResult({ status: "error", message: "Tool 名稱必填。" })
      return
    }
    if (!toolForm.code.trim()) {
      setToolTestResult({ status: "error", message: "Tool code 不能為空。" })
      return
    }
    if (toolForm.installTarget === "project" && !project) {
      setToolTestResult({ status: "error", message: "Project scope 需要有效的 Project 才能測試。" })
      return
    }
    try {
      JSON.parse(toolForm.testInput || "{}")
    } catch {
      setToolTestResult({ status: "error", message: "Test input 必須是合法 JSON。" })
      return
    }

    setToolCallTestLoading(true)
    setToolTestResult(null)
    try {
      const result = await testToolScript({
        code: toolForm.code,
        entry: toolForm.entry,
        project: toolForm.installTarget === "project" ? project : undefined,
        runtime: "js-ts",
        scope: toolForm.installTarget,
        testInput: toolForm.testInput || "{}",
      })
      const details = [
        ...(result.diagnostics?.length ? result.diagnostics : []),
        result.output ? `Output:\n${result.output}` : "",
        result.stdout ? `stdout:\n${result.stdout}` : "",
        result.stderr ? `stderr:\n${result.stderr}` : "",
      ].filter(Boolean)
      setToolTestResult({ status: result.status, message: details.length ? `${result.message}\n${details.join("\n")}` : result.message })
    } catch (error) {
      setToolTestResult({ status: "error", message: `Tool Call Test 失敗：${getApiErrorMessage(error)}` })
    } finally {
      setToolCallTestLoading(false)
    }
  }

  return (
    <ToolConfigPanel
      onRunToolCallTest={runToolCallTest}
      onSubmitToolConfig={submit}
      onToolFormChange={setToolForm}
      onToolTestResultChange={setToolTestResult}
      requireTestSuccess={false}
      toolCallTestLoading={toolCallTestLoading}
      toolEditMode="edit"
      toolForm={toolForm}
      toolTestResult={toolTestResult}
    />
  )
}

function WorkflowCommandConfigPanel({ availableModels, modelOptions, node, onUpdateNode }: Pick<WorkflowResourceConfigPanelProps, "availableModels" | "modelOptions" | "node" | "onUpdateNode">) {
  const data = resourceData(node)
  const [commandConfigMode, setCommandConfigMode] = useState<CommandConfigMode>("interface")
  const [commandForm, setCommandForm] = useState<CommandForm>(() => commandFormFromDocument(data.content ?? "", data.name, data.scope))
  const [commandDocument, setCommandDocument] = useState(() => data.content?.trim() ? data.content : commandFormToMarkdown(commandFormFromDocument("", data.name, data.scope)))
  const variantOptions = [...new Set([...buildAgentVariantOptions(commandForm.model, modelOptions ?? []), commandForm.variant ?? ""])]

  function updateCommandForm(update: SetStateAction<CommandForm>) {
    setCommandForm((current) => {
      const next = typeof update === "function" ? update(current) : update
      if (next.model === current.model) return next
      const variants = buildAgentVariantOptions(next.model, modelOptions ?? [])
      return next.variant && !variants.includes(next.variant) ? { ...next, variant: "" } : next
    })
  }

  function changeMode(mode: CommandConfigMode) {
    if (mode === commandConfigMode) return
    if (mode === "document") setCommandDocument(commandFormToMarkdown(commandForm))
    else updateCommandForm(commandFormFromDocument(commandDocument, data.name, data.scope))
    setCommandConfigMode(mode)
  }

  function changeDocument(content: string) {
    setCommandDocument(content)
    updateCommandForm((current) => commandFormFromDocument(content, current.name || data.name, current.installTarget))
  }

  function submit() {
    const content = commandConfigMode === "document" ? commandDocument : commandFormToMarkdown(commandForm)
    const nextForm = commandConfigMode === "document" ? commandFormFromDocument(content, data.name, data.scope) : commandForm
    updateResourceNode(node, onUpdateNode, {
      name: nextForm.name.trim() || data.name,
      scope: nextForm.installTarget,
      content,
    })
  }

  return (
    <CommandConfigPanel
      commandConfigMode={commandConfigMode}
      commandDocument={commandDocument}
      commandEditMode="edit"
      commandForm={commandForm}
      availableModels={availableModels}
      modelOptions={modelOptions}
      variantOptions={variantOptions}
      workflowAgentLinked
      onCommandConfigModeChange={changeMode}
      onCommandDocumentChange={changeDocument}
      onCommandFormChange={updateCommandForm}
      onSubmitCommandConfig={submit}
    />
  )
}

function WorkflowPluginConfigPanel({ node, onClose, onUpdateNode, project }: Pick<WorkflowResourceConfigPanelProps, "node" | "onClose" | "onUpdateNode" | "project">) {
  const data = resourceData(node)
  const [pluginForm, setPluginForm] = useState<PluginForm>(() => pluginFormFromNode(data))
  const [installResult, setInstallResult] = useState<InstallResult | null>(null)

  function submit() {
    if (pluginForm.method === "local" && !pluginForm.customPluginEnabled) {
      setInstallResult({ status: "error", message: "請先勾選「是否開啟自訂 Plugin」才能儲存自訂 Plugin。" })
      return
    }
    const name = pluginForm.name.trim().split(/[\s,]+/).filter(Boolean)[0] || data.name
    const nextData: ResourceNodeData = {
      ...data,
      name,
      scope: pluginForm.installTarget,
    }
    if (pluginForm.method === "local") {
      nextData.content = pluginForm.code
      delete nextData.config
    } else {
      nextData.config = {
        ...data.config,
        entry: name,
        method: "npm",
        description: pluginForm.description,
        useInProject: pluginForm.useInProject,
      }
    }
    onUpdateNode({ ...node, data: nextData } as WorkflowNode)
  }

  return (
    <AddPluginForm
      currentProjectName={project}
      editorMode={"edit" satisfies PluginEditorMode}
      form={pluginForm}
      installResult={installResult}
      onCancel={onClose}
      onFormChange={setPluginForm}
      onInstallResultChange={setInstallResult}
      onSubmit={submit}
    />
  )
}

function WorkflowSkillConfigPanel({ node, onClose, onUpdateNode, project }: Pick<WorkflowResourceConfigPanelProps, "node" | "onClose" | "onUpdateNode" | "project">) {
  const data = resourceData(node)
  const [skillName, setSkillName] = useState(data.name)
  const [skillForm, setSkillForm] = useState<SkillForm>(() => skillFormFromNode(data))
  const [installResult, setInstallResult] = useState<InstallResult | null>(null)

  function submit() {
    const name = skillName.trim() || data.name.trim() || "new-skill"
    const description = skillForm.description.trim() || `Managed workflow skill: ${name}`
    updateResourceNode(node, onUpdateNode, {
      name,
      scope: skillForm.installTarget,
      content: data.content?.trim() || `---\nname: ${name}\ndescription: ${description}\n---\n\n# Instructions\n\nDescribe the skill instructions here.\n`,
      config: {
        ...data.config,
        method: skillForm.method,
        sources: skillForm.sources,
        archiveName: skillForm.archiveName,
        description: skillForm.description,
        license: skillForm.license,
        compatibility: skillForm.compatibility,
        useInProject: skillForm.useInProject,
      },
    })
    setInstallResult({ status: "success", message: "Workflow Skill draft 已保存；發布時才會套用來源或內容。" })
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-1.5 px-5 pt-5 text-xs text-muted-foreground">
        Skill 名稱
        <Input aria-label="Skill 名稱" onChange={(event) => setSkillName(event.target.value)} value={skillName} />
      </label>
      <AddSkillForm
        currentProjectName={project}
        form={skillForm}
        installResult={installResult}
        onCancel={onClose}
        onFormChange={setSkillForm}
        onInstallResultChange={setInstallResult}
        onSubmit={submit}
      />
    </div>
  )
}

function WorkflowMcpConfigPanel({ node, onClose, onUpdateNode, project }: Pick<WorkflowResourceConfigPanelProps, "node" | "onClose" | "onUpdateNode" | "project">) {
  const data = resourceData(node)
  const [scope, setScope] = useState(data.scope)
  const [form, setForm] = useState<McpForm>(() => mcpFormFromNode(data))
  const [configMode, setConfigMode] = useState<McpConfigMode>("interface")
  const [configDocument, setConfigDocument] = useState(() => mcpDocumentFromForm(form))
  const [testResult, setTestResult] = useState<OpenCodeMcpTestResult | null>(null)
  const [testLoading, setTestLoading] = useState(false)

  function updateForm(updates: Partial<McpForm>) {
    setForm((current) => ({ ...current, ...updates }))
    setTestResult(null)
  }

  function changeMode(mode: McpConfigMode) {
    if (mode === configMode) return
    if (mode === "document") setConfigDocument(mcpDocumentFromForm(form))
    else {
      const parsed = mcpEntryFromDocument(configDocument, form.name)
      if (parsed) setForm(mcpFormFromConfig(parsed.name, parsed.config))
    }
    setConfigMode(mode)
  }

  function changeDocument(content: string) {
    setConfigDocument(content)
    const parsed = mcpEntryFromDocument(content, form.name)
    if (!parsed) return
    const nextForm = mcpFormFromConfig(parsed.name, parsed.config)
    setForm(nextForm)
    updateResourceNode(node, onUpdateNode, { name: parsed.name, scope, config: parsed.config })
  }

  function submit() {
    const config = mcpConfigFromForm(form)
    updateResourceNode(node, onUpdateNode, { name: form.name.trim() || data.name, scope, config })
  }

  async function testConnection() {
    setTestLoading(true)
    setTestResult(null)
    try {
      const result = await testOpenCodeMcpConnection(scope, mcpConfigFromForm(form), scope === "project" ? project : undefined)
      setTestResult(result)
    } catch (error) {
      setTestResult({ ok: false, type: form.type, message: getApiErrorMessage(error) })
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <McpEditor
      configDocument={configDocument}
      configLoading={false}
      configMode={configMode}
      currentProjectName={project}
      form={form}
      onCancel={onClose}
      onChange={updateForm}
      onConfigModeChange={changeMode}
      onDocumentChange={changeDocument}
      onRefresh={() => setConfigDocument(mcpDocumentFromForm(form))}
      onScopeChange={setScope}
      onSubmit={submit}
      onTestConnection={testConnection}
      scope={scope}
      testLoading={testLoading}
      testResult={testResult}
      view="edit"
    />
  )
}

function resourceData(node: WorkflowNode) {
  return node.data as ResourceNodeData
}

function updateResourceNode(node: WorkflowNode, onUpdateNode: (node: WorkflowNode) => void, changes: Partial<ResourceNodeData>) {
  const data = resourceData(node)
  onUpdateNode({ ...node, data: { ...data, ...changes } } as WorkflowNode)
}

function toolFormFromNode(data: ResourceNodeData): ToolForm {
  const config = data.config ?? {}
  return {
    ...emptyToolForm,
    name: data.name,
    description: stringValue(config.description),
    category: stringValue(config.category) || "Custom",
    installTarget: data.scope,
    entry: stringValue(config.entry) || toolEntry(data.name, data.scope),
    runtime: stringValue(config.runtime) === "js-ts" ? "js-ts" : "js-ts",
    code: data.content ?? emptyToolForm.code,
    testInput: stringValue(config.testInput) || emptyToolForm.testInput,
  }
}

function commandFormFromDocument(content: string, fallbackName: string, scope: ResourceNodeData["scope"]): CommandForm {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/)
  const values: Record<string, string> = {}
  for (const line of match?.[1]?.split(/\r?\n/) ?? []) {
    const separator = line.indexOf(":")
    if (separator < 0) continue
    values[line.slice(0, separator).trim()] = unquote(line.slice(separator + 1).trim())
  }
  return {
    ...emptyCommandForm,
    name: values.name || fallbackName,
    installTarget: scope,
    description: values.description ?? "",
    agent: values.agent ?? "",
    model: values.model ?? "",
    variant: values.variant ?? "",
    subtask: values.subtask === "true",
    template: (match?.[2] ?? content).trim() || emptyCommandForm.template,
  }
}

function commandFormToMarkdown(form: CommandForm) {
  const metadata = [
    form.description.trim() ? `description: ${form.description.trim()}` : "",
    form.agent.trim() ? `agent: ${form.agent.trim()}` : "",
    form.model.trim() ? `model: ${form.model.trim()}` : "",
    form.variant?.trim() ? `variant: ${form.variant.trim()}` : "",
    form.subtask ? "subtask: true" : "",
  ].filter(Boolean)
  return `---\n${metadata.join("\n")}\n---\n${form.template.trim()}\n`
}

function pluginFormFromNode(data: ResourceNodeData): PluginForm {
  const config = data.config ?? {}
  const entry = stringValue(config.entry)
  const method = stringValue(config.method) === "npm" || (entry && !entry.includes("/plugins/")) ? "npm" : "local"
  return {
    ...emptyPluginForm,
    method,
    name: method === "npm" && entry ? entry : data.name,
    description: stringValue(config.description),
    entry,
    installTarget: data.scope,
    code: data.content ?? emptyPluginForm.code,
    customPluginEnabled: method === "local",
    useInProject: config.useInProject !== false,
  }
}

function skillFormFromNode(data: ResourceNodeData): SkillForm {
  const config = data.config ?? {}
  return {
    ...emptySkillForm,
    method: stringValue(config.method) === "upload" ? "upload" : "remote",
    installTarget: data.scope,
    sources: stringValue(config.sources),
    archiveName: stringValue(config.archiveName),
    description: stringValue(config.description),
    license: stringValue(config.license),
    compatibility: stringValue(config.compatibility) || "opencode",
    useInProject: config.useInProject !== false,
  }
}

function mcpFormFromNode(data: ResourceNodeData) {
  return mcpFormFromConfig(data.name, data.config ?? {})
}

function mcpFormFromConfig(name: string, config: Record<string, unknown>): McpForm {
  const type = config.type === "local" ? "local" : "remote"
  return {
    ...emptyMcpForm,
    name,
    type,
    url: stringValue(config.url),
    command: stringArray(config.command).join("\n"),
    cwd: stringValue(config.cwd),
    environment: recordRows(config.environment),
    headers: recordRows(config.headers),
    oauth: oauthForm(config.oauth),
    enabled: config.enabled !== false,
    timeout: typeof config.timeout === "number" ? String(config.timeout) : stringValue(config.timeout),
  }
}

function mcpConfigFromForm(form: McpForm): Record<string, unknown> {
  const config: Record<string, unknown> = { type: form.type, enabled: form.enabled }
  if (form.type === "remote") {
    config.url = form.url.trim()
    const headers = rowsRecord(form.headers)
    if (Object.keys(headers).length > 0) config.headers = headers
    if (form.oauth.disabled) config.oauth = false
    else {
      const oauth = Object.fromEntries(Object.entries({ clientId: form.oauth.clientId, clientSecret: form.oauth.clientSecret, scope: form.oauth.scope }).filter(([, value]) => value.trim()))
      if (Object.keys(oauth).length > 0) config.oauth = oauth
    }
  } else {
    config.command = form.command.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
    const environment = rowsRecord(form.environment)
    if (Object.keys(environment).length > 0) config.environment = environment
  }
  if (form.cwd.trim()) config.cwd = form.cwd.trim()
  if (form.timeout.trim()) config.timeout = Number(form.timeout)
  return config
}

function mcpDocumentFromForm(form: McpForm) {
  return `${JSON.stringify({ mcp: { [form.name || "new-mcp"]: mcpConfigFromForm(form) } }, null, 2)}\n`
}

function mcpEntryFromDocument(content: string, fallbackName: string): { name: string; config: Record<string, unknown> } | null {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>
    const mcp = isRecord(parsed.mcp) ? parsed.mcp : parsed
    const current = isRecord(mcp[fallbackName])
      ? ([fallbackName, mcp[fallbackName]] as const)
      : Object.entries(mcp).find(([, value]) => isRecord(value))
    if (!current || !isRecord(current[1])) return null
    return { name: current[0], config: current[1] }
  } catch {
    return null
  }
}

function recordRows(value: unknown) {
  if (!isRecord(value)) return [{ key: "", value: "" }]
  const rows = Object.entries(value).flatMap(([key, item]) => typeof item === "string" ? [{ key, value: item }] : [])
  return rows.length > 0 ? rows : [{ key: "", value: "" }]
}

function rowsRecord(rows: Array<{ key: string; value: string }>) {
  return Object.fromEntries(rows.map(({ key, value }) => [key.trim(), value]).filter(([key]) => key))
}

function oauthForm(value: unknown) {
  if (value === false) return { clientId: "", clientSecret: "", scope: "", disabled: true }
  return {
    clientId: isRecord(value) ? stringValue(value.clientId) : "",
    clientSecret: isRecord(value) ? stringValue(value.clientSecret) : "",
    scope: isRecord(value) ? stringValue(value.scope) : "",
    disabled: false,
  }
}

function toolEntry(name: string, scope: ResourceNodeData["scope"]) {
  return scope === "global" ? `~/.config/opencode/tools/${name}.ts` : `./.opencode/tools/${name}.ts`
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function unquote(value: string) {
  return value.replace(/^['"]|['"]$/g, "")
}
