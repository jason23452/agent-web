import { ActivityIcon, Code2Icon, FileClockIcon, FolderOpenIcon, GitBranchIcon, MessageSquareTextIcon, PanelRightOpenIcon, SparklesIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"

export function WorkflowProductNav({
  onBack,
  onBrowse,
  onOpenPanel,
  project,
  workflowName,
}: {
  onBack: () => void
  onBrowse: () => void
  onOpenPanel: () => void
  project?: string
  workflowName: string
}) {
  return (
    <aside className="workflow-product-nav" aria-label="產品導覽">
      <div className="workflow-product-heading">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground" aria-label="AICaht"><SparklesIcon aria-hidden="true" className="size-4" /></div>
        <div className="min-w-0"><strong className="block truncate text-sm">{workflowName}</strong><span className="block truncate text-[11px] text-muted-foreground">{project ?? "全域"} · Workflow</span></div>
      </div>
      <nav aria-label="主要產品功能" className="workflow-product-links">
        <button aria-label="返回 Agent 工作區" className="workflow-product-link" onClick={onBack} type="button"><MessageSquareTextIcon aria-hidden="true" /><span>工作區</span></button>
        <button aria-current="page" className="workflow-product-link workflow-product-link--active" type="button"><GitBranchIcon aria-hidden="true" /><span>編排</span></button>
        <button className="workflow-product-link" onClick={onBrowse} type="button"><FolderOpenIcon aria-hidden="true" /><span>Workflow 列表</span></button>
        <button aria-disabled="true" className="workflow-product-link" disabled type="button"><Code2Icon aria-hidden="true" /><span>訪問 API</span></button>
        <button aria-disabled="true" className="workflow-product-link" disabled type="button"><FileClockIcon aria-hidden="true" /><span>日誌</span></button>
        <button aria-disabled="true" className="workflow-product-link" disabled type="button"><ActivityIcon aria-hidden="true" /><span>監控</span></button>
      </nav>
      <Button aria-label="開啟節點面板" className="mt-auto min-[1001px]:hidden" onClick={onOpenPanel} size="icon-lg" variant="ghost"><PanelRightOpenIcon aria-hidden="true" /></Button>
    </aside>
  )
}
