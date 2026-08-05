import type { WorkflowV1 } from "@/features/workflows/types"
import { createStoredZip, readZipEntries, type DownloadArchiveEntry } from "@/shared/utils/projectFileDownload"

const WORKFLOW_ARCHIVE_FORMAT = "agent-system.workflow.project-archive"
const WORKFLOW_ARCHIVE_VERSION = 1
const workflowPathPattern = /^workflows\/([a-z0-9][a-z0-9-]{0,79})\.json$/

type WorkflowArchiveManifest = {
  exportedAt: string
  format: typeof WORKFLOW_ARCHIVE_FORMAT
  project: string
  version: typeof WORKFLOW_ARCHIVE_VERSION
  workflows: Array<{ id: string; name: string; path: string }>
}

export function createProjectWorkflowArchive(workflows: readonly WorkflowV1[], project: string) {
  const manifest: WorkflowArchiveManifest = {
    exportedAt: new Date().toISOString(),
    format: WORKFLOW_ARCHIVE_FORMAT,
    project,
    version: WORKFLOW_ARCHIVE_VERSION,
    workflows: workflows.map((workflow) => ({ id: workflow.id, name: workflow.name, path: `workflows/${workflow.id}.json` })),
  }
  const entries: DownloadArchiveEntry[] = [
    { content: encodeJson(manifest), name: "manifest.json" },
    ...workflows.map((workflow) => ({ content: encodeJson(workflow), name: `workflows/${workflow.id}.json` })),
  ]
  return createStoredZip(entries)
}

export async function readProjectWorkflowArchive(file: Blob) {
  const entries = await readZipEntries(file)
  const manifestEntry = entries.find((entry) => entry.name === "manifest.json")
  if (!manifestEntry) throw new Error("找不到 workflow 壓縮包 manifest.json。")

  const manifest = parseJson<WorkflowArchiveManifest>(manifestEntry.content, "manifest.json")
  if (manifest.format !== WORKFLOW_ARCHIVE_FORMAT || manifest.version !== WORKFLOW_ARCHIVE_VERSION || !Array.isArray(manifest.workflows)) {
    throw new Error("這不是有效的 Project workflow 壓縮包。")
  }

  const workflowEntries = new Map(entries.map((entry) => [entry.name, entry]))
  const workflows: WorkflowV1[] = []
  for (const item of manifest.workflows) {
    if (!item || typeof item.id !== "string" || typeof item.name !== "string" || typeof item.path !== "string") throw new Error("manifest 的 workflow 項目格式無效。")
    const match = workflowPathPattern.exec(item.path)
    if (!match || match[1] !== item.id) throw new Error(`manifest 的 workflow 路徑無效：${item.path}`)
    const entry = workflowEntries.get(item.path)
    if (!entry) throw new Error(`壓縮包缺少 workflow：${item.id}`)
    workflows.push(parseJson<WorkflowV1>(entry.content, item.path))
  }

  if (workflows.length === 0) throw new Error("壓縮包內沒有可匯入的 workflow。")
  return workflows
}

function encodeJson(value: unknown) {
  return new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`)
}

function parseJson<T>(content: Uint8Array, name: string) {
  try {
    return JSON.parse(new TextDecoder().decode(content)) as T
  } catch {
    throw new Error(`壓縮包內的 ${name} 不是有效 JSON。`)
  }
}
