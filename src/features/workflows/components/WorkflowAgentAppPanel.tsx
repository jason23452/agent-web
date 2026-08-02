import { BotIcon, CheckCircle2Icon, CommandIcon, PlugZapIcon, SparklesIcon, WrenchIcon } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import type { WorkflowNode, WorkflowV1 } from "@/features/workflows/types"
import { projectWorkflowRelationships } from "@/features/workflows/workflowUtils"

type WorkflowAgentAppPanelProps = {
  workflow: WorkflowV1
  onSelectNode: (nodeID: string) => void
}

const CAPABILITY_META = {
  skill: { label: "Skills", icon: SparklesIcon },
  tool: { label: "Tools", icon: WrenchIcon },
  mcp: { label: "MCP", icon: PlugZapIcon },
  plugin: { label: "Plugins", icon: BotIcon },
} as const

export function WorkflowAgentAppPanel({ onSelectNode, workflow }: WorkflowAgentAppPanelProps) {
  const projection = projectWorkflowRelationships(workflow)
  const nodeByID = new Map(workflow.nodes.map((node) => [node.id, node]))

  return (
    <section aria-label="Agent App 摘要" className="min-h-0 overflow-y-auto">
      <header className="border-border border-b p-4">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">Dify-like layer</p>
        <h2 className="mt-1 font-semibold text-sm">Agent Apps</h2>
        <p className="mt-1 text-muted-foreground text-xs leading-5">從畫布的 command → agent → capabilities 關係推導，不是另一份設定來源。</p>
      </header>
      <div className="grid gap-3 p-3">
        {projection.agentApps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-muted-foreground text-xs leading-5">
            尚未形成 Agent App。請將 Command 連到 Agent，再將 Agent 連到 Skills、Tools、MCP 或 Plugins。
          </div>
        ) : projection.agentApps.map((app) => (
          <article className="grid gap-3 rounded-xl border border-border bg-card p-3" key={app.id}>
            <div className="flex items-start gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted"><BotIcon aria-hidden="true" className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-sm">{app.agent}</p>
                <button className="mt-1 flex max-w-full items-center gap-1 truncate text-left text-muted-foreground text-xs hover:text-foreground" onClick={() => app.commandNodeID && onSelectNode(app.commandNodeID)} type="button">
                  <CommandIcon aria-hidden="true" className="size-3 shrink-0" />
                  <span className="truncate">{app.command}</span>
                </button>
              </div>
              <Badge size="sm" variant="success"><CheckCircle2Icon aria-hidden="true" /> App</Badge>
            </div>
            <div className="grid gap-1.5">
              {(Object.entries(app.capabilities) as Array<[keyof typeof CAPABILITY_META, string[]]>).map(([kind, names]) => {
                const meta = CAPABILITY_META[kind]
                const Icon = meta.icon
                return (
                  <button className="flex min-w-0 items-start gap-2 rounded-lg bg-muted/60 px-2.5 py-2 text-left text-xs hover:bg-accent" key={kind} onClick={() => selectCapabilityNode(names, nodeByID, onSelectNode)} type="button">
                    <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1"><strong>{meta.label}</strong><span className="ml-2 text-muted-foreground">{names.length ? names.join(", ") : "未配置"}</span></span>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">Capabilities 是 declarative dependencies，不代表 runtime hard isolation。</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function selectCapabilityNode(names: string[], nodeByID: Map<string, WorkflowNode>, onSelectNode: (nodeID: string) => void) {
  const node = [...nodeByID.values()].find((candidate) => candidate.type.startsWith("resource.") && "name" in candidate.data && names.includes(candidate.data.name))
  if (node) onSelectNode(node.id)
}
