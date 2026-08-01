import type { WorkspaceMessage } from "@/shared/types/workspace"

export function ChatMessageList({ error, loading, messages }: { error?: string | null; loading?: boolean; messages: WorkspaceMessage[] }) {
  if (loading && messages.length === 0) {
    return <div className="grid min-h-0 place-items-center overflow-y-auto px-4 py-8 text-center sm:px-8 lg:px-12" role="status">載入對話中...</div>
  }

  if (error) {
    return <div className="grid min-h-0 place-items-center overflow-y-auto px-4 py-8 text-center text-destructive text-sm sm:px-8 lg:px-12">{error}</div>
  }

  if (messages.length === 0) {
    return <div className="grid min-h-0 place-items-center overflow-y-auto px-4 py-8 text-center text-muted-foreground text-sm sm:px-8 lg:px-12">目前沒有訊息，請在下方輸入內容開始對話。</div>
  }

  return (
    <div className="mx-auto grid min-h-0 w-full max-w-[920px] gap-5 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12" aria-live="polite">
      {messages.map((message) => (
        <article className={`grid gap-2 rounded-2xl border p-4 ${message.role === "user" ? "ml-auto max-w-[78%] bg-primary/8" : "mr-auto max-w-[92%] bg-card"}`} key={message.id}>
          <header className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold">{message.role === "user" ? "你" : message.title || "OpenCode agent"}</span>
            {message.modelLabel && <span className="truncate font-mono text-muted-foreground">{message.modelLabel}</span>}
          </header>
          <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body || "..."}</p>
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
