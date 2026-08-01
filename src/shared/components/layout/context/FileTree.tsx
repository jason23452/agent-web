import { ChevronRightIcon, Code2Icon, FileIcon, FileImageIcon, FileJsonIcon, FolderIcon, FolderOpenIcon, FolderPlusIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { type DragEvent, type KeyboardEvent, useState } from "react"
import type { FileNode, FileType } from "@/shared/types/workspace"

export type FileTreeNode = FileNode

type FileTreeProps = {
  nodes: FileTreeNode[]
  onCreateFile?: (directory: string) => void
  onCreateFolder?: (directory: string) => void
  onDeleteNode?: (node: FileTreeNode) => void
  onPreviewFile: (file: FileTreeNode) => void
  onUploadFiles?: (files: readonly File[], targetDirectory: string) => Promise<void> | void
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

export function FileTree({ nodes, onCreateFile, onCreateFolder, onDeleteNode, onPreviewFile, onUploadFiles }: FileTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())

  function toggleNode(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderNodes(items: FileTreeNode[], depth = 0, parentPath = ".") {
    function handleDrop(event: DragEvent, targetDirectory: string) {
      if (!onUploadFiles) return

      event.preventDefault()
      const files = Array.from(event.dataTransfer.files)
      if (files.length === 0) return

      void onUploadFiles(files, targetDirectory)
    }

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
        <li className="grid" key={node.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, actionDirectory)}>
          <div
            className="group/file-tree flex min-h-8 w-full items-center gap-1.5 rounded-lg pr-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

            <span className="ml-auto flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover/file-tree:opacity-100" onClick={(event) => event.stopPropagation()}>
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

          {isFolder && node.children && expanded && <ul className="grid">{renderNodes(node.children, depth + 1, nodeDirectory)}</ul>}
        </li>
      )
    })
  }

  return <ul className="grid gap-0.5">{renderNodes(nodes, 0, ".")}</ul>
}
