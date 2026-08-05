import { apiRequest, type ApiRequestConfig } from "@/shared/api"
import type { FileType } from "@/shared/types/workspace"

export type OpenCodeProjectFileNode = {
  absolute: string
  children?: OpenCodeProjectFileNode[]
  ignored: boolean
  name: string
  path: string
  type: "directory" | "file"
}

export type OpenCodeFileContent = {
  content: string
  encoding?: "base64"
  mimeType?: string
  type: "binary" | "text"
}

export type OpenCodeProjectFileWriteInput = {
  directory: string
  path: string
  content: string
  encoding?: "base64"
  overwrite?: boolean
}

export type OpenCodeProjectFileDeleteInput = {
  directory: string
  path: string
  recursive?: boolean
}

export type OpenCodeProjectDirectoryInput = {
  directory: string
  path: string
}

export function listProjectFiles(directory: string, path: string, config?: ApiRequestConfig) {
  return apiRequest<OpenCodeProjectFileNode[]>("/bff/opencode-proxy/file", {
    ...config,
    query: {
      ...config?.query,
      directory,
      path,
    },
  })
}

export function listProjectFileTree(directory: string, config?: ApiRequestConfig) {
  return apiRequest<OpenCodeProjectFileNode[]>("/bff/files/tree", {
    ...config,
    query: {
      ...config?.query,
      directory,
    },
  })
}

export function readProjectFileContent(directory: string, path: string, config?: ApiRequestConfig) {
  return apiRequest<OpenCodeFileContent>("/bff/opencode-proxy/file/content", {
    ...config,
    query: {
      ...config?.query,
      directory,
      path,
    },
  })
}

export function createOrUpdateProjectFile(body: OpenCodeProjectFileWriteInput, config?: ApiRequestConfig) {
  return apiRequest<{ path: string }>("/bff/files", {
    ...config,
    method: "POST",
    body,
  })
}

export function deleteProjectFile(body: OpenCodeProjectFileDeleteInput, config?: ApiRequestConfig) {
  return apiRequest<{ path: string }>("/bff/files", {
    ...config,
    method: "DELETE",
    body,
  })
}

export function createProjectDirectory(body: OpenCodeProjectDirectoryInput, config?: ApiRequestConfig) {
  return apiRequest<{ path: string }>("/bff/files/folder", {
    ...config,
    method: "POST",
    body,
  })
}

export function getFileTypeByName(name: string): FileType {
  const lower = name.toLowerCase()

  if (lower.endsWith(".tsx")) return "tsx"
  if (lower.endsWith(".ts")) return "ts"
  if (lower.endsWith(".css")) return "css"
  if (lower.endsWith(".html")) return "html"
  if (lower.endsWith(".md")) return "md"
  if (lower.endsWith(".json")) return "json"

  const imageExtensions = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico", "avif", "heic"]
  if (imageExtensions.some((extension) => lower.endsWith(`.${extension}`))) return "img"

  return "file"
}
