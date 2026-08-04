import { ArrowUpRightIcon, BotIcon, CircleAlertIcon, LoaderCircleIcon, WrenchIcon } from "lucide-react"
import { useEffect, useRef } from "react"
import type { PlanStep, WorkspaceMessage } from "@/shared/types/workspace"

type ChatMessageListProps = {
  error?: string | null
  getSessionHref?: (sessionId: string) => string
  loading?: boolean
  messages: WorkspaceMessage[]
  onSelectSession?: (sessionId: string) => void
}

function getStepStatus(step: PlanStep) {
  if (step.status === "done") return "完成"
  if (step.status === "error") return "失敗"
  if (step.status === "pending") return "等待中"
  return "執行中"
}

function TaskStep({ getSessionHref, onSelectSession, step }: { getSessionHref?: (sessionId: string) => string; onSelectSession?: (sessionId: string) => void; step: PlanStep }) {
  const childSessionId = step.childSessionId
  const href = childSessionId ? getSessionHref?.(childSessionId) : undefined
  const working = step.status === "pending" || step.status === "running"
  const content = (
    <>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground shadow-xs/5">
        {working
          ? <LoaderCircleIcon aria-hidden="true" className="size-4 motion-safe:animate-spin" />
          : step.status === "error"
            ? <CircleAlertIcon aria-hidden="true" className="size-4 text-destructive" />
            : <BotIcon aria-hidden="true" className="size-4" />}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <strong className="truncate font-medium text-foreground text-sm">{step.agentLabel ? `@${step.agentLabel}` : "Subagent"}</strong>
          <span className={`shrink-0 text-[11px] ${step.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{getStepStatus(step)}</span>
        </span>
        <span className="truncate text-muted-foreground text-xs">{step.label}</span>
      </span>
      {href && onSelectSession && <ArrowUpRightIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/task:-translate-y-0.5 group-hover/task:translate-x-0.5" />}
    </>
  )

  if (!href || !childSessionId || !onSelectSession) {
    return <div aria-busy={working} className="flex min-h-12 items-center gap-3 rounded-xl bg-muted/45 px-3 py-2.5">{content}</div>
  }

  return (
    <a
      aria-label={`開啟 ${step.agentLabel ? `@${step.agentLabel}` : "subagent"} session：${step.label}`}
      className="group/task flex min-h-12 items-center gap-3 rounded-xl bg-muted/45 px-3 py-2.5 transition-colors hover:bg-muted/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-component="task-tool-card"
      href={href}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        onSelectSession(childSessionId)
      }}
    >
      {content}
    </a>
  )
}

function MessageTools({ getSessionHref, onSelectSession, steps }: { getSessionHref?: (sessionId: string) => string; onSelectSession?: (sessionId: string) => void; steps: PlanStep[] }) {
  return (
    <ul className="mt-3 grid gap-2" aria-label="工具執行紀錄">
      {steps.map((step) => (
        <li key={step.id}>
          {step.kind === "task" ? (
            <TaskStep getSessionHref={getSessionHref} onSelectSession={onSelectSession} step={step} />
          ) : (
            <div className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-muted-foreground text-xs">
              <WrenchIcon aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{step.label}</span>
              <span className={step.status === "error" ? "text-destructive" : undefined}>{getStepStatus(step)}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export function ChatMessageList({ error, getSessionHref, loading, messages, onSelectSession }: ChatMessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const followOutputRef = useRef(true)
  const firstMessageID = messages[0]?.id
  const hasStreamingMessage = messages.some((message) => message.role === "agent" && message.status === "streaming")

  useEffect(() => {
    followOutputRef.current = true
  }, [firstMessageID])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !followOutputRef.current) return
    container.scrollTop = container.scrollHeight
  }, [messages])

  if (loading && messages.length === 0) {
    return <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto px-4 py-8 text-center sm:px-8 lg:px-12" role="status">載入對話中...</div>
  }

  if (error && messages.length === 0) {
    return <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto px-4 py-8 text-center text-destructive text-sm sm:px-8 lg:px-12" role="alert">{error}</div>
  }

  if (messages.length === 0) {
    return <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto px-4 py-8 text-center text-muted-foreground text-sm sm:px-8 lg:px-12">目前沒有訊息，請在下方輸入內容開始對話。</div>
  }

  return (
    <div
      aria-busy={hasStreamingMessage}
      aria-live="polite"
      aria-relevant="additions text"
      className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-8 overflow-y-auto px-4 py-6 sm:px-6 sm:py-10"
      onScroll={(event) => {
        const container = event.currentTarget
        followOutputRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 96
      }}
      ref={scrollContainerRef}
      role="log"
    >
      {error && <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-destructive text-sm" role="alert">{error}</div>}
      {messages.map((message) => message.role === "user" ? (
        <article className="ml-auto max-w-[min(88%,40rem)]" data-status={message.status} key={message.id}>
          <p className="whitespace-pre-wrap break-words rounded-[22px] bg-muted px-4 py-2.5 text-[15px] leading-6 text-foreground">{message.body || "..."}</p>
        </article>
      ) : (
        <article aria-busy={message.status === "streaming"} className="w-full" data-status={message.status} key={message.id}>
          <div className="flex items-start gap-3.5">
            <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${message.status === "error" ? "bg-destructive/10 text-destructive" : "bg-foreground text-background"}`}>
              {message.status === "error" ? <CircleAlertIcon aria-hidden="true" className="size-4" /> : <BotIcon aria-hidden="true" className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <header className="mb-2 flex min-w-0 items-center gap-2 text-xs">
                <strong className="truncate font-semibold text-foreground">{message.title || "OpenCode agent"}</strong>
                {message.status === "streaming" && <span className="shrink-0 text-primary">正在產生</span>}
                {message.status === "error" && <span className="shrink-0 text-destructive">失敗</span>}
                {message.modelLabel && <span className="ml-auto hidden truncate font-mono text-muted-foreground sm:block">{message.modelLabel}</span>}
              </header>
              {message.body && (
                <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-foreground">
                  {message.body}
                  {message.status === "streaming" && <span aria-hidden="true" className="ml-1 inline-block h-4 w-1.5 translate-y-0.5 rounded-sm bg-foreground motion-safe:animate-pulse" />}
                </p>
              )}
              {message.plan && message.plan.length > 0 && <MessageTools getSessionHref={getSessionHref} onSelectSession={onSelectSession} steps={message.plan} />}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
