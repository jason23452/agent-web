import { ApiError } from "@/shared/api"
import { WORKSPACE_PROJECT_ROUTE_PREFIX } from "@/features/workspace/router/[name]"
import { HOME_ROUTE_PATH } from "@/features/home/router"
import { WORKSPACE_ROUTE_PATH } from "@/features/workspace/router"
import { WORKFLOWS_ROUTE_PATH } from "@/features/workflows/constants"
import { EXTENSION_ROUTE_SEGMENT } from "@/features/extensions/constants"
import { getFileTypeByName, listProjectFiles } from "@/features/workspace/api/files"
import { getOpenCodeRuntimeOperation, getOpenCodeRuntimeStatus } from "@/shared/api/opencodeRuntime"
import type { OpenCodeRuntimeOperation } from "@/shared/api/opencodeRuntime"
import { type OpenCodeProjectFileNode } from "@/features/workspace/api/files"
import type { FileTreeNode } from "@/shared/components/layout/context/FileTree"

export type AppRoute =
  | { name: "home" }
  | { name: "workspace" }
  | { name: "workspaceProject"; projectName: string; sessionId?: string }
  | { extensionId: string; filePath?: string; name: "extension"; projectName: string }
  | { name: "workflows"; projectName?: string }

export const OPENCODE_RESTART_WAIT_TIMEOUT_MS = 70_000
export const OPENCODE_RESTART_POLL_MS = 1_000

export function readBrowserRoute(): AppRoute {
  const pathname = window.location.pathname.replace(/\/+$/, "") || HOME_ROUTE_PATH

  if (pathname === WORKFLOWS_ROUTE_PATH) {
    const projectName = new URLSearchParams(window.location.search).get("project")?.trim()
    return projectName ? { name: "workflows", projectName } : { name: "workflows" }
  }

  if (pathname === WORKSPACE_ROUTE_PATH) {
    return { name: "workspace" }
  }

  if (pathname.startsWith(`${WORKSPACE_PROJECT_ROUTE_PREFIX}/`)) {
    const segments = pathname.slice(`${WORKSPACE_PROJECT_ROUTE_PREFIX}/`.length).split("/")
    const encodedProjectName = segments[0]
    if (!encodedProjectName) return { name: "workspace" }

    try {
      const projectName = decodeURIComponent(encodedProjectName)
      if (segments[1] === EXTENSION_ROUTE_SEGMENT && segments[2]) {
        const filePath = new URLSearchParams(window.location.search).get("file")?.trim()
        return { extensionId: decodeURIComponent(segments[2]), ...(filePath ? { filePath } : {}), name: "extension", projectName }
      }
      if (segments[1] === "session" && segments[2]) {
        return { name: "workspaceProject", projectName, sessionId: decodeURIComponent(segments[2]) }
      }
      return { name: "workspaceProject", projectName }
    } catch {
      return { name: "workspace" }
    }
  }

  return { name: "home" }
}

export function getRoutePath(route: AppRoute) {
  if (route.name === "workspace") return WORKSPACE_ROUTE_PATH
  if (route.name === "workspaceProject") {
    const projectPath = `${WORKSPACE_PROJECT_ROUTE_PREFIX}/${encodeURIComponent(route.projectName)}`
    return route.sessionId ? `${projectPath}/session/${encodeURIComponent(route.sessionId)}` : projectPath
  }
  if (route.name === "extension") {
    const path = `${WORKSPACE_PROJECT_ROUTE_PREFIX}/${encodeURIComponent(route.projectName)}/${EXTENSION_ROUTE_SEGMENT}/${encodeURIComponent(route.extensionId)}`
    return route.filePath ? `${path}?file=${encodeURIComponent(route.filePath)}` : path
  }
  if (route.name === "workflows") {
    return route.projectName ? `${WORKFLOWS_ROUTE_PATH}?project=${encodeURIComponent(route.projectName)}` : WORKFLOWS_ROUTE_PATH
  }

  return HOME_ROUTE_PATH
}

export function getProjectRouteName(projectPath: string) {
  const normalizedPath = projectPath.replace(/\\/g, "/").replace(/\/+$/, "")
  const name = normalizedPath.split("/").filter(Boolean).at(-1)

  return name || "project"
}

function normalizePath(value: string) {
  return value.replace(/\\/g, "/").replace(/\/+$/, "")
}

export function normalizeDirectoryInput(path: string) {
  const normalized = normalizePath(path).replace(/^\.\/+/, "").trim()

  if (!normalized || normalized === ".") return "."
  return normalized
}

export function combineRelativePath(directory: string, entryName: string) {
  const normalizedDirectory = normalizeDirectoryInput(directory)
  const normalizedName = normalizeDirectoryInput(entryName)

  if (!normalizedName || normalizedName === ".") return normalizedDirectory === "." ? normalizedName : normalizedDirectory
  if (!normalizedDirectory || normalizedDirectory === ".") return normalizedName

  return `${normalizedDirectory}/${normalizedName}`
}

