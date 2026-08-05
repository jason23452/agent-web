import { FileIcon, FolderPlusIcon, FolderOpenIcon, PlusIcon, UploadIcon, XIcon } from "lucide-react"
import type { ChangeEvent, DragEvent, ReactNode } from "react"
import { useRef, useState } from "react"
import { FileTree, type FileTreeNode } from "@/shared/components/layout/context/FileTree"
import { collectDroppedProjectFiles, type ProjectUploadEntry } from "@/shared/components/layout/context/fileUpload"
import { Sidebar } from "@/shared/components/layout/app/Sidebar"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Progress, ProgressIndicator, ProgressTrack } from "@/shared/components/ui/progress"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ModalShell } from "@/shared/components/layout/dialogs/ModalShell"
import type { ProjectFileUploadProgress } from "@/shared/hooks/useProjectContextFiles"

type CreateItemType = "file" | "folder"

type AppContextPanelProps = {
  fileTree: FileTreeNode[]
  open: boolean
  projectActive?: boolean
  loading?: boolean
  uploading?: boolean
  uploadProgress?: ProjectFileUploadProgress | null
  message?: string | null
  onClose: () => void
  extensionAction?: ReactNode
  onCreateFile?: (directory: string, itemName?: string) => void
  onCreateFolder?: (directory: string, itemName?: string) => void
  onCreateItem?: (itemType: CreateItemType, directory: string, itemName: string) => Promise<void> | void
  onDeleteNode?: (node: FileTreeNode) => Promise<void> | void
  onDownloadNode?: (node: FileTreeNode) => Promise<void> | void
  onOpenExtensionFile?: (file: FileTreeNode) => void
  onUploadFiles?: (files: readonly ProjectUploadEntry[], targetDirectory: string) => Promise<void> | void
  onPreviewFile: (file: FileTreeNode) => void
}

