import { useCallback, useEffect, useRef, useState } from "react"
import { createOrUpdateProjectFile, createProjectDirectory, deleteProjectFile, getFileTypeByName, readProjectFileContent } from "@/features/workspace/api/files"
import { getApiErrorMessage } from "@/shared/api"
import { consumeProjectFileEvents, type OpenCodeEvent } from "@/shared/api/opencodeEvents"
import type { FileNode } from "@/shared/types/workspace"
import type { FileTreeNode } from "@/shared/components/layout/context/FileTree"
import {
  buildWorkspaceFileTree,
  combineRelativePath,
  decodeTextContent,
  normalizeDirectoryInput,
  readFileAsBase64,
  toRelativePath,
} from "@/shared/utils/appRouterUtils"

type UseProjectContextFilesOptions = {
  activeProjectPath: string | null
}

type ProjectFileChange = "add" | "change" | "unlink"
type ProjectFileKind = "directory" | "file"

function normalizeProjectFilePath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/^\/+|\/+$/g, "")
}

function sortProjectFileNodes(nodes: FileTreeNode[]) {
  return nodes.slice().sort((first, second) => {
    if (first.type !== second.type) return first.type === "folder" ? -1 : 1
    return first.name.localeCompare(second.name, "zh-Hant", { sensitivity: "base" })
  })
}

function insertProjectFileNode(nodes: FileTreeNode[], parentPath: string, nextNode: FileTreeNode): { found: boolean; nodes: FileTreeNode[] } {
  let found = false
  const next = nodes.map((node) => {
    if (node.type === "folder" && node.path === parentPath) {
      found = true
      const children = node.children ?? []
      if (children.some((child) => child.path === nextNode.path)) return node
      return { ...node, children: sortProjectFileNodes([...children, nextNode]) }
    }
    if (!node.children) return node

    const result = insertProjectFileNode(node.children, parentPath, nextNode)
    if (!result.found) return node
    found = true
    return { ...node, children: result.nodes }
  })

  return { found, nodes: next }
}

function removeProjectFileNode(nodes: FileTreeNode[], targetPath: string): { found: boolean; nodes: FileTreeNode[] } {
  let found = false
  const next: FileTreeNode[] = []
  for (const node of nodes) {
    if (node.path === targetPath) {
      found = true
      continue
    }
    if (!node.children) {
      next.push(node)
      continue
    }

    const result = removeProjectFileNode(node.children, targetPath)
    if (!result.found) {
      next.push(node)
      continue
    }
    found = true
    next.push({ ...node, children: result.nodes })
  }

  return { found, nodes: next }
}

function applyProjectFileTreeChange(
  nodes: FileTreeNode[],
  directory: string,
  relativePath: string,
  event: ProjectFileChange,
  kind?: ProjectFileKind,
): { applied: boolean; nodes: FileTreeNode[] } {
  const normalizedPath = normalizeProjectFilePath(relativePath)
  if (!normalizedPath) return { applied: false, nodes }
  if (event === "change") return { applied: true, nodes }

  if (event === "unlink") {
    const result = removeProjectFileNode(nodes, normalizedPath)
    return { applied: result.found, nodes: result.nodes }
  }

  if (!kind) return { applied: false, nodes }
  const segments = normalizedPath.split("/")
  const name = segments.at(-1)
  if (!name) return { applied: false, nodes }
  const nextNode: FileTreeNode = {
    id: `${directory.replace(/\\/g, "/")}/${normalizedPath}`,
    name,
    path: normalizedPath,
    type: kind === "directory" ? "folder" : getFileTypeByName(name),
    ...(kind === "directory" ? { children: [] } : {}),
  }
  const parentPath = segments.slice(0, -1).join("/") || "."
  if (parentPath === ".") {
    if (nodes.some((node) => node.path === normalizedPath)) return { applied: true, nodes }
    return { applied: true, nodes: sortProjectFileNodes([...nodes, nextNode]) }
  }

  const result = insertProjectFileNode(nodes, parentPath, nextNode)
  return { applied: result.found, nodes: result.nodes }
}

function parseProjectFileEvent(event: OpenCodeEvent) {
  const payload = event.payload ?? event
  if (payload.type !== "file.watcher.updated") return null
  const properties = payload.properties ?? {}
  if (typeof properties.file !== "string") return null
  if (properties.event !== "add" && properties.event !== "change" && properties.event !== "unlink") return null

  return {
    event: properties.event,
    file: properties.file,
    kind: properties.kind === "directory" || properties.kind === "file" ? properties.kind : undefined,
  } satisfies { event: ProjectFileChange; file: string; kind?: ProjectFileKind }
}

