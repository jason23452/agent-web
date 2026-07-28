import { CheckIcon, Clock3Icon, PinIcon, SparklesIcon } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardPanel } from "@/shared/components/ui/card"
import { messages } from "@/features/workspace/data/mockWorkspace"
import type { Agent, PlanStep } from "@/features/workspace/types/workspace"

type ChatMessageListProps = {
  activeAgent: Agent
}

const quickActions = [
  { title: "建立頁面", description: "從 design spec 產生 React feature" },
  { title: "檢查 API", description: "確認 agent endpoint 與資料流" },
  { title: "整理檔案", description: "把 prototype 拆到正確分層" },
]

function PlanStatus({ step }: { step: PlanStep }) {
  if (step.status === "done") {
    return (
      <Badge variant="success">
        <CheckIcon aria-hidden="true" />
        完成
      </Badge>
    )
  }

  if (step.status === "running") {
    return (
      <Badge variant="info">
        <Clock3Icon aria-hidden="true" />
        進行中
      </Badge>
    )
  }

  return <Badge variant="outline">等待</Badge>
}

export function ChatMessageList({ activeAgent }: ChatMessageListProps) {
  return (
    <div className="min-h-0 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-[820px] gap-8">
        <section className="grid min-h-48 place-items-center text-center" aria-labelledby="workspace-welcome-title">
          <div className="grid gap-5">
            <div className="mx-auto grid size-11 place-items-center rounded-full bg-primary text-primary-foreground">
              <SparklesIcon aria-hidden="true" className="size-5" />
            </div>
            <div className="grid gap-2">
              <h1 className="text-balance font-heading font-semibold text-3xl tracking-[-0.025em] sm:text-4xl" id="workspace-welcome-title">
                今天要讓 {activeAgent.name} 做什麼？
              </h1>
              <p className="mx-auto max-w-[54ch] text-muted-foreground">
                從對話出發，附加檔案、Pin 選取內容，或打開右側面板讓 agent 針對專案上下文工作。
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {quickActions.map((action) => (
                <button
                  className="rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  key={action.title}
                  type="button"
                >
                  <strong className="block text-sm">{action.title}</strong>
                  <span className="text-muted-foreground text-xs">{action.description}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section aria-label="對話訊息" aria-live="polite" className="grid gap-6">
          {messages.map((message) => (
            <article className="grid grid-cols-[34px_minmax(0,1fr)] gap-3" key={message.id}>
              <div className="grid size-8 place-items-center rounded-full bg-primary font-bold text-primary-foreground text-xs">AI</div>
              <div className="grid min-w-0 gap-3 pt-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-2">
                    {message.title && <h2 className="font-heading font-semibold text-xl tracking-[-0.015em]">{message.title}</h2>}
                    <p className="leading-7">{message.body}</p>
                  </div>
                  <button aria-label="Pin 這則訊息" className="rounded-md p-1 text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button">
                    <PinIcon aria-hidden="true" className="size-4" />
                  </button>
                </div>

                {message.plan && (
                  <Card>
                    <CardPanel className="grid gap-3 p-4">
                      {message.plan.map((step, index) => (
                        <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm" key={step.id}>
                          <span className="grid size-6 place-items-center rounded-full border bg-background font-mono text-muted-foreground text-xs">{index + 1}</span>
                          <span className="min-w-0 truncate">{step.label}</span>
                          <PlanStatus step={step} />
                        </div>
                      ))}
                    </CardPanel>
                  </Card>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}
