import { FolderOpenIcon, XIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { FileTree } from "@/features/workspace/components/FileTree"
import { fileTree } from "@/features/workspace/data/mockWorkspace"
import type { FileNode } from "@/features/workspace/types/workspace"

type ContextPanelProps = {
  open: boolean
  onClose: () => void
  onPreviewFile: (file: FileNode) => void
}

export function ContextPanel({ open, onClose, onPreviewFile }: ContextPanelProps) {
  return (
    <aside
      aria-label="檔案庫與預覽"
      className={`z-40 grid min-h-dvh min-w-0 grid-rows-[auto_minmax(0,1fr)] border-border border-l bg-muted/45 transition-transform max-[1180px]:fixed max-[1180px]:inset-y-0 max-[1180px]:right-0 max-[1180px]:w-[min(360px,92vw)] max-[1180px]:shadow-[-20px_0_50px_rgb(15_23_42_/_12%)] min-[1181px]:static min-[1181px]:translate-x-0 ${open ? "max-[1180px]:translate-x-0" : "max-[1180px]:translate-x-full"}`}
      data-region="context-panel"
    >
      <div className="flex h-16 items-center gap-2 border-border/70 border-b px-4">
        <FolderOpenIcon aria-hidden="true" className="size-5 text-muted-foreground" />
        <h2 className="min-w-0 flex-1 truncate font-semibold">檔案庫</h2>
        <Button aria-label="關閉面板" className="min-[1181px]:hidden" onClick={onClose} size="icon" variant="ghost">
          <XIcon aria-hidden="true" />
        </Button>
      </div>

      <section className="min-h-0 overflow-y-auto px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="font-medium text-muted-foreground text-xs">專案樹</p>
        </div>

        <FileTree nodes={fileTree} onPreviewFile={onPreviewFile} />
      </section>
    </aside>
  )
}
