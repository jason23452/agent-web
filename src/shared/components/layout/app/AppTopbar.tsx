import { HomeIcon, PanelLeftIcon, PanelRightIcon } from "lucide-react"
import { AgentSwitcher } from "@/shared/components/layout/app/AgentSwitcher"
import { ContextMeter } from "@/shared/components/layout/context/ContextMeter"
import { ModelSwitcher } from "@/shared/components/layout/app/ModelSwitcher"
import { TopNav } from "@/shared/components/layout/app/TopNav"
import { Button } from "@/shared/components/ui/button"
import type { Agent, ModelOption, ModelRateLimitUsage, TokenUsage } from "@/shared/types/workspace"

type AppTopbarProps = {
  activeAgent: Agent
  activeProjectPath?: string | null
  agentsError?: string | null
  agentsLoading?: boolean
  agents: Agent[]
  modelLoading?: boolean
  models: ModelOption[]
  onAgentChange: (agentId: string) => void
  onModelChange: (modelKey: string) => void
  onOpenContextPanel: () => void
  onOpenSidebar: () => void
  rateLimitUsage?: ModelRateLimitUsage | null
  selectedModelKey: string | null
  tokenUsage: TokenUsage[]
}

function getProjectLabel(path: string) {
  const segments = path.replace(/\\/g, "/").split("/").filter(Boolean)
  return segments.at(-1) ?? path
}

export function AppTopbar({
  activeAgent,
  activeProjectPath,
  agentsError,
  agentsLoading = false,
  agents,
  modelLoading = false,
  models,
  onAgentChange,
  onModelChange,
  onOpenContextPanel,
  onOpenSidebar,
  rateLimitUsage,
  selectedModelKey,
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
          <AgentSwitcher activeAgent={activeAgent} agents={agents} error={agentsError} loading={agentsLoading} onAgentChange={onAgentChange} />
          <ModelSwitcher activeModelKey={selectedModelKey} loading={modelLoading} models={models} onModelChange={onModelChange} />
          <ContextMeter rateLimitUsage={rateLimitUsage} usage={tokenUsage} />
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
