import { apiRequest, type ApiRequestConfig } from "@/shared/api"
import type { FileType } from "@/shared/types/workspace"

export type OpenCodeProjectFileNode = {
  absolute: string
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
