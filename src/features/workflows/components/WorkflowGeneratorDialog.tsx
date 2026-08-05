import { useEffect, useRef, useState } from "react"
import { CheckIcon, CircleDashedIcon, SparklesIcon } from "lucide-react"
import { getApiErrorMessage } from "@/shared/api"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/shared/components/ui/dialog"
import { Textarea } from "@/shared/components/ui/textarea"
import { WORKFLOW_GENERATOR_WORKFLOW_ID, runWorkflowSystemCommand } from "@/features/workflows/api/workflowTestChat"
import { validateWorkflow } from "@/features/workflows/api/workflows"
import type { ResourceNodeData, WorkflowV1 } from "@/features/workflows/types"
import { issueMessage } from "@/features/workflows/workflowUtils"

const DEFAULT_REQUEST = "請建立一個可直接驗證與發布的 Workflow V3：只包含一個 Command 與一個 entry primary Agent；只有在職責可明確拆分時才新增 delegated subagent，只有在需求確實需要時才新增 Skill、Tool、Plugin 或 MCP。所有 managed resources 必須有完整內容、採最小權限、不得綁定未確認可用的 model，並定義清楚的輸入、輸出、完成條件與失敗處理。"

export function WorkflowGeneratorDialog({ onCreateWorkflow, onOpenChange, open, project }: {
  onCreateWorkflow: (workflow: WorkflowV1) => Promise<void>
  onOpenChange: (open: boolean) => void
  open: boolean
  project: string
}) {
  const [request, setRequest] = useState(DEFAULT_REQUEST)
  const [result, setResult] = useState("")
  const [generated, setGenerated] = useState<WorkflowV1 | null>(null)
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) controllerRef.current?.abort()
  }, [open])

  useEffect(() => () => controllerRef.current?.abort(), [])

  async function generateWorkflow() {
    if (!request.trim() || busy || creating) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setBusy(true)
    setError(null)
    setResult("")
    setGenerated(null)
    const text = [
      "請根據以下需求產生完整 agent-system.workflow.v3 JSON。",
      `目前 UI project: ${project}`,
      "workflow.scope 必須是 project，workflow.project 必須是目前 UI project；Command 與所有 managed resources 的 scope 也必須是 project。Reference resources 可以保留原本 scope。",
      "只輸出 JSON object，不要輸出說明或 Markdown；nodes 必須使用 resource.command/resource.agent/resource.skill/resource.tool/resource.mcp/resource.plugin，edges 必須使用 kind、sourceHandle、targetHandle，絕對不要使用舊版的 node type command/agent/skill/tool/reference 或 edge type。",
      "",
      request.trim(),
    ].join("\n")
    try {
      const response = await runWorkflowSystemCommand(WORKFLOW_GENERATOR_WORKFLOW_ID, text, controller.signal, project)
      if (controller.signal.aborted) return
      setResult(response.text)
      const parsed = parseWorkflowResult(response.text)
      if (!parsed) {
        setError("Agent 回應不是完整 Workflow JSON。")
        return
      }
       const validation = await validateWorkflow(scopeWorkflowToProject(parsed, project), { signal: controller.signal, workspace: project })
      if (!validation.valid || !validation.workflow) {
        setError(validation.errors.map(issueMessage).join("；") || "生成的 Workflow 未通過驗證。")
        return
      }
      setGenerated(validation.workflow)
    } catch (requestError) {
      if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  async function createWorkflow() {
    if (!generated || creating) return
    setCreating(true)
    setError(null)
    try {
        const validation = await validateWorkflow(scopeWorkflowToProject(generated, project), { workspace: project })
      if (!validation.valid || !validation.workflow) {
        setError(validation.errors.map(issueMessage).join("；") || "Workflow JSON 未通過驗證，尚未建立。")
        return
      }
      await onCreateWorkflow(validation.workflow)
      onOpenChange(false)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="h-[min(820px,calc(100dvh-2rem))] max-w-4xl" closeProps={{ "aria-label": "關閉 Workflow Generator" }}>
          <DialogHeader className="border-border border-b"><div className="flex items-start gap-3 pr-12"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary"><SparklesIcon aria-hidden="true" className="size-5" /></span><div className="min-w-0"><DialogTitle>在目前專案建立 Workflow</DialogTitle><DialogDescription className="mt-1">由 coordinator 驗證並規劃，再委派 generator 產生完整 V3 JSON；Workflow、Command 與 managed resources 都會新增到目前專案。</DialogDescription></div></div><div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]"><Badge variant="info">/workflow-generator</Badge><Badge variant="secondary">Project · {project}</Badge></div></DialogHeader>
        <DialogPanel className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6" scrollFade={false}><div className="mx-auto grid w-full max-w-3xl gap-4"><label className="grid gap-1.5 text-muted-foreground text-xs">使用者需求<Textarea aria-label="Workflow Generator 使用者需求" className="min-h-32" disabled={busy || creating} onChange={(event) => setRequest(event.target.value)} value={request} /></label><Button disabled={!request.trim() || creating} loading={busy} onClick={() => void generateWorkflow()}><SparklesIcon aria-hidden="true" />{busy ? "正在產生 Workflow..." : "執行 /workflow-generator"}</Button>{(busy || creating) && <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-muted-foreground text-xs" role="status"><CircleDashedIcon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />{creating ? "正在建立 Workflow 專案..." : "Coordinator 完成規劃與委派後會產生 JSON。"}</div>}{error && <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-destructive-foreground text-xs" role="alert">{error}</div>}{result && <section className="grid gap-1.5"><h3 className="font-semibold text-sm">Agent 回應</h3><pre className="max-h-56 overflow-auto rounded-lg border border-border bg-muted/30 p-3 whitespace-pre-wrap break-words font-mono text-[11px] leading-5">{result}</pre></section>}{generated && <section className="grid gap-2 rounded-lg border border-success/30 bg-success/8 p-3"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-sm">Workflow JSON 已通過驗證</h3><Badge variant="success"><CheckIcon aria-hidden="true" />{generated.name}</Badge></div><p className="text-muted-foreground text-xs">{generated.nodes.length} nodes · {generated.edges.length} edges · {generated.scope}{generated.project ? ` · ${generated.project}` : ""}</p><Textarea aria-label="生成的 Workflow JSON" className="min-h-72 font-mono text-xs" onChange={(event) => { try { setGenerated(JSON.parse(event.target.value) as WorkflowV1); setError(null) } catch { setError("Workflow JSON 格式無效。") } }} value={JSON.stringify(generated, null, 2)} /></section>}</div></DialogPanel>
        <DialogFooter className="border-border border-t bg-muted/40 px-4 py-2 sm:px-6"><div className="flex w-full items-center justify-end gap-2"><Button onClick={() => onOpenChange(false)} type="button" variant="outline">取消</Button><Button disabled={!generated || busy || creating} loading={creating} onClick={() => void createWorkflow()}><CheckIcon aria-hidden="true" />自動建立 Workflow</Button></div></DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}

function parseWorkflowResult(text: string): WorkflowV1 | null {
  const candidates = [
    ...Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi), (match) => match[1]?.trim() ?? ""),
    text.trim(),
    ...extractJsonObjectCandidates(text),
  ]
  const seen = new Set<string>()

  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue
    seen.add(candidate)
    try {
      const parsed: unknown = JSON.parse(candidate)
      const workflow = normalizeWorkflowShape(parsed)
      if (workflow) return workflow
    } catch {
      // Try the next JSON candidate when the agent surrounds its response with text.
    }
  }

  return null
}

