import { FileIcon, FolderPlusIcon, FolderOpenIcon, PlusIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { FileTree, type FileTreeNode } from "@/shared/components/layout/FileTree"
import { Sidebar } from "@/shared/components/layout/Sidebar"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ModalShell } from "@/shared/components/layout/ModalShell"

type CreateItemType = "file" | "folder"

type AppContextPanelProps = {
  fileTree: FileTreeNode[]
  open: boolean
  projectActive?: boolean
  loading?: boolean
  message?: string | null
  onClose: () => void
  onCreateFile?: (directory: string, itemName?: string) => void
  onCreateFolder?: (directory: string, itemName?: string) => void
  onCreateItem?: (itemType: CreateItemType, directory: string, itemName: string) => Promise<void> | void
  onDeleteNode?: (node: FileTreeNode) => void
  onUploadFiles?: (files: readonly File[], targetDirectory: string) => Promise<void> | void
  onPreviewFile: (file: FileTreeNode) => void
}

export function AppContextPanel({ fileTree, message, loading = false, onClose, onCreateFile, onCreateFolder, onCreateItem, onDeleteNode, onUploadFiles, onPreviewFile, open, projectActive = true }: AppContextPanelProps) {
  const [createItemOpen, setCreateItemOpen] = useState(false)
  const [createItemType, setCreateItemType] = useState<CreateItemType>("file")
  const [createItemName, setCreateItemName] = useState("")
  const [createItemLoading, setCreateItemLoading] = useState(false)
  const [createItemError, setCreateItemError] = useState("")

  function openCreateItemPanel(itemType: CreateItemType) {
    if (!projectActive) {
      return
    }

    setCreateItemType(itemType)
    setCreateItemName("")
    setCreateItemError("")
    setCreateItemOpen(true)
  }

  async function submitCreateItem() {
    const nextName = createItemName.trim()
    if (!nextName) {
      setCreateItemError("請輸入資料名稱")
      return
    }

    const targetDirectory = "."

    if (!onCreateItem) {
      const fallbackAction = createItemType === "folder" ? onCreateFolder : onCreateFile
      if (!fallbackAction) {
        setCreateItemError("尚未提供建立 handler")
        return
      }

      fallbackAction(targetDirectory, nextName)
      setCreateItemOpen(false)
      setCreateItemName("")
      return
    }

    try {
      setCreateItemLoading(true)
      setCreateItemError("")

      await onCreateItem(createItemType, ".", nextName)

      setCreateItemOpen(false)
      setCreateItemName("")
    } catch {
      setCreateItemError("建立項目失敗，請稍後再試")
    } finally {
      setCreateItemLoading(false)
    }
  }

  const createItemTypeButtons = (
    <div className="flex gap-2">
      <Button
        aria-pressed={createItemType === "file"}
        className="flex-1"
        onClick={() => setCreateItemType("file")}
        size="sm"
        variant={createItemType === "file" ? "default" : "outline"}
        type="button"
      >
        <FileIcon aria-hidden="true" className="size-4" />
        檔案
      </Button>
      <Button
        aria-pressed={createItemType === "folder"}
        className="flex-1"
        onClick={() => setCreateItemType("folder")}
        size="sm"
        variant={createItemType === "folder" ? "default" : "outline"}
        type="button"
      >
        <FolderPlusIcon aria-hidden="true" className="size-4" />
        資料夾
      </Button>
    </div>
  )

  return (
    <Sidebar
      aria-label="Context panel"
      className={`z-40 grid min-h-dvh min-w-0 grid-rows-[auto_minmax(0,1fr)] border-border border-l bg-background transition-transform max-[1180px]:fixed max-[1180px]:inset-y-0 max-[1180px]:right-0 max-[1180px]:w-[min(360px,92vw)] max-[1180px]:shadow-[-20px_0_50px_rgb(15_23_42_/_12%)] min-[1181px]:static min-[1181px]:translate-x-0 ${open ? "max-[1180px]:translate-x-0" : "max-[1180px]:translate-x-full"}`}
      data-region="context-panel"
    >
      <div className="flex h-16 items-center gap-2 border-border/70 border-b px-4">
        <FolderOpenIcon aria-hidden="true" className="size-5 text-muted-foreground" />
        <h2 className="min-w-0 flex-1 truncate font-semibold">Context</h2>
        <Button aria-label="Close context panel" className="bg-background min-[1181px]:hidden" onClick={onClose} size="icon" variant="outline">
          <XIcon aria-hidden="true" />
        </Button>
      </div>

      <section className="min-h-0 overflow-y-auto px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="font-medium text-muted-foreground text-xs">Project files</p>
          {projectActive ? (
            <button
              aria-label="新增檔案或資料夾"
              className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => openCreateItemPanel("file")}
              title="新增檔案或資料夾"
              type="button"
            >
              <PlusIcon aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="grid min-h-24 gap-2 rounded-lg  bg-muted/30 p-3">
            {Array.from({ length: 8 }).map((_, index) => {
              const widthClass =
                index % 3 === 0
                  ? "w-[72%]"
                  : index % 3 === 1
                    ? "w-[84%]"
                    : "w-[68%]"

              return (
                <div className="flex items-center gap-2" key={`context-skeleton-${index}`}>
                  <Skeleton className="size-4 shrink-0 rounded-md" />
                  <Skeleton className={`h-4 flex-1 ${widthClass}`} />
                  <Skeleton className="h-3 w-12" />
                </div>
              )
            })}
          </div>
        ) : !projectActive ? (
          <p className="rounded-lg border border-dashed bg-muted/40 p-3 text-muted-foreground text-sm">尚未啟用專案，請先到左側側邊欄開啟一個專案。</p>
        ) : message ? (
          <p className="rounded-lg border border-dashed bg-destructive/10 p-3 text-destructive text-sm">{message}</p>
        ) : fileTree.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/40 p-3 text-muted-foreground text-sm">目前沒有可顯示的專案檔案。</p>
        ) : (
          <FileTree
            nodes={fileTree}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            onDeleteNode={onDeleteNode}
            onPreviewFile={onPreviewFile}
            onUploadFiles={onUploadFiles}
          />
        )}
      </section>

      <ModalShell
        ariaLabel="新增專案檔案"
        bodyClassName="grid gap-4 p-5"
        closeAriaLabel="關閉新增專案檔案"
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setCreateItemOpen(false)} size="sm" variant="outline">
              取消
            </Button>
            <Button loading={createItemLoading} onClick={() => void submitCreateItem()} size="sm">
              建立
            </Button>
          </div>
        }
        maxWidth="max-w-[420px]"
        onOpenChange={setCreateItemOpen}
        open={createItemOpen && projectActive}
        title="新增檔案 / 資料夾"
      >
        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="font-medium text-xs">類型</span>
            {createItemTypeButtons}
          </label>
          <label className="grid gap-1.5">
            <span className="font-medium text-xs">名稱</span>
            <Input
              aria-label="新項目名稱"
              onChange={(event) => {
                setCreateItemName(event.target.value)
                setCreateItemError("")
              }}
              placeholder={createItemType === "file" ? "例如：index.tsx" : "例如：components"}
              value={createItemName}
            />
          </label>
          {createItemError ? <p className="text-destructive text-xs">{createItemError}</p> : null}
          <p className="text-muted-foreground text-xs">將會建立到專案根目錄</p>
        </div>
      </ModalShell>
    </Sidebar>
  )
}
