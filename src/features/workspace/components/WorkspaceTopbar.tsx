import { HomeIcon, PanelLeftIcon, PanelRightIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { AgentSwitcher } from "@/features/workspace/components/AgentSwitcher"
import { ContextMeter } from "@/features/workspace/components/ContextMeter"
import { tokenUsage } from "@/features/workspace/data/mockWorkspace"
import type { Agent } from "@/features/workspace/types/workspace"

type WorkspaceTopbarProps = {
  activeAgent: Agent
  activeProjectPath: string
  agents: Agent[]
  onAgentChange: (agentId: string) => void
  onOpenContextPanel: () => void
  onOpenSidebar: () => void
}

function getProjectLabel(path: string) {
  const segments = path.replace(/\\/g, "/").split("/").filter(Boolean)
  return segments.at(-1) ?? path
}

export function WorkspaceTopbar({ activeAgent, activeProjectPath, agents, onAgentChange, onOpenContextPanel, onOpenSidebar }: WorkspaceTopbarProps) {
  const projectLabel = getProjectLabel(activeProjectPath)

  return (
    <header className="sticky top-0 z-20 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-border/70 border-b bg-background/90 px-3 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-2">
        <Button aria-label="開啟側欄" className="max-[760px]:inline-flex min-[761px]:hidden" onClick={onOpenSidebar} size="icon" variant="ghost">
          <PanelLeftIcon aria-hidden="true" />
        </Button>
      </div>

      <div className="hidden min-w-0 items-center gap-1 font-mono text-muted-foreground text-xs min-[760px]:flex" title={activeProjectPath}>
        <HomeIcon aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate">當前專案</span>
        <span className="text-foreground">/</span>
        <span className="truncate font-medium text-foreground">{projectLabel}</span>
      </div>

      <div className="flex items-center justify-end gap-2">
        <AgentSwitcher activeAgent={activeAgent} agents={agents} onAgentChange={onAgentChange} />
        <ContextMeter usage={tokenUsage} />
        <Button aria-label="開啟上下文面板" className="min-[1181px]:hidden" onClick={onOpenContextPanel} size="icon" variant="ghost">
          <PanelRightIcon aria-hidden="true" />
        </Button>
      </div>
    </header>
  )
}