function extractJsonObjectCandidates(text: string): string[] {
  const candidates: string[] = []
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "{") continue
    const candidate = readBalancedJsonObject(text, index)
    if (candidate) candidates.push(candidate)
  }
  return candidates
}

function readBalancedJsonObject(text: string, start: number): string | null {
  let depth = 0
  let escaped = false
  let inString = false

  for (let index = start; index < text.length; index += 1) {
    const character = text[index]
    if (inString) {
      if (escaped) escaped = false
      else if (character === "\\") escaped = true
      else if (character === '"') inString = false
      continue
    }
    if (character === '"') {
      inString = true
      continue
    }
    if (character === "{") depth += 1
    if (character === "}") {
      depth -= 1
      if (depth === 0) return text.slice(start, index + 1).trim()
    }
  }

  return null
}

function normalizeWorkflowShape(value: unknown): WorkflowV1 | null {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) return null

  const rawNodes = value.nodes.filter(isRecord)
  if (rawNodes.length !== value.nodes.length) return null
  const rawEdges = value.edges.filter(isRecord)
  if (rawEdges.length !== value.edges.length) return null
  let nodes: Array<{ id: string; type: `resource.${string}`; position: { x: number; y: number }; data: Record<string, unknown> }> = []

  for (const rawNode of rawNodes) {
    const id = stringValue(rawNode.id)
    const rawType = stringValue(rawNode.type)
    const type = normalizeResourceNodeType(rawType)
    if (!id || !rawType) return null
    if (!type) {
      if (rawType === "reference" || rawType === "resource.reference") continue
      return null
    }

    const data = normalizeResourceNodeData(rawNode.data, type)
    if (!data) return null
    const position = isRecord(rawNode.position)
      && typeof rawNode.position.x === "number"
      && typeof rawNode.position.y === "number"
      ? { x: rawNode.position.x, y: rawNode.position.y }
      : { x: 0, y: 0 }
    nodes.push({ id, type, position, data })
  }

  const nodeIDs = new Set(nodes.map((node) => node.id))
  const edges: WorkflowV1["edges"] = []
  const edgeIDs = new Set<string>()
  for (const [index, rawEdge] of rawEdges.entries()) {
    let source = stringValue(rawEdge.source)
    let target = stringValue(rawEdge.target)
    if (!source || !target || !nodeIDs.has(source) || !nodeIDs.has(target)) continue
    const rawKind = stringValue(rawEdge.kind) || stringValue(rawEdge.type)
    if (rawKind !== "capability" && rawKind !== "delegation" && rawKind !== "primary-link") return null
    const initialSourceNode = nodes.find((node) => node.id === source)
    const initialTargetNode = nodes.find((node) => node.id === target)
    if (rawKind === "capability" && initialSourceNode?.type === "resource.agent" && isCapabilityResourceNodeType(initialTargetNode?.type)) {
      [source, target] = [target, source]
    }
    const sourceNode = nodes.find((node) => node.id === source)
    const targetNode = nodes.find((node) => node.id === target)
    if (!sourceNode || !targetNode) continue
    const edgeID = uniqueEdgeID(stringValue(rawEdge.id) || `${rawKind}-${source}-${target}-${index}`, edgeIDs)
    const sourceHandle = rawKind === "delegation" || rawKind === "primary-link" ? "delegation" : "capability"
    const targetHandle = rawKind === "delegation" || rawKind === "primary-link" || (sourceNode.type === "resource.command" && targetNode.type === "resource.agent")
      ? "agent"
      : "capability"
    edges.push({ id: edgeID, source, target, kind: rawKind, sourceHandle, targetHandle })
  }

  nodes.sort((left, right) => Number(right.type === "resource.command") - Number(left.type === "resource.command"))
  const commandNode = nodes.find((node) => node.type === "resource.command")
  const entryAgentID = edges.find((edge) => edge.kind === "capability"
    && edge.source === commandNode?.id
    && edge.targetHandle === "agent"
    && nodes.find((node) => node.id === edge.target)?.type === "resource.agent")?.target
  const entryAgent = nodes.find((node) => node.id === entryAgentID && node.type === "resource.agent")
  const delegatedAgentIDs = new Set(edges.filter((edge) => edge.kind === "delegation").map((edge) => edge.target))
  nodes = nodes.map((node) => {
    if (node.type === "resource.command" && node.data.mode === "managed") {
      return {
        ...node,
        data: {
          ...node.data,
          content: normalizeCommandContent(stringValue(node.data.content), stringValue(entryAgent?.data.name) || undefined),
        },
      }
    }
    if (node.type === "resource.agent" && node.data.mode === "managed") {
      return {
        ...node,
        data: {
          ...node.data,
          content: normalizeAgentContent(stringValue(node.data.content), stringValue(node.data.name), delegatedAgentIDs.has(node.id) ? "subagent" : "primary"),
        },
      }
    }
    return node
  })
  const normalized: Record<string, unknown> = {
    schemaVersion: "agent-system.workflow.v3",
    id: stringValue(value.id) || "generated-workflow",
    name: stringValue(value.name) || "Generated Workflow",
    scope: value.scope === "global" ? "global" : "project",
    nodes,
    edges,
    createdAt: stringValue(value.createdAt) || new Date().toISOString(),
    updatedAt: stringValue(value.updatedAt) || new Date().toISOString(),
  }
  if (typeof value.description === "string") normalized.description = value.description
  if (typeof value.project === "string") normalized.project = value.project
  if (isRecord(value.variables)) normalized.variables = value.variables
  if (isRecord(value.metadata)) normalized.metadata = value.metadata
  return normalized as WorkflowV1
}

