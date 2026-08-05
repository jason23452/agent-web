import { ChevronRightIcon, Code2Icon, DownloadIcon, FileIcon, FileImageIcon, FileJsonIcon, FolderIcon, FolderOpenIcon, FolderPlusIcon, PlusIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { type DragEvent, type KeyboardEvent, type ReactNode, useState } from "react"
import type { FileNode, FileType } from "@/shared/types/workspace"
import { collectDroppedProjectFiles, type ProjectUploadEntry } from "@/shared/components/layout/context/fileUpload"

export type FileTreeNode = FileNode

type FileTreeProps = {
  nodes: FileTreeNode[]
  onCreateFile?: (directory: string) => void
  onCreateFolder?: (directory: string) => void
  onDeleteNode?: (node: FileTreeNode) => void
  onDownloadNode?: (node: FileTreeNode) => Promise<void> | void
  onPreviewFile: (file: FileTreeNode) => void
  onRequestUpload?: (targetDirectory: string) => void
  onUploadFiles?: (files: readonly ProjectUploadEntry[], targetDirectory: string) => Promise<void> | void
  emptyMessage?: ReactNode
}

function FileTypeIcon({ expanded, type }: { expanded?: boolean; type: FileType }) {
  if (type === "folder") {
    return expanded ? (
      <FolderOpenIcon aria-hidden="true" className="size-4 text-warning" />
    ) : (
      <FolderIcon aria-hidden="true" className="size-4 text-warning" />
    )
  }
  if (type === "img") return <FileImageIcon aria-hidden="true" className="size-4 text-primary" />
  if (type === "json") return <FileJsonIcon aria-hidden="true" className="size-4 text-muted-foreground" />
  if (type === "tsx" || type === "ts" || type === "css" || type === "html") return <Code2Icon aria-hidden="true" className="size-4 text-muted-foreground" />

  return <FileIcon aria-hidden="true" className="size-4 text-muted-foreground" />
}

export function FileTree({ emptyMessage, nodes, onCreateFile, onCreateFolder, onDeleteNode, onDownloadNode, onPreviewFile, onRequestUpload, onUploadFiles }: FileTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())

  function toggleNode(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleDragOver(event: DragEvent) {
    if (!onUploadFiles) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }

  async function handleDrop(event: DragEvent, targetDirectory: string) {
    if (!onUploadFiles) return
    event.preventDefault()
    event.stopPropagation()

    const files = await collectDroppedProjectFiles(event.dataTransfer)
    if (files.length === 0) return
    await onUploadFiles(files, targetDirectory)
  }

  function renderNodes(items: FileTreeNode[], depth = 0, parentPath = ".") {
    return items.map((node) => {
      const isFolder = node.type === "folder"
      const expanded = expandedIds.has(node.id)
      const nodeDirectory = node.path || parentPath
      const actionDirectory = isFolder ? nodeDirectory : parentPath
      const activateNode = () => (isFolder ? toggleNode(node.id) : onPreviewFile(node))
      const handleNodeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Enter" && event.key !== " ") return

        event.preventDefault()
        activateNode()
      }

      return (
        <li className="grid min-w-0" key={node.id} onDragOver={handleDragOver} onDrop={(event) => void handleDrop(event, actionDirectory)}>
          <div
            className="group/file-tree flex min-h-8 min-w-0 w-full items-center gap-1.5 rounded-lg pr-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={activateNode}
            onKeyDown={handleNodeKeyDown}
            role="button"
            style={{ paddingLeft: `${depth * 18 + 4}px` }}
            tabIndex={0}
          >
            <span className={`grid size-4 place-items-center text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""} ${isFolder ? "visible" : "invisible"}`}>
              <ChevronRightIcon aria-hidden="true" className="size-3" />
            </span>
            <span className="grid size-6 shrink-0 place-items-center rounded-md">
              <FileTypeIcon expanded={expanded} type={node.type} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{node.name}</span>
            {node.size && <span className="shrink-0 font-mono text-muted-foreground text-[10px] opacity-0 transition-opacity group-hover/file-tree:opacity-100">{node.size}</span>}

            <span className="ml-auto flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity pointer-coarse:opacity-100 group-focus-within/file-tree:opacity-100 group-hover/file-tree:opacity-100" onClick={(event) => event.stopPropagation()}>
              {isFolder && onCreateFile ? (
                <button
                  aria-label="在此資料夾新增檔案"
                  className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation()
                    onCreateFile(nodeDirectory)
                  }}
                  title="在此資料夾新增檔案"
                  type="button"
                >
                  <PlusIcon aria-hidden="true" className="size-4" />
                </button>
              ) : null}

              {isFolder && onCreateFolder ? (
                <button
                  aria-label="在此資料夾新增資料夾"
                  className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation()
                    onCreateFolder(nodeDirectory)
                  }}
                  title="在此資料夾新增資料夾"
                  type="button"
                >
                  <FolderPlusIcon aria-hidden="true" className="size-4" />
                </button>
              ) : null}

              {isFolder && onRequestUpload ? (
                <button
                  aria-label="在此資料夾上傳檔案"
                  className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRequestUpload(nodeDirectory)
                  }}
                  title="在此資料夾上傳檔案"
                  type="button"
                >
                  <UploadIcon aria-hidden="true" className="size-4" />
                </button>
              ) : null}

              {onDownloadNode ? (
                <button
                  aria-label={`下載 ${node.name}`}
                  className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation()
                    void onDownloadNode(node)
                  }}
                  title={`下載 ${node.name}`}
                  type="button"
                >
                  <DownloadIcon aria-hidden="true" className="size-4" />
                </button>
              ) : null}

              {onDeleteNode ? (
                <button
                  aria-label={`刪除 ${node.name}`}
                  className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteNode(node)
                  }}
                  title={`刪除 ${node.name}`}
                  type="button"
                >
                  <Trash2Icon aria-hidden="true" className="size-4" />
                </button>
              ) : null}
            </span>
          </div>

          {isFolder && node.children && expanded && <ul className="grid min-w-0">{renderNodes(node.children, depth + 1, nodeDirectory)}</ul>}
        </li>
      )
    })
  }

  if (nodes.length === 0) {
    return (
      <div className="min-w-0 rounded-lg border border-dashed bg-muted/30 p-3" onDragOver={handleDragOver} onDrop={(event) => void handleDrop(event, ".")}>
        {emptyMessage}
      </div>
    )
  }

  return <ul className="grid min-w-0 gap-0.5" onDragOver={handleDragOver} onDrop={(event) => void handleDrop(event, ".")}>{renderNodes(nodes, 0, ".")}</ul>
}