export function AppContextPanel({ fileTree, message, loading = false, uploading = false, uploadProgress = null, onClose, extensionAction, onCreateFile, onCreateFolder, onCreateItem, onDeleteNode, onDownloadNode, onOpenExtensionFile, onUploadFiles, onPreviewFile, open, projectActive = true }: AppContextPanelProps) {
  const [createItemOpen, setCreateItemOpen] = useState(false)
  const [createItemDirectory, setCreateItemDirectory] = useState(".")
  const [createItemType, setCreateItemType] = useState<CreateItemType>("file")
  const [createItemName, setCreateItemName] = useState("")
  const [createItemLoading, setCreateItemLoading] = useState(false)
  const [createItemError, setCreateItemError] = useState("")

  const [deleteNode, setDeleteNode] = useState<FileTreeNode | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadDirectoryRef = useRef(".")

  function requestUpload(directory = ".") {
    if (!projectActive || !onUploadFiles || uploading) return
    uploadDirectoryRef.current = directory
    fileInputRef.current?.click()
  }

  function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []).map((file): ProjectUploadEntry => ({
      file,
      kind: "file",
      relativePath: file.webkitRelativePath || file.name,
    }))
    event.currentTarget.value = ""
    if (files.length === 0 || !onUploadFiles) return

    void Promise.resolve(onUploadFiles(files, uploadDirectoryRef.current)).catch(() => undefined)
  }

  function handleSidebarDragOver(event: DragEvent<HTMLElement>) {
    if (!projectActive || !onUploadFiles || uploading) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }

  async function handleSidebarDrop(event: DragEvent<HTMLElement>) {
    if (!projectActive || !onUploadFiles || uploading) return
    event.preventDefault()
    event.stopPropagation()

    const files = await collectDroppedProjectFiles(event.dataTransfer)
    if (files.length === 0) return
    await onUploadFiles(files, ".")
  }

  function openCreateItemPanel(itemType: CreateItemType, directory = ".") {
    if (!projectActive) {
      return
    }

    setCreateItemType(itemType)
    setCreateItemName("")
    setCreateItemError("")
    setCreateItemDirectory(directory)
    setCreateItemOpen(true)
  }

  async function submitDeleteNode() {
    if (!deleteNode || !onDeleteNode) {
      setDeleteNode(null)
      return
    }

    try {
      setDeleteLoading(true)

      await onDeleteNode(deleteNode)
    } catch {
      // 錯誤將由父層回傳至 error bar，modal 仍可關閉後再進行重試。
      return
    } finally {
      setDeleteLoading(false)
      setDeleteNode(null)
    }
  }

  async function submitCreateItem() {
    const nextName = createItemName.trim()
    if (!nextName) {
      setCreateItemError("請輸入資料名稱")
      return
    }

    if (!onCreateItem) {
      const fallbackAction = createItemType === "folder" ? onCreateFolder : onCreateFile
      if (!fallbackAction) {
        setCreateItemError("尚未提供建立 handler")
        return
      }

      fallbackAction(createItemDirectory, nextName)
      setCreateItemOpen(false)
      setCreateItemName("")
      return
    }

    try {
      setCreateItemLoading(true)
      setCreateItemError("")

      await onCreateItem(createItemType, createItemDirectory, nextName)

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

  function handleCreateFile(directory: string) {
    if (!projectActive) {
      return
    }

    if (onCreateItem) {
      openCreateItemPanel("file", directory)
      return
    }

    if (onCreateFile) {
      onCreateFile(directory)
    }
  }

  function handleCreateFolder(directory: string) {
    if (!projectActive) {
      return
    }

    if (onCreateItem) {
      openCreateItemPanel("folder", directory)
      return
    }

    if (onCreateFolder) {
      onCreateFolder(directory)
    }
  }

  function requestDeleteNode(node: FileTreeNode) {
    if (!projectActive) {
      return
    }

    setDeleteNode(node)
  }

  function previewNode(node: FileTreeNode) {
    if (node.name.toLowerCase().endsWith(".xmind") && onOpenExtensionFile) {
      onOpenExtensionFile(node)
      return
    }
    onPreviewFile(node)
  }

  return (
    <Sidebar
      aria-label="Context panel"
      className={`z-40 grid min-h-dvh min-w-0 grid-rows-[auto_minmax(0,1fr)] border-border border-l bg-background transition-transform max-[1180px]:fixed max-[1180px]:inset-y-0 max-[1180px]:right-0 max-[1180px]:w-[min(360px,92vw)] max-[1180px]:shadow-[-20px_0_50px_rgb(15_23_42_/_12%)] min-[1181px]:static min-[1181px]:translate-x-0 ${open ? "max-[1180px]:translate-x-0" : "max-[1180px]:translate-x-full"}`}
      data-region="context-panel"
      onDragOver={handleSidebarDragOver}
      onDrop={(event) => void handleSidebarDrop(event)}
    >
      <div className="flex h-16 items-center gap-2 border-border/70 border-b px-4">
        <FolderOpenIcon aria-hidden="true" className="size-5 text-muted-foreground" />
        <h2 className="min-w-0 flex-1 truncate font-semibold">Context</h2>
        {extensionAction}
        <Button aria-label="Close context panel" className="bg-background min-[1181px]:hidden" onClick={onClose} size="icon" variant="outline">
          <XIcon aria-hidden="true" />
        </Button>
      </div>

      <section className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="font-medium text-muted-foreground text-xs">Project files</p>
          <div className="flex items-center gap-1">
            {projectActive && onUploadFiles ? (
              <button
                aria-label="上傳檔案到專案根目錄"
                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={uploading}
                onClick={() => requestUpload()}
                title="上傳檔案到專案根目錄"
                type="button"
              >
                <UploadIcon aria-hidden="true" className="size-4" />
              </button>
            ) : null}
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
        </div>

        <input
          accept="*/*"
          className="hidden"
          disabled={uploading || !projectActive || !onUploadFiles}
          multiple
          onChange={handleUploadChange}
          ref={fileInputRef}
          type="file"
        />

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
        ) : (
          <FileTree
            emptyMessage={fileTree.length === 0 ? <p className="text-muted-foreground text-sm">目前沒有可顯示的專案檔案。{onUploadFiles ? " 可將檔案或資料夾拖曳到這裡上傳。" : ""}</p> : undefined}
            nodes={fileTree}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteNode={requestDeleteNode}
            onDownloadNode={onDownloadNode}
            onPreviewFile={previewNode}
            onRequestUpload={onUploadFiles ? requestUpload : undefined}
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
          <p className="text-muted-foreground text-xs">將會建立到：{createItemDirectory}</p>
        </div>
      </ModalShell>

      <ModalShell
        ariaLabel="確認刪除"
        bodyClassName="grid gap-4 p-5"
        closeAriaLabel="關閉刪除確認"
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDeleteNode(null)} size="sm" variant="outline">
              取消
            </Button>
            <Button loading={deleteLoading} onClick={() => void submitDeleteNode()} size="sm" variant="destructive">
              刪除
            </Button>
          </div>
        }
        maxWidth="max-w-[420px]"
        footerClassName="justify-end"
        onOpenChange={(openState) => {
          if (!openState) {
            setDeleteNode(null)
          }
        }}
        open={Boolean(deleteNode)}
        title="確認刪除"
      >
        <p className="text-sm">確定要刪除「{deleteNode?.name ?? ""}」嗎？此操作無法復原。</p>
      </ModalShell>

      <ModalShell
        ariaLabel="檔案上傳進度"
        bodyClassName="grid gap-4 px-5 py-5"
        onOpenChange={() => undefined}
        open={Boolean(uploadProgress)}
        showCloseButton={false}
        title="正在上傳檔案"
      >
        <div aria-live="polite" className="grid gap-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>已處理項目</span>
            <span className="font-mono text-xs">{uploadProgress?.completed ?? 0} / {uploadProgress?.total ?? 0}</span>
          </div>
          <Progress
            aria-label="檔案上傳進度"
            className="gap-0"
            getAriaValueText={() => `${uploadProgress?.completed ?? 0} / ${uploadProgress?.total ?? 0}`}
            max={uploadProgress?.total ?? 1}
            value={uploadProgress?.completed ?? 0}
          >
            <ProgressTrack className="h-2 bg-muted">
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
          <p className="min-w-0 truncate text-muted-foreground text-xs" title={uploadProgress?.currentPath ?? undefined}>
            {uploadProgress?.currentPath ?? "準備上傳..."}
          </p>
        </div>
      </ModalShell>
    </Sidebar>
  )
}