function normalizeResourceNodeType(type: string): `resource.${string}` | null {
  if (["resource.agent", "resource.command", "resource.skill", "resource.tool", "resource.mcp", "resource.plugin"].includes(type)) {
    return type as `resource.${string}`
  }
  const legacyType: Record<string, `resource.${string}`> = {
    agent: "resource.agent",
    command: "resource.command",
    skill: "resource.skill",
    tool: "resource.tool",
    mcp: "resource.mcp",
    plugin: "resource.plugin",
  }
  return legacyType[type] ?? null
}

function isCapabilityResourceNodeType(type: string | undefined): boolean {
  return type === "resource.skill" || type === "resource.tool" || type === "resource.mcp" || type === "resource.plugin"
}

function normalizeResourceNodeData(value: unknown, type: `resource.${string}`): Record<string, unknown> | null {
  if (!isRecord(value)) return null
  const mode = value.mode === "reference" || value.mode === "managed"
    ? value.mode
    : type === "resource.agent" && (value.mode === "primary" || value.mode === "subagent")
      ? "managed"
      : null
  const name = stringValue(value.name)
  const scope = value.scope === "global" || value.scope === "project" ? value.scope : null
  if (!mode || !name || !scope) return null
  const data: Record<string, unknown> = { mode, name, scope }
  if (mode === "reference") return data
  if (type === "resource.mcp") {
    if (isRecord(value.config)) data.config = value.config
    return data
  }
  if (type === "resource.plugin" && typeof value.content !== "string" && isRecord(value.config)) {
    data.config = value.config
    return data
  }
  if (typeof value.content === "string") data.content = type === "resource.skill" ? normalizeSkillContent(value.content, name) : value.content
  return data
}

