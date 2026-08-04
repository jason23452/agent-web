import { useCallback, useEffect, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { createOrUpdateProjectFile } from "@/features/workspace/api/files"
import { createProjectSession, toWorkspaceSession } from "@/features/workspace/api/sessions"
import { listSessionMessages, sendSessionPrompt, toWorkspaceMessages } from "@/features/workspace/api/messages"
import { consumeOpenCodeEvents, type OpenCodeEvent } from "@/shared/api/opencodeEvents"
import { getApiErrorMessage } from "@/shared/api"
import { readFileAsBase64 } from "@/shared/utils/appRouterUtils"
import type { Agent, Attachment, ModelOption, PinContext, Session, WorkspaceMessage } from "@/shared/types/workspace"
import type { OpenCodeSession } from "@/features/workspace/api/sessions"

function formatAttachmentSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getEventPayload(event: OpenCodeEvent) {
  return event.payload ?? event
}

type UseWorkspaceChatOptions = {
  activeAgent: Agent
  activeProjectPath: string | null
  activeSessionId: string | null
  emptyAgentId: string
  reloadContextFileTree: () => void
  selectedModel: ModelOption | null
  selectedThinkingVariant: string
  setActiveSessionId: (sessionId: string) => void
  setOpenCodeSessions: Dispatch<SetStateAction<OpenCodeSession[]>>
  setProjectSessions: Dispatch<SetStateAction<Session[]>>
}

export function useWorkspaceChat({
  activeAgent,
  activeProjectPath,
  activeSessionId,
  emptyAgentId,
  reloadContextFileTree,
  selectedModel,
  selectedThinkingVariant,
  setActiveSessionId,
  setOpenCodeSessions,
  setProjectSessions,
}: UseWorkspaceChatOptions) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [workspaceMessages, setWorkspaceMessages] = useState<WorkspaceMessage[]>([])
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messageSending, setMessageSending] = useState(false)

  const loadWorkspaceMessages = useCallback(async (sessionID: string, directory: string, signal?: AbortSignal, options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading !== false
    if (showLoading) setMessagesLoading(true)
    setMessagesError(null)
    try {
      const response = await listSessionMessages(sessionID, directory, { signal })
      if (signal?.aborted) return response
      setWorkspaceMessages(toWorkspaceMessages(response))
      return response
    } catch (error) {
      if (!signal?.aborted) {
        setWorkspaceMessages([])
        setMessagesError(getApiErrorMessage(error))
      }
      return null
    } finally {
      if (showLoading && !signal?.aborted) setMessagesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!activeProjectPath || !activeSessionId) {
      const timeoutId = window.setTimeout(() => {
        setWorkspaceMessages([])
        setMessagesError(null)
        setMessagesLoading(false)
      }, 0)
      return () => window.clearTimeout(timeoutId)
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => void loadWorkspaceMessages(activeSessionId, activeProjectPath, controller.signal), 0)
    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [activeProjectPath, activeSessionId, loadWorkspaceMessages])

  useEffect(() => {
    if (!activeProjectPath) return
    const controller = new AbortController()
    void consumeOpenCodeEvents(activeProjectPath, (event) => {
      const payload = getEventPayload(event)
      const properties = payload.properties ?? {}
      const sessionID = typeof properties.sessionID === "string" ? properties.sessionID : undefined
      if (payload.type === "session.status" && sessionID === activeSessionId) {
        const status = properties.status
        if (status && typeof status === "object" && "type" in status && status.type === "idle") {
          setMessageSending(false)
          void loadWorkspaceMessages(activeSessionId, activeProjectPath, undefined, { showLoading: false })
        }
      }
      if ((payload.type === "message.updated" || payload.type === "message.part.updated" || payload.type === "session.idle") && sessionID === activeSessionId) {
        void loadWorkspaceMessages(activeSessionId, activeProjectPath, undefined, { showLoading: false })
      }
      if (payload.type === "file.edited") reloadContextFileTree()
    }, controller.signal).catch((error) => {
      if (!controller.signal.aborted) console.warn(getApiErrorMessage(error))
    })
    return () => controller.abort()
  }, [activeProjectPath, activeSessionId, loadWorkspaceMessages, reloadContextFileTree])

  const uploadChatFiles = useCallback(async (files: readonly File[]) => {
    if (!activeProjectPath) throw new Error("請先開啟專案後再上傳檔案。")
    const uploaded = await Promise.all(Array.from(files).map(async (file) => {
      await createOrUpdateProjectFile({
        content: await readFileAsBase64(file),
        directory: activeProjectPath,
        encoding: "base64",
        overwrite: true,
        path: file.name,
      })
      return {
        id: file.name,
        isImage: file.type.startsWith("image/"),
        meta: formatAttachmentSize(file.size),
        name: file.name,
        path: file.name,
      } satisfies Attachment
    }))
    setAttachments((current) => [...current.filter((item) => !uploaded.some((next) => next.id === item.id)), ...uploaded])
    reloadContextFileTree()
  }, [activeProjectPath, reloadContextFileTree])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id))
  }, [])

  const sendMessage = useCallback(async (text: string, selectedAttachments: Attachment[], context: PinContext | null): Promise<boolean> => {
    if (!activeProjectPath) {
      setMessagesError("請先開啟專案後再傳送訊息。")
      return false
    }
    const promptText = [
      text.trim(),
      context ? `\n\nContext: ${context.label}\n${context.text}` : "",
      selectedAttachments.length > 0 ? `\n\nReferenced project files:\n${selectedAttachments.map((attachment) => `- ${attachment.path ?? attachment.name}`).join("\n")}` : "",
    ].filter(Boolean).join("")
    if (!promptText.trim()) return false

    try {
      let sessionID = activeSessionId
      if (!sessionID) {
        const response = await createProjectSession(activeProjectPath, { title: text.trim().slice(0, 80) || "新對話" })
        const nextSession = toWorkspaceSession(response)
        sessionID = response.id
        setOpenCodeSessions((current) => [response, ...current])
        setProjectSessions((current) => [nextSession, ...current])
        setActiveSessionId(sessionID)
      }
      setMessageSending(true)
      setMessagesError(null)
      await sendSessionPrompt(sessionID, activeProjectPath, {
        agent: activeAgent.id === emptyAgentId ? undefined : activeAgent.id,
        model: selectedModel ? { modelID: selectedModel.id, providerID: selectedModel.providerID, ...(selectedThinkingVariant !== "default" ? { variant: selectedThinkingVariant } : {}) } : undefined,
        text: promptText,
      })
      setAttachments([])
      let attempts = 0
      const refreshUntilComplete = async () => {
        attempts += 1
        const response = await listSessionMessages(sessionID!, activeProjectPath).catch(() => null)
        if (response) {
          setWorkspaceMessages(toWorkspaceMessages(response))
          const lastAssistant = [...response].reverse().find((message) => message.info.role === "assistant")
          if (lastAssistant?.info.time?.completed || lastAssistant?.info.error || attempts >= 120) {
            setMessageSending(false)
            return
          }
        }
        if (attempts < 120) window.setTimeout(() => void refreshUntilComplete(), 1_000)
        else setMessageSending(false)
      }
      window.setTimeout(() => void refreshUntilComplete(), 500)
      return true
    } catch (error) {
      setMessageSending(false)
      setMessagesError(getApiErrorMessage(error))
      return false
    }
  }, [activeAgent.id, activeProjectPath, activeSessionId, emptyAgentId, selectedModel, selectedThinkingVariant, setActiveSessionId, setOpenCodeSessions, setProjectSessions])

  return { attachments, messagesError, messagesLoading, messageSending, removeAttachment, sendMessage, setAttachments, setMessagesError, uploadChatFiles, workspaceMessages }
}
