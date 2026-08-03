import { useEffect, useRef, useState } from "react"
import { BotIcon, CheckCircle2Icon, CircleDashedIcon, CommandIcon, CpuIcon, MessageSquareTextIcon, WorkflowIcon } from "lucide-react"
import { getApiErrorMessage } from "@/shared/api"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { ModelSwitcher } from "@/shared/components/layout/app/ModelSwitcher"
import { ChatComposer, type ChatComposerCompletionOption } from "@/shared/components/layout/context/ChatComposer"
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/shared/components/ui/dialog"
import { createWorkflowTestChatSession, sendWorkflowTestChatMessage } from "@/features/workflows/api/workflowTestChat"
import type { WorkflowNode, WorkflowResourceCatalog, WorkflowTestChatSession, WorkflowV1 } from "@/features/workflows/types"
import type { ModelOption } from "@/shared/types/workspace"
import { buildThinkingVariantOptions, getAgentModelKey } from "@/shared/utils/openCodeModelUtils"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
}

type WorkflowChatIdentity = {
  agent: string
  command: string
  model: string | null
  variant: string | null
}

type WorkflowResourceNode = WorkflowNode & { data: { name: string; content?: string } }

function getWorkflowChatIdentity(workflow: WorkflowV1): WorkflowChatIdentity {
  const commandNode = workflow.nodes.find((node): node is WorkflowResourceNode => node.type === "resource.command")
  const agentEdge = commandNode
    ? workflow.edges.find((edge) => edge.kind === "capability" && edge.source === commandNode.id && edge.targetHandle === "agent")
    : undefined
  const agentNode = workflow.nodes.find((node): node is WorkflowResourceNode => node.type === "resource.agent" && node.id === agentEdge?.target)
  const command = commandNode?.data.name || "command"
  const agent = agentNode?.data.name || "primary agent"
  const model = frontmatterValue(agentNode?.data.content, "model") ?? frontmatterValue(commandNode?.data.content, "model")
  const variant = frontmatterValue(agentNode?.data.content, "variant") ?? frontmatterValue(commandNode?.data.content, "variant")

  return { agent, command, model, variant }
}

function frontmatterValue(content: string | undefined, key: string) {
  if (!content) return null
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/)
  const line = match?.[1]?.split(/\r?\n/).find((item) => item.match(new RegExp(`^${key}:`)))
  const value = line?.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, "")
  return value || null
}

function getWorkflowCompletionOptions(workflow: WorkflowV1, catalog: WorkflowResourceCatalog | null | undefined, currentCommand: string, currentAgent: string) {
  const commandNode = workflow.nodes.find((node): node is WorkflowResourceNode => node.type === "resource.command")
  const workflowAgents = workflow.nodes.filter((node): node is WorkflowResourceNode => node.type === "resource.agent")
  const commands = uniqueCompletionOptions([
    { description: frontmatterValue(commandNode?.data.content, "description") ?? "目前 Workflow command", name: currentCommand },
    ...(catalog?.resources.commands ?? []).map((resource) => ({ description: resource.description, name: resource.name })),
  ])
  const subagents = uniqueCompletionOptions([
    ...(catalog?.resources.agents ?? [])
      .filter((resource) => resource.mode !== "primary")
      .map((resource) => ({ description: resource.description, name: resource.name })),
    ...workflowAgents.map((agent) => ({ description: frontmatterValue(agent.data.content, "description") ?? undefined, name: agent.data.name })),
  ]).filter((option) => option.name !== currentAgent)

  return { commands, subagents }
}

