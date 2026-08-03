import { useRef, useState, type ChangeEvent } from "react"
import { CheckCircle2Icon, ClipboardIcon, DownloadIcon, FileUpIcon, ShieldCheckIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import type { WorkflowV1, WorkflowValidationResult } from "@/features/workflows/types"
import { issueMessage } from "@/features/workflows/workflowUtils"

type WorkflowJsonPanelProps = {
  workflow: WorkflowV1
  onImport: (workflow: WorkflowV1) => void
  onValidateImport: (workflow: WorkflowV1, signal?: AbortSignal) => Promise<WorkflowValidationResult>
  protectedWorkflow: boolean
}

export function WorkflowJsonPanel({ onImport, onValidateImport, protectedWorkflow, workflow }: WorkflowJsonPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const [notice, setNotice] = useState("")
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [validating, setValidating] = useState(false)
  const json = JSON.stringify(workflow, null, 2)

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json)
      setNotice("已複製目前草稿 JSON。")
    } catch {
      setNotice("瀏覽器拒絕剪貼簿權限，請改用下載。")
    }
  }

  function downloadJson() {
    const blob = new Blob([`${json}\n`], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${workflow.id}.workflow.json`
    link.click()
    URL.revokeObjectURL(url)
    setNotice("已下載目前草稿；此操作不會儲存或發布。")
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setErrors([])
    setWarnings([])
    setNotice("")
    let parsed: WorkflowV1
    try {
      parsed = JSON.parse(await file.text()) as WorkflowV1
    } catch {
      setErrors(["檔案不是有效的 JSON。"])
      return
    }
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setValidating(true)
    try {
      const result = await onValidateImport(parsed, controller.signal)
      if (controller.signal.aborted) return
      setErrors(result.errors.map(issueMessage))
      setWarnings(result.warnings.map(issueMessage))
      if (!result.valid) return
      onImport(result.workflow ?? parsed)
      setNotice("後端驗證通過，已還原到目前畫布；請明確按下「儲存」才會保存。")
    } catch (error) {
      if (!controller.signal.aborted) setErrors([error instanceof Error ? error.message : "後端驗證失敗。"])
    } finally {
      if (!controller.signal.aborted) setValidating(false)
    }
  }

  return (
    <section aria-labelledby="workflow-json-title" className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <header className="grid gap-3 border-border border-b p-4">
        <div><h2 className="font-semibold text-sm" id="workflow-json-title">Workflow JSON</h2><p className="mt-0.5 text-muted-foreground text-xs">{protectedWorkflow ? "預設 Workflow 僅供檢視；請從節點設定編輯 Model / Variant。" : "目前草稿可複製、下載或經 BFF 驗證後匯入。"}</p></div>
        <div className="grid grid-cols-3 gap-1.5">
          <Button onClick={() => void copyJson()} size="sm" variant="outline"><ClipboardIcon aria-hidden="true" />複製</Button>
          <Button onClick={downloadJson} size="sm" variant="outline"><DownloadIcon aria-hidden="true" />下載</Button>
          <Button disabled={protectedWorkflow} loading={validating} onClick={() => inputRef.current?.click()} size="sm" variant="outline"><FileUpIcon aria-hidden="true" />匯入</Button>
          <input accept="application/json,.json" aria-label="匯入 Workflow JSON" className="sr-only" onChange={(event) => void importFile(event)} ref={inputRef} type="file" />
        </div>
        <p className="flex items-start gap-1.5 rounded-lg bg-info/8 px-3 py-2 text-info-foreground text-[11px] leading-4"><ShieldCheckIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />{protectedWorkflow ? "預設 Workflow 只允許 Model / Variant 變更，且只可發布到 workflow-test。" : "匯入與儲存都不會修改 OpenCode。只有明確發布才會同步資源。"}</p>
        {notice && <p aria-live="polite" className="flex items-start gap-1.5 rounded-lg bg-success/8 px-3 py-2 text-success-foreground text-xs"><CheckCircle2Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />{notice}</p>}
        {errors.length > 0 && <ul className="grid gap-1 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-destructive-foreground text-xs" role="alert">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
        {warnings.length > 0 && <ul className="grid gap-1 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-warning-foreground text-xs">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      </header>
      <pre className="m-0 overflow-auto bg-muted/35 p-4 font-mono text-[10px] leading-4 text-foreground">{json}</pre>
    </section>
  )
}
