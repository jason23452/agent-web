import { useState } from "react"
import { ArrowLeftIcon, Clock3Icon, FilePlus2Icon, FolderOpenIcon, GitBranchIcon, SparklesIcon, Trash2Icon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import type { WorkflowScope, WorkflowSummary, WorkflowV1 } from "@/features/workflows/types"
import { scopeLabel } from "@/features/workflows/workflowUtils"

type WorkflowBrowserProps = {
  activeWorkflowID: string
  busy: boolean
  error: string | null
  loading: boolean
  open: boolean
  project: string
  workflows: WorkflowSummary[]
  onCreate: (input: Pick<WorkflowV1, "name" | "description" | "scope">) => Promise<void>
  onDelete: (workflow: WorkflowSummary) => Promise<void>
  onLoad: (workflow: WorkflowSummary) => Promise<void>
  onOpenChange: (open: boolean) => void
  onOpenGenerator: () => void
}

export function WorkflowBrowser({
  activeWorkflowID,
  busy,
  error,
  loading,
  onCreate,
  onDelete,
  onLoad,
  onOpenChange,
  onOpenGenerator,
  open,
  project,
  workflows,
}: WorkflowBrowserProps) {
  const [createMode, setCreateMode] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [scope, setScope] = useState<WorkflowScope>(project ? "project" : "global")
  const [deleteTarget, setDeleteTarget] = useState<WorkflowSummary | null>(null)

  async function submitCreate() {
    const normalizedName = name.trim()
    if (!normalizedName) return
    await onCreate({ name: normalizedName, description: description.trim(), scope })
    setCreateMode(false)
    setName("")
    setDescription("")
    onOpenChange(false)
  }

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogPopup className="max-h-[calc(100dvh-2rem)] max-w-2xl" closeProps={{ "aria-label": "關閉 Workflow 瀏覽器" }}>
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-8">
              <div><DialogTitle>{createMode ? "建立 Workflow" : "Workflow"}</DialogTitle><DialogDescription className="mt-1">{createMode ? "建立後可在 Workflow Builder 編輯與發布。" : `瀏覽、載入或建立 ${project ? `${project} 專案與全域` : "全域"} workflow。`}</DialogDescription></div>
              {createMode ? <Button aria-label="返回 Workflow 列表" onClick={() => setCreateMode(false)} size="icon" variant="ghost"><ArrowLeftIcon aria-hidden="true" /></Button> : <div className="flex gap-2"><Button onClick={onOpenGenerator} size="sm" variant="secondary"><SparklesIcon aria-hidden="true" />需求生成</Button><Button onClick={() => setCreateMode(true)} size="sm"><FilePlus2Icon aria-hidden="true" />新增</Button></div>}
            </div>
          </DialogHeader>
          <DialogPanel className="min-h-0 min-w-0 w-full max-w-full flex-1 grid gap-4 overflow-x-hidden overflow-y-auto">
            {createMode ? (
              <form className="mx-auto grid w-full max-w-xl min-w-0 gap-4 rounded-2xl border border-border bg-muted/30 p-4 sm:p-5" onSubmit={(event) => { event.preventDefault(); void submitCreate() }}>
                <div><p className="font-semibold text-sm">Workflow 基本資料</p><p className="mt-1 text-muted-foreground text-xs">只保存 workflow JSON，不會立即發布到 OpenCode。</p></div>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                  <label className="grid min-w-0 gap-1.5 text-xs"><span className="font-medium text-muted-foreground">名稱</span><Input autoComplete="off" autoFocus className="min-w-0" onChange={(event) => setName(event.target.value)} placeholder="例如 PR 自動檢查" value={name} /></label>
                  <label className="grid min-w-0 gap-1.5 text-xs"><span className="font-medium text-muted-foreground">範圍</span><select className="workflow-select min-w-0" onChange={(event) => setScope(event.target.value as WorkflowScope)} value={scope}>{project && <option value="project">專案 · {project}</option>}<option value="global">全域</option></select></label>
                </div>
                <label className="grid min-w-0 gap-1.5 text-xs"><span className="font-medium text-muted-foreground">說明</span><Input autoComplete="off" className="min-w-0" onChange={(event) => setDescription(event.target.value)} placeholder="這個 workflow 會完成什麼工作" value={description} /></label>
                {scope === "global" && <p className="rounded-xl border border-warning/30 bg-warning/8 px-3 py-2 text-warning-foreground text-xs">全域 workflow 可發布到影響所有 Project 的環境，正式發布前會再次確認。</p>}
                <div className="flex justify-end gap-2 border-border border-t pt-4"><Button onClick={() => setCreateMode(false)} type="button" variant="outline">取消</Button><Button disabled={!name.trim()} loading={busy} type="submit">建立並儲存</Button></div>
              </form>
            ) : (
              <>
                {error && <p className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-destructive-foreground text-xs" role="alert">{error}</p>}
                {loading ? <p aria-live="polite" className="py-12 text-center text-muted-foreground text-sm">正在讀取 workflow...</p> : (
                  <ul className="grid w-full max-w-full min-w-0 gap-2">
                    {workflows.map((workflow) => (
                      <li className={`flex w-full max-w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border p-3 ${workflow.id === activeWorkflowID ? "border-foreground/25 bg-accent" : "border-border"}`} key={`${workflow.scope}-${workflow.project ?? "global"}-${workflow.id}`}>
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted"><GitBranchIcon aria-hidden="true" className="size-4" /></span>
                        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><strong className="truncate text-sm">{workflow.name}</strong><Badge size="sm" variant={workflow.scope === "global" ? "warning" : "secondary"}>{scopeLabel(workflow.scope)}</Badge>{workflow.protected && <Badge size="sm" variant="info">預設</Badge>}</div><p className="mt-0.5 truncate text-muted-foreground text-xs">{workflow.description || workflow.id}</p>{workflow.protected && <p className="mt-0.5 text-info-foreground text-[11px]">系統預設，可編輯但不可刪除</p>}<p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-muted-foreground"><Clock3Icon aria-hidden="true" className="size-3" />{formatDate(workflow.updatedAt)}</p></div>
                        <Button aria-label={`載入 ${workflow.name}`} loading={busy} onClick={() => void onLoad(workflow)} size="icon" variant="outline"><FolderOpenIcon aria-hidden="true" /></Button>
                        <Button aria-label={workflow.protected ? `${workflow.name} 不可刪除` : `刪除 ${workflow.name}`} disabled={busy || workflow.protected} onClick={() => setDeleteTarget(workflow)} size="icon" title={workflow.protected ? "預設 Workflow 不可刪除，但可以編輯" : undefined} variant="ghost"><Trash2Icon aria-hidden="true" /></Button>
                      </li>
                    ))}
                    {!workflows.length && <li className="grid place-items-center gap-2 rounded-xl border border-dashed border-border py-14 text-center"><GitBranchIcon aria-hidden="true" className="size-5 text-muted-foreground" /><p className="font-medium text-sm">尚無已保存的 Workflow</p><p className="text-muted-foreground text-xs">建立第一個 workflow，開始組合自動化寫 code 流程。</p></li>}
                  </ul>
                )}
              </>
            )}
          </DialogPanel>
        </DialogPopup>
      </Dialog>

      <AlertDialog onOpenChange={(nextOpen) => { if (!nextOpen) setDeleteTarget(null) }} open={Boolean(deleteTarget)}>
        <AlertDialogPopup>
          <AlertDialogHeader><AlertDialogTitle>刪除 Workflow？</AlertDialogTitle><AlertDialogDescription>「{deleteTarget?.name}」的 JSON，以及由它管理的 agents、commands、skills、tools、plugins 與 MCP 設定都會被移除；reference 資源不會受影響。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogClose render={<Button variant="outline" />}>取消</AlertDialogClose><AlertDialogClose render={<Button loading={busy} variant="destructive" />} onClick={() => { if (deleteTarget) void onDelete(deleteTarget) }}>確認刪除</AlertDialogClose></AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(date)
}
