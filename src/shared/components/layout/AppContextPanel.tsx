import { FolderOpenIcon, XIcon } from "lucide-react"
import { FileTree, type FileTreeNode } from "@/shared/components/layout/FileTree"
import { Sidebar } from "@/shared/components/layout/Sidebar"
import { Button } from "@/shared/components/ui/button"

type AppContextPanelProps = {
  fileTree: FileTreeNode[]
  open: boolean
  onClose: () => void
  onPreviewFile: (file: FileTreeNode) => void
}

export function AppContextPanel({ fileTree, open, onClose, onPreviewFile }: AppContextPanelProps) {
  return (
    <Sidebar
      aria-label="Context panel"
      className={`z-40 grid min-h-dvh min-w-0 grid-rows-[auto_minmax(0,1fr)] border-border border-l bg-muted/45 transition-transform max-[1180px]:fixed max-[1180px]:inset-y-0 max-[1180px]:right-0 max-[1180px]:w-[min(360px,92vw)] max-[1180px]:shadow-[-20px_0_50px_rgb(15_23_42_/_12%)] min-[1181px]:static min-[1181px]:translate-x-0 ${open ? "max-[1180px]:translate-x-0" : "max-[1180px]:translate-x-full"}`}
      data-region="context-panel"
    >
      <div className="flex h-16 items-center gap-2 border-border/70 border-b px-4">
        <FolderOpenIcon aria-hidden="true" className="size-5 text-muted-foreground" />
        <h2 className="min-w-0 flex-1 truncate font-semibold">Context</h2>
        <Button aria-label="Close context panel" className="min-[1181px]:hidden" onClick={onClose} size="icon" variant="ghost">
          <XIcon aria-hidden="true" />
        </Button>
      </div>

      <section className="min-h-0 overflow-y-auto px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="font-medium text-muted-foreground text-xs">Project files</p>
        </div>

        <FileTree nodes={fileTree} onPreviewFile={onPreviewFile} />
      </section>
    </Sidebar>
  )
}