function normalizeCommandContent(content: string, agentName?: string): string {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/)
  const frontmatter = match?.[1]?.split(/\r?\n/) ?? []
  const body = match ? content.slice(match[0].length).trim() : content.trim()
  setFrontmatterValue(frontmatter, "description", "Generated managed workflow command")
  if (agentName) setFrontmatterValue(frontmatter, "agent", agentName, true)
  const nextBody = body.includes("$ARGUMENTS") ? body : `${body}${body ? "\n\n" : ""}$ARGUMENTS`
  return `---\n${frontmatter.filter(Boolean).join("\n")}\n---\n${nextBody}`
}

function normalizeAgentContent(content: string, name: string, mode: "primary" | "subagent"): string {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/)
  const frontmatter = match?.[1]?.split(/\r?\n/) ?? []
  const body = match ? content.slice(match[0].length).trim() : content.trim()
  setFrontmatterValue(frontmatter, "name", name, true)
  setFrontmatterValue(frontmatter, "description", "Generated managed workflow agent")
  setFrontmatterValue(frontmatter, "mode", mode, true)
  return `---\n${frontmatter.filter(Boolean).join("\n")}\n---\n${body || "Follow the Workflow contract and return the requested result."}`
}

function setFrontmatterValue(lines: string[], key: string, value: string, force = false): void {
  const index = lines.findIndex((line) => line.startsWith(`${key}:`))
  if (index < 0) {
    lines.unshift(`${key}: ${value}`)
    return
  }
  if (force || !lines[index]?.slice(key.length + 1).trim()) lines[index] = `${key}: ${value}`
}

function normalizeSkillContent(content: string, name: string): string {
  if (!content.trim()) return content
  const frontmatter = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/)
  if (!frontmatter) return `---\nname: ${name}\ndescription: Generated managed skill\n---\n\n${content.trim()}`
  let next = frontmatter[1] ?? ""
  next = /^name:\s*[^\r\n]*$/m.test(next) ? next.replace(/^name:\s*[^\r\n]*$/m, `name: ${name}`) : `name: ${name}\n${next}`
  if (!/^description:\s*[^\r\n]+$/m.test(next)) next = `description: Generated managed skill\n${next}`
  return content.replace(frontmatter[1] ?? "", next)
}

function uniqueEdgeID(candidate: string, existing: Set<string>): string {
  let id = candidate
  let suffix = 2
  while (existing.has(id)) id = `${candidate}-${suffix++}`
  existing.add(id)
  return id
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function scopeWorkflowToProject(workflow: WorkflowV1, project: string): WorkflowV1 {
  return {
    ...workflow,
    scope: "project",
    project,
    nodes: workflow.nodes.map((node) => {
      if (!node.type.startsWith("resource.")) return node
      const data = node.data as ResourceNodeData
      return data.mode === "managed" ? { ...node, data: { ...data, scope: "project" } } as WorkflowNodeWithProjectResource : node
    }),
  }
}

type WorkflowNodeWithProjectResource = Extract<WorkflowV1["nodes"][number], { type: `resource.${string}` }>
