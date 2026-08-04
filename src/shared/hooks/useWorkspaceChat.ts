import { startTransition, useCallback, useEffect, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { createOrUpdateProjectFile } from "@/features/workspace/api/files"
import { createProjectSession, toWorkspaceSession } from "@/features/workspace/api/sessions"
import { abortSession, applyOpenCodeMessageEvent, listSessionMessages, sendSessionPrompt, toWorkspaceMessages } from "@/features/workspace/api/messages"
import type { OpenCodeMessageEvent, OpenCodeSessionMessage } from "@/features/workspace/api/messages"
import { consumeOpenCodeEvents, type OpenCodeEvent } from "@/shared/api/opencodeEvents"
import { getApiErrorMessage } from "@/shared/api"
import { getProjectRouteName, readFileAsBase64 } from "@/shared/utils/appRouterUtils"
import { preparePlatformExtensionAttachment } from "@/shared/extensions/platformExtensionRuntime"
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

function getSessionID(properties: Record<string, unknown>) {
  if (typeof properties.sessionID === "string") return properties.sessionID
  if (isRecord(properties.info) && typeof properties.info.sessionID === "string") return properties.info.sessionID
  if (isRecord(properties.part) && typeof properties.part.sessionID === "string") return properties.part.sessionID
  return undefined
}

function getSessionStatus(properties: Record<string, unknown>) {
  const status = properties.status
  return status && typeof status === "object" && "type" in status && typeof status.type === "string" ? status.type : undefined
}

function getSessionError(properties: Record<string, unknown>) {
  const error = properties.error
  if (!isRecord(error) || !("data" in error)) return undefined
  const data = error.data
  return isRecord(data) && typeof data.message === "string" ? data.message : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
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
  const activeSessionRef = useRef(activeSessionId)
  const eventRevisionRef = useRef(0)
  const openCodeMessagesRef = useRef<OpenCodeSessionMessage[]>([])
  const promptControllerRef = useRef<AbortController | null>(null)
  const sendingSessionRef = useRef<string | null>(null)
  const cancelledSessionRef = useRef<string | null>(null)
  const reconciledSessionRef = useRef<string | null>(null)
  const sendInFlightRef = useRef(false)
  const snapshotTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    activeSessionRef.current = activeSessionId
  }, [activeSessionId])

  const commitMessages = useCallback((messages: OpenCodeSessionMessage[]) => {
    openCodeMessagesRef.current = messages
    startTransition(() => setWorkspaceMessages(toWorkspaceMessages(messages)))
  }, [])

  const clearSnapshotTimeout = useCallback(() => {
    if (snapshotTimeoutRef.current === null) return
    window.clearTimeout(snapshotTimeoutRef.current)
    snapshotTimeoutRef.current = null
  }, [])

  const loadWorkspaceMessages = useCallback(async (
    sessionID: string,
    directory: string,
    signal?: AbortSignal,
    options?: { authoritative?: boolean; clearError?: boolean; showLoading?: boolean },
  ) => {
    const showLoading = options?.showLoading !== false
    const eventRevision = eventRevisionRef.current
    if (showLoading) setMessagesLoading(true)
    if (options?.clearError !== false) setMessagesError(null)
    try {
      const response = await listSessionMessages(sessionID, directory, { signal })
      if (signal?.aborted || activeSessionRef.current !== sessionID) return response
      if (!options?.authoritative && eventRevision !== eventRevisionRef.current) return response
      commitMessages(response)
      const latestMessage = response.at(-1)
      if (sendingSessionRef.current === sessionID
        && latestMessage?.info.role === "assistant"
        && (latestMessage.info.time?.completed || latestMessage.info.error)) {
        sendingSessionRef.current = null
        setMessageSending(false)
      }
      return response
    } catch (error) {
      if (!signal?.aborted && activeSessionRef.current === sessionID) {
        if (showLoading) commitMessages([])
        setMessagesError(getApiErrorMessage(error))
      }
      return null
    } finally {
      if (showLoading && !signal?.aborted) setMessagesLoading(false)
    }
  }, [commitMessages])

  useEffect(() => {
    clearSnapshotTimeout()
    if (!activeProjectPath || !activeSessionId) {
      const timeoutId = window.setTimeout(() => {
        eventRevisionRef.current += 1
        commitMessages([])
        setMessagesError(null)
        setMessagesLoading(false)
        setMessageSending(false)
        sendingSessionRef.current = null
      }, 0)
      return () => window.clearTimeout(timeoutId)
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      if (sendingSessionRef.current && sendingSessionRef.current !== activeSessionId) {
        sendingSessionRef.current = null
        setMessageSending(false)
      }
      eventRevisionRef.current += 1
      commitMessages([])
      void loadWorkspaceMessages(activeSessionId, activeProjectPath, controller.signal)
    }, 0)
    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [activeProjectPath, activeSessionId, clearSnapshotTimeout, commitMessages, loadWorkspaceMessages])

  useEffect(() => {
    if (!activeProjectPath) return
    const controller = new AbortController()
    void consumeOpenCodeEvents(activeProjectPath, (event) => {
      const payload = getEventPayload(event)
      const properties = payload.properties ?? {}
      const sessionID = getSessionID(properties)
      const currentSessionID = activeSessionRef.current

      if (payload.type === "server.connected" && currentSessionID) {
        void loadWorkspaceMessages(currentSessionID, activeProjectPath, undefined, { showLoading: false })
      }

      if (sessionID === currentSessionID && payload.type?.startsWith("message.")) {
        const nextMessages = applyOpenCodeMessageEvent(openCodeMessagesRef.current, payload as OpenCodeMessageEvent)
        if (nextMessages !== openCodeMessagesRef.current) {
          eventRevisionRef.current += 1
          commitMessages(nextMessages)
        }
        if (payload.type === "message.updated" && isRecord(properties.info) && properties.info.role === "assistant") {
          const time = properties.info.time
          if (!properties.info.error && (!isRecord(time) || typeof time.completed !== "number")) {
            reconciledSessionRef.current = null
            sendingSessionRef.current = sessionID
            setMessageSending(true)
          }
        }
      }

      if (payload.type === "session.status" && sessionID === currentSessionID) {
        const status = getSessionStatus(properties)
        if (status && status !== "idle") {
          reconciledSessionRef.current = null
          sendingSessionRef.current = sessionID
          setMessageSending(true)
        }
        if (status === "idle") {
          clearSnapshotTimeout()
          sendingSessionRef.current = null
          cancelledSessionRef.current = null
          setMessageSending(false)
          if (reconciledSessionRef.current !== sessionID) {
            reconciledSessionRef.current = sessionID
            void loadWorkspaceMessages(sessionID, activeProjectPath, undefined, { authoritative: true, showLoading: false })
          }
        }
      }

      if (payload.type === "session.idle" && sessionID === currentSessionID) {
        clearSnapshotTimeout()
        sendingSessionRef.current = null
        cancelledSessionRef.current = null
        setMessageSending(false)
        if (reconciledSessionRef.current !== sessionID) {
          reconciledSessionRef.current = sessionID
          void loadWorkspaceMessages(sessionID, activeProjectPath, undefined, { authoritative: true, showLoading: false })
        }
      }

      if (payload.type === "session.error" && sessionID === currentSessionID) {
        clearSnapshotTimeout()
        sendingSessionRef.current = null
        setMessageSending(false)
        if (cancelledSessionRef.current === sessionID) setMessagesError(null)
        else setMessagesError(getSessionError(properties) ?? "OpenCode session 發生錯誤。")
        if (reconciledSessionRef.current !== sessionID) {
          reconciledSessionRef.current = sessionID
          void loadWorkspaceMessages(sessionID, activeProjectPath, undefined, { authoritative: true, clearError: false, showLoading: false })
        }
      }

      if (payload.type === "file.edited") reloadContextFileTree()
    }, controller.signal).catch((error) => {
      if (!controller.signal.aborted) setMessagesError(getApiErrorMessage(error))
    })
    return () => controller.abort()
  }, [activeProjectPath, clearSnapshotTimeout, commitMessages, loadWorkspaceMessages, reloadContextFileTree])

  useEffect(() => () => {
    promptControllerRef.current?.abort()
    clearSnapshotTimeout()
  }, [clearSnapshotTimeout])

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
      const prepared = await preparePlatformExtensionAttachment(file, {
        projectName: getProjectRouteName(activeProjectPath),
        projectPath: activeProjectPath,
      })
      if (file.name.toLowerCase().endsWith(".xmind") && !prepared) {
        throw new Error("XMind Extension 未提供 Markdown 轉換處理器。")
      }
      return {
        id: prepared?.path ?? file.name,
        isImage: file.type.startsWith("image/"),
        meta: prepared?.meta ?? formatAttachmentSize(file.size),
        name: prepared?.name ?? file.name,
        path: prepared?.path ?? file.name,
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
    if (sendInFlightRef.current || sendingSessionRef.current) return false

    const controller = new AbortController()
    promptControllerRef.current = controller
    sendInFlightRef.current = true
    cancelledSessionRef.current = null
    reconciledSessionRef.current = null
    setMessageSending(true)
    setMessagesError(null)
    try {
      let sessionID = activeSessionId
      if (!sessionID) {
        const response = await createProjectSession(activeProjectPath, { title: text.trim().slice(0, 80) || "新對話" }, { signal: controller.signal })
        const nextSession = toWorkspaceSession(response)
        sessionID = response.id
        activeSessionRef.current = sessionID
        eventRevisionRef.current += 1
        commitMessages([])
        setOpenCodeSessions((current) => [response, ...current])
        setProjectSessions((current) => [nextSession, ...current])
        setActiveSessionId(sessionID)
      }
      sendingSessionRef.current = sessionID
      await sendSessionPrompt(sessionID, activeProjectPath, {
        agent: activeAgent.id === emptyAgentId ? undefined : activeAgent.id,
        model: selectedModel ? { modelID: selectedModel.id, providerID: selectedModel.providerID, ...(selectedThinkingVariant !== "default" ? { variant: selectedThinkingVariant } : {}) } : undefined,
        text: promptText,
      }, { signal: controller.signal })
      if (controller.signal.aborted) return false
      setAttachments([])
      clearSnapshotTimeout()
      snapshotTimeoutRef.current = window.setTimeout(() => {
        snapshotTimeoutRef.current = null
        void loadWorkspaceMessages(sessionID, activeProjectPath, undefined, { showLoading: false })
      }, 250)
      return true
    } catch (error) {
      sendingSessionRef.current = null
      setMessageSending(false)
      if (!controller.signal.aborted) setMessagesError(getApiErrorMessage(error))
      return false
    } finally {
      sendInFlightRef.current = false
      if (promptControllerRef.current === controller) promptControllerRef.current = null
    }
  }, [activeAgent.id, activeProjectPath, activeSessionId, clearSnapshotTimeout, commitMessages, emptyAgentId, loadWorkspaceMessages, selectedModel, selectedThinkingVariant, setActiveSessionId, setOpenCodeSessions, setProjectSessions])

  const cancelMessage = useCallback(async () => {
    promptControllerRef.current?.abort()
    clearSnapshotTimeout()
    const sessionID = sendingSessionRef.current
    sendingSessionRef.current = null
    setMessageSending(false)
    if (!activeProjectPath || !sessionID) return

    cancelledSessionRef.current = sessionID
    reconciledSessionRef.current = sessionID
    let abortFailed = false
    try {
      await abortSession(sessionID, activeProjectPath)
    } catch (error) {
      abortFailed = true
      setMessagesError(getApiErrorMessage(error))
    } finally {
      if (activeSessionRef.current === sessionID) {
        await loadWorkspaceMessages(sessionID, activeProjectPath, undefined, { authoritative: true, clearError: !abortFailed, showLoading: false })
      }
    }
  }, [activeProjectPath, clearSnapshotTimeout, loadWorkspaceMessages])

  return { attachments, cancelMessage, messagesError, messagesLoading, messageSending, removeAttachment, sendMessage, setAttachments, setMessagesError, uploadChatFiles, workspaceMessages }
}
