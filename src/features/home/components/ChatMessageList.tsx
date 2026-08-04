import { useEffect, useRef } from "react"
import type { WorkspaceMessage } from "@/shared/types/workspace"

export function ChatMessageList({ error, loading, messages }: { error?: string | null; loading?: boolean; messages: WorkspaceMessage[] }) {
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
    return <div className="grid min-h-0 place-items-center overflow-y-auto px-4 py-8 text-center sm:px-8 lg:px-12" role="status">載入對話中...</div>
  }

  if (error && messages.length === 0) {
    return <div className="grid min-h-0 place-items-center overflow-y-auto px-4 py-8 text-center text-destructive text-sm sm:px-8 lg:px-12" role="alert">{error}</div>
  }

  if (messages.length === 0) {
    return <div className="grid min-h-0 place-items-center overflow-y-auto px-4 py-8 text-center text-muted-foreground text-sm sm:px-8 lg:px-12">目前沒有訊息，請在下方輸入內容開始對話。</div>
  }

  return (
    <div
      aria-busy={hasStreamingMessage}
      aria-live="polite"
      aria-relevant="additions text"
      className="mx-auto grid min-h-0 w-full max-w-[920px] gap-5 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12"
      onScroll={(event) => {
        const container = event.currentTarget
        followOutputRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 96
      }}
      ref={scrollContainerRef}
      role="log"
    >
      {error && <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-destructive text-sm" role="alert">{error}</div>}
      {messages.map((message) => (
        <article aria-busy={message.status === "streaming"} className={`grid gap-2 rounded-2xl border p-4 ${message.role === "user" ? "ml-auto max-w-[78%] bg-primary/8" : "mr-auto max-w-[92%] bg-card"} ${message.status === "error" ? "border-destructive/30" : ""}`} data-status={message.status} key={message.id}>
          <header className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold">{message.role === "user" ? "你" : message.title || "OpenCode agent"}</span>
            <span className="flex min-w-0 items-center gap-2">
              {message.status === "streaming" && message.role === "agent" && <span className="shrink-0 text-primary">正在產生</span>}
              {message.status === "error" && <span className="shrink-0 text-destructive">失敗</span>}
              {message.modelLabel && <span className="truncate font-mono text-muted-foreground">{message.modelLabel}</span>}
            </span>
          </header>
          <p className="whitespace-pre-wrap break-words text-sm leading-6">
            {message.body || "..."}
            {message.status === "streaming" && message.role === "agent" && <span aria-hidden="true" className="ml-1 inline-block h-4 w-1.5 translate-y-0.5 rounded-sm bg-primary motion-safe:animate-pulse" />}
          </p>
          {message.plan && message.plan.length > 0 && (
            <ul className="grid gap-1 border-border/70 border-t pt-2 text-muted-foreground text-xs">
              {message.plan.map((step) => <li key={step.id}>{step.status === "done" ? "完成" : step.status === "running" ? "執行中" : "待處理"} · {step.label}</li>)}
            </ul>
          )}
        </article>
      ))}
    </div>
  )
}
