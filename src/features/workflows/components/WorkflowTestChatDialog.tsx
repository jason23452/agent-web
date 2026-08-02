import { useEffect, useRef, useState } from "react"
import type { FormEvent, KeyboardEvent } from "react"
import { BotIcon, CheckCircle2Icon, CircleDashedIcon, MessageSquareTextIcon, SendIcon, WorkflowIcon } from "lucide-react"
import { getApiErrorMessage } from "@/shared/api"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/shared/components/ui/dialog"
import { Textarea } from "@/shared/components/ui/textarea"
import { createWorkflowTestChatSession, sendWorkflowTestChatMessage } from "@/features/workflows/api/workflowTestChat"
import type { WorkflowTestChatSession, WorkflowV1 } from "@/features/workflows/types"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
}

export function WorkflowTestChatDialog({
  onOpenChange,
  open,
  published,
  workflow,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
  published: boolean
  workflow: WorkflowV1
}) {
  const [session, setSession] = useState<WorkflowTestChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [starting, setStarting] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const requestControllerRef = useRef<AbortController | null>(null)

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

  async function submitMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const text = draft.trim()
    if (!text || sending || starting || !published) return

    setDraft("")
    setError(null)
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", text }
    setMessages((current) => [...current, userMessage])

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
      }, controller.signal)
      if (controller.signal.aborted) return
      setMessages((current) => [...current, {
        id: response.messageID ?? `assistant-${Date.now()}`,
        role: "assistant",
        text: response.text || "OpenCode 已回傳空白訊息。",
      }])
    } catch (requestError) {
      if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
    } finally {
      if (!controller.signal.aborted) setSending(false)
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    void submitMessage()
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="h-[min(760px,calc(100dvh-2rem))] max-w-4xl" closeProps={{ "aria-label": "關閉 Workflow 測試對話" }}>
        <DialogHeader className="border-border border-b">
          <div className="flex items-start gap-3 pr-8">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary"><MessageSquareTextIcon aria-hidden="true" className="size-5" /></span>
            <div className="min-w-0">
              <DialogTitle>測試 Workflow 對話</DialogTitle>
              <DialogDescription className="mt-1">在 `workflow-test` sandbox 透過目前的 Command、Agent 與節點關係進行對話。</DialogDescription>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <Badge variant="info"><WorkflowIcon aria-hidden="true" className="size-3" />workflow-test</Badge>
            <Badge variant={published ? "success" : "warning"}>{published ? <CheckCircle2Icon aria-hidden="true" className="size-3" /> : <CircleDashedIcon aria-hidden="true" className="size-3" />}{published ? "已測試發布" : "尚未測試發布"}</Badge>
            <code className="truncate text-muted-foreground">{workflow.id}</code>
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
                    <p className="mt-2 text-muted-foreground text-xs leading-5">送出第一則訊息時，系統會建立持久 OpenCode session，並將目前 workflow 的 nodes、edges 與連接關係附加到 command arguments。</p>
                    {!published && <p className="mt-3 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-left text-warning-foreground text-xs">請先關閉此視窗，按「測試發布」並等待 runtime verification 完成。</p>}
                    {published && <Button className="mt-5" disabled={starting} loading={starting} onClick={() => void startSession()} size="sm"><MessageSquareTextIcon aria-hidden="true" />建立測試 session</Button>}
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

            <form className="border-border border-t bg-background p-3 sm:p-4" onSubmit={(event) => void submitMessage(event)}>
              <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
                <label className="sr-only" htmlFor="workflow-test-chat-composer">輸入測試訊息</label>
                <Textarea aria-describedby="workflow-test-chat-hint" disabled={!published || starting || sending} id="workflow-test-chat-composer" onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder={published ? "描述你想測試或配置的 Agent 行為..." : "請先測試發布 Workflow"} rows={2} value={draft} />
                <Button aria-label="送出測試訊息" disabled={!draft.trim() || !published || starting || sending} loading={sending} size="icon-lg" type="submit"><SendIcon aria-hidden="true" /></Button>
              </div>
              <p className="mx-auto mt-2 w-full max-w-3xl text-[10px] text-muted-foreground" id="workflow-test-chat-hint">Enter 送出 · Shift + Enter 換行 · 每次訊息都會使用目前的 workflow-test sandbox。</p>
            </form>
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
