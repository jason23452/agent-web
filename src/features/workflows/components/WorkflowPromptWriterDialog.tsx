import { useEffect, useRef, useState } from "react"
import { ArrowLeftIcon, BotIcon, CheckIcon, CircleDashedIcon, SparklesIcon } from "lucide-react"
import { getApiErrorMessage } from "@/shared/api"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/shared/components/ui/dialog"
import { Textarea } from "@/shared/components/ui/textarea"
import { runPromptWriterForNode } from "@/features/workflows/api/workflowTestChat"
import type { WorkflowNode, WorkflowV1 } from "@/features/workflows/types"
import { getWorkflowNodeTitle } from "@/features/workflows/workflowUtils"

const DEFAULT_REQUEST = "請建立或改寫目前 target node 的 prompt，保留使用者目標、connected resources 與 Agent relationship 規則，並輸出可直接回寫的完整內容。"

export function WorkflowPromptWriterDialog({ onApplyPrompt, onOpenChange, open, targetNode, workflow }: {
  onApplyPrompt: (content: string) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  targetNode: WorkflowNode | null
  workflow: WorkflowV1
}) {
  const [request, setRequest] = useState(DEFAULT_REQUEST)
  const [result, setResult] = useState("")
  const [promptDraft, setPromptDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) controllerRef.current?.abort()
  }, [open])

  useEffect(() => () => controllerRef.current?.abort(), [])

  async function generatePrompt() {
    if (!targetNode || !request.trim() || busy) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setBusy(true)
    setError(null)
    setResult("")
    setPromptDraft("")
    try {
      const response = await runPromptWriterForNode(workflow, targetNode.id, request, controller.signal)
      if (controller.signal.aborted) return
      setResult(response.text)
      setPromptDraft(extractPrompt(response.text))
    } catch (requestError) {
      if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  function applyPrompt() {
    if (!promptDraft.trim()) return
    onApplyPrompt(promptDraft.trim())
    onOpenChange(false)
  }

  function cancelPromptWriter() {
    controllerRef.current?.abort()
    onOpenChange(false)
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="h-[min(820px,calc(100dvh-2rem))] max-w-4xl" closeProps={{ "aria-label": "關閉 Prompt Writer" }}>
        <DialogHeader className="border-border border-b">
          <div className="flex items-start gap-2 pr-12">
            <Button aria-label="返回 target node" onClick={cancelPromptWriter} size="icon-sm" title="返回 target node" type="button" variant="ghost"><ArrowLeftIcon aria-hidden="true" /></Button>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary"><SparklesIcon aria-hidden="true" className="size-5" /></span>
            <div className="min-w-0">
              <DialogTitle>用 Prompt Writer 建立提示詞</DialogTitle>
              <DialogDescription className="mt-1">先執行官方 plan，再由自訂 prompt-writer-agent 產生目前 node 的 prompt。</DialogDescription>
            </div>
          </div>
          {targetNode && <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]"><Badge variant="info"><BotIcon aria-hidden="true" className="size-3" />Target node</Badge><code className="rounded-md border border-border bg-muted/40 px-2 py-1 text-foreground">{getWorkflowNodeTitle(targetNode)} · {targetNode.id}</code><Badge variant="secondary">/prompt-writer-coordinator</Badge></div>}
        </DialogHeader>
        <DialogPanel className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6" scrollFade={false}>
          <div className="mx-auto grid w-full max-w-3xl gap-4">
            <label className="grid gap-1.5 text-muted-foreground text-xs">
              使用者需求
              <Textarea aria-label="Prompt Writer 使用者需求" className="min-h-24" disabled={busy} onChange={(event) => setRequest(event.target.value)} value={request} />
            </label>
            <Button disabled={!targetNode || !request.trim()} loading={busy} onClick={() => void generatePrompt()}><SparklesIcon aria-hidden="true" />{busy ? "正在執行兩階段 Agent..." : "執行 /prompt-writer-coordinator"}</Button>
            {busy && <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-muted-foreground text-xs" role="status"><CircleDashedIcon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />官方 plan 完成後才會交給 prompt-writer-agent，可能需要一些時間。</div>}
            {error && <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-destructive-foreground text-xs" role="alert">{error}</div>}
            {result && <section className="grid gap-1.5"><h3 className="font-semibold text-sm">Agent 回應</h3><pre className="max-h-56 overflow-auto rounded-lg border border-border bg-muted/30 p-3 whitespace-pre-wrap break-words font-mono text-[11px] leading-5">{result}</pre></section>}
            <label className="grid gap-1.5 text-muted-foreground text-xs">
              可直接回寫的 Prompt
              <Textarea aria-label="可直接回寫的 Prompt" className="min-h-72 font-mono text-xs" disabled={busy || !promptDraft} onChange={(event) => setPromptDraft(event.target.value)} placeholder="執行完成後會從 Agent 回應擷取 prompt。" value={promptDraft} />
            </label>
          </div>
        </DialogPanel>
        <DialogFooter className="border-border border-t bg-muted/40 px-4 py-2 sm:px-6">
          <div className="flex w-full items-center justify-between gap-3">
            <p className="min-w-0 truncate text-muted-foreground text-[11px]">套用前仍可在上方編輯 Prompt；不會自動發布 Workflow。</p>
            <div className="flex gap-2"><Button onClick={cancelPromptWriter} type="button" variant="outline">取消並返回</Button><Button disabled={!promptDraft.trim() || busy} onClick={applyPrompt}><CheckIcon aria-hidden="true" />套用到目前 node</Button></div>
          </div>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}

function extractPrompt(text: string) {
  const blocks = Array.from(text.matchAll(/```(?:yaml|yml|markdown|md)?\s*\r?\n([\s\S]*?)```/gi), (match) => match[1]?.trim() ?? "").filter(Boolean)
  return blocks.find((block) => block.includes("---") && (block.includes("name:") || block.includes("description:"))) ?? blocks[0] ?? ""
}
