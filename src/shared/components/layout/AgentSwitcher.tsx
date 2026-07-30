import { CheckIcon, ChevronDownIcon, UserRoundIcon } from "lucide-react"
import { useState } from "react"
import type { Agent } from "@/shared/types/workspace"

type AgentSwitcherProps = {
  activeAgent: Agent
  agents: Agent[]
  error?: string | null
  loading?: boolean
  onAgentChange: (agentId: string) => void
}

export function AgentSwitcher({ activeAgent, agents, error, loading = false, onAgentChange }: AgentSwitcherProps) {
  const [open, setOpen] = useState(false)
  const hasAgents = agents.length > 0

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <UserRoundIcon aria-hidden="true" className="size-4" />
        <span className="hidden max-w-36 truncate sm:inline">{loading ? "讀取 agent..." : activeAgent.name}</span>
        <ChevronDownIcon aria-hidden="true" className="size-3.5" />
      </button>
      {open && (
        <div
          aria-label="可選 agent"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-50 w-56 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg/5"
          role="listbox"
        >
          {loading && (
            <div className="px-2 py-2 text-muted-foreground text-sm" role="status">
              正在讀取 primary agents...
            </div>
          )}
          {!loading && error && (
            <div className="px-2 py-2 text-destructive-foreground text-sm" role="alert">
              {error}
            </div>
          )}
          {!loading && !error && !hasAgents && (
            <div className="px-2 py-2 text-muted-foreground text-sm">
              沒有可用 primary agent
            </div>
          )}
          {agents.map((agent) => {
            const selected = activeAgent.id === agent.id
            return (
              <button
                aria-selected={selected}
                className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent ${selected ? "bg-accent font-semibold" : ""}`}
                key={agent.id}
                onClick={() => {
                  onAgentChange(agent.id)
                  setOpen(false)
                }}
                role="option"
                type="button"
              >
                <span className={`size-2 rounded-full ${agent.status === "active" ? "bg-success" : agent.status === "review" ? "bg-warning" : "bg-muted-foreground"}`} />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate">{agent.name}</span>
                  <span className="truncate text-muted-foreground text-xs">{agent.provider}</span>
                </span>
                <span className="rounded-md border px-1.5 py-0.5 text-muted-foreground text-[10px]">
                  {agent.builtIn ? "預設" : "自訂"}
                </span>
                {selected && <CheckIcon aria-hidden="true" className="size-4" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
