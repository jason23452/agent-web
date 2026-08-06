import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { CheckIcon, CircleDashedIcon, SparklesIcon } from "lucide-react"
import { getApiErrorMessage } from "@/shared/api"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/shared/components/ui/dialog"
import { Textarea } from "@/shared/components/ui/textarea"
import { runWorkflowUpdater } from "@/features/workflows/api/workflowTestChat"
import { validateWorkflow } from "@/features/workflows/api/workflows"
import { WORKFLOW_V3_SCHEMA_VERSION, type ResourceNodeData, type WorkflowEdge, type WorkflowNode, type WorkflowV1 } from "@/features/workflows/types"
import { issueMessage, scopeLabel } from "@/features/workflows/workflowUtils"

type WorkflowUpdaterError = {
  code: string
  message: string
  details: string[]
}

type WorkflowUpdaterResult =
  | { kind: "error"; error: WorkflowUpdaterError }
  | { kind: "workflow"; workflow: WorkflowV1 }

const PROTECTED_METADATA_KEYS = [
  "system",
  "deletable",
  "role",
  "packageFormat",
  "packageArtifact",
  "workflowAsset",
] as const

export function WorkflowUpdaterDialog({ onApplyWorkflow, onOpenChange, open, project, workflow, workspace }: {
  onApplyWorkflow: (workflow: WorkflowV1, baseline: WorkflowV1) => boolean
  onOpenChange: (open: boolean) => void
  open: boolean
  project: string
  workflow: WorkflowV1
  workspace: string
}) {
  const [request, setRequest] = useState("")
  const [rawResult, setRawResult] = useState("")
  const [candidateText, setCandidateText] = useState("")
  const [candidate, setCandidate] = useState<WorkflowV1 | null>(null)
  const [candidateBaseline, setCandidateBaseline] = useState<WorkflowV1 | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const workflowRef = useRef(workflow)
  const operationBusy = busy || applying

  useLayoutEffect(() => {
    workflowRef.current = workflow
  }, [workflow])

  useEffect(() => {
    if (!open) controllerRef.current?.abort()
  }, [open])

  useEffect(() => () => controllerRef.current?.abort(), [])

  async function updateWorkflow() {
    if (!request.trim() || operationBusy) return
    if (workflow.schemaVersion !== WORKFLOW_V3_SCHEMA_VERSION) {
      setError("AI 更新僅支援完整 Workflow V3；請先升級目前 Workflow。")
      return
    }
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setBusy(true)
    setError(null)
    setWarnings([])
    setRawResult("")
    setCandidateText("")
    setCandidate(null)
    setCandidateBaseline(null)
    const baseline = workflow

    try {
      const response = await runWorkflowUpdater({ project, request, workflow: baseline }, controller.signal, workspace)
      if (controller.signal.aborted) return
      setRawResult(response.text)

      if (!jsonEqual(workflowRef.current, baseline)) {
        setError("目前 Workflow 已在更新期間變更；已捨棄過期候選，請重新執行。")
        return
      }

      const parsed = parseWorkflowUpdaterResult(response.text)
      if (!parsed) {
        setError("Agent 回應必須是可直接解析的完整 Workflow V3 JSON 或 error object。")
        return
      }
      if (parsed.kind === "error") {
        setError(formatUpdaterError(parsed.error))
        return
      }

      const prepared = prepareWorkflowCandidate(baseline, parsed.workflow)
      setCandidateText(JSON.stringify(prepared, null, 2))
      const validation = await validateWorkflow(prepared, { signal: controller.signal, workspace })
      if (controller.signal.aborted) return
      if (!jsonEqual(workflowRef.current, baseline)) {
        setError("目前 Workflow 已在驗證期間變更；已捨棄過期候選，請重新執行。")
        return
      }
      if (!validation.valid || !validation.workflow) {
        setError(validation.errors.map(issueMessage).join("；") || "候選 Workflow 未通過後端驗證。")
        setWarnings(validation.warnings.map(issueMessage))
        return
      }

      const validated = prepareWorkflowCandidate(baseline, validation.workflow)
      setCandidate(validated)
      setCandidateBaseline(baseline)
      setCandidateText(JSON.stringify(validated, null, 2))
      setWarnings(validation.warnings.map(issueMessage))
    } catch (requestError) {
      if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
        setBusy(false)
      }
    }
  }

  async function applyWorkflow() {
    if (!candidateText.trim() || !candidateBaseline || operationBusy) return
    if (!jsonEqual(workflowRef.current, candidateBaseline)) {
      setCandidate(null)
      setCandidateBaseline(null)
      setError("目前 Workflow 已在候選產生後變更；請重新執行 AI 更新。")
      return
    }
    const parsed = parseWorkflowUpdaterResult(candidateText)
    if (!parsed) {
      setCandidate(null)
      setError("候選內容不是完整 Workflow V3 JSON，無法套用。")
      return
    }
    if (parsed.kind === "error") {
      setCandidate(null)
      setError(formatUpdaterError(parsed.error))
      return
    }

    let prepared: WorkflowV1
    try {
      prepared = prepareWorkflowCandidate(candidateBaseline, parsed.workflow)
    } catch (candidateError) {
      setCandidate(null)
      setError(getApiErrorMessage(candidateError))
      return
    }

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setApplying(true)
    setError(null)
    setWarnings([])
    setCandidateText(JSON.stringify(prepared, null, 2))
    try {
      const validation = await validateWorkflow(prepared, { signal: controller.signal, workspace })
      if (controller.signal.aborted) return
      if (!jsonEqual(workflowRef.current, candidateBaseline)) {
        setCandidate(null)
        setCandidateBaseline(null)
        setError("目前 Workflow 已在重新驗證期間變更；候選未套用。")
        return
      }
      if (!validation.valid || !validation.workflow) {
        setCandidate(null)
        setError(validation.errors.map(issueMessage).join("；") || "候選 Workflow 未通過後端驗證，尚未套用。")
        setWarnings(validation.warnings.map(issueMessage))
        return
      }

      const validated = prepareWorkflowCandidate(candidateBaseline, validation.workflow)
      setCandidate(validated)
      setCandidateText(JSON.stringify(validated, null, 2))
      setWarnings(validation.warnings.map(issueMessage))
      if (!onApplyWorkflow(validated, candidateBaseline)) {
        setCandidate(null)
        setCandidateBaseline(null)
        setError("目前 Workflow 已變更或正在處理其他操作；候選未套用。")
        return
      }
      onOpenChange(false)
    } catch (requestError) {
      if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
        setApplying(false)
      }
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="h-[min(840px,calc(100dvh-2rem))] max-w-4xl" closeProps={{ "aria-label": "關閉 Workflow Updater" }}>
        <DialogHeader className="border-border border-b">
          <div className="flex items-start gap-3 pr-12">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary"><SparklesIcon aria-hidden="true" className="size-5" /></span>
            <div className="min-w-0">
              <DialogTitle>AI 更新目前 Workflow</DialogTitle>
              <DialogDescription className="mt-1">由獨立 system workflow 產生完整 V3 候選內容；只會替換目前草稿，不會建立、儲存或發布 Workflow。</DialogDescription>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            <Badge variant="info">/workflow-updater</Badge>
            <Badge variant="secondary">{scopeLabel(workflow.scope)} · {workflow.id}</Badge>
            <Badge variant="secondary">Project · {project}</Badge>
          </div>
        </DialogHeader>
        <DialogPanel className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6" scrollFade={false}>
          <div className="mx-auto grid w-full max-w-3xl gap-4">
            <label className="grid gap-1.5 text-muted-foreground text-xs">
              更新需求
              <Textarea aria-label="Workflow Updater 使用者需求" className="min-h-28" disabled={operationBusy} onChange={(event) => setRequest(event.target.value)} placeholder="描述要如何修改目前 Workflow；未要求變更的節點與關係應保持不變。" value={request} />
            </label>
            <Button disabled={!request.trim() || operationBusy} loading={busy} onClick={() => void updateWorkflow()}><SparklesIcon aria-hidden="true" />{busy ? "正在產生更新候選..." : "執行 /workflow-updater"}</Button>
            {operationBusy && <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-muted-foreground text-xs" role="status"><CircleDashedIcon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />{applying ? "正在重新驗證候選 Workflow..." : "正在分析目前 Workflow 並產生完整 V3 JSON。"}</div>}
            {error && <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-destructive-foreground text-xs" role="alert">{error}</div>}
            {warnings.length > 0 && <ul className="grid gap-1 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-warning-foreground text-xs">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
            {rawResult && <section className="grid gap-1.5"><h3 className="font-semibold text-sm">Agent 原始回應</h3><pre className="max-h-52 overflow-auto rounded-lg border border-border bg-muted/30 p-3 whitespace-pre-wrap break-words font-mono text-[11px] leading-5">{rawResult}</pre></section>}
            {candidateText && <section className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-sm">候選 Workflow</h3><p className="mt-0.5 text-muted-foreground text-xs">會保留目前 Workflow 識別、scope、時間、受保護 metadata 與 retained graph IDs；套用後仍可在 Builder 手動修改 managed resources。</p></div><Badge variant={candidate ? "success" : "warning"}>{candidate ? <><CheckIcon aria-hidden="true" />後端驗證通過</> : "待重新驗證"}</Badge></div>{candidate && <p className="text-muted-foreground text-xs">{candidate.nodes.length} nodes · {candidate.edges.length} edges · {candidate.scope}{candidate.project ? ` · ${candidate.project}` : ""}</p>}<Textarea aria-label="Workflow 更新候選 JSON" className="min-h-80 font-mono text-xs" readOnly value={candidateText} /></section>}
          </div>
        </DialogPanel>
        <DialogFooter className="border-border border-t bg-muted/40 px-4 py-2 sm:px-6"><div className="flex w-full items-center justify-end gap-2"><Button onClick={() => onOpenChange(false)} type="button" variant="outline">取消</Button><Button disabled={!candidateText.trim() || !candidateBaseline || operationBusy} loading={applying} onClick={() => void applyWorkflow()}><CheckIcon aria-hidden="true" />確認套用更新</Button></div></DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}

function parseWorkflowUpdaterResult(text: string): WorkflowUpdaterResult | null {
  const candidate = text.trim()
  if (!candidate) return null
  try {
    const parsed: unknown = JSON.parse(candidate)
    if (!isRecord(parsed)) return null
    if (Object.keys(parsed).length === 1 && isRecord(parsed.error)) {
      const error = parsed.error
      const exactErrorKeys = Object.keys(error).every((key) => key === "code" || key === "message" || key === "details")
      if (!exactErrorKeys || typeof error.code !== "string" || !error.code.trim() || typeof error.message !== "string" || !error.message.trim()) return null
      if (!Array.isArray(error.details) || !error.details.every((detail): detail is string => typeof detail === "string")) return null
      return { kind: "error", error: { code: error.code, message: error.message, details: error.details } }
    }
    return isCompleteWorkflowV3(parsed) ? { kind: "workflow", workflow: parsed } : null
  } catch {
    return null
  }
}

function isCompleteWorkflowV3(value: Record<string, unknown>): value is WorkflowV1 {
    if (value.schemaVersion !== WORKFLOW_V3_SCHEMA_VERSION) return false
  if (typeof value.id !== "string" || typeof value.name !== "string" || typeof value.createdAt !== "string" || typeof value.updatedAt !== "string") return false
  if (value.scope !== "project" && value.scope !== "global") return false
  if (value.project !== undefined && typeof value.project !== "string") return false
  if (value.scope === "project" && typeof value.project !== "string") return false
  if (value.description !== undefined && typeof value.description !== "string") return false
  if (value.variables !== undefined && !isRecord(value.variables)) return false
  if (value.metadata !== undefined && !isRecord(value.metadata)) return false
  if (!Array.isArray(value.nodes) || !value.nodes.every(isCompleteWorkflowNode)) return false
  if (!Array.isArray(value.edges) || !value.edges.every(isCompleteWorkflowEdge)) return false
  return true
}

function isCompleteWorkflowNode(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== "string" || !RESOURCE_NODE_TYPES.has(String(value.type))) return false
  if (!isRecord(value.position) || typeof value.position.x !== "number" || typeof value.position.y !== "number") return false
  if (!isRecord(value.data)) return false
  if (value.data.mode !== "managed" && value.data.mode !== "reference") return false
  if (typeof value.data.name !== "string" || (value.data.scope !== "project" && value.data.scope !== "global")) return false
  if (value.data.content !== undefined && typeof value.data.content !== "string") return false
  if (value.data.config !== undefined && !isRecord(value.data.config)) return false
  return true
}

function isCompleteWorkflowEdge(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (typeof value.id !== "string" || typeof value.source !== "string" || typeof value.target !== "string") return false
  if (value.kind !== "capability" && value.kind !== "primary-link" && value.kind !== "delegation") return false
  return typeof value.sourceHandle === "string" && typeof value.targetHandle === "string"
}

const RESOURCE_NODE_TYPES = new Set([
  "resource.agent",
  "resource.command",
  "resource.skill",
  "resource.tool",
  "resource.mcp",
  "resource.plugin",
])

function prepareWorkflowCandidate(current: WorkflowV1, proposed: WorkflowV1): WorkflowV1 {
  assertWorkflowIdentity(current, proposed)
  assertRetainedGraphIDs(current, proposed)
  assertRetainedReferences(current, proposed)
  const next: WorkflowV1 = {
    ...proposed,
    id: proposed.id,
    scope: proposed.scope,
    createdAt: proposed.createdAt,
    updatedAt: proposed.updatedAt,
  }
  if (proposed.project === undefined) delete next.project
  else next.project = proposed.project

  const metadata = preserveProtectedMetadata(current.metadata, proposed.metadata)
  if (metadata === undefined) delete next.metadata
  else next.metadata = metadata
  return next
}

function assertWorkflowIdentity(current: WorkflowV1, proposed: WorkflowV1): void {
  const fields = ["id", "scope", "createdAt", "updatedAt"] as const
  for (const field of fields) {
    if (proposed[field] !== current[field]) throw new Error(`候選 Workflow 變更了不可修改的 ${field}，已拒絕套用。`)
  }
  if (proposed.project !== current.project) throw new Error("候選 Workflow 變更了不可修改的 project，已拒絕套用。")
  for (const key of PROTECTED_METADATA_KEYS) {
    const currentValue = current.metadata?.[key]
    const proposedValue = proposed.metadata?.[key]
    if (!jsonEqual(proposedValue, currentValue)) {
      throw new Error(`候選 Workflow 變更了受保護 metadata.${key}，已拒絕套用。`)
    }
  }
}

function assertRetainedReferences(current: WorkflowV1, proposed: WorkflowV1): void {
  const proposedByID = new Map(proposed.nodes.map((node) => [node.id, node]))
  for (const node of current.nodes) {
    if (!node.type.startsWith("resource.") || (node.data as ResourceNodeData).mode !== "reference") continue
    const retained = proposedByID.get(node.id)
    if (!retained) throw new Error(`候選 Workflow 刪除了外部 reference node ${node.id}，已拒絕套用。`)
    if (retained.type !== node.type || !jsonEqual(retained.data, node.data)) {
      throw new Error(`候選 Workflow 修改了外部 reference node ${node.id}，已拒絕套用。`)
    }
  }
}

function preserveProtectedMetadata(current: Record<string, unknown> | undefined, proposed: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const metadata = { ...(proposed ?? {}) }
  for (const key of PROTECTED_METADATA_KEYS) {
    if (current && Object.hasOwn(current, key)) metadata[key] = current[key]
    else delete metadata[key]
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined
}

function assertRetainedGraphIDs(current: WorkflowV1, proposed: WorkflowV1): void {
  assertUniqueIDs(proposed.nodes, "node")
  assertUniqueIDs(proposed.edges, "edge")

  const currentNodeIDs = uniqueNodeIdentityMap(current.nodes)
  for (const node of proposed.nodes) {
    const identity = resourceNodeIdentity(node)
    const retainedID = identity ? currentNodeIDs.get(identity) : undefined
    if (retainedID && retainedID !== node.id) {
      throw new Error(`候選 Workflow 變更了 retained node ${retainedID} 的 ID，已拒絕套用。`)
    }
  }

  const currentEdgeIDs = uniqueEdgeIdentityMap(current.edges)
  for (const edge of proposed.edges) {
    const retainedID = currentEdgeIDs.get(edgeIdentity(edge))
    if (retainedID && retainedID !== edge.id) {
      throw new Error(`候選 Workflow 變更了 retained edge ${retainedID} 的 ID，已拒絕套用。`)
    }
  }
}

function uniqueNodeIdentityMap(nodes: WorkflowNode[]): Map<string, string | null> {
  const identities = new Map<string, string | null>()
  for (const node of nodes) {
    const identity = resourceNodeIdentity(node)
    if (!identity) continue
    identities.set(identity, identities.has(identity) ? null : node.id)
  }
  return identities
}

function uniqueEdgeIdentityMap(edges: WorkflowEdge[]): Map<string, string | null> {
  const identities = new Map<string, string | null>()
  for (const edge of edges) {
    const identity = edgeIdentity(edge)
    identities.set(identity, identities.has(identity) ? null : edge.id)
  }
  return identities
}

function resourceNodeIdentity(node: WorkflowNode): string | null {
  if (!node.type.startsWith("resource.")) return null
  const data = node.data as ResourceNodeData
  if (!data.name || (data.scope !== "project" && data.scope !== "global")) return null
  return `${node.type}\0${data.scope}\0${data.name}`
}

function edgeIdentity(edge: WorkflowEdge): string {
  return [edge.kind, edge.source, edge.target, edge.sourceHandle ?? "", edge.targetHandle ?? ""].join("\0")
}

function assertUniqueIDs(items: Array<{ id: string }>, kind: "node" | "edge"): void {
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`候選 Workflow 的 ${kind} ID ${item.id} 重複，已拒絕套用。`)
    ids.add(item.id)
  }
}

function formatUpdaterError(error: WorkflowUpdaterError): string {
  const details = error.details.join("；")
  return `${error.code}：${error.message}${details ? `（${details}）` : ""}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right)
}

function canonicalJson(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (!isRecord(item)) return item
    return Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right)))
  })
}