function uniqueCompletionOptions(options: ChatComposerCompletionOption[]) {
  const seen = new Set<string>()
  return options.filter((option) => {
    const key = option.name.trim().toLocaleLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function resolveModelKey(modelLabel: string | null, models: ModelOption[]) {
  if (modelLabel) {
    const selected = models.find((model) => getAgentModelKey(model) === modelLabel || model.key === modelLabel)
    if (selected) return selected.key
  }
  return models[0]?.key ?? null
}

export function WorkflowTestChatDialog({
  catalog,
  modelOptions = [],
  onOpenChange,
  open,
  published,
  workflow,
}: {
  catalog?: WorkflowResourceCatalog | null
  modelOptions?: ModelOption[]
  onOpenChange: (open: boolean) => void
  open: boolean
  published: boolean
  workflow: WorkflowV1
}) {
  const [session, setSession] = useState<WorkflowTestChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [starting, setStarting] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedModelKey, setSelectedModelKey] = useState<string | null>(() => resolveModelKey(getWorkflowChatIdentity(workflow).model, modelOptions))
  const [selectedThinkingVariant, setSelectedThinkingVariant] = useState(() => getWorkflowChatIdentity(workflow).variant ?? "default")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const requestControllerRef = useRef<AbortController | null>(null)
  const identity = getWorkflowChatIdentity(workflow)
  const currentCommand = session?.command ?? identity.command
  const currentAgent = session?.agent ?? identity.agent
  const effectiveModelKey = selectedModelKey && modelOptions.some((model) => model.key === selectedModelKey)
    ? selectedModelKey
    : resolveModelKey(identity.model, modelOptions)
  const selectedModel = modelOptions.find((model) => model.key === effectiveModelKey) ?? null
  const thinkingVariants = buildThinkingVariantOptions(selectedModel)
  const effectiveThinkingVariant = thinkingVariants.some((variant) => variant.key === selectedThinkingVariant) ? selectedThinkingVariant : "default"
  const currentModel = selectedModel ? getAgentModelKey(selectedModel) : session?.model ?? identity.model ?? "Default"
  const currentVariant = thinkingVariants.find((variant) => variant.key === effectiveThinkingVariant)?.label ?? "Default"
  const completionOptions = getWorkflowCompletionOptions(workflow, catalog, currentCommand, currentAgent)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  useEffect(() => () => requestControllerRef.current?.abort(), [])

  async function startSession() {
    if (!published || starting || sending) return null
    requestControllerRef.current?.abort()
    const controller = new AbortController()
    requestControllerRef.current = controller
    setStarting(true)
    setError(null)
    try {
      const nextSession = await createWorkflowTestChatSession(workflow.id, { scope: workflow.scope, project: workflow.project }, controller.signal)
      if (controller.signal.aborted) return null
      setSession(nextSession)
      return nextSession
    } catch (requestError) {
      if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
      return null
    } finally {
      setStarting(false)
    }
  }

  function submitMessage(value: string): boolean {
    const text = value.trim()
    if (!text || sending || starting || !published) return false

    setError(null)
    setMessages((current) => [...current, { id: `user-${current.length}`, role: "user", text }])
    void sendMessage(text)
    return true
  }

  async function sendMessage(text: string) {
    let activeSession = session
    if (!activeSession) activeSession = await startSession()
    if (!activeSession) return

    const controller = new AbortController()
    requestControllerRef.current = controller
    setSending(true)
    try {
      const response = await sendWorkflowTestChatMessage(workflow.id, activeSession.sessionID, {
        scope: workflow.scope,
        project: workflow.project,
        text,
        ...(selectedModel ? { model: getAgentModelKey(selectedModel) } : {}),
        ...(effectiveThinkingVariant !== "default" ? { variant: effectiveThinkingVariant } : {}),
      }, controller.signal)
      if (controller.signal.aborted) return
      setMessages((current) => [...current, {
        id: response.messageID ?? `assistant-${Date.now()}`,
        role: "assistant",
        text: response.text || "OpenCode 已回傳空白訊息。",
      }])
      setSession((current) => current
        ? { ...current, command: response.command, agent: response.agent, ...(response.model ? { model: response.model } : {}) }
        : current)
    } catch (requestError) {
      if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
    } finally {
      if (!controller.signal.aborted) setSending(false)
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="h-[min(760px,calc(100dvh-2rem))] max-w-4xl" closeProps={{ "aria-label": "關閉 Workflow 測試對話" }}>
        <DialogHeader className="border-border border-b">
          <div className="flex items-start justify-between gap-3 pr-16">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary"><MessageSquareTextIcon aria-hidden="true" className="size-5" /></span>
              <div className="min-w-0">
                <DialogTitle>測試 Workflow 對話</DialogTitle>
                <DialogDescription className="mt-1">在 `workflow-test` sandbox 透過目前的 Command、Agent 與節點關係進行對話。</DialogDescription>
              </div>
            </div>
            {modelOptions.length > 0 ? (
              <ModelSwitcher activeModelKey={effectiveModelKey} disabled={!published || starting || sending} models={modelOptions} onModelChange={setSelectedModelKey} />
            ) : (
              <span className="inline-flex min-h-9 max-w-44 shrink-0 items-center gap-1.5 rounded-lg px-2 text-muted-foreground text-sm" title={`目前 Model ${currentModel}`}>
                <CpuIcon aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">{currentModel}</span>
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            <Badge variant="info"><WorkflowIcon aria-hidden="true" className="size-3" />workflow-test</Badge>
            <Badge variant={published ? "success" : "warning"}>{published ? <CheckCircle2Icon aria-hidden="true" className="size-3" /> : <CircleDashedIcon aria-hidden="true" className="size-3" />}{published ? "已測試發布" : "尚未測試發布"}</Badge>
            <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border" />
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1 text-muted-foreground" title={`目前 Command /${currentCommand}`}>
              <CommandIcon aria-hidden="true" className="size-3 shrink-0" />
              <span className="text-[10px]">Command</span>
              <code className="truncate text-foreground">/{currentCommand}</code>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1 text-muted-foreground" title={`目前 Agent ${currentAgent}`}>
              <BotIcon aria-hidden="true" className="size-3 shrink-0" />
              <span className="text-[10px]">Agent</span>
              <span className="truncate text-foreground">{currentAgent}</span>
            </span>
          </div>
        </DialogHeader>

        <DialogPanel className="min-h-0 flex-1 overflow-hidden p-0" scrollFade={false}>
          <div className="flex h-full min-h-0 flex-col">
            <div aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-4 py-5 sm:px-6">
              {messages.length === 0 ? (
                <div className="grid min-h-full place-items-center py-8 text-center">
                  <div className="max-w-md">
                    <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-border bg-background text-muted-foreground"><BotIcon aria-hidden="true" className="size-6" /></span>
                    <h2 className="mt-4 font-semibold text-sm">準備測試目前的 Agent App</h2>
                    <p className="mt-2 text-muted-foreground text-xs leading-5">送出第一則訊息時，系統會建立持久 OpenCode session，並以 <code className="rounded bg-muted px-1 py-0.5">/{currentCommand}</code> 執行目前的 Agent App。</p>
                    {!published && <p className="mt-3 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-left text-warning-foreground text-xs">請先關閉此視窗，按「測試發布」並等待 runtime verification 完成。</p>}
                  </div>
                </div>
              ) : (
                <div className="mx-auto grid w-full max-w-3xl gap-4">
                  {messages.map((message) => <ChatBubble key={message.id} message={message} />)}
                  {(starting || sending) && <div className="flex items-center gap-2 text-muted-foreground text-xs"><span className="grid size-7 place-items-center rounded-lg border border-border bg-background"><CircleDashedIcon aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" /></span>{starting ? "正在建立 workflow-test session..." : "OpenCode 正在執行目前的 command..."}</div>}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {error && <div className="border-border border-t bg-destructive/8 px-4 py-2 text-destructive-foreground text-xs sm:px-6" role="alert">{error}</div>}

            <ChatComposer
              attachments={[]}
              commands={completionOptions.commands}
              disabled={!published || starting || sending}
              hint={`Enter 送出 · Shift + Enter 換行 · 目前使用 /${currentCommand} · ${currentModel} · ${currentVariant}。`}
              onClearPin={() => undefined}
              onRemoveAttachment={() => undefined}
              onSubmit={submitMessage}
              onThinkingVariantChange={setSelectedThinkingVariant}
              onUploadFiles={async () => {
                throw new Error("Workflow 測試對話目前僅支援文字訊息。")
              }}
              pinContext={null}
              placeholder={published ? `詢問 AICaht，或請 /${currentCommand} 開始工作` : "請先測試發布 Workflow"}
              selectedThinkingVariant={effectiveThinkingVariant}
              subagents={completionOptions.subagents}
              sending={sending || starting}
              thinkingVariants={thinkingVariants}
            />
          </div>
        </DialogPanel>
        <DialogFooter className="border-border border-t bg-muted/40 px-4 py-2 sm:px-6">
          <div className="flex w-full items-center justify-between gap-3">
            <p className="min-w-0 truncate font-mono text-[10px] text-muted-foreground">{session ? `Session ${session.sessionID}` : "尚未建立 session"}</p>
            <DialogClose render={<Button size="sm" variant="outline" />}>關閉</DialogClose>
          </div>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const user = message.role === "user"
  return (
    <article className={`flex gap-2.5 ${user ? "justify-end" : "justify-start"}`}>
      {!user && <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-background text-muted-foreground"><BotIcon aria-hidden="true" className="size-3.5" /></span>}
      <div className={`max-w-[min(88%,42rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${user ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-background"}`}>
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
      </div>
    </article>
  )
}
