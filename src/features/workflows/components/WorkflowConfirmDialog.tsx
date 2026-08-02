import { AlertTriangleIcon, FlaskConicalIcon, RocketIcon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Button } from "@/shared/components/ui/button"
import type { WorkflowScope, WorkflowTarget } from "@/features/workflows/types"

export type WorkflowRequestedAction = { kind: "publish" | "run"; target: WorkflowTarget }

export function WorkflowConfirmDialog({
  action,
  busy,
  name,
  onConfirm,
  onOpenChange,
  scope,
}: {
  action: WorkflowRequestedAction | null
  busy: boolean
  name: string
  onConfirm: (action: WorkflowRequestedAction) => Promise<void>
  onOpenChange: (open: boolean) => void
  scope: WorkflowScope
}) {
  const production = action?.target === "main"
  const publish = action?.kind === "publish"
  const Icon = production ? RocketIcon : FlaskConicalIcon
  return (
    <AlertDialog onOpenChange={onOpenChange} open={Boolean(action)}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <span className={`mx-auto mb-2 grid size-11 place-items-center rounded-2xl sm:mx-0 ${production ? "bg-destructive/10 text-destructive-foreground" : "bg-info/10 text-info-foreground"}`}><Icon aria-hidden="true" className="size-5" /></span>
          <AlertDialogTitle>{production ? "確認正式" : "確認測試"}{publish ? "發布" : "執行"}</AlertDialogTitle>
          <AlertDialogDescription>
            {publish
              ? production
                ? `將「${name}」同步到 main runtime、寫入 OpenCode 資源並重啟正式環境。`
                : `將「${name}」發布到隔離的 workflow-test runtime，接著重啟並驗證資源。`
              : production
                ? `將在 main runtime 實際執行「${name}」，可能修改正式專案檔案。`
                : `將在 workflow-test runtime 執行「${name}」並建立完整 run log。`}
          </AlertDialogDescription>
          {(production || scope === "global") && <p className="mt-2 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-left text-warning-foreground text-xs"><AlertTriangleIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />{scope === "global" ? "這是全域 workflow，可能影響所有 Project。" : "這是正式環境操作，請確認目前 workflow 與 target。"}</p>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>取消</AlertDialogClose>
          <Button loading={busy} onClick={() => { if (action) void onConfirm(action) }} variant={production ? "destructive" : "default"}>確認{publish ? "發布" : "執行"}</Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