export function useProjectContextFiles({ activeProjectPath }: UseProjectContextFilesOptions) {
  const [previewFile, setPreviewFile] = useState<FileNode | null>(null)
  const [contextFileTree, setContextFileTree] = useState<FileTreeNode[]>([])
  const [contextFileTreeLoading, setContextFileTreeLoading] = useState(false)
  const [contextFileTreeError, setContextFileTreeError] = useState<string | null>(null)
  const [contextFileTreeVersion, setContextFileTreeVersion] = useState(0)
  const contextFileTreeRef = useRef<FileTreeNode[]>([])

  const triggerContextFileTreeReload = useCallback(() => {
    setContextFileTreeVersion((current) => current + 1)
  }, [])

  const commitContextFileTree = useCallback((tree: FileTreeNode[]) => {
    contextFileTreeRef.current = tree
    setContextFileTree(tree)
  }, [])

  const applyProjectFileChange = useCallback((relativePath: string, event: ProjectFileChange, kind?: ProjectFileKind) => {
    if (!activeProjectPath) return
    const result = applyProjectFileTreeChange(contextFileTreeRef.current, activeProjectPath, relativePath, event, kind)
    if (!result.applied) {
      triggerContextFileTreeReload()
      return
    }
    if (result.nodes !== contextFileTreeRef.current) commitContextFileTree(result.nodes)
  }, [activeProjectPath, commitContextFileTree, triggerContextFileTreeReload])

  const openProjectFile = useCallback(async (file: FileTreeNode) => {
    if (!activeProjectPath) return
    const queryPath = toRelativePath(activeProjectPath, file.absolute || file.path || file.id)
    setPreviewFile({ ...file, contentLoading: true, contentError: null, contentType: undefined })

    try {
      const response = await readProjectFileContent(activeProjectPath, queryPath)
      setPreviewFile({
        ...file,
        content: response.type === "text" ? decodeTextContent(response.content, response.encoding) : undefined,
        contentType: response.type,
        contentLoading: false,
        contentError: null,
      })
    } catch (error) {
      setPreviewFile({
        ...file,
        contentLoading: false,
        contentError: error instanceof Error ? error.message : getApiErrorMessage(error),
        contentType: "text",
      })
    }
  }, [activeProjectPath])

  const createContextProjectFile = useCallback(async (directory: string, itemName?: string) => {
    if (!activeProjectPath) return
    const fileName = itemName ?? window.prompt("輸入新檔名", "")?.trim()
    if (!fileName) return

    try {
      const response = await createOrUpdateProjectFile({ directory: activeProjectPath, path: combineRelativePath(directory, fileName), content: "" })
      setContextFileTreeError(null)
      applyProjectFileChange(response.path, "add", "file")
    } catch (error) {
      setContextFileTreeError(getApiErrorMessage(error))
    }
  }, [activeProjectPath, applyProjectFileChange])

  const createContextProjectFolder = useCallback(async (directory: string, itemName?: string) => {
    if (!activeProjectPath) return
    const folderName = itemName ?? window.prompt("輸入新資料夾名稱", "")?.trim()
    if (!folderName) return

    try {
      const response = await createProjectDirectory({ directory: activeProjectPath, path: combineRelativePath(directory, folderName) })
      setContextFileTreeError(null)
      applyProjectFileChange(response.path, "add", "directory")
    } catch (error) {
      setContextFileTreeError(getApiErrorMessage(error))
    }
  }, [activeProjectPath, applyProjectFileChange])

  const uploadContextFiles = useCallback(async (files: readonly File[], directory: string) => {
    if (!activeProjectPath) return
    const list = Array.from(files)
    if (list.length === 0) return
    setContextFileTreeLoading(true)

    try {
      const targetDirectory = normalizeDirectoryInput(directory)
      const responses = await Promise.all(list.map(async (item) => createOrUpdateProjectFile({
          directory: activeProjectPath,
          path: combineRelativePath(targetDirectory, item.name),
          content: await readFileAsBase64(item),
          encoding: "base64",
          overwrite: true,
        })))
      setContextFileTreeError(null)
      responses.forEach((response) => applyProjectFileChange(response.path, "add", "file"))
    } catch (error) {
      setContextFileTreeError(getApiErrorMessage(error))
    } finally {
      setContextFileTreeLoading(false)
    }
  }, [activeProjectPath, applyProjectFileChange])

  const deleteContextNode = useCallback(async (node: FileTreeNode) => {
    if (!activeProjectPath) return
    const nodePath = normalizeDirectoryInput(node.path || toRelativePath(activeProjectPath, node.absolute || node.id))
    if (!nodePath || nodePath === ".") {
      setContextFileTreeError("無法刪除此節點。")
      return
    }

    try {
      const response = await deleteProjectFile({ directory: activeProjectPath, path: nodePath, recursive: node.type === "folder" })
      setContextFileTreeError(null)
      applyProjectFileChange(response.path, "unlink")
    } catch (error) {
      setContextFileTreeError(getApiErrorMessage(error))
    }
  }, [activeProjectPath, applyProjectFileChange])

  useEffect(() => {
    if (!activeProjectPath) return
    const controller = new AbortController()
    void buildWorkspaceFileTree(activeProjectPath, controller.signal)
      .then((tree) => { if (!controller.signal.aborted) commitContextFileTree(tree) })
      .catch((error) => {
        if (!controller.signal.aborted) {
           commitContextFileTree([])
          setContextFileTreeError(error instanceof Error ? error.message : "讀取專案檔案樹失敗。")
        }
      })
      .finally(() => { if (!controller.signal.aborted) setContextFileTreeLoading(false) })
    return () => controller.abort()
  }, [activeProjectPath, commitContextFileTree, contextFileTreeVersion])

  useEffect(() => {
    if (!activeProjectPath) return
    const controller = new AbortController()
    void consumeProjectFileEvents(activeProjectPath, (event) => {
      const change = parseProjectFileEvent(event)
      if (!change) return
      applyProjectFileChange(change.file, change.event, change.kind)
    }, controller.signal).catch((error: unknown) => {
      if (!controller.signal.aborted) setContextFileTreeError(getApiErrorMessage(error))
    })
    return () => controller.abort()
  }, [activeProjectPath, applyProjectFileChange])

  return {
    contextFileTree,
    contextFileTreeError: activeProjectPath ? contextFileTreeError : "尚未啟用專案，請先到側邊欄開啟專案。",
    contextFileTreeLoading: activeProjectPath ? contextFileTreeLoading : false,
    createContextProjectFile,
    createContextProjectFolder,
    deleteContextNode,
    openProjectFile,
    previewFile,
    reloadContextFileTree: triggerContextFileTreeReload,
    setPreviewFile,
    setContextFileTreeError,
    uploadContextFiles,
  }
}
