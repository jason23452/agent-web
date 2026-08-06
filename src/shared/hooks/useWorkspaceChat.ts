import { startTransition, useCallback, useEffect, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { createOrUpdateProjectFile } from "@/features/workspace/api/files"
import { createProjectSession, toWorkspaceSession } from "@/features/workspace/api/sessions"
import { abortSession, applyOpenCodeMessageEvent, listSessionMessages, parseSessionCommand, sendSessionCommand, sendSessionPrompt, toWorkspaceMessages } from "@/features/workspace/api/messages"
import type { OpenCodeMessageEvent, OpenCodeSessionMessage } from "@/features/workspace/api/messages"
import { consumeOpenCodeEvents, type OpenCodeEvent } from "@/shared/api/opencodeEvents"
import { listOpenCodeQuestions, rejectOpenCodeQuestion, replyOpenCodeQuestion } from "@/shared/api/opencodeQuestions"
import type { OpenCodeQuestionAnswers, OpenCodeQuestionInfo, OpenCodeQuestionRequest } from "@/shared/api/opencodeQuestions"
import type { OpenCodeRuntimeCommand } from "@/shared/api/opencodeCommands"
import { getApiErrorMessage } from "@/shared/api"
import { getProjectRouteName, readFileAsBase64 } from "@/shared/utils/appRouterUtils"
import { preparePlatformExtensionAttachment } from "@/shared/extensions/platformExtensionRuntime"
import type { Agent, Attachment, ModelOption, PinContext, Session, WorkspaceCommand, WorkspaceMessage } from "@/shared/types/workspace"
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

function getCommandExecution(properties: Record<string, unknown>) {
  if (typeof properties.messageID !== "string" || typeof properties.name !== "string" || typeof properties.arguments !== "string") return null
  return {
    messageID: properties.messageID,
    command: {
      arguments: properties.arguments,
      name: properties.name,
    } satisfies WorkspaceCommand,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function getSessionTreeIDs(sessionID: string, sessions: Array<{ id: string; parentID?: string }>) {
  const sessionIDs = new Set([sessionID])
  let foundChild = true

  while (foundChild) {
    foundChild = false
    for (const session of sessions) {
      if (!session.parentID || !sessionIDs.has(session.parentID) || sessionIDs.has(session.id)) continue
      sessionIDs.add(session.id)
      foundChild = true
    }
  }

  return sessionIDs
}

function getSessionFamilyIDs(sessionID: string, sessions: Array<{ id: string; parentID?: string }>) {
  const byID = new Map(sessions.map((session) => [session.id, session]))
  let rootID = sessionID
  const visited = new Set<string>()
  while (!visited.has(rootID)) {
    visited.add(rootID)
    const parentID = byID.get(rootID)?.parentID
    if (!parentID) break
    rootID = parentID
  }
  return getSessionTreeIDs(rootID, sessions)
}

function parseQuestionInfo(value: unknown): OpenCodeQuestionInfo | null {
  if (!isRecord(value) || typeof value.question !== "string" || typeof value.header !== "string" || !Array.isArray(value.options)) return null
  const options = value.options.flatMap((option) => isRecord(option) && typeof option.label === "string"
    ? [{ label: option.label, description: typeof option.description === "string" ? option.description : "" }]
    : [],
  )
  if (options.length !== value.options.length) return null
  return {
    custom: value.custom !== false,
    header: value.header,
    multiple: value.multiple === true,
    options,
    question: value.question,
  }
}

function parseQuestionRequest(value: unknown): OpenCodeQuestionRequest | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.sessionID !== "string" || !Array.isArray(value.questions)) return null
  const questions = value.questions.flatMap((question) => {
    const parsed = parseQuestionInfo(question)
    return parsed ? [parsed] : []
  })
  if (questions.length === 0 || questions.length !== value.questions.length) return null
  const tool = isRecord(value.tool) && typeof value.tool.callID === "string" && typeof value.tool.messageID === "string"
    ? { callID: value.tool.callID, messageID: value.tool.messageID }
    : undefined
  return { id: value.id, questions, sessionID: value.sessionID, ...(tool ? { tool } : {}) }
}

function isOpenCodeSession(value: unknown): value is OpenCodeSession {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.directory === "string"
    && typeof value.projectID === "string"
    && typeof value.title === "string"
    && typeof value.version === "string"
    && isRecord(value.time)
    && typeof value.time.created === "number"
    && typeof value.time.updated === "number"
}

type UseWorkspaceChatOptions = {
  activeAgent: Agent
  activeProjectPath: string | null
  activeSessionId: string | null
  commands: OpenCodeRuntimeCommand[]
  emptyAgentId: string
  onSessionCreated?: (sessionID: string) => void
  openCodeSessions: OpenCodeSession[]
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
  commands,
  emptyAgentId,
  onSessionCreated,
  openCodeSessions,
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
  const [pendingQuestions, setPendingQuestions] = useState<OpenCodeQuestionRequest[]>([])
  const [questionActionID, setQuestionActionID] = useState<string | null>(null)
  const [questionError, setQuestionError] = useState<string | null>(null)
  const activeProjectRef = useRef(activeProjectPath)
  const activeSessionRef = useRef(activeSessionId)
  const abortInFlightRef = useRef(false)
  const eventRevisionRef = useRef(0)
  const openCodeMessagesRef = useRef<OpenCodeSessionMessage[]>([])
  const commandExecutionsRef = useRef(new Map<string, WorkspaceCommand>())
  const promptControllerRef = useRef<AbortController | null>(null)
  const sendingSessionRef = useRef<string | null>(null)
  const cancelledSessionRef = useRef<string | null>(null)
  const reconciledSessionRef = useRef<string | null>(null)
  const sendInFlightRef = useRef(false)
  const snapshotTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    activeSessionRef.current = activeSessionId
  }, [activeSessionId])

  useEffect(() => {
    if (activeProjectRef.current !== activeProjectPath) promptControllerRef.current?.abort()
    activeProjectRef.current = activeProjectPath
  }, [activeProjectPath])

  const commitMessages = useCallback((messages: OpenCodeSessionMessage[]) => {
    openCodeMessagesRef.current = messages
    startTransition(() => setWorkspaceMessages(toWorkspaceMessages(messages, commandExecutionsRef.current)))
  }, [])

  const clearSnapshotTimeout = useCallback(() => {
    if (snapshotTimeoutRef.current === null) return
    window.clearTimeout(snapshotTimeoutRef.current)
    snapshotTimeoutRef.current = null
  }, [])

  const refreshPendingQuestions = useCallback(async (directory: string, signal?: AbortSignal) => {
    try {
      const response = await listOpenCodeQuestions(directory, { signal })
      if (signal?.aborted || activeProjectRef.current !== directory) return
      setPendingQuestions(response.flatMap((question) => {
        const parsed = parseQuestionRequest(question)
        return parsed ? [parsed] : []
      }))
      setQuestionError(null)
    } catch (error) {
      if (!signal?.aborted && activeProjectRef.current === directory) setQuestionError(getApiErrorMessage(error))
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timeoutID = window.setTimeout(() => {
      setPendingQuestions([])
      setQuestionActionID(null)
      setQuestionError(null)
      if (activeProjectPath) void refreshPendingQuestions(activeProjectPath, controller.signal)
    }, 0)
    return () => {
      window.clearTimeout(timeoutID)
      controller.abort()
    }
  }, [activeProjectPath, refreshPendingQuestions])

  const loadWorkspaceMessages = useCallback(async (
    sessionID: string,
    directory: string,
    signal?: AbortSignal,
    options?: { authoritative?: boolean; clearError?: boolean; showLoading?: boolean; trackSending?: boolean },
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
      if (options?.trackSending !== false && latestMessage?.info.role === "assistant" && !abortInFlightRef.current) {
        if (!latestMessage.info.time?.completed && !latestMessage.info.error) {
          reconciledSessionRef.current = null
          sendingSessionRef.current = sessionID
          setMessageSending(true)
        } else if (sendingSessionRef.current === sessionID) {
          sendingSessionRef.current = null
          setMessageSending(false)
        }
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
      const properties = payload.properties ?? payload.data ?? {}
      const sessionID = getSessionID(properties)
      const currentSessionID = activeSessionRef.current

      if (payload.type === "server.connected" && currentSessionID) {
        void loadWorkspaceMessages(currentSessionID, activeProjectPath, undefined, { showLoading: false })
        void refreshPendingQuestions(activeProjectPath)
      }

      if (payload.type === "question.asked" || payload.type === "question.v2.asked") {
        const question = parseQuestionRequest(properties)
        if (question) {
          setPendingQuestions((current) => [...current.filter((item) => item.id !== question.id), question])
          setQuestionError(null)
        }
      }

      if (payload.type === "question.replied" || payload.type === "question.rejected" || payload.type === "question.v2.replied" || payload.type === "question.v2.rejected") {
        const requestID = typeof properties.requestID === "string" ? properties.requestID : undefined
        if (requestID) {
          setPendingQuestions((current) => current.filter((question) => question.id !== requestID))
          setQuestionActionID((current) => current === requestID ? null : current)
        }
      }

      if ((payload.type === "session.created" || payload.type === "session.updated") && isOpenCodeSession(properties.info)) {
        const session = properties.info
        if (session.directory === activeProjectPath) {
          if (session.time.archived) {
            setOpenCodeSessions((current) => {
              const archivedSessionIDs = getSessionTreeIDs(session.id, current)
              return current.filter((item) => !archivedSessionIDs.has(item.id))
            })
            setProjectSessions((current) => {
              const archivedSessionIDs = getSessionTreeIDs(session.id, current)
              return current.filter((item) => !archivedSessionIDs.has(item.id))
            })
            return
          }
          setOpenCodeSessions((current) => {
            const index = current.findIndex((item) => item.id === session.id)
            return index === -1 ? [session, ...current] : current.map((item) => item.id === session.id ? session : item)
          })
          const workspaceSession = toWorkspaceSession(session)
          setProjectSessions((current) => {
            const index = current.findIndex((item) => item.id === workspaceSession.id)
            return index === -1 ? [workspaceSession, ...current] : current.map((item) => item.id === workspaceSession.id ? workspaceSession : item)
          })
        }
      }

      if (payload.type === "session.deleted") {
        const deletedSessionID = sessionID ?? (isRecord(properties.info) && typeof properties.info.id === "string" ? properties.info.id : undefined)
        if (deletedSessionID) {
          setOpenCodeSessions((current) => {
            const deletedSessionIDs = getSessionTreeIDs(deletedSessionID, current)
            return current.filter((session) => !deletedSessionIDs.has(session.id))
          })
          setProjectSessions((current) => {
            const deletedSessionIDs = getSessionTreeIDs(deletedSessionID, current)
            return current.filter((session) => !deletedSessionIDs.has(session.id))
          })
        }
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

      if (sessionID === currentSessionID && payload.type === "command.executed") {
        const execution = getCommandExecution(properties)
        if (execution) {
          commandExecutionsRef.current.set(execution.messageID, execution.command)
          commitMessages(openCodeMessagesRef.current)
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
          const aborting = abortInFlightRef.current && cancelledSessionRef.current === sessionID
          if (!aborting) {
            sendingSessionRef.current = null
            cancelledSessionRef.current = null
            setMessageSending(false)
          }
          if (reconciledSessionRef.current !== sessionID) {
            reconciledSessionRef.current = sessionID
            void loadWorkspaceMessages(sessionID, activeProjectPath, undefined, { authoritative: true, showLoading: false, trackSending: false })
          }
        }
      }

      if (payload.type === "session.idle" && sessionID === currentSessionID) {
        clearSnapshotTimeout()
        const aborting = abortInFlightRef.current && cancelledSessionRef.current === sessionID
        if (!aborting) {
          sendingSessionRef.current = null
          cancelledSessionRef.current = null
          setMessageSending(false)
        }
        if (reconciledSessionRef.current !== sessionID) {
          reconciledSessionRef.current = sessionID
          void loadWorkspaceMessages(sessionID, activeProjectPath, undefined, { authoritative: true, showLoading: false, trackSending: false })
        }
      }

      if (payload.type === "session.error" && sessionID === currentSessionID) {
        clearSnapshotTimeout()
        const aborting = abortInFlightRef.current && cancelledSessionRef.current === sessionID
        if (!aborting) {
          sendingSessionRef.current = null
          setMessageSending(false)
        }
        if (cancelledSessionRef.current === sessionID) setMessagesError(null)
        else setMessagesError(getSessionError(properties) ?? "OpenCode session 發生錯誤。")
        if (reconciledSessionRef.current !== sessionID) {
          reconciledSessionRef.current = sessionID
          void loadWorkspaceMessages(sessionID, activeProjectPath, undefined, { authoritative: true, clearError: false, showLoading: false, trackSending: false })
        }
      }

      if (payload.type === "file.edited" || payload.type === "file.watcher.updated") reloadContextFileTree()
    }, controller.signal).catch((error) => {
      if (!controller.signal.aborted) setMessagesError(getApiErrorMessage(error))
    })
    return () => controller.abort()
  }, [activeProjectPath, clearSnapshotTimeout, commitMessages, loadWorkspaceMessages, refreshPendingQuestions, reloadContextFileTree, setOpenCodeSessions, setProjectSessions])

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

  const resetConversation = useCallback(() => {
    promptControllerRef.current?.abort()
    promptControllerRef.current = null
    clearSnapshotTimeout()
    activeSessionRef.current = null
    eventRevisionRef.current += 1
    openCodeMessagesRef.current = []
    commandExecutionsRef.current.clear()
    sendingSessionRef.current = null
    cancelledSessionRef.current = null
    reconciledSessionRef.current = null
    abortInFlightRef.current = false
    setAttachments([])
    setWorkspaceMessages([])
    setMessagesError(null)
    setMessagesLoading(false)
    setMessageSending(false)
    setQuestionActionID(null)
    setQuestionError(null)
  }, [clearSnapshotTimeout])

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
    const command = parseSessionCommand(text.trim(), commands)
    const commandArguments = command
      ? [
          command.arguments,
          context ? `Context: ${context.label}\n${context.text}` : "",
          selectedAttachments.length > 0 ? `Referenced project files:\n${selectedAttachments.map((attachment) => `- ${attachment.path ?? attachment.name}`).join("\n")}` : "",
        ].filter(Boolean).join("\n\n")
      : ""
    if (abortInFlightRef.current || sendInFlightRef.current || sendingSessionRef.current) return false

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
        setOpenCodeSessions((current) => [response, ...current.filter((session) => session.id !== response.id)])
        setProjectSessions((current) => [nextSession, ...current.filter((session) => session.id !== nextSession.id)])
        setActiveSessionId(sessionID)
        onSessionCreated?.(sessionID)
      }
      sendingSessionRef.current = sessionID
      if (command) {
        const response = await sendSessionCommand(sessionID, activeProjectPath, {
          agent: activeAgent.id === emptyAgentId ? undefined : activeAgent.id,
          arguments: commandArguments,
          command: command.name,
          model: selectedModel ? `${selectedModel.providerID}/${selectedModel.id}` : undefined,
          variant: selectedThinkingVariant !== "default" ? selectedThinkingVariant : undefined,
        }, { signal: controller.signal })
        if (response.info.id) {
          commandExecutionsRef.current.set(response.info.id, {
            arguments: commandArguments,
            name: command.name,
          })
          commitMessages(openCodeMessagesRef.current)
        }
      } else {
        await sendSessionPrompt(sessionID, activeProjectPath, {
          agent: activeAgent.id === emptyAgentId ? undefined : activeAgent.id,
          model: selectedModel ? { modelID: selectedModel.id, providerID: selectedModel.providerID, ...(selectedThinkingVariant !== "default" ? { variant: selectedThinkingVariant } : {}) } : undefined,
          text: promptText,
        }, { signal: controller.signal })
      }
      if (controller.signal.aborted) return false
      if (activeProjectRef.current !== activeProjectPath || activeSessionRef.current !== sessionID) return false
      setAttachments([])
      clearSnapshotTimeout()
      snapshotTimeoutRef.current = window.setTimeout(() => {
        snapshotTimeoutRef.current = null
        void loadWorkspaceMessages(sessionID, activeProjectPath, undefined, { showLoading: false })
      }, 250)
      return true
    } catch (error) {
      if (!abortInFlightRef.current) {
        sendingSessionRef.current = null
        setMessageSending(false)
      }
      if (!controller.signal.aborted) setMessagesError(getApiErrorMessage(error))
      return false
    } finally {
      sendInFlightRef.current = false
      if (promptControllerRef.current === controller) promptControllerRef.current = null
    }
  }, [activeAgent.id, activeProjectPath, activeSessionId, clearSnapshotTimeout, commands, commitMessages, emptyAgentId, loadWorkspaceMessages, onSessionCreated, selectedModel, selectedThinkingVariant, setActiveSessionId, setOpenCodeSessions, setProjectSessions])

  const answerQuestion = useCallback(async (requestID: string, answers: OpenCodeQuestionAnswers) => {
    if (!activeProjectPath || questionActionID) return
    setQuestionActionID(requestID)
    setQuestionError(null)
    try {
      const replied = await replyOpenCodeQuestion(requestID, activeProjectPath, answers)
      if (!replied) throw new Error("OpenCode 未接受這組答案。")
      setPendingQuestions((current) => current.filter((question) => question.id !== requestID))
    } catch (error) {
      setQuestionError(getApiErrorMessage(error))
    } finally {
      setQuestionActionID((current) => current === requestID ? null : current)
    }
  }, [activeProjectPath, questionActionID])

  const rejectQuestion = useCallback(async (requestID: string) => {
    if (!activeProjectPath || questionActionID) return
    setQuestionActionID(requestID)
    setQuestionError(null)
    try {
      const rejected = await rejectOpenCodeQuestion(requestID, activeProjectPath)
      if (!rejected) throw new Error("OpenCode 未接受拒絕操作。")
      setPendingQuestions((current) => current.filter((question) => question.id !== requestID))
    } catch (error) {
      setQuestionError(getApiErrorMessage(error))
    } finally {
      setQuestionActionID((current) => current === requestID ? null : current)
    }
  }, [activeProjectPath, questionActionID])

  const cancelMessage = useCallback(async () => {
    if (abortInFlightRef.current) return
    const sessionID = sendingSessionRef.current
    abortInFlightRef.current = true
    cancelledSessionRef.current = sessionID
    if (sessionID) reconciledSessionRef.current = sessionID
    promptControllerRef.current?.abort()
    clearSnapshotTimeout()
    if (!activeProjectPath || !sessionID) {
      abortInFlightRef.current = false
      sendingSessionRef.current = null
      setMessageSending(false)
      return
    }

    let abortFailed = false
    try {
      await abortSession(sessionID, activeProjectPath)
    } catch (error) {
      abortFailed = true
      setMessagesError(getApiErrorMessage(error))
    } finally {
      if (activeSessionRef.current === sessionID) {
        await loadWorkspaceMessages(sessionID, activeProjectPath, undefined, { authoritative: true, clearError: !abortFailed, showLoading: false, trackSending: false })
      }
      abortInFlightRef.current = false
      sendingSessionRef.current = null
      setMessageSending(false)
    }
  }, [activeProjectPath, clearSnapshotTimeout, loadWorkspaceMessages])

  const activeQuestionSessionIDs = activeSessionId ? getSessionFamilyIDs(activeSessionId, openCodeSessions) : new Set<string>()
  const activeQuestions = pendingQuestions.filter((question) => activeQuestionSessionIDs.has(question.sessionID))

  return {
    activeQuestion: activeQuestions[0] ?? null,
    answerQuestion,
    attachments,
    cancelMessage,
    messagesError,
    messagesLoading,
    messageSending,
    pendingQuestionCount: activeQuestions.length,
    questionActionID,
    questionError,
    rejectQuestion,
    removeAttachment,
    resetConversation,
    sendMessage,
    setAttachments,
    setMessagesError,
    uploadChatFiles,
    workspaceMessages,
  }
}