export function readFileAsBase64(file: File) {
  return file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer)
    let raw = ""

    for (let i = 0; i < bytes.length; i += 8_192) {
      const chunk = bytes.subarray(i, i + 8_192)
      raw += String.fromCharCode(...chunk)
    }

    return btoa(raw)
  })
}

export function toRelativePath(directory: string, absolutePath: string) {
  const normalizedDirectory = normalizePath(directory)
  const normalizedPath = normalizePath(absolutePath)

  if (!normalizedDirectory || !normalizedPath) return normalizeDirectoryInput(absolutePath)

  if (!normalizedPath.startsWith(normalizedDirectory)) {
    return normalizeDirectoryInput(absolutePath)
  }

  const relativePath = normalizedPath.slice(normalizedDirectory.length)

  return normalizeDirectoryInput(relativePath)
}

export function toFileTreeId(directory: string, file: OpenCodeProjectFileNode, fallbackPath?: string) {
  if (file.absolute) return file.absolute

  const candidatePath = normalizeDirectoryInput(fallbackPath || file.path || file.name)
  const normalizedDirectory = normalizeDirectoryInput(directory)
  const relativePath = candidatePath ? toRelativePath(directory, candidatePath) : "."

  return relativePath === "." ? normalizedDirectory || "root" : `${normalizedDirectory}/${relativePath}`
}

export function decodeTextContent(raw: string, encoding: string | undefined) {
  if (encoding !== "base64") return raw

  try {
    const binary = atob(raw)
    const bytes = new Uint8Array(binary.length)

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }

    return new TextDecoder().decode(bytes)
  } catch {
    return raw
  }
}

function sortWorkspaceFiles(first: OpenCodeProjectFileNode, second: OpenCodeProjectFileNode) {
  if (first.type !== second.type) {
    return first.type === "directory" ? -1 : 1
  }

  return first.name.localeCompare(second.name, "zh-Hant", { sensitivity: "base" })
}

export async function buildWorkspaceFileTree(directory: string, signal: AbortSignal): Promise<FileTreeNode[]> {
  const cache = new Map<string, OpenCodeProjectFileNode[]>()

  async function listDirectory(path: string) {
    const normalizedPath = normalizeDirectoryInput(path)

    if (cache.has(normalizedPath)) return cache.get(normalizedPath) ?? []

    const next = await listProjectFiles(directory, normalizedPath, { signal })
    const filtered = next
      .filter((item) => !item.ignored)
      .slice()
      .sort(sortWorkspaceFiles)

    cache.set(normalizedPath, filtered)

    return filtered
  }

  async function buildNodes(path: string): Promise<FileTreeNode[]> {
    const entries = await listDirectory(path)

    return Promise.all(
      entries.map(async (entry) => {
        const candidatePath = entry.path || entry.absolute || (path === "." ? entry.name : `${path}/${entry.name}`)
        const queryPath = toRelativePath(directory, candidatePath)

        if (entry.type === "directory") {
          const children = await buildNodes(queryPath)

          return {
            id: toFileTreeId(directory, entry, queryPath),
            name: entry.name,
            type: "folder",
            path: queryPath,
            children,
          } satisfies FileTreeNode
        }

        return {
          id: toFileTreeId(directory, entry, queryPath),
          name: entry.name,
          path: queryPath,
          type: getFileTypeByName(entry.name),
        } satisfies FileTreeNode
      }),
    )
  }

  return buildNodes(".")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isRuntimeOperation(value: unknown): value is OpenCodeRuntimeOperation {
  return isRecord(value) && typeof value.operationID === "string" && typeof value.status === "string"
}

export function getRestartInProgressOperation(error: unknown): OpenCodeRuntimeOperation | null {
  if (!(error instanceof ApiError)) return null
  if (error.status !== 409 || error.code !== "OPENCODE_RESTART_IN_PROGRESS") return null

  return isRuntimeOperation(error.details) ? error.details : null
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export async function waitForOpenCodeRestartOperation(operationID: string) {
  const deadline = Date.now() + OPENCODE_RESTART_WAIT_TIMEOUT_MS

  while (Date.now() <= deadline) {
    const { operation } = await getOpenCodeRuntimeOperation(operationID)
    if (operation.status === "ready") return operation
    if (operation.status === "failed") {
      throw new Error(operation.error || "OpenCode runtime restart failed.")
    }

    await sleep(OPENCODE_RESTART_POLL_MS)
  }

  throw new Error("OpenCode runtime restart did not finish before the timeout.")
}

export async function waitForOpenCodeRuntimeReady() {
  const deadline = Date.now() + OPENCODE_RESTART_WAIT_TIMEOUT_MS

  while (Date.now() <= deadline) {
    const status = await getOpenCodeRuntimeStatus()
    if (!status.operation && status.upstream.ready) return
    if (status.operation?.status === "ready" && status.upstream.ready) return
    if (status.operation?.status === "failed") {
      throw new Error(status.operation.error || "OpenCode runtime restart failed.")
    }

    await sleep(OPENCODE_RESTART_POLL_MS)
  }

  throw new Error("OpenCode runtime did not become ready before the timeout.")
}
