import { HomeIcon, PanelLeftIcon, PanelRightIcon } from "lucide-react"
import { AgentSwitcher } from "@/shared/components/layout/AgentSwitcher"
import { ContextMeter } from "@/shared/components/layout/ContextMeter"
import { TopNav } from "@/shared/components/layout/TopNav"
import { Button } from "@/shared/components/ui/button"
import type { Agent, TokenUsage } from "@/shared/types/workspace"

type AppTopbarProps = {
  activeAgent: Agent
  activeProjectPath?: string | null
  agents: Agent[]
  onAgentChange: (agentId: string) => void
  onOpenContextPanel: () => void
  onOpenSidebar: () => void
  tokenUsage: TokenUsage[]
}

function getProjectLabel(path: string) {
  const segments = path.replace(/\\/g, "/").split("/").filter(Boolean)
  return segments.at(-1) ?? path
}

export function AppTopbar({
  activeAgent,
  activeProjectPath,
  agents,
  onAgentChange,
  onOpenContextPanel,
  onOpenSidebar,
  tokenUsage,
}: AppTopbarProps) {
  const projectLabel = activeProjectPath ? getProjectLabel(activeProjectPath) : null

  return (
    <TopNav
      center={
        <div className="hidden min-w-0 items-center gap-1 font-mono text-muted-foreground text-xs min-[760px]:flex" title={activeProjectPath ?? undefined}>
          <HomeIcon aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate font-medium text-foreground">AICaht</span>
          {projectLabel && (
            <>
              <span className="text-foreground">/</span>
              <span className="truncate font-medium text-foreground">{projectLabel}</span>
            </>
          )}
        </div>
      }
      end={
        <>
          <AgentSwitcher activeAgent={activeAgent} agents={agents} onAgentChange={onAgentChange} />
          <ContextMeter usage={tokenUsage} />
          <Button aria-label="Open context panel" className="bg-background min-[1181px]:hidden" onClick={onOpenContextPanel} size="icon" variant="outline">
            <PanelRightIcon aria-hidden="true" />
          </Button>
        </>
      }
      start={
        <Button aria-label="Open sidebar" className="bg-background max-[760px]:inline-flex min-[761px]:hidden" onClick={onOpenSidebar} size="icon" variant="outline">
          <PanelLeftIcon aria-hidden="true" />
        </Button>
      }
    />
  )
}
