import { createOrUpdateProjectFile, readProjectFileContent } from "@/features/workspace/api/files"
import { abortSession, listSessionMessages, sendSessionPrompt } from "@/features/workspace/api/messages"
import { createProjectSession } from "@/features/workspace/api/sessions"
import { listPlatformExtensions, loadPlatformExtensionFrontend } from "@/shared/api/platformExtensions"

export type ExtensionAgentPromptInput = {
  agent: string
  prompt: string
  timeoutMs?: number
  title?: string
}

export type ExtensionActionContext = {
  openEditor: () => void
  projectName: string
  projectPath: string
}

export type ExtensionActionHandle = {
  destroy?: () => void
}

export type ExtensionHost = {
  extensionId: string
  hostVersion: string
  api: {
    readProjectFile: (path: string) => Promise<unknown>
    writeProjectFile: (input: { content: string; encoding?: "base64"; overwrite?: boolean; path: string }) => Promise<void>
    executeAgentPrompt: (input: ExtensionAgentPromptInput) => Promise<unknown>
  }
  ui: {
    announce: (message: string) => void
    showError: (message: string) => void
  }
}

export type ExtensionRuntime = {
  extensionId?: string
  version?: string
  capabilities?: string[]
  contextAction?: {
    mount?: (container: HTMLElement, context: ExtensionActionContext) => Promise<ExtensionActionHandle | void> | ExtensionActionHandle | void
  }
  editor?: {
    mount?: (container: HTMLElement, context: unknown) => Promise<{ destroy?: () => void } | void>
  }
  attachments?: {
    prepare?: (file: File, context: { projectName: string; projectPath: string }) => Promise<{ meta?: string; name: string; path: string } | void>
  }
}

export type ExtensionModule = {
  activate?: (host: ExtensionHost) => Promise<ExtensionRuntime>
  deactivate?: () => Promise<void>
}

export async function preparePlatformExtensionAttachment(
  file: File,
  options: { projectName: string; projectPath: string; signal?: AbortSignal },
): Promise<{ meta?: string; name: string; path: string } | null> {
  const signal = options.signal ?? new AbortController().signal
  const catalog = await listPlatformExtensions({ project: options.projectName, scope: "project" }, { signal })

  for (const extension of catalog.extensions.filter((entry) => entry.installed)) {
    const extensionId = extension.extensionId ?? extension.id
    let extensionModule: ExtensionModule | undefined
    let objectURL: string | undefined
    let hasPrepareHandler = false
    try {
      const source = await loadPlatformExtensionFrontend(extensionId, { project: options.projectName, scope: "project" }, { signal })
      objectURL = URL.createObjectURL(new Blob([source], { type: "text/javascript" }))
      extensionModule = await import(/* @vite-ignore */ objectURL) as ExtensionModule
      if (!extensionModule.activate) continue
      const runtime = await extensionModule.activate(createExtensionHost(extensionId, options.projectPath, signal, () => undefined, () => undefined))
      const prepare = runtime?.attachments?.prepare
      if (!prepare) continue
      hasPrepareHandler = true
      const prepared = await prepare(file, { projectName: options.projectName, projectPath: options.projectPath })
      if (prepared?.name && prepared.path) return prepared
    } catch (error) {
      if (signal.aborted || hasPrepareHandler) throw error
    } finally {
      await extensionModule?.deactivate?.()
      if (objectURL) URL.revokeObjectURL(objectURL)
    }
  }

  return null
}

export function createExtensionHost(
  extensionId: string,
  projectPath: string,
  signal: AbortSignal,
  announce: (message: string) => void,
  showError: (message: string) => void,
): ExtensionHost {
  return {
    extensionId,
    hostVersion: "1.0.0",
    api: {
      executeAgentPrompt: async (input) => {
        const agent = input.agent?.trim()
        const prompt = input.prompt?.trim()
        if (!agent) throw new Error("Extension agent prompt 缺少 agent。")
        if (!prompt) throw new Error("Extension agent prompt 缺少 prompt。")
        const timeoutMs = Math.max(15_000, Math.min(120_000, input.timeoutMs ?? 90_000))
        const session = await createProjectSession(projectPath, {
          title: input.title?.trim() || `${extensionId} extension agent`,
        }, { signal })

        try {
          await sendSessionPrompt(session.id, projectPath, { agent, text: prompt }, { signal })
          const deadline = Date.now() + timeoutMs
          while (Date.now() <= deadline) {
            const messages = await listSessionMessages(session.id, projectPath, { signal })
            const response = [...messages].reverse().find((message) => message.info.role === "assistant")
            const responseError = response?.info.error?.data?.message
            if (responseError) throw new Error(responseError)
            if (response?.info.time?.completed) return response
            await waitForExtensionAgent(750, signal)
          }
          throw new Error(`Agent 在 ${Math.round(timeoutMs / 1000)} 秒內未完成。`)
        } catch (error) {
          await abortSession(session.id, projectPath).catch(() => undefined)
          throw error
        }
      },
      readProjectFile: async (path) => readProjectFileContent(projectPath, path, { signal }),
      writeProjectFile: async (input) => {
        await createOrUpdateProjectFile({
          content: input.content,
          directory: projectPath,
          ...(input.encoding ? { encoding: input.encoding } : {}),
          overwrite: input.overwrite ?? true,
          path: input.path,
        }, { signal })
      },
    },
    ui: { announce, showError },
  }
}

function waitForExtensionAgent(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("The operation was aborted", "AbortError"))
      return
    }
    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener("abort", abort)
      resolve()
    }, delayMs)
    const abort = () => {
      window.clearTimeout(timeoutId)
      reject(new DOMException("The operation was aborted", "AbortError"))
    }
    signal.addEventListener("abort", abort, { once: true })
  })
}
