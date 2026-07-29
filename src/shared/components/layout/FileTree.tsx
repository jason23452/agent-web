import { ChevronRightIcon, Code2Icon, FileIcon, FileImageIcon, FileJsonIcon, FolderIcon, FolderOpenIcon } from "lucide-react"
import { useState } from "react"
import type { FileNode, FileType } from "@/shared/types/workspace"

export type FileTreeNode = FileNode

type FileTreeProps = {
  nodes: FileTreeNode[]
  onPreviewFile: (file: FileTreeNode) => void
}

function FileTypeIcon({ expanded, type }: { expanded?: boolean; type: FileType }) {
  if (type === "folder") return expanded ? <FolderOpenIcon aria-hidden="true" className="size-4 text-warning" /> : <FolderIcon aria-hidden="true" className="size-4 text-warning" />
  if (type === "img") return <FileImageIcon aria-hidden="true" className="size-4 text-primary" />
  if (type === "json") return <FileJsonIcon aria-hidden="true" className="size-4 text-muted-foreground" />
  if (type === "tsx" || type === "ts" || type === "css" || type === "html") return <Code2Icon aria-hidden="true" className="size-4 text-muted-foreground" />
  return <FileIcon aria-hidden="true" className="size-4 text-muted-foreground" />
}

export function FileTree({ nodes, onPreviewFile }: FileTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(["src"]))

  function toggleNode(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderNodes(items: FileTreeNode[], depth = 0) {
    return items.map((node) => {
      const isFolder = node.type === "folder"
      const expanded = expandedIds.has(node.id)

      return (
        <li className="grid" key={node.id}>
          <button
            className="group flex min-h-8 w-full items-center gap-1.5 rounded-lg pr-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => (isFolder ? toggleNode(node.id) : onPreviewFile(node))}
            style={{ paddingLeft: `${depth * 18 + 4}px` }}
            type="button"
          >
            <span className={`grid size-4 place-items-center text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""} ${isFolder ? "visible" : "invisible"}`}>
              <ChevronRightIcon aria-hidden="true" className="size-3" />
            </span>
            <span className="grid size-6 shrink-0 place-items-center rounded-md">
              <FileTypeIcon expanded={expanded} type={node.type} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{node.name}</span>
            {node.size && <span className="shrink-0 font-mono text-muted-foreground text-[10px] opacity-0 transition-opacity group-hover:opacity-100">{node.size}</span>}
          </button>
          {isFolder && node.children && expanded && <ul className="grid">{renderNodes(node.children, depth + 1)}</ul>}
        </li>
      )
    })
  }

  return <ul className="grid gap-0.5">{renderNodes(nodes)}</ul>
}
