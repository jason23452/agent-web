import { useCallback, useEffect, useState } from "react"
import { createOrUpdateProjectFile, createProjectDirectory, deleteProjectFile, readProjectFileContent } from "@/features/workspace/api/files"
import { getApiErrorMessage } from "@/shared/api"
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

export function useProjectContextFiles({ activeProjectPath }: UseProjectContextFilesOptions) {
  const [previewFile, setPreviewFile] = useState<FileNode | null>(null)
  const [contextFileTree, setContextFileTree] = useState<FileTreeNode[]>([])
  const [contextFileTreeLoading, setContextFileTreeLoading] = useState(false)
  const [contextFileTreeError, setContextFileTreeError] = useState<string | null>(null)
  const [contextFileTreeVersion, setContextFileTreeVersion] = useState(0)

  const triggerContextFileTreeReload = useCallback(() => {
    setContextFileTreeVersion((current) => current + 1)
  }, [])

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
      await createOrUpdateProjectFile({ directory: activeProjectPath, path: combineRelativePath(directory, fileName), content: "" })
      setContextFileTreeError(null)
      triggerContextFileTreeReload()
    } catch (error) {
      setContextFileTreeError(getApiErrorMessage(error))
    }
  }, [activeProjectPath, triggerContextFileTreeReload])

  const createContextProjectFolder = useCallback(async (directory: string, itemName?: string) => {
    if (!activeProjectPath) return
    const folderName = itemName ?? window.prompt("輸入新資料夾名稱", "")?.trim()
    if (!folderName) return

    try {
      await createProjectDirectory({ directory: activeProjectPath, path: combineRelativePath(directory, folderName) })
      setContextFileTreeError(null)
      triggerContextFileTreeReload()
    } catch (error) {
      setContextFileTreeError(getApiErrorMessage(error))
    }
  }, [activeProjectPath, triggerContextFileTreeReload])

  const uploadContextFiles = useCallback(async (files: readonly File[], directory: string) => {
    if (!activeProjectPath) return
    const list = Array.from(files)
    if (list.length === 0) return
    setContextFileTreeLoading(true)

    try {
      const targetDirectory = normalizeDirectoryInput(directory)
      await Promise.all(list.map(async (item) => createOrUpdateProjectFile({
        directory: activeProjectPath,
        path: combineRelativePath(targetDirectory, item.name),
        content: await readFileAsBase64(item),
        encoding: "base64",
        overwrite: true,
      })))
      setContextFileTreeError(null)
      triggerContextFileTreeReload()
    } catch (error) {
      setContextFileTreeError(getApiErrorMessage(error))
    } finally {
      setContextFileTreeLoading(false)
    }
  }, [activeProjectPath, triggerContextFileTreeReload])

  const deleteContextNode = useCallback(async (node: FileTreeNode) => {
    if (!activeProjectPath) return
    const nodePath = normalizeDirectoryInput(node.path || toRelativePath(activeProjectPath, node.absolute || node.id))
    if (!nodePath || nodePath === ".") {
      setContextFileTreeError("無法刪除此節點。")
      return
    }

    try {
      await deleteProjectFile({ directory: activeProjectPath, path: nodePath, recursive: node.type === "folder" })
      setContextFileTreeError(null)
      triggerContextFileTreeReload()
    } catch (error) {
      setContextFileTreeError(getApiErrorMessage(error))
    }
  }, [activeProjectPath, triggerContextFileTreeReload])

  useEffect(() => {
    if (!activeProjectPath) return
    const controller = new AbortController()
    setContextFileTreeLoading(true)
    setContextFileTreeError(null)
    void buildWorkspaceFileTree(activeProjectPath, controller.signal)
      .then((tree) => { if (!controller.signal.aborted) setContextFileTree(tree) })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setContextFileTree([])
          setContextFileTreeError(error instanceof Error ? error.message : "讀取專案檔案樹失敗。")
        }
      })
      .finally(() => { if (!controller.signal.aborted) setContextFileTreeLoading(false) })
    return () => controller.abort()
  }, [activeProjectPath, contextFileTreeVersion])

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
