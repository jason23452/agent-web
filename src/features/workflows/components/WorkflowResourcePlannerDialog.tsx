import { useEffect, useRef, useState } from "react"
import { CheckIcon, CircleDashedIcon, SparklesIcon } from "lucide-react"
import { getApiErrorMessage } from "@/shared/api"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/shared/components/ui/dialog"
import { Textarea } from "@/shared/components/ui/textarea"
import { getResourceWriterWorkflowID, runWorkflowSystemCommand } from "@/features/workflows/api/workflowTestChat"
import type { ResourceNodeData, WorkflowNode, WorkflowV1 } from "@/features/workflows/types"
import { getWorkflowNodeTitle } from "@/features/workflows/workflowUtils"

export type PlannedResource = {
  name?: string
  scope?: "global" | "project"
  content?: string
  config?: Record<string, unknown>
}

const DEFAULT_REQUEST = "請依 target node 類型與 Workflow graph 產出可直接套用的單一資源。預設保留目前 name 與 scope，內容必須符合對應 registry 契約，只使用直接連接的能力並採最小權限；不得加入未確認的 model、依賴或秘密。請同時檢查 frontmatter、輸入輸出、完成條件、安全限制與可執行驗證，資訊不足時明確回傳 validation.valid=false。"

export function WorkflowResourcePlannerDialog({ onApplyResource, onOpenChange, open, targetNode, workflow, workspace }: {
  onApplyResource: (resource: PlannedResource) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  targetNode: WorkflowNode | null
  workflow: WorkflowV1
  workspace: string
}) {
  const [request, setRequest] = useState(DEFAULT_REQUEST)
  const [result, setResult] = useState("")
  const [plannedResource, setPlannedResource] = useState<PlannedResource | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const resourceType = targetNode?.type.replace("resource.", "") ?? "resource"
  const workflowID = getResourceWriterWorkflowID(resourceType)
  const workflowCommand = workflowID?.replace(/^workflow-/, "") ?? "resource-writer"

  useEffect(() => {
    if (!open) controllerRef.current?.abort()
  }, [open])

  useEffect(() => () => controllerRef.current?.abort(), [])

  async function planResource() {
    if (!targetNode || !request.trim() || busy) return
    if (!workflowID) {
      setError(`目前沒有 ${resourceType} 專用的 system workflow。`)
      return
    }
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setBusy(true)
    setError(null)
    setResult("")
    setPlannedResource(null)
    const text = [
      `resourceType: ${resourceType}`,
      `Target node ID: ${targetNode.id}`,
      "使用者需求：",
      request.trim(),
      "",
      "完整 target workflow JSON：",
      JSON.stringify(workflow, null, 2),
    ].join("\n")
    try {
      const response = await runWorkflowSystemCommand(workflowID, text, controller.signal, workspace)
      if (controller.signal.aborted) return
      setResult(response.text)
      const parsed = parsePlannerResult(response.text)
      if (!parsed) setError("Agent 回應不是可套用的資源 JSON，請檢查完整回應。")
      setPlannedResource(parsed)
    } catch (requestError) {
      if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  function applyResource() {
    if (!plannedResource) return
    onApplyResource(plannedResource)
    onOpenChange(false)
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="h-[min(760px,calc(100dvh-2rem))] max-w-4xl" closeProps={{ "aria-label": "關閉 Resource Planner" }}>
        <DialogHeader className="border-border border-b">
           <div className="flex items-start gap-3 pr-12"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary"><SparklesIcon aria-hidden="true" className="size-5" /></span><div className="min-w-0"><DialogTitle>撰寫 Workflow Resource</DialogTitle><DialogDescription className="mt-1">由 {workflowCommand} system workflow 專門撰寫 {resourceType}，先規劃再產出可套用 JSON。</DialogDescription></div></div>
           {targetNode && <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]"><Badge variant="info">{resourceType}</Badge><code className="rounded-md border border-border bg-muted/40 px-2 py-1 text-foreground">{getWorkflowNodeTitle(targetNode)} · {targetNode.id}</code><Badge variant="secondary">/{workflowCommand}</Badge></div>}
        </DialogHeader>
        <DialogPanel className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6" scrollFade={false}>
          <div className="mx-auto grid w-full max-w-3xl gap-4">
             <label className="grid gap-1.5 text-muted-foreground text-xs">使用者需求<Textarea aria-label={`${resourceType} Writer 使用者需求`} className="min-h-24" disabled={busy} onChange={(event) => setRequest(event.target.value)} value={request} /></label>
             <Button disabled={!targetNode || !workflowID || !request.trim()} loading={busy} onClick={() => void planResource()}><SparklesIcon aria-hidden="true" />{busy ? `正在撰寫 ${resourceType}...` : `執行 /${workflowCommand}`}</Button>
            {busy && <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-muted-foreground text-xs" role="status"><CircleDashedIcon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />Coordinator 規劃完成後會委派專用 writer 產出資源 JSON。</div>}
            {error && <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-destructive-foreground text-xs" role="alert">{error}</div>}
            {result && <section className="grid gap-1.5"><h3 className="font-semibold text-sm">Agent 回應</h3><pre className="max-h-56 overflow-auto rounded-lg border border-border bg-muted/30 p-3 whitespace-pre-wrap break-words font-mono text-[11px] leading-5">{result}</pre></section>}
            {plannedResource && <section className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3"><h3 className="font-semibold text-sm">可套用資源</h3><p className="text-muted-foreground text-xs">{plannedResource.name ?? "未命名資源"} · {plannedResource.scope ?? (targetNode?.data as ResourceNodeData | undefined)?.scope ?? "global"}</p>{plannedResource.content && <Textarea aria-label="規劃資源內容" className="min-h-56 font-mono text-xs" onChange={(event) => setPlannedResource((current) => current ? { ...current, content: event.target.value } : current)} value={plannedResource.content} />}{plannedResource.config && <Textarea aria-label="規劃資源設定" className="min-h-40 font-mono text-xs" onChange={(event) => { try { setPlannedResource((current) => current ? { ...current, config: JSON.parse(event.target.value) as Record<string, unknown> } : current) } catch { /* Keep the last valid config until JSON is valid. */ } }} value={JSON.stringify(plannedResource.config, null, 2)} />}</section>}
          </div>
        </DialogPanel>
        <DialogFooter className="border-border border-t bg-muted/40 px-4 py-2 sm:px-6"><div className="flex w-full items-center justify-end gap-2"><Button onClick={() => onOpenChange(false)} type="button" variant="outline">取消</Button><Button disabled={!plannedResource || busy} onClick={applyResource}><CheckIcon aria-hidden="true" />套用資源</Button></div></DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}

function parsePlannerResult(text: string): PlannedResource | null {
  const candidate = Array.from(text.matchAll(/```(?:json)?\s*\r?\n([\s\S]*?)```/gi), (match) => match[1]?.trim() ?? "").find(Boolean) ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
  if (!candidate) return null
  try {
    const parsed = JSON.parse(candidate) as { resource?: PlannedResource; validation?: { valid?: boolean } }
    if (parsed.validation?.valid === false || !parsed.resource || typeof parsed.resource !== "object") return null
    return parsed.resource
  } catch {
    return null
  }
}
