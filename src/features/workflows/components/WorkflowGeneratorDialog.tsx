import { useEffect, useRef, useState } from "react"
import { CheckIcon, CircleDashedIcon, SparklesIcon } from "lucide-react"
import { getApiErrorMessage } from "@/shared/api"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/shared/components/ui/dialog"
import { Textarea } from "@/shared/components/ui/textarea"
import { WORKFLOW_GENERATOR_WORKFLOW_ID, runWorkflowSystemCommand } from "@/features/workflows/api/workflowTestChat"
import { validateWorkflow } from "@/features/workflows/api/workflows"
import type { WorkflowV1 } from "@/features/workflows/types"
import { issueMessage } from "@/features/workflows/workflowUtils"

const DEFAULT_REQUEST = "請建立一個可由使用者描述需求後執行的 Workflow，包含合理的 Command、Agent、delegation、capability resources 與完整 V3 graph。"

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
       const validation = await validateWorkflow(parsed, { signal: controller.signal, workspace: project })
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
       const validation = await validateWorkflow(generated, { workspace: project })
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
         <DialogHeader className="border-border border-b"><div className="flex items-start gap-3 pr-12"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary"><SparklesIcon aria-hidden="true" className="size-5" /></span><div className="min-w-0"><DialogTitle>依需求建立 Workflow</DialogTitle><DialogDescription className="mt-1">先由官方 plan 規劃，再產生完整 V3 JSON；通過驗證後自動建立 Workflow。</DialogDescription></div></div><div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]"><Badge variant="info">/workflow-generator</Badge><Badge variant="secondary">Project · {project}</Badge></div></DialogHeader>
        <DialogPanel className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6" scrollFade={false}><div className="mx-auto grid w-full max-w-3xl gap-4"><label className="grid gap-1.5 text-muted-foreground text-xs">使用者需求<Textarea aria-label="Workflow Generator 使用者需求" className="min-h-32" disabled={busy || creating} onChange={(event) => setRequest(event.target.value)} value={request} /></label><Button disabled={!request.trim() || creating} loading={busy} onClick={() => void generateWorkflow()}><SparklesIcon aria-hidden="true" />{busy ? "正在產生 Workflow..." : "執行 /workflow-generator"}</Button>{(busy || creating) && <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-muted-foreground text-xs" role="status"><CircleDashedIcon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />{creating ? "正在建立 Workflow 專案..." : "官方 plan 完成後才會產生 JSON。"}</div>}{error && <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-destructive-foreground text-xs" role="alert">{error}</div>}{result && <section className="grid gap-1.5"><h3 className="font-semibold text-sm">Agent 回應</h3><pre className="max-h-56 overflow-auto rounded-lg border border-border bg-muted/30 p-3 whitespace-pre-wrap break-words font-mono text-[11px] leading-5">{result}</pre></section>}{generated && <section className="grid gap-2 rounded-lg border border-success/30 bg-success/8 p-3"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-sm">Workflow JSON 已通過驗證</h3><Badge variant="success"><CheckIcon aria-hidden="true" />{generated.name}</Badge></div><p className="text-muted-foreground text-xs">{generated.nodes.length} nodes · {generated.edges.length} edges · {generated.scope}{generated.project ? ` · ${generated.project}` : ""}</p><Textarea aria-label="生成的 Workflow JSON" className="min-h-72 font-mono text-xs" onChange={(event) => { try { setGenerated(JSON.parse(event.target.value) as WorkflowV1); setError(null) } catch { setError("Workflow JSON 格式無效。") } }} value={JSON.stringify(generated, null, 2)} /></section>}</div></DialogPanel>
        <DialogFooter className="border-border border-t bg-muted/40 px-4 py-2 sm:px-6"><div className="flex w-full items-center justify-end gap-2"><Button onClick={() => onOpenChange(false)} type="button" variant="outline">取消</Button><Button disabled={!generated || busy || creating} loading={creating} onClick={() => void createWorkflow()}><CheckIcon aria-hidden="true" />自動建立 Workflow</Button></div></DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}

function parseWorkflowResult(text: string): WorkflowV1 | null {
  const fenced = Array.from(text.matchAll(/```(?:json)?\s*\r?\n([\s\S]*?)```/gi), (match) => match[1]?.trim() ?? "").find(Boolean)
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
  if (!candidate) return null
  try {
    return JSON.parse(candidate) as WorkflowV1
  } catch {
    return null
  }
}
