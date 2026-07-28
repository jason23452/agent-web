import { CheckIcon, ChevronDownIcon, UserRoundIcon } from "lucide-react"
import { useState } from "react"

type AgentSwitcherAgent = {
  id: string
  name: string
  provider: string
  status: "active" | "idle" | "review"
}

type AgentSwitcherProps = {
  activeAgent: AgentSwitcherAgent
  agents: AgentSwitcherAgent[]
  onAgentChange: (agentId: string) => void
}

export function AgentSwitcher({ activeAgent, agents, onAgentChange }: AgentSwitcherProps) {
  const [open, setOpen] = useState(false)

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
        <span className="hidden max-w-36 truncate sm:inline">{activeAgent.name}</span>
        <ChevronDownIcon aria-hidden="true" className="size-3.5" />
      </button>
      {open && (
        <div
          aria-label="可選 agent"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-50 w-56 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg/5"
          role="listbox"
        >
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
                <span className="min-w-0 flex-1 truncate">{agent.name}</span>
                <span className="text-muted-foreground text-xs">{agent.provider}</span>
                {selected && <CheckIcon aria-hidden="true" className="size-4" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
