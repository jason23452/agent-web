import { BracesIcon, CloudUploadIcon, FlaskConicalIcon, FolderOpenIcon, MenuIcon, PlayIcon, RocketIcon, SaveIcon } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import type { WorkflowV1 } from "@/features/workflows/types"
import type { WorkflowRequestedAction } from "@/features/workflows/components/WorkflowConfirmDialog"
import { scopeLabel } from "@/features/workflows/workflowUtils"

export function WorkflowTopbar({
  busy,
  dirty,
  onBrowse,
  onNameChange,
  onOpenPanel,
  onRequestAction,
  onSave,
  persisted,
  workflow,
}: {
  busy: boolean
  dirty: boolean
  onBrowse: () => void
  onNameChange: (name: string) => void
  onOpenPanel: () => void
  onRequestAction: (action: WorkflowRequestedAction) => void
  onSave: () => Promise<void>
  persisted: boolean
  workflow: WorkflowV1
}) {
  const hasExecutableAction = workflow.nodes.some((node) => node.type.startsWith("action."))
  const publishDisabled = busy || dirty || !persisted || !hasExecutableAction
  const blockedReason = !hasExecutableAction ? "請先加入至少一個動作節點" : dirty || !persisted ? "請先儲存有效的 Workflow JSON" : undefined
  return (
    <header className="workflow-topbar">
      <div className="flex min-w-0 items-center gap-2.5">
        <Button aria-label="瀏覽 Workflow" onClick={onBrowse} size="icon" variant="ghost"><FolderOpenIcon aria-hidden="true" /></Button>
        <div className="min-w-0">
          <Input aria-label="Workflow 名稱" className="border-transparent bg-transparent shadow-none before:hidden" onChange={(event) => onNameChange(event.target.value)} value={workflow.name} />
          <div className="flex items-center gap-1.5 px-2 text-[10px] text-muted-foreground"><code className="truncate font-mono">{workflow.id}</code><span>·</span><span>{scopeLabel(workflow.scope)}</span>{dirty ? <Badge size="sm" variant="warning">未儲存</Badge> : <Badge size="sm" variant="success">已同步 JSON</Badge>}</div>
        </div>
      </div>

      <div className="workflow-topbar-actions" role="group" aria-label="Workflow 儲存、發布與執行">
        <Button loading={busy} onClick={() => void onSave()} size="sm"><SaveIcon aria-hidden="true" />儲存</Button>
        <Button disabled={publishDisabled} onClick={() => onRequestAction({ kind: "publish", target: "workflow-test" })} size="sm" title={blockedReason} variant="outline"><FlaskConicalIcon aria-hidden="true" />測試發布</Button>
        <Button disabled={publishDisabled} onClick={() => onRequestAction({ kind: "publish", target: "main" })} size="sm" title={blockedReason} variant="destructive-outline"><CloudUploadIcon aria-hidden="true" />正式發布</Button>
        <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border" />
        <Button disabled={publishDisabled} onClick={() => onRequestAction({ kind: "run", target: "workflow-test" })} size="sm" title={blockedReason} variant="secondary"><PlayIcon aria-hidden="true" />測試執行</Button>
        <Button disabled={publishDisabled} onClick={() => onRequestAction({ kind: "run", target: "main" })} size="sm" title={blockedReason} variant="outline"><RocketIcon aria-hidden="true" />正式執行</Button>
        <Button aria-label="開啟 Builder 面板" className="min-[1001px]:hidden" onClick={onOpenPanel} size="icon" variant="ghost"><MenuIcon aria-hidden="true" /></Button>
      </div>
      {!persisted && <span className="sr-only"><BracesIcon aria-hidden="true" />這是尚未保存的新草稿</span>}
    </header>
  )
}
