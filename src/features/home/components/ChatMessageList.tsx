import { ArrowUpRightIcon, BotIcon, ChevronRightIcon, CircleAlertIcon, LoaderCircleIcon, WrenchIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { PlanStep, WorkspaceMessage } from "@/shared/types/workspace"
import { cn } from "@/shared/utils/cn"

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

function MarkdownMessage({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "min-w-0 max-w-full break-words text-[15px] leading-7 [overflow-wrap:anywhere] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
        "[&_blockquote]:my-4 [&_blockquote]:border-foreground/20 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
        "[&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.875em]",
        "[&_h1]:my-4 [&_h1]:font-semibold [&_h1]:text-xl [&_h1]:leading-7 [&_h2]:my-4 [&_h2]:font-semibold [&_h2]:text-lg [&_h3]:my-3 [&_h3]:font-semibold",
        "[&_hr]:my-5 [&_hr]:border-border [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl",
        "[&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_p]:whitespace-pre-wrap [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_pre]:my-4 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/60 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs",
        "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted/60 [&_th]:p-2 [&_th]:text-left",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}

function ReasoningDetails({ content, streaming }: { content: string; streaming: boolean }) {
  const [open, setOpen] = useState(streaming)

  return (
    <details
      className="group mb-4 overflow-hidden rounded-xl border border-border/70 bg-muted/30"
      onToggle={(event) => setOpen(event.currentTarget.open)}
      open={open}
    >
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3.5 py-2 text-muted-foreground text-xs transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon aria-hidden="true" className="size-3.5 shrink-0 transition-transform group-open:rotate-90" />
        <span className="font-medium">思考過程</span>
        {streaming && <span className="ml-auto text-primary">正在思考</span>}
      </summary>
      <div className="border-border/70 border-t px-3.5 py-3 text-muted-foreground">
        <MarkdownMessage className="text-sm leading-6">{content}</MarkdownMessage>
      </div>
    </details>
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
    return <div className="grid min-h-0 w-full flex-1 place-items-center overflow-y-auto px-3 py-8 text-center sm:px-6 lg:px-8" role="status">載入對話中...</div>
  }

  if (error && messages.length === 0) {
    return <div className="grid min-h-0 w-full flex-1 place-items-center overflow-y-auto px-3 py-8 text-center text-destructive text-sm sm:px-6 lg:px-8" role="alert">{error}</div>
  }

  if (messages.length === 0) {
    return <div className="grid min-h-0 w-full flex-1 place-items-center overflow-y-auto px-3 py-8 text-center text-muted-foreground text-sm sm:px-6 lg:px-8">目前沒有訊息，請在下方輸入內容開始對話。</div>
  }

  return (
    <div
      aria-busy={hasStreamingMessage}
      aria-live="polite"
      aria-relevant="additions text"
      className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
      onScroll={(event) => {
        const container = event.currentTarget
        followOutputRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 96
      }}
      ref={scrollContainerRef}
      role="log"
    >
      <div className="mx-auto flex min-h-full w-full max-w-[884px] flex-col gap-6 px-3 py-5 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {error && <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-destructive text-sm" role="alert">{error}</div>}
        {messages.map((message) => message.role === "user" ? (
          <article className="ml-auto max-w-[min(92%,40rem)] sm:max-w-[min(88%,40rem)]" data-status={message.status} key={message.id}>
            <MarkdownMessage className="rounded-[22px] bg-muted px-4 py-2.5 leading-6 text-foreground [&_code]:bg-background/70">{message.body || "..."}</MarkdownMessage>
          </article>
        ) : (
          <article aria-busy={message.status === "streaming"} className="w-full" data-status={message.status} key={message.id}>
            <div className="flex items-start gap-2.5 sm:gap-3.5">
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
                {message.reasoning && <ReasoningDetails content={message.reasoning} streaming={message.status === "streaming"} />}
                {message.body && <MarkdownMessage className="text-foreground">{message.body}</MarkdownMessage>}
                {message.plan && message.plan.length > 0 && <MessageTools getSessionHref={getSessionHref} onSelectSession={onSelectSession} steps={message.plan} />}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
