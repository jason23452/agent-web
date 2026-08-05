import { useCallback, useEffect, useRef, useState } from "react"
import { createOrUpdateProjectFile, createProjectDirectory, deleteProjectFile, getFileTypeByName, projectFileExists, readProjectFileContent } from "@/features/workspace/api/files"
import { ApiError, getApiErrorMessage } from "@/shared/api"
import { consumeProjectFileEvents, type OpenCodeEvent } from "@/shared/api/opencodeEvents"
import type { FileNode } from "@/shared/types/workspace"
import type { FileTreeNode } from "@/shared/components/layout/context/FileTree"
import type { ProjectUploadEntry } from "@/shared/components/layout/context/fileUpload"
import {
  buildWorkspaceFileTree,
  combineRelativePath,
  decodeTextContent,
  normalizeDirectoryInput,
  readFileAsBase64,
  toRelativePath,
} from "@/shared/utils/appRouterUtils"
import { createStoredZip, downloadBytes, type DownloadArchiveEntry } from "@/shared/utils/projectFileDownload"

type UseProjectContextFilesOptions = {
  activeProjectPath: string | null
}

export type ProjectFileUploadProgress = {
  completed: number
  currentPath: string | null
  total: number
}

type ProjectFileChange = "add" | "change" | "unlink"
type ProjectFileKind = "directory" | "file"

function normalizeProjectFilePath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/^\/+|\/+$/g, "")
}

function isExistingDirectoryError(error: unknown) {
  return error instanceof ApiError && error.status === 409 && error.code === "FILE_ALREADY_EXISTS"
}

function decodeBase64Bytes(value: string) {
  const binary = atob(value.replace(/\s/g, ""))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function findProjectFileNode(nodes: FileTreeNode[], targetPath: string): FileTreeNode | undefined {
  for (const node of nodes) {
    if (node.path === targetPath) return node
    if (node.children) {
      const match = findProjectFileNode(node.children, targetPath)
      if (match) return match
    }
  }
  return undefined
}

async function buildDownloadEntries(directory: string, node: FileTreeNode, archivePath = node.name): Promise<DownloadArchiveEntry[]> {
  if (node.type !== "folder") {
    const path = normalizeDirectoryInput(node.path || node.name)
    const response = await readProjectFileContent(directory, path)
    const content = response.encoding === "base64" || response.type === "binary"
      ? decodeBase64Bytes(response.content)
      : new TextEncoder().encode(response.content)
    return [{ content, name: archivePath }]
  }

  const entries: DownloadArchiveEntry[] = [{ content: new Uint8Array(), name: `${archivePath}/` }]
  for (const child of node.children ?? []) {
    entries.push(...await buildDownloadEntries(directory, child, `${archivePath}/${child.name}`))
  }
  return entries
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
  const [contextFileTreeUploading, setContextFileTreeUploading] = useState(false)
  const [contextFileTreeUploadProgress, setContextFileTreeUploadProgress] = useState<ProjectFileUploadProgress | null>(null)
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

  const uploadContextFiles = useCallback(async (files: readonly ProjectUploadEntry[], directory: string) => {
    if (!activeProjectPath) return
    const list = Array.from(files)
    if (list.length === 0) return
    const targetDirectory = normalizeDirectoryInput(directory)
    const directoryPaths = new Set<string>()
    list.forEach((item) => {
      const relativePath = normalizeProjectFilePath(item.relativePath)
      const segments = relativePath.split("/").filter(Boolean)
      const end = item.kind === "directory" ? segments.length : Math.max(0, segments.length - 1)
      for (let index = 1; index <= end; index += 1) directoryPaths.add(segments.slice(0, index).join("/"))
    })
    const sortedDirectoryPaths = Array.from(directoryPaths).sort((first, second) => first.split("/").length - second.split("/").length)
    const fileItems = list.filter((item): item is Extract<ProjectUploadEntry, { kind: "file" }> => item.kind === "file")
    const total = Math.max(1, sortedDirectoryPaths.length + fileItems.length)
    let completed = 0
    const updateUploadProgress = (currentPath: string | null) => {
      setContextFileTreeUploadProgress({ completed, currentPath, total })
    }

    setContextFileTreeUploading(true)
    updateUploadProgress(null)

    try {
      const directoryResponses: Array<{ path: string } | null> = []
      for (const relativePath of sortedDirectoryPaths) {
        const path = combineRelativePath(targetDirectory, relativePath)
        updateUploadProgress(`建立資料夾：${relativePath}`)
        const existing = await projectFileExists(activeProjectPath, path)
        if (existing.exists) {
          if (existing.type !== "directory") throw new Error(`上傳路徑不是資料夾：${path}`)
          directoryResponses.push(null)
          completed += 1
          updateUploadProgress(relativePath)
          continue
        }

        try {
          directoryResponses.push(await createProjectDirectory({ directory: activeProjectPath, path }))
        } catch (error) {
          if (isExistingDirectoryError(error)) directoryResponses.push(null)
          else throw error
        }
        completed += 1
        updateUploadProgress(relativePath)
      }
      directoryResponses.forEach((response) => {
        if (response) applyProjectFileChange(response.path, "add", "directory")
      })

      const responses = await Promise.all(fileItems.map(async (item) => {
        updateUploadProgress(`上傳檔案：${item.relativePath}`)
        const response = await createOrUpdateProjectFile({
          directory: activeProjectPath,
          path: combineRelativePath(targetDirectory, normalizeProjectFilePath(item.relativePath)),
          content: await readFileAsBase64(item.file),
          encoding: "base64",
          overwrite: true,
        })
        completed += 1
        updateUploadProgress(item.relativePath)
        return response
      }))
      setContextFileTreeError(null)
      responses.forEach((response) => applyProjectFileChange(response.path, "add", "file"))
    } catch (error) {
      setContextFileTreeError(getApiErrorMessage(error))
    } finally {
      setContextFileTreeUploading(false)
      setContextFileTreeUploadProgress(null)
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

  const downloadContextNode = useCallback(async (node: FileTreeNode) => {
    if (!activeProjectPath) return

    try {
      let target = node
      if (node.type === "folder") {
        const tree = await buildWorkspaceFileTree(activeProjectPath, new AbortController().signal)
        target = findProjectFileNode(tree, normalizeDirectoryInput(node.path || node.name)) ?? node
      }

      if (target.type === "folder") {
        const entries = await buildDownloadEntries(activeProjectPath, target)
        downloadBytes(createStoredZip(entries), `${target.name}.zip`, "application/zip")
      } else {
        const path = normalizeDirectoryInput(target.path || target.name)
        const response = await readProjectFileContent(activeProjectPath, path)
        const bytes = response.encoding === "base64" || response.type === "binary"
          ? decodeBase64Bytes(response.content)
          : new TextEncoder().encode(response.content)
        downloadBytes(bytes, target.name, response.mimeType ?? "application/octet-stream")
      }

      setContextFileTreeError(null)
    } catch (error) {
      setContextFileTreeError(getApiErrorMessage(error))
    }
  }, [activeProjectPath])

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
    contextFileTreeUploading: activeProjectPath ? contextFileTreeUploading : false,
    contextFileTreeUploadProgress: activeProjectPath ? contextFileTreeUploadProgress : null,
    createContextProjectFile,
    createContextProjectFolder,
    deleteContextNode,
    downloadContextNode,
    openProjectFile,
    previewFile,
    reloadContextFileTree: triggerContextFileTreeReload,
    setPreviewFile,
    setContextFileTreeError,
    uploadContextFiles,
  }
}
